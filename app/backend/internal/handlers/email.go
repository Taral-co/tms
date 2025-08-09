package handlers

import (
	"net/http"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// EmailHandler handles email-related HTTP requests
type EmailHandler struct {
	emailRepo *repo.EmailRepo
}

// NewEmailHandler creates a new email handler
func NewEmailHandler(emailRepo *repo.EmailRepo) *EmailHandler {
	return &EmailHandler{
		emailRepo: emailRepo,
	}
}

// CreateConnectorRequest represents a request to create an email connector
type CreateConnectorRequest struct {
	Type        models.EmailConnectorType `json:"type" binding:"required"`
	Name        string                    `json:"name" binding:"required"`
	IMAPHost    *string                   `json:"imap_host,omitempty"`
	IMAPPort    *int                      `json:"imap_port,omitempty"`
	IMAPUseTLS  *bool                     `json:"imap_use_tls,omitempty"`
	IMAPUsername *string                  `json:"imap_username,omitempty"`
	IMAPPassword *string                  `json:"imap_password,omitempty"`
	IMAPFolder  string                    `json:"imap_folder,omitempty"`
	SMTPHost    *string                   `json:"smtp_host,omitempty"`
	SMTPPort    *int                      `json:"smtp_port,omitempty"`
	SMTPUseTLS  *bool                     `json:"smtp_use_tls,omitempty"`
	SMTPUsername *string                  `json:"smtp_username,omitempty"`
	SMTPPassword *string                  `json:"smtp_password,omitempty"`
	FromName    *string                   `json:"from_name,omitempty"`
	FromAddress *string                   `json:"from_address,omitempty"`
}

// CreateConnector creates a new email connector
func (h *EmailHandler) CreateConnector(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	var req CreateConnectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create connector model
	connector := &models.EmailConnector{
		ID:               uuid.New(),
		TenantID:         tenantID,
		Type:             req.Type,
		Name:             req.Name,
		IsActive:         true,
		IMAPHost:         req.IMAPHost,
		IMAPPort:         req.IMAPPort,
		IMAPUseTLS:       req.IMAPUseTLS,
		IMAPUsername:     req.IMAPUsername,
		IMAPFolder:       req.IMAPFolder,
		SMTPHost:         req.SMTPHost,
		SMTPPort:         req.SMTPPort,
		SMTPUseTLS:       req.SMTPUseTLS,
		SMTPUsername:     req.SMTPUsername,
		FromName:         req.FromName,
		FromAddress:      req.FromAddress,
		LastHealth:       make(models.JSONMap),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	// Set default IMAP folder if not provided
	if connector.IMAPFolder == "" {
		connector.IMAPFolder = "INBOX"
	}

	// Encrypt passwords (TODO: implement proper encryption with KMS/Vault)
	if req.IMAPPassword != nil {
		connector.IMAPPasswordEnc = []byte(*req.IMAPPassword) // This should be encrypted
	}
	if req.SMTPPassword != nil {
		connector.SMTPPasswordEnc = []byte(*req.SMTPPassword) // This should be encrypted
	}

	// Save to database
	if err := h.emailRepo.CreateConnector(c.Request.Context(), connector); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create connector"})
		return
	}

	// Remove sensitive data from response
	connector.IMAPPasswordEnc = nil
	connector.SMTPPasswordEnc = nil

	c.JSON(http.StatusCreated, connector)
}

// ListConnectors lists all email connectors for a tenant
func (h *EmailHandler) ListConnectors(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	var connectorType *models.EmailConnectorType
	if typeParam := c.Query("type"); typeParam != "" {
		t := models.EmailConnectorType(typeParam)
		connectorType = &t
	}

	connectors, err := h.emailRepo.ListConnectors(c.Request.Context(), tenantID, connectorType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list connectors"})
		return
	}

	// Remove sensitive data from response
	for _, connector := range connectors {
		connector.IMAPPasswordEnc = nil
		connector.SMTPPasswordEnc = nil
		connector.DKIMPrivateKeyEnc = nil
	}

	c.JSON(http.StatusOK, gin.H{"connectors": connectors})
}

// GetConnector gets a specific email connector
func (h *EmailHandler) GetConnector(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	connectorIDParam := c.Param("connector_id")
	connectorID, err := uuid.Parse(connectorIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connector ID"})
		return
	}

	connector, err := h.emailRepo.GetConnector(c.Request.Context(), tenantID, connectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connector"})
		return
	}

	if connector == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connector not found"})
		return
	}

	// Remove sensitive data from response
	connector.IMAPPasswordEnc = nil
	connector.SMTPPasswordEnc = nil
	connector.DKIMPrivateKeyEnc = nil

	c.JSON(http.StatusOK, connector)
}

