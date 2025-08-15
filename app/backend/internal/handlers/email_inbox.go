package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// EmailInboxHandler handles email inbox HTTP requests
type EmailInboxHandler struct {
	emailInboxService *service.EmailInboxService
}

// NewEmailInboxHandler creates a new email inbox handler
func NewEmailInboxHandler(emailInboxService *service.EmailInboxService) *EmailInboxHandler {
	return &EmailInboxHandler{
		emailInboxService: emailInboxService,
	}
}

// ListEmailsRequest represents the request for listing emails
type ListEmailsRequest struct {
	ProjectID      *string `form:"project_id"`
	MailboxAddress *string `form:"mailbox_address"`
	IsRead         *bool   `form:"is_read"`
	IsReply        *bool   `form:"is_reply"`
	HasTicket      *bool   `form:"has_ticket"`
	ThreadID       *string `form:"thread_id"`
	FromAddress    *string `form:"from_address"`
	Subject        *string `form:"subject"`
	StartDate      *string `form:"start_date"`
	EndDate        *string `form:"end_date"`
	Limit          int     `form:"limit,default=50"`
	Offset         int     `form:"offset,default=0"`
	OrderBy        string  `form:"order_by,default=received_at"`
	OrderDir       string  `form:"order_dir,default=DESC"`
}

// ListEmailsResponse represents the response for listing emails
type ListEmailsResponse struct {
	Emails []EmailResponse `json:"emails"`
	Total  int             `json:"total"`
	Limit  int             `json:"limit"`
	Offset int             `json:"offset"`
}

// EmailResponse represents an email in the response
type EmailResponse struct {
	ID                  uuid.UUID         `json:"id"`
	MessageID           string            `json:"message_id"`
	ThreadID            *string           `json:"thread_id,omitempty"`
	MailboxAddress      string            `json:"mailbox_address"`
	FromAddress         string            `json:"from_address"`
	FromName            *string           `json:"from_name,omitempty"`
	ToAddresses         []string          `json:"to_addresses"`
	CcAddresses         []string          `json:"cc_addresses,omitempty"`
	Subject             string            `json:"subject"`
	Snippet             *string           `json:"snippet,omitempty"`
	IsRead              bool              `json:"is_read"`
	IsReply             bool              `json:"is_reply"`
	HasAttachments      bool              `json:"has_attachments"`
	AttachmentCount     int               `json:"attachment_count"`
	SentAt              *time.Time        `json:"sent_at,omitempty"`
	ReceivedAt          time.Time         `json:"received_at"`
	TicketID            *uuid.UUID        `json:"ticket_id,omitempty"`
	IsConvertedToTicket bool              `json:"is_converted_to_ticket"`
	Headers             map[string]string `json:"headers,omitempty"`
	CreatedAt           time.Time         `json:"created_at"`
}

// ConvertToTicketRequest represents request to convert email to ticket
type ConvertToTicketRequest struct {
	ProjectID uuid.UUID `json:"project_id" binding:"required"`
	Type      string    `json:"type" binding:"required,oneof=question incident problem task"`
	Priority  string    `json:"priority" binding:"required,oneof=low normal high urgent"`
}

// ReplyToEmailRequest represents request to reply to an email
type ReplyToEmailRequest struct {
	Body      string `json:"body" binding:"required"`
	IsPrivate bool   `json:"is_private"`
}

// SyncEmailsResponse represents the response for sync operation
type SyncEmailsResponse struct {
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	StartedAt time.Time `json:"started_at"`
}

// ListEmails handles GET /emails
func (h *EmailInboxHandler) ListEmails(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	var req ListEmailsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert request to filter
	filter := h.convertToEmailFilter(req)

	emails, total, err := h.emailInboxService.ListEmails(c.Request.Context(), tenantUUID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list emails"})
		return
	}

	// Convert to response format
	emailResponses := make([]EmailResponse, len(emails))
	for i, email := range emails {
		emailResponses[i] = h.convertToEmailResponse(email)
	}

	response := ListEmailsResponse{
		Emails: emailResponses,
		Total:  total,
		Limit:  req.Limit,
		Offset: req.Offset,
	}

	c.JSON(http.StatusOK, response)
}

// GetEmail handles GET /emails/:id
func (h *EmailInboxHandler) GetEmail(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	emailID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email_id"})
		return
	}

	email, attachments, err := h.emailInboxService.GetEmailWithAttachments(c.Request.Context(), tenantUUID, emailID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "email not found"})
		return
	}

	// Mark email as read
	if !email.IsRead {
		err = h.emailInboxService.MarkEmailAsRead(c.Request.Context(), tenantUUID, emailID)
		if err != nil {
			// Log error but don't fail the request
		}
	}

	response := h.convertToEmailResponse(email)

	// Add attachments to response
	if len(attachments) > 0 {
		// You can extend the response structure to include attachments
	}

	c.JSON(http.StatusOK, response)
}

