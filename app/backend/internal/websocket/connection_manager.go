package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

// ConnectionType represents the type of WebSocket connection
type ConnectionType string

const (
	ConnectionTypeVisitor ConnectionType = "visitor"
	ConnectionTypeAgent   ConnectionType = "agent"
)

// Connection represents a WebSocket connection with metadata
type Connection struct {
	ID          string         `json:"id"`
	SessionID   string         `json:"session_id"`
	Type        ConnectionType `json:"type"`
	UserID      *string        `json:"user_id,omitempty"` // For agents
	TenantID    string         `json:"tenant_id"`
	ServerID    string         `json:"server_id"` // Which server instance holds this connection
	ConnectedAt time.Time      `json:"connected_at"`
	LastPingAt  time.Time      `json:"last_ping_at"`

	// Local connection (only exists on the server that owns this connection)
	Conn       *websocket.Conn `json:"-"`
	writeMutex sync.Mutex      `json:"-"` // Mutex to prevent concurrent writes to WebSocket
}

// Message represents a chat message to be sent via WebSocket
type Message struct {
	Type      string          `json:"type"`
	SessionID string          `json:"session_id"`
	Data      json.RawMessage `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
	FromType  ConnectionType  `json:"from_type"`
}

// ConnectionManager manages WebSocket connections using Redis for enterprise scaling
type ConnectionManager struct {
	redis      *redis.Client
	serverID   string
	localConns map[string]*Connection // Local connections only
	connMutex  sync.RWMutex
	pubsub     *redis.PubSub
	ctx        context.Context
	cancel     context.CancelFunc

	// Configuration
	connectionTTL     time.Duration
	heartbeatInterval time.Duration
}

// NewConnectionManager creates a new enterprise-ready connection manager
func NewConnectionManager(redisClient *redis.Client) *ConnectionManager {
	ctx, cancel := context.WithCancel(context.Background())
	serverID := uuid.New().String() // Unique server instance ID

	cm := &ConnectionManager{
		redis:             redisClient,
		serverID:          serverID,
		localConns:        make(map[string]*Connection),
		ctx:               ctx,
		cancel:            cancel,
		connectionTTL:     5 * time.Minute,
		heartbeatInterval: 30 * time.Second,
	}

	// Start background services
	go cm.startPubSubListener()
	go cm.startHeartbeatMonitor()

	log.Info().Str("server_id", serverID).Msg("Connection manager started")
	return cm
}

// AddConnection registers a new WebSocket connection
func (cm *ConnectionManager) AddConnection(sessionID string, connType ConnectionType, tenantID string, userID *string, conn *websocket.Conn) (*Connection, error) {
	connID := uuid.New().String()

	connection := &Connection{
		ID:          connID,
		SessionID:   sessionID,
		Type:        connType,
		UserID:      userID,
		TenantID:    tenantID,
		ServerID:    cm.serverID,
		ConnectedAt: time.Now(),
		LastPingAt:  time.Now(),
		Conn:        conn,
	}

	// Store locally
	cm.connMutex.Lock()
	cm.localConns[connID] = connection
	cm.connMutex.Unlock()

	// Store in Redis for cross-server visibility
	if err := cm.storeConnectionInRedis(connection); err != nil {
		log.Error().Err(err).Str("connection_id", connID).Msg("Failed to store connection in Redis")
		// Continue anyway - local connection still works
	}

	// Add to session-based lookup
	sessionKey := fmt.Sprintf("session:%s:connections", sessionID)
	if err := cm.redis.SAdd(cm.ctx, sessionKey, connID).Err(); err != nil {
		log.Error().Err(err).Str("session_id", sessionID).Msg("Failed to add connection to session set")
	}
	cm.redis.Expire(cm.ctx, sessionKey, cm.connectionTTL)

	log.Info().
		Str("connection_id", connID).
		Str("session_id", sessionID).
		Str("type", string(connType)).
		Str("tenant_id", tenantID).
		Msg("WebSocket connection added")

	return connection, nil
}

// RemoveConnection removes a WebSocket connection
func (cm *ConnectionManager) RemoveConnection(connID string) {
	cm.connMutex.Lock()
	connection, exists := cm.localConns[connID]
	if exists {
		delete(cm.localConns, connID)
	}
	cm.connMutex.Unlock()

	if !exists {
		return
	}

	// Remove from Redis
	connKey := fmt.Sprintf("connection:%s", connID)
	cm.redis.Del(cm.ctx, connKey)

	// Remove from session set
	sessionKey := fmt.Sprintf("session:%s:connections", connection.SessionID)
	cm.redis.SRem(cm.ctx, sessionKey, connID)

	// Close WebSocket connection
	if connection.Conn != nil {
		connection.Conn.Close()
	}

	log.Info().
		Str("connection_id", connID).
		Str("session_id", connection.SessionID).
		Msg("WebSocket connection removed")
}

// BroadcastToSession sends a message to all connections in a chat session
func (cm *ConnectionManager) BroadcastToSession(sessionID string, message *Message) error {
	message.Timestamp = time.Now()

	// Serialize message
	msgBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	// Publish to Redis channel for cross-server delivery
	channelKey := fmt.Sprintf("chat:session:%s", sessionID)
	if err := cm.redis.Publish(cm.ctx, channelKey, msgBytes).Err(); err != nil {
		log.Error().Err(err).Str("session_id", sessionID).Msg("Failed to publish message to Redis")
		// Continue with local delivery
	}

	// Also deliver locally immediately (for better latency)
	cm.deliverToLocalConnections(sessionID, msgBytes)

	return nil
}

// SendToConnection sends a message to a specific connection
func (cm *ConnectionManager) SendToConnection(connID string, message *Message) error {
	// Try local connection first
	cm.connMutex.RLock()
	connection, exists := cm.localConns[connID]
	cm.connMutex.RUnlock()

	if exists {
		return cm.sendToWebSocketByConnection(connection, message)
	}

	// If not local, publish to Redis for cross-server delivery
	message.Timestamp = time.Now()
	msgBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	channelKey := fmt.Sprintf("chat:connection:%s", connID)
	return cm.redis.Publish(cm.ctx, channelKey, msgBytes).Err()
}

// GetSessionConnections returns all connections for a session (across all servers)
func (cm *ConnectionManager) GetSessionConnections(sessionID string) ([]*Connection, error) {
	sessionKey := fmt.Sprintf("session:%s:connections", sessionID)
	connIDs, err := cm.redis.SMembers(cm.ctx, sessionKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get session connections: %w", err)
	}

	var connections []*Connection
	for _, connID := range connIDs {
		connKey := fmt.Sprintf("connection:%s", connID)
		connData, err := cm.redis.Get(cm.ctx, connKey).Result()
		if err != nil {
			if err != redis.Nil {
				log.Error().Err(err).Str("connection_id", connID).Msg("Failed to get connection data")
			}
			continue
		}

		var connection Connection
		if err := json.Unmarshal([]byte(connData), &connection); err != nil {
			log.Error().Err(err).Str("connection_id", connID).Msg("Failed to unmarshal connection data")
			continue
		}

		connections = append(connections, &connection)
	}

	return connections, nil
}

// GetActiveAgents returns all active agent connections for a tenant
func (cm *ConnectionManager) GetActiveAgents(tenantID string) ([]*Connection, error) {
	pattern := "connection:*"
	keys, err := cm.redis.Keys(cm.ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get connection keys: %w", err)
	}

	var agents []*Connection
	for _, key := range keys {
		connData, err := cm.redis.Get(cm.ctx, key).Result()
		if err != nil {
			continue
		}

		var connection Connection
		if err := json.Unmarshal([]byte(connData), &connection); err != nil {
			continue
		}

		if connection.Type == ConnectionTypeAgent && connection.TenantID == tenantID {
			agents = append(agents, &connection)
		}
	}

	return agents, nil
}

// Shutdown gracefully shuts down the connection manager
func (cm *ConnectionManager) Shutdown() {
	log.Info().Msg("Shutting down connection manager")

	// Cancel context to stop background services
	cm.cancel()

	// Close pub/sub
	if cm.pubsub != nil {
		cm.pubsub.Close()
	}

	// Close all local connections
	cm.connMutex.Lock()
	for connID, connection := range cm.localConns {
		if connection.Conn != nil {
			connection.Conn.Close()
		}
		// Remove from Redis
		connKey := fmt.Sprintf("connection:%s", connID)
		cm.redis.Del(context.Background(), connKey)
	}
	cm.localConns = make(map[string]*Connection)
	cm.connMutex.Unlock()
}

// Private methods

func (cm *ConnectionManager) storeConnectionInRedis(connection *Connection) error {
	// Don't store the WebSocket connection in Redis
	redisConn := *connection
	redisConn.Conn = nil

	connData, err := json.Marshal(redisConn)
	if err != nil {
		return fmt.Errorf("failed to marshal connection: %w", err)
	}

	connKey := fmt.Sprintf("connection:%s", connection.ID)
	return cm.redis.Set(cm.ctx, connKey, connData, cm.connectionTTL).Err()
}

func (cm *ConnectionManager) startPubSubListener() {
	// Subscribe to session channels and connection-specific channels
	patterns := []string{
		"chat:session:*",
		"chat:connection:*",
	}

	cm.pubsub = cm.redis.PSubscribe(cm.ctx, patterns...)
	defer cm.pubsub.Close()

	ch := cm.pubsub.Channel()
	for {
		select {
		case msg := <-ch:
			cm.handleRedisMessage(msg)
		case <-cm.ctx.Done():
			return
		}
	}
}

func (cm *ConnectionManager) handleRedisMessage(msg *redis.Message) {
	var message Message
	if err := json.Unmarshal([]byte(msg.Payload), &message); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal Redis message")
		return
	}

	// Determine if this is for a session or specific connection
	if len(msg.Channel) > len("chat:session:") && msg.Channel[:len("chat:session:")] == "chat:session:" {
		sessionID := msg.Channel[len("chat:session:"):]
		cm.deliverToLocalConnections(sessionID, []byte(msg.Payload))
		
		// Also deliver to agent-global connections that should receive session updates
		cm.deliverToAgentGlobalConnections(sessionID, []byte(msg.Payload))
	} else if len(msg.Channel) > len("chat:connection:") && msg.Channel[:len("chat:connection:")] == "chat:connection:" {
		connID := msg.Channel[len("chat:connection:"):]
		cm.deliverToLocalConnection(connID, &message)
	}
}

func (cm *ConnectionManager) deliverToLocalConnections(sessionID string, msgBytes []byte) {
	var message Message
	if err := json.Unmarshal(msgBytes, &message); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal message for local delivery")
		return
	}

	cm.connMutex.RLock()
	defer cm.connMutex.RUnlock()

	for _, connection := range cm.localConns {
		if connection.SessionID == sessionID {
			if err := cm.sendToWebSocketByConnection(connection, &message); err != nil {
				log.Error().Err(err).Str("connection_id", connection.ID).Msg("Failed to send message to WebSocket")
				// Remove failed connection
				go cm.RemoveConnection(connection.ID)
			}
		}
	}
}

func (cm *ConnectionManager) deliverToAgentGlobalConnections(sessionID string, msgBytes []byte) {
	var message Message
	if err := json.Unmarshal(msgBytes, &message); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal message for agent global delivery")
		return
	}

	cm.connMutex.RLock()
	defer cm.connMutex.RUnlock()

	// Deliver to agent-global connections (sessions starting with "agent-global-")
	for _, connection := range cm.localConns {
		if connection.Type == ConnectionTypeAgent && 
		   len(connection.SessionID) > len("agent-global-") &&
		   connection.SessionID[:len("agent-global-")] == "agent-global-" {
			// This is an agent-global connection, send session updates to it
			if err := cm.sendToWebSocketByConnection(connection, &message); err != nil {
				log.Error().Err(err).Str("connection_id", connection.ID).Msg("Failed to send message to agent global WebSocket")
				// Remove failed connection
				go cm.RemoveConnection(connection.ID)
			}
		}
	}
}

func (cm *ConnectionManager) deliverToLocalConnection(connID string, message *Message) {
	cm.connMutex.RLock()
	connection, exists := cm.localConns[connID]
	cm.connMutex.RUnlock()

	if !exists {
		return
	}

	if err := cm.sendToWebSocketByConnection(connection, message); err != nil {
		log.Error().Err(err).Str("connection_id", connID).Msg("Failed to send message to WebSocket")
		go cm.RemoveConnection(connID)
	}
}

func (cm *ConnectionManager) sendToWebSocketByConnection(connection *Connection, message *Message) error {
	if connection == nil || connection.Conn == nil {
		return fmt.Errorf("connection is nil")
	}

	// Use connection-specific write mutex to prevent concurrent writes
	connection.writeMutex.Lock()
	defer connection.writeMutex.Unlock()

	return connection.Conn.WriteJSON(message)
}

func (cm *ConnectionManager) startHeartbeatMonitor() {
	ticker := time.NewTicker(cm.heartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			cm.performHeartbeat()
		case <-cm.ctx.Done():
			return
		}
	}
}

func (cm *ConnectionManager) performHeartbeat() {
	cm.connMutex.Lock()
	defer cm.connMutex.Unlock()

	now := time.Now()
	var staleConnections []string

	for connID, connection := range cm.localConns {
		// Check if connection is stale
		if now.Sub(connection.LastPingAt) > cm.connectionTTL {
			staleConnections = append(staleConnections, connID)
			continue
		}

		// Send ping with write synchronization
		if connection.Conn != nil {
			connection.writeMutex.Lock()
			err := connection.Conn.WriteMessage(websocket.PingMessage, nil)
			connection.writeMutex.Unlock()

			if err != nil {
				staleConnections = append(staleConnections, connID)
				continue
			}
		}

		// Update last ping time in Redis
		connection.LastPingAt = now
		cm.storeConnectionInRedis(connection)
	}

	// Remove stale connections
	for _, connID := range staleConnections {
		log.Info().Str("connection_id", connID).Msg("Removing stale connection")
		go cm.RemoveConnection(connID)
	}
}

// UpdateConnectionPing updates the last ping time for a connection
func (cm *ConnectionManager) UpdateConnectionPing(connID string) {
	cm.connMutex.Lock()
	defer cm.connMutex.Unlock()

	if connection, exists := cm.localConns[connID]; exists {
		connection.LastPingAt = time.Now()
		go cm.storeConnectionInRedis(connection)
	}
}