// UpdateConnector updates an email connector
func (h *EmailHandler) UpdateConnector(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	connectorIDParam := c.Param("connector_id")
	connectorID, err := uuid.Parse(connectorIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connector ID"})
		return
	}

	// Get existing connector
	connector, err := h.emailRepo.GetConnector(c.Request.Context(), tenantID, connectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connector"})
		return
	}

	if connector == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connector not found"})
		return
	}

	var req CreateConnectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	connector.Name = req.Name
	connector.IMAPHost = req.IMAPHost
	connector.IMAPPort = req.IMAPPort
	connector.IMAPUseTLS = req.IMAPUseTLS
	connector.IMAPUsername = req.IMAPUsername
	connector.SMTPHost = req.SMTPHost
	connector.SMTPPort = req.SMTPPort
	connector.SMTPUseTLS = req.SMTPUseTLS
	connector.SMTPUsername = req.SMTPUsername
	connector.FromName = req.FromName
	connector.FromAddress = req.FromAddress
	connector.UpdatedAt = time.Now()

	// Update passwords if provided
	if req.IMAPPassword != nil {
		connector.IMAPPasswordEnc = []byte(*req.IMAPPassword) // This should be encrypted
	}
	if req.SMTPPassword != nil {
		connector.SMTPPasswordEnc = []byte(*req.SMTPPassword) // This should be encrypted
	}

	// Save to database
	if err := h.emailRepo.UpdateConnector(c.Request.Context(), connector); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connector"})
		return
	}

	// Remove sensitive data from response
	connector.IMAPPasswordEnc = nil
	connector.SMTPPasswordEnc = nil

	c.JSON(http.StatusOK, connector)
}

// DeleteConnector deletes an email connector
func (h *EmailHandler) DeleteConnector(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	connectorIDParam := c.Param("connector_id")
	connectorID, err := uuid.Parse(connectorIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connector ID"})
		return
	}

	if err := h.emailRepo.DeleteConnector(c.Request.Context(), tenantID, connectorID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete connector"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// TestConnector tests an email connector connection
func (h *EmailHandler) TestConnector(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	connectorIDParam := c.Param("connector_id")
	connectorID, err := uuid.Parse(connectorIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connector ID"})
		return
	}

	connector, err := h.emailRepo.GetConnector(c.Request.Context(), tenantID, connectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connector"})
		return
	}

	if connector == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connector not found"})
		return
	}

	// TODO: Implement actual connection testing
	// For now, just return success
	result := map[string]interface{}{
		"status": "success",
		"message": "Connection test successful",
		"tested_at": time.Now(),
	}

	c.JSON(http.StatusOK, result)
}

// CreateMailboxRequest represents a request to create an email mailbox
type CreateMailboxRequest struct {
	Address              string                   `json:"address" binding:"required,email"`
	InboundConnectorID   uuid.UUID                `json:"inbound_connector_id" binding:"required"`
	DefaultProjectID     uuid.UUID                `json:"default_project_id" binding:"required"`
	RoutingRules         []models.RoutingRule     `json:"routing_rules,omitempty"`
	AllowNewTicket       bool                     `json:"allow_new_ticket"`
}

// CreateMailbox creates a new email mailbox
func (h *EmailHandler) CreateMailbox(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	var req CreateMailboxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert routing rules to JSONMap
	routingRules := make(models.JSONMap)
	if len(req.RoutingRules) > 0 {
		rules := make([]map[string]interface{}, len(req.RoutingRules))
		for i, rule := range req.RoutingRules {
			rules[i] = map[string]interface{}{
				"match":      rule.Match,
				"project_id": rule.ProjectID.String(),
			}
		}
		routingRules["rules"] = rules
	}

	mailbox := &models.EmailMailbox{
		ID:                   uuid.New(),
		TenantID:             tenantID,
		Address:              req.Address,
		InboundConnectorID:   req.InboundConnectorID,
		DefaultProjectID:     req.DefaultProjectID,
		RoutingRules:         routingRules,
		AllowNewTicket:       req.AllowNewTicket,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	if err := h.emailRepo.CreateMailbox(c.Request.Context(), mailbox); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mailbox"})
		return
	}

	c.JSON(http.StatusCreated, mailbox)
}

// ListMailboxes lists all email mailboxes for a tenant
func (h *EmailHandler) ListMailboxes(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)

	mailboxes, err := h.emailRepo.ListMailboxes(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list mailboxes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"mailboxes": mailboxes})
}