// MarkAsRead handles PUT /emails/:id/read
func (h *EmailInboxHandler) MarkAsRead(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	emailID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email_id"})
		return
	}

	err = h.emailInboxService.MarkEmailAsRead(c.Request.Context(), tenantUUID, emailID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark email as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "email marked as read"})
}

// ConvertToTicket handles POST /emails/:id/convert-to-ticket
func (h *EmailInboxHandler) ConvertToTicket(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	emailID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email_id"})
		return
	}

	var req ConvertToTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ticket, err := h.emailInboxService.ConvertEmailToTicket(c.Request.Context(), tenantUUID, emailID, req.ProjectID, req.Type, req.Priority)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to convert email to ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "email converted to ticket successfully",
		"ticket_id":     ticket.ID,
		"ticket_number": ticket.Number,
	})
}

// ReplyToEmail handles POST /emails/:id/reply
func (h *EmailInboxHandler) ReplyToEmail(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	emailID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email_id"})
		return
	}

	var req ReplyToEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.emailInboxService.ReplyToEmail(c.Request.Context(), tenantUUID, emailID, req.Body, req.IsPrivate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send reply"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "reply sent successfully"})
}

// SyncEmails handles POST /emails/sync
func (h *EmailInboxHandler) SyncEmails(c *gin.Context) {
	tenantUUID := middleware.GetTenantID(c)
	projectUUID := middleware.GetProjectID(c)

	// Run sync in background
	go func() {
		// Use background context instead of request context to avoid cancellation
		ctx := context.Background()
		err := h.emailInboxService.SyncEmails(ctx, tenantUUID, projectUUID)
		if err != nil {
			// Log error - you might want to use a proper logger here
			fmt.Printf("Email sync error for tenant %s: %v\n", tenantUUID, err)
		}
	}()

	response := SyncEmailsResponse{
		Status:    "started",
		Message:   "Email synchronization started",
		StartedAt: time.Now(),
	}

	c.JSON(http.StatusAccepted, response)
}

// GetSyncStatus handles GET /emails/sync-status
func (h *EmailInboxHandler) GetSyncStatus(c *gin.Context) {
	tenantUUID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	statuses, err := h.emailInboxService.GetSyncStatus(c.Request.Context(), tenantUUID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get sync status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sync_statuses": statuses})
}

// Helper functions

func (h *EmailInboxHandler) convertToEmailFilter(req ListEmailsRequest) repo.EmailFilter {
	filter := repo.EmailFilter{
		Limit:    req.Limit,
		Offset:   req.Offset,
		OrderBy:  req.OrderBy,
		OrderDir: req.OrderDir,
	}

	if req.ProjectID != nil {
		if projectUUID, err := uuid.Parse(*req.ProjectID); err == nil {
			filter.ProjectID = &projectUUID
		}
	}

	if req.MailboxAddress != nil {
		filter.MailboxAddress = req.MailboxAddress
	}

	if req.IsRead != nil {
		filter.IsRead = req.IsRead
	}

	if req.IsReply != nil {
		filter.IsReply = req.IsReply
	}

	if req.HasTicket != nil {
		filter.HasTicket = req.HasTicket
	}

	if req.ThreadID != nil {
		filter.ThreadID = req.ThreadID
	}

	if req.FromAddress != nil {
		filter.FromAddress = req.FromAddress
	}

	if req.Subject != nil {
		filter.Subject = req.Subject
	}

	if req.StartDate != nil {
		if startTime, err := time.Parse(time.RFC3339, *req.StartDate); err == nil {
			filter.StartDate = &startTime
		}
	}

	if req.EndDate != nil {
		if endTime, err := time.Parse(time.RFC3339, *req.EndDate); err == nil {
			filter.EndDate = &endTime
		}
	}

	return filter
}

func (h *EmailInboxHandler) convertToEmailResponse(email *models.EmailInbox) EmailResponse {
	return EmailResponse{
		ID:                  email.ID,
		MessageID:           email.MessageID,
		ThreadID:            email.ThreadID,
		MailboxAddress:      email.MailboxAddress,
		FromAddress:         email.FromAddress,
		FromName:            email.FromName,
		ToAddresses:         []string(email.ToAddresses),
		CcAddresses:         []string(email.CcAddresses),
		Subject:             email.Subject,
		Snippet:             email.Snippet,
		IsRead:              email.IsRead,
		IsReply:             email.IsReply,
		HasAttachments:      email.HasAttachments,
		AttachmentCount:     email.AttachmentCount,
		SentAt:              email.SentAt,
		ReceivedAt:          email.ReceivedAt,
		TicketID:            email.TicketID,
		IsConvertedToTicket: email.IsConvertedToTicket,
		Headers:             email.Headers,
		CreatedAt:           email.CreatedAt,
	}
}
