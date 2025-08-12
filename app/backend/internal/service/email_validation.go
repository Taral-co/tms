package service

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/redis"
	"github.com/google/uuid"
)

// EmailValidationService handles email domain validation
type EmailValidationService struct {
	redisService *redis.Service
	mailService  MailService // Interface for sending emails
}

// MailService interface for sending validation emails
type MailService interface {
	SendValidationEmail(ctx context.Context, to, otp, domain string) error
}

// NewEmailValidationService creates a new email validation service
func NewEmailValidationService(redisService *redis.Service, mailService MailService) *EmailValidationService {
	return &EmailValidationService{
		redisService: redisService,
		mailService:  mailService,
	}
}

// ValidateDomainOwnership validates email domain ownership using OTP
func (s *EmailValidationService) ValidateDomainOwnership(ctx context.Context, tenantID, projectID uuid.UUID, fromAddress, replyToAddress string) (*models.EmailDomainValidation, error) {
	// Extract domains from addresses
	fromDomain, err := extractDomain(fromAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid from address: %w", err)
	}

	replyToDomain, err := extractDomain(replyToAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid reply-to address: %w", err)
	}

	// Validate that both addresses use the same domain
	if fromDomain != replyToDomain {
		return nil, fmt.Errorf("from address and reply-to address must use the same domain")
	}

	// Check rate limiting
	attemptKey := redis.ValidationAttemptsKey(tenantID.String(), projectID.String(), replyToAddress)
	attempts, err := s.redisService.GetAttempts(ctx, attemptKey)
	if err != nil {
		return nil, fmt.Errorf("failed to check validation attempts: %w", err)
	}

	if attempts >= 3 {
		return nil, fmt.Errorf("too many validation attempts, please try again later")
	}

	// Generate OTP and store it
	otpKey := redis.EmailOTPKey(tenantID.String(), projectID.String(), replyToAddress)
	otp, err := s.redisService.GenerateAndStoreOTP(ctx, otpKey, 10*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("failed to generate OTP: %w", err)
	}

	// Send validation email
	err = s.mailService.SendValidationEmail(ctx, replyToAddress, otp, fromDomain)
	if err != nil {
		// Clean up OTP if email sending fails
		s.redisService.DeleteOTP(ctx, otpKey)
		return nil, fmt.Errorf("failed to send validation email: %w", err)
	}

	// Create domain validation record
	validation := &models.EmailDomainValidation{
		ID:               uuid.New(),
		TenantID:         tenantID,
		ProjectID:        projectID,
		Domain:           fromDomain,
		ValidationToken:  otp,
		ValidationMethod: models.ValidationMethodEmailOTP,
		Status:           models.DomainValidationStatusPending,
		ExpiresAt:        time.Now().Add(10 * time.Minute),
		Metadata: models.JSONMap{
			"from_address":     fromAddress,
			"reply_to_address": replyToAddress,
			"validation_email": replyToAddress,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return validation, nil
}

// VerifyDomainOTP verifies the OTP for domain validation
func (s *EmailValidationService) VerifyDomainOTP(ctx context.Context, tenantID, projectID uuid.UUID, email, providedOTP string) (bool, error) {
	otpKey := redis.EmailOTPKey(tenantID.String(), projectID.String(), email)

	// Verify OTP
	isValid, err := s.redisService.VerifyOTP(ctx, otpKey, providedOTP)
	if err != nil {
		return false, fmt.Errorf("failed to verify OTP: %w", err)
	}

	if !isValid {
		// Increment failed attempts
		attemptKey := redis.ValidationAttemptsKey(tenantID.String(), projectID.String(), email)
		s.redisService.IncrementAttempts(ctx, attemptKey, 1*time.Hour)
		return false, nil
	}

	return true, nil
}

// ValidateEmailConfiguration validates email connector configuration
func (s *EmailValidationService) ValidateEmailConfiguration(ctx context.Context, connector *models.EmailConnector) error {
	// Basic validation
	if connector.FromAddress == nil || *connector.FromAddress == "" {
		return fmt.Errorf("from address is required")
	}

	if connector.ReplyToAddress == nil || *connector.ReplyToAddress == "" {
		return fmt.Errorf("reply-to address is required")
	}

	// Validate email format
	if !isValidEmail(*connector.FromAddress) {
		return fmt.Errorf("invalid from address format")
	}

	if !isValidEmail(*connector.ReplyToAddress) {
		return fmt.Errorf("invalid reply-to address format")
	}

	// Extract and validate domains
	fromDomain, err := extractDomain(*connector.FromAddress)
	if err != nil {
		return fmt.Errorf("invalid from address domain: %w", err)
	}

	replyToDomain, err := extractDomain(*connector.ReplyToAddress)
	if err != nil {
		return fmt.Errorf("invalid reply-to address domain: %w", err)
	}

	// Both addresses must use the same domain
	if fromDomain != replyToDomain {
		return fmt.Errorf("from address and reply-to address must use the same domain")
	}

	// Validate domain exists (basic DNS check)
	if err := validateDomainExists(fromDomain); err != nil {
		return fmt.Errorf("domain validation failed: %w", err)
	}

	// Validate SMTP/IMAP configuration based on connector type
	switch connector.Type {
	case models.ConnectorTypeInboundIMAP:
		if err := s.validateIMAPConfig(connector); err != nil {
			return fmt.Errorf("IMAP configuration validation failed: %w", err)
		}
	case models.ConnectorTypeOutboundSMTP:
		if err := s.validateSMTPConfig(connector); err != nil {
			return fmt.Errorf("SMTP configuration validation failed: %w", err)
		}
	}

	return nil
}

// validateIMAPConfig validates IMAP configuration
func (s *EmailValidationService) validateIMAPConfig(connector *models.EmailConnector) error {
	if connector.IMAPHost == nil || *connector.IMAPHost == "" {
		return fmt.Errorf("IMAP host is required")
	}

	if connector.IMAPPort == nil || *connector.IMAPPort <= 0 {
		return fmt.Errorf("valid IMAP port is required")
	}

	if connector.IMAPUsername == nil || *connector.IMAPUsername == "" {
		return fmt.Errorf("IMAP username is required")
	}

	// Validate common IMAP ports
	validPorts := []int{143, 993, 110, 995}
	isValidPort := false
	for _, port := range validPorts {
		if *connector.IMAPPort == port {
			isValidPort = true
			break
		}
	}

	if !isValidPort {
		return fmt.Errorf("IMAP port %d is not a standard IMAP port (143, 993, 110, 995)", *connector.IMAPPort)
	}

	return nil
}

// validateSMTPConfig validates SMTP configuration
func (s *EmailValidationService) validateSMTPConfig(connector *models.EmailConnector) error {
	if connector.SMTPHost == nil || *connector.SMTPHost == "" {
		return fmt.Errorf("SMTP host is required")
	}

	if connector.SMTPPort == nil || *connector.SMTPPort <= 0 {
		return fmt.Errorf("valid SMTP port is required")
	}

	if connector.SMTPUsername == nil || *connector.SMTPUsername == "" {
		return fmt.Errorf("SMTP username is required")
	}

	// Validate common SMTP ports
	validPorts := []int{25, 587, 465, 2525}
	isValidPort := false
	for _, port := range validPorts {
		if *connector.SMTPPort == port {
			isValidPort = true
			break
		}
	}

	if !isValidPort {
		return fmt.Errorf("SMTP port %d is not a standard SMTP port (25, 587, 465, 2525)", *connector.SMTPPort)
	}

	return nil
}

// Helper functions

func extractDomain(email string) (string, error) {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid email format")
	}
	return strings.ToLower(parts[1]), nil
}

func isValidEmail(email string) bool {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	local := parts[0]
	domain := parts[1]

	// Basic validation
	return len(local) > 0 && len(domain) > 0 && strings.Contains(domain, ".")
}

func validateDomainExists(domain string) error {
	// Perform MX record lookup
	mxRecords, err := net.LookupMX(domain)
	if err != nil {
		// If MX lookup fails, try A record lookup
		_, err := net.LookupHost(domain)
		if err != nil {
			return fmt.Errorf("domain %s does not exist or is not reachable", domain)
		}
	}

	// If we have MX records, the domain can receive email
	if len(mxRecords) > 0 {
		return nil
	}

	return nil
}
