package worker

import (
	"context"
	"sync"
	"time"

	"github.com/bareuptime/tms/internal/mail"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// IMAPPollerManager manages IMAP pollers for all active connectors
type IMAPPollerManager struct {
	logger      zerolog.Logger
	emailRepo   *repo.EmailRepo
	mailService *mail.Service
	pollers     map[uuid.UUID]*IMAPPoller
	mu          sync.RWMutex
	ctx         context.Context
	cancel      context.CancelFunc
}

// NewIMAPPollerManager creates a new IMAP poller manager
func NewIMAPPollerManager(logger zerolog.Logger, emailRepo *repo.EmailRepo, mailService *mail.Service) *IMAPPollerManager {
	ctx, cancel := context.WithCancel(context.Background())
	
	return &IMAPPollerManager{
		logger:      logger,
		emailRepo:   emailRepo,
		mailService: mailService,
		pollers:     make(map[uuid.UUID]*IMAPPoller),
		ctx:         ctx,
		cancel:      cancel,
	}
}

// Start starts the IMAP poller manager
func (m *IMAPPollerManager) Start() error {
	m.logger.Info().Msg("Starting IMAP poller manager")

	// Start monitoring for connector changes
	go m.monitorConnectors()

	// Load and start all active IMAP connectors
	return m.loadActiveConnectors()
}

// Stop stops all IMAP pollers
func (m *IMAPPollerManager) Stop() {
	m.logger.Info().Msg("Stopping IMAP poller manager")
	
	m.cancel()
	
	m.mu.Lock()
	defer m.mu.Unlock()
	
	for _, poller := range m.pollers {
		poller.Stop()
	}
	m.pollers = make(map[uuid.UUID]*IMAPPoller)
}

// AddConnector adds a new IMAP connector poller
func (m *IMAPPollerManager) AddConnector(connector *models.EmailConnector) error {
	if connector.Type != models.ConnectorTypeInboundIMAP || !connector.IsActive {
		return nil
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Stop existing poller if any
	if existing, exists := m.pollers[connector.ID]; exists {
		existing.Stop()
	}

	// Create new poller
	poller := NewIMAPPoller(
		m.logger.With().Str("connector_id", connector.ID.String()).Logger(),
		connector,
		m.emailRepo,
		m.mailService,
	)

	m.pollers[connector.ID] = poller
	
	// Start the poller
	go poller.Start(m.ctx)

	m.logger.Info().
		Str("connector_id", connector.ID.String()).
		Str("connector_name", connector.Name).
		Msg("Added IMAP poller")

	return nil
}

// RemoveConnector removes an IMAP connector poller
func (m *IMAPPollerManager) RemoveConnector(connectorID uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if poller, exists := m.pollers[connectorID]; exists {
		poller.Stop()
		delete(m.pollers, connectorID)
		
		m.logger.Info().
			Str("connector_id", connectorID.String()).
			Msg("Removed IMAP poller")
	}
}

// loadActiveConnectors loads all active IMAP connectors and starts pollers
func (m *IMAPPollerManager) loadActiveConnectors() error {
	// TODO: Get all tenants and load their connectors
	// For now, we'll simulate this with a placeholder
	
	m.logger.Info().Msg("Loading active IMAP connectors")
	
	// In a real implementation, you would:
	// 1. Get all tenants
	// 2. For each tenant, get active IMAP connectors
	// 3. Start pollers for each connector
	
	return nil
}

// monitorConnectors monitors for connector configuration changes
func (m *IMAPPollerManager) monitorConnectors() {
	ticker := time.NewTicker(5 * time.Minute) // Check every 5 minutes
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.refreshConnectors()
		}
	}
}

// refreshConnectors refreshes the list of active connectors
func (m *IMAPPollerManager) refreshConnectors() {
	m.logger.Debug().Msg("Refreshing IMAP connectors")
	
	// TODO: Implement connector refresh logic
	// This would check for:
	// - New active connectors
	// - Disabled connectors
	// - Configuration changes
}

// IMAPPoller handles polling for a single IMAP connector
type IMAPPoller struct {
	logger      zerolog.Logger
	connector   *models.EmailConnector
	emailRepo   *repo.EmailRepo
	mailService *mail.Service
	imapClient  *mail.IMAPClient
	lastUID     uint32
	interval    time.Duration
	ctx         context.Context
	cancel      context.CancelFunc
}

// NewIMAPPoller creates a new IMAP poller for a connector
func NewIMAPPoller(logger zerolog.Logger, connector *models.EmailConnector, emailRepo *repo.EmailRepo, mailService *mail.Service) *IMAPPoller {
	ctx, cancel := context.WithCancel(context.Background())
	
	return &IMAPPoller{
		logger:      logger,
		connector:   connector,
		emailRepo:   emailRepo,
		mailService: mailService,
		imapClient:  mail.NewIMAPClient(logger),
		lastUID:     0, // TODO: Load from persistent storage
		interval:    60 * time.Second, // Default polling interval
		ctx:         ctx,
		cancel:      cancel,
	}
}

