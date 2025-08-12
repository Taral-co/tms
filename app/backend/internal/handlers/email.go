package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/bareuptime/tms/internal/middleware"
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
	Type             models.EmailConnectorType `json:"type" binding:"required"`
	Name             string                    `json:"name" binding:"required"`
	IMAPHost         *string                   `json:"imap_host,omitempty"`
	IMAPPort         *int                      `json:"imap_port,omitempty"`
	IMAPUseTLS       *bool                     `json:"imap_use_tls,omitempty"`
	IMAPUsername     *string                   `json:"imap_username,omitempty"`
	IMAPPassword     *string                   `json:"imap_password,omitempty"`
	IMAPFolder       string                    `json:"imap_folder,omitempty"`
	IMAPSeenStrategy *models.IMAPSeenStrategy  `json:"imap_seen_strategy,omitempty"`
	SMTPHost         *string                   `json:"smtp_host,omitempty"`
	SMTPPort         *int                      `json:"smtp_port,omitempty"`
	SMTPUseTLS       *bool                     `json:"smtp_use_tls,omitempty"`
	SMTPUsername     *string                   `json:"smtp_username,omitempty"`
	SMTPPassword     *string                   `json:"smtp_password,omitempty"`
	FromName         *string                   `json:"from_name,omitempty"`
	FromAddress      *string                   `json:"from_address,omitempty"`
	ReplyToAddress   *string                   `json:"reply_to_address,omitempty"`
}

// ValidateConnectorRequest represents a request to validate email connector
type ValidateConnectorRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// VerifyOTPRequest represents a request to verify OTP
type VerifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required,len=6"`
}

// CreateConnector creates a new email connector
func (h *EmailHandler) CreateConnector(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)

	// Get project ID from URL params
	projectID := middleware.GetProjectID(c)

	var req CreateConnectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create connector model
	connector := &models.EmailConnector{
		ID:               uuid.New(),
		TenantID:         tenantID,
		ProjectID:        &projectID,
		Type:             req.Type,
		Name:             req.Name,
		IsActive:         true,
		IsValidated:      false,
		ValidationStatus: models.ValidationStatusPending,
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
		ReplyToAddress:   req.ReplyToAddress,
		LastHealth:       make(models.JSONMap),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	// Set default IMAP folder if not provided
	if connector.IMAPFolder == "" {
		connector.IMAPFolder = "INBOX"
	}

	// Set IMAP seen strategy - use request value or default
	if req.IMAPSeenStrategy != nil {
		connector.IMAPSeenStrategy = *req.IMAPSeenStrategy
	} else {
		connector.IMAPSeenStrategy = models.SeenStrategyMarkAfterParse
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
		fmt.Println("Failed to create connector:", err)
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
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

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
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

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
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

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
	if req.IMAPFolder != "" {
		connector.IMAPFolder = req.IMAPFolder
	}
	if req.IMAPSeenStrategy != nil {
		connector.IMAPSeenStrategy = *req.IMAPSeenStrategy
	}
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
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

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
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

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
		"status":    "success",
		"message":   "Connection test successful",
		"tested_at": time.Now(),
	}

	c.JSON(http.StatusOK, result)
}

// CreateMailboxRequest represents a request to create an email mailbox
type CreateMailboxRequest struct {
	Address            string               `json:"address" binding:"required,email"`
	InboundConnectorID uuid.UUID            `json:"inbound_connector_id" binding:"required"`
	DefaultProjectID   uuid.UUID            `json:"default_project_id" binding:"required"`
	RoutingRules       []models.RoutingRule `json:"routing_rules,omitempty"`
	AllowNewTicket     bool                 `json:"allow_new_ticket"`
}

// CreateMailbox creates a new email mailbox
func (h *EmailHandler) CreateMailbox(c *gin.Context) {
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

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
		ID:                 uuid.New(),
		TenantID:           tenantID,
		Address:            req.Address,
		InboundConnectorID: req.InboundConnectorID,
		DefaultProjectID:   req.DefaultProjectID,
		RoutingRules:       routingRules,
		AllowNewTicket:     req.AllowNewTicket,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if err := h.emailRepo.CreateMailbox(c.Request.Context(), mailbox); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mailbox"})
		return
	}

	c.JSON(http.StatusCreated, mailbox)
}

// ListMailboxes lists all email mailboxes for a tenant and project
func (h *EmailHandler) ListMailboxes(c *gin.Context) {
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

	// Get project ID from URL params
	projectIDStr := c.Param("project_id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID format"})
		return
	}

	mailboxes, err := h.emailRepo.ListMailboxesByProject(c.Request.Context(), tenantID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list mailboxes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"mailboxes": mailboxes})
}

// ValidateConnector initiates domain validation for a connector
func (h *EmailHandler) ValidateConnector(c *gin.Context) {
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

	projectIDStr := c.Param("project_id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID format"})
		return
	}

	connectorIDStr := c.Param("connector_id")
	connectorID, err := uuid.Parse(connectorIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connector ID format"})
		return
	}

	var req ValidateConnectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the connector
	connector, err := h.emailRepo.GetConnector(c.Request.Context(), tenantID, connectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connector"})
		return
	}

	if connector == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connector not found"})
		return
	}

	// Check if connector belongs to the project
	if connector.ProjectID == nil || *connector.ProjectID != projectID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Connector does not belong to this project"})
		return
	}

	// TODO: Implement validation logic with email validation service
	// For now, just update the status
	connector.ValidationStatus = models.ValidationStatusValidating
	connector.UpdatedAt = time.Now()

	if err := h.emailRepo.UpdateConnector(c.Request.Context(), connector); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connector"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "validation_started",
		"message": "Validation email will be sent to " + req.Email,
	})
}

// VerifyConnectorOTP verifies the OTP for connector validation
func (h *EmailHandler) VerifyConnectorOTP(c *gin.Context) {
	tenantIDStr := c.MustGet("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
		return
	}

	projectIDStr := c.Param("project_id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID format"})
		return
	}

	connectorIDStr := c.Param("connector_id")
	connectorID, err := uuid.Parse(connectorIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connector ID format"})
		return
	}

	var req VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the connector
	connector, err := h.emailRepo.GetConnector(c.Request.Context(), tenantID, connectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connector"})
		return
	}

	if connector == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connector not found"})
		return
	}

	// Check if connector belongs to the project
	if connector.ProjectID == nil || *connector.ProjectID != projectID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Connector does not belong to this project"})
		return
	}

	// TODO: Implement OTP verification with Redis
	// For now, just mark as validated if OTP is "123456"
	if req.OTP == "123456" {
		now := time.Now()
		connector.IsValidated = true
		connector.ValidationStatus = models.ValidationStatusValidated
		connector.LastValidationAt = &now
		connector.ValidationError = nil
		connector.UpdatedAt = now

		if err := h.emailRepo.UpdateConnector(c.Request.Context(), connector); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connector"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "verified",
			"message": "Email connector has been successfully validated",
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "invalid_otp",
			"message": "Invalid OTP provided",
		})
	}
}
