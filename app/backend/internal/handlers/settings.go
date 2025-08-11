package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SettingsHandler struct {
	settingsRepo *repo.SettingsRepository
}

func NewSettingsHandler(settingsRepo *repo.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{
		settingsRepo: settingsRepo,
	}
}

// EmailSettings represents email configuration
type EmailSettings struct {
	SMTPHost                 string `json:"smtp_host"`
	SMTPPort                 int    `json:"smtp_port"`
	SMTPUsername             string `json:"smtp_username"`
	SMTPPassword             string `json:"smtp_password"`
	SMTPEncryption           string `json:"smtp_encryption"`
	FromEmail                string `json:"from_email"`
	FromName                 string `json:"from_name"`
	EnableEmailNotifications bool   `json:"enable_email_notifications"`
	EnableEmailToTicket      bool   `json:"enable_email_to_ticket"`
}

// BrandingSettings represents branding configuration
type BrandingSettings struct {
	CompanyName          string `json:"company_name"`
	LogoURL              string `json:"logo_url"`
	SupportURL           string `json:"support_url"`
	PrimaryColor         string `json:"primary_color"`
	AccentColor          string `json:"accent_color"`
	SecondaryColor       string `json:"secondary_color"`
	CustomCSS            string `json:"custom_css"`
	FaviconURL           string `json:"favicon_url"`
	HeaderLogoHeight     int    `json:"header_logo_height"`
	EnableCustomBranding bool   `json:"enable_custom_branding"`
}

// AutomationSettings represents automation configuration
type AutomationSettings struct {
	EnableAutoAssignment     bool   `json:"enable_auto_assignment"`
	AssignmentStrategy       string `json:"assignment_strategy"`
	MaxTicketsPerAgent       int    `json:"max_tickets_per_agent"`
	EnableEscalation         bool   `json:"enable_escalation"`
	EscalationThresholdHours int    `json:"escalation_threshold_hours"`
	EnableAutoReply          bool   `json:"enable_auto_reply"`
	AutoReplyTemplate        string `json:"auto_reply_template"`
}

// GetEmailSettings retrieves email settings for a tenant
func (h *SettingsHandler) GetEmailSettings(c *gin.Context) {
	tenantUUID := middleware.GetTenantID(c)
	projectIDStr, _ := c.Params.Get("project_id")
	projectUUID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	settings, err := h.settingsRepo.GetSetting(context.Background(), tenantUUID, projectUUID, "email_settings")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve email settings"})
		return
	}

	// Convert map to EmailSettings struct
	settingsJSON, _ := json.Marshal(settings)
	var emailSettings EmailSettings
	json.Unmarshal(settingsJSON, &emailSettings)

	c.JSON(http.StatusOK, emailSettings)
}

// UpdateEmailSettings updates email settings for a tenant
func (h *SettingsHandler) UpdateEmailSettings(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectIDStr, _ := c.Params.Get("project_id")
	projectUUID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var emailSettings EmailSettings
	if err := c.ShouldBindJSON(&emailSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Convert struct to map
	settingsJSON, _ := json.Marshal(emailSettings)
	var settingsMap map[string]interface{}
	json.Unmarshal(settingsJSON, &settingsMap)

	err = h.settingsRepo.UpdateSetting(context.Background(), tenantID, projectUUID, "email_settings", settingsMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email settings"})
		return
	}

	c.JSON(http.StatusOK, emailSettings)
}

// GetBrandingSettings retrieves branding settings for a tenant
func (h *SettingsHandler) GetBrandingSettings(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectIDStr, _ := c.Params.Get("project_id")
	projectUUID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	settings, err := h.settingsRepo.GetSetting(context.Background(), tenantID, projectUUID, "branding_settings")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve branding settings"})
		return
	}

	// Convert map to BrandingSettings struct
	settingsJSON, _ := json.Marshal(settings)
	var brandingSettings BrandingSettings
	json.Unmarshal(settingsJSON, &brandingSettings)

	c.JSON(http.StatusOK, brandingSettings)
}

// UpdateBrandingSettings updates branding settings for a tenant
func (h *SettingsHandler) UpdateBrandingSettings(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectIDStr, _ := c.Params.Get("project_id")
	projectUUID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var brandingSettings BrandingSettings
	if err := c.ShouldBindJSON(&brandingSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Convert struct to map
	settingsJSON, _ := json.Marshal(brandingSettings)
	var settingsMap map[string]interface{}
	json.Unmarshal(settingsJSON, &settingsMap)

	err = h.settingsRepo.UpdateSetting(context.Background(), tenantID, projectUUID, "branding_settings", settingsMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update branding settings"})
		return
	}

	c.JSON(http.StatusOK, brandingSettings)
}

// GetAutomationSettings retrieves automation settings for a tenant
func (h *SettingsHandler) GetAutomationSettings(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectIDStr, _ := c.Params.Get("project_id")
	projectUUID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	settings, err := h.settingsRepo.GetSetting(context.Background(), tenantID, projectUUID, "automation_settings")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve automation settings"})
		return
	}

	// Convert map to AutomationSettings struct
	settingsJSON, _ := json.Marshal(settings)
	var automationSettings AutomationSettings
	json.Unmarshal(settingsJSON, &automationSettings)

	c.JSON(http.StatusOK, automationSettings)
}

// UpdateAutomationSettings updates automation settings for a tenant
func (h *SettingsHandler) UpdateAutomationSettings(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectIDStr, _ := c.Params.Get("project_id")
	projectUUID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var automationSettings AutomationSettings
	if err := c.ShouldBindJSON(&automationSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Convert struct to map
	settingsJSON, _ := json.Marshal(automationSettings)
	var settingsMap map[string]interface{}
	json.Unmarshal(settingsJSON, &settingsMap)

	err = h.settingsRepo.UpdateSetting(context.Background(), tenantID, projectUUID, "automation_settings", settingsMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update automation settings"})
		return
	}

	c.JSON(http.StatusOK, automationSettings)
}