// Start starts the IMAP poller
func (p *IMAPPoller) Start(parentCtx context.Context) {
	p.logger.Info().
		Str("imap_host", *p.connector.IMAPHost).
		Dur("interval", p.interval).
		Msg("Starting IMAP poller")

	// Test connection first
	if err := p.imapClient.TestConnection(p.ctx, p.connector); err != nil {
		p.logger.Error().Err(err).Msg("IMAP connection test failed")
		return
	}

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	// Initial poll
	p.poll()

	for {
		select {
		case <-parentCtx.Done():
			p.logger.Info().Msg("Parent context cancelled, stopping IMAP poller")
			return
		case <-p.ctx.Done():
			p.logger.Info().Msg("IMAP poller stopped")
			return
		case <-ticker.C:
			p.poll()
		}
	}
}

// Stop stops the IMAP poller
func (p *IMAPPoller) Stop() {
	p.logger.Info().Msg("Stopping IMAP poller")
	p.cancel()
}

// poll performs a single IMAP polling cycle
func (p *IMAPPoller) poll() {
	start := time.Now()
	
	p.logger.Debug().
		Uint32("last_uid", p.lastUID).
		Msg("Starting IMAP poll")

	messages, err := p.imapClient.FetchMessages(p.ctx, p.connector, p.lastUID)
	if err != nil {
		p.logger.Error().Err(err).Msg("Failed to fetch IMAP messages")
		return
	}

	if len(messages) == 0 {
		p.logger.Debug().Msg("No new messages found")
		return
	}

	p.logger.Info().
		Int("message_count", len(messages)).
		Dur("fetch_duration", time.Since(start)).
		Msg("Fetched new messages")

	// Process each message
	for _, msg := range messages {
		if err := p.processMessage(msg); err != nil {
			p.logger.Error().
				Err(err).
				Str("message_id", msg.MessageID).
				Msg("Failed to process message")
		}
	}

	// Update last UID (in a real implementation, this would be persisted)
	// p.lastUID = getMaxUID(messages)
}

// processMessage processes a single inbound email message
func (p *IMAPPoller) processMessage(msg *mail.ParsedMessage) error {
	start := time.Now()
	
	p.logger.Info().
		Str("message_id", msg.MessageID).
		Str("from", msg.From).
		Str("subject", msg.Subject).
		Msg("Processing inbound message")

	// Get mailboxes for this connector
	mailboxes, err := p.emailRepo.ListMailboxes(p.ctx, p.connector.TenantID)
	if err != nil {
		return err
	}

	// Find matching mailbox
	var matchedMailbox *models.EmailMailbox
	for _, mailbox := range mailboxes {
		if mailbox.InboundConnectorID == p.connector.ID {
			// Check if any To/CC address matches this mailbox
			for _, addr := range append(msg.To, msg.CC...) {
				if containsAddress(addr, mailbox.Address) {
					matchedMailbox = mailbox
					break
				}
			}
			if matchedMailbox != nil {
				break
			}
		}
	}

	if matchedMailbox == nil {
		p.logger.Warn().
			Str("message_id", msg.MessageID).
			Strs("to", msg.To).
			Msg("No matching mailbox found for message")
		return nil
	}

	// Process the message
	result, err := p.mailService.ProcessInboundEmail(p.ctx, msg, matchedMailbox)
	if err != nil {
		return err
	}

	// Log the processing result
	logEntry := &models.EmailInboundLog{
		ID:             uuid.New(),
		TenantID:       p.connector.TenantID,
		MailboxAddress: &matchedMailbox.Address,
		MessageID:      &msg.MessageID,
		FromAddress:    &msg.From,
		ToAddresses:    msg.To,
		CCAddresses:    msg.CC,
		Subject:        &msg.Subject,
		ReceivedAt:     &msg.Date,
		ProcessedAt:    &start,
		Status:         models.EmailStatusAccepted,
		CreatedAt:      time.Now(),
	}

	if result.TicketID != uuid.Nil {
		logEntry.TicketID = &result.TicketID
	}
	
	if result.ProjectID != uuid.Nil {
		logEntry.ProjectID = &result.ProjectID
	}

	if result.Action == "reject" || result.Action == "ignore" {
		logEntry.Status = models.EmailStatusRejected
		logEntry.Reason = &result.Reason
	}

	if err := p.emailRepo.LogInboundEmail(p.ctx, logEntry); err != nil {
		p.logger.Error().Err(err).Msg("Failed to log inbound email")
	}

	p.logger.Info().
		Str("message_id", msg.MessageID).
		Str("action", result.Action).
		Dur("duration", time.Since(start)).
		Msg("Processed inbound message")

	return nil
}

// containsAddress checks if an address contains the target address
func containsAddress(fullAddress, targetAddress string) bool {
	// Simple contains check - could be enhanced for proper email parsing
	return fullAddress == targetAddress || 
		   (len(fullAddress) > len(targetAddress) && 
		   	fullAddress[len(fullAddress)-len(targetAddress):] == targetAddress)
}
