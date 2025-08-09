package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/rs/zerolog"
)

// SMTPClient handles SMTP email sending
type SMTPClient struct {
	logger zerolog.Logger
}

// NewSMTPClient creates a new SMTP client
func NewSMTPClient(logger zerolog.Logger) *SMTPClient {
	return &SMTPClient{
		logger: logger,
	}
}

// SendMessage sends an email via SMTP
func (c *SMTPClient) SendMessage(ctx context.Context, connector *models.EmailConnector, msg *Message) error {
	if connector.SMTPHost == nil || connector.SMTPPort == nil {
		return fmt.Errorf("SMTP configuration incomplete")
	}

	// Build email message
	emailBody, err := c.buildMessage(msg)
	if err != nil {
		return fmt.Errorf("failed to build email message: %w", err)
	}

	// Create auth if credentials provided
	var auth smtp.Auth
	if connector.SMTPUsername != nil && connector.SMTPPasswordEnc != nil {
		// TODO: Decrypt password using KMS/Vault
		password := string(connector.SMTPPasswordEnc) // This should be decrypted
		auth = smtp.PlainAuth("", *connector.SMTPUsername, password, *connector.SMTPHost)
	}

	addr := fmt.Sprintf("%s:%d", *connector.SMTPHost, *connector.SMTPPort)

	// Send email
	start := time.Now()
	err = smtp.SendMail(addr, auth, msg.From, msg.To, emailBody)
	duration := time.Since(start)

	c.logger.Info().
		Str("smtp_host", *connector.SMTPHost).
		Int("smtp_port", *connector.SMTPPort).
		Str("from", msg.From).
		Strs("to", msg.To).
		Str("subject", msg.Subject).
		Dur("duration", duration).
		Err(err).
		Msg("SMTP send attempt")

	return err
}

// buildMessage builds the raw email message
func (c *SMTPClient) buildMessage(msg *Message) ([]byte, error) {
	var body strings.Builder

	// Headers
	body.WriteString(fmt.Sprintf("From: %s\r\n", msg.From))
	body.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(msg.To, ", ")))
	if len(msg.CC) > 0 {
		body.WriteString(fmt.Sprintf("Cc: %s\r\n", strings.Join(msg.CC, ", ")))
	}
	body.WriteString(fmt.Sprintf("Subject: %s\r\n", msg.Subject))
	
	if msg.MessageID != "" {
		body.WriteString(fmt.Sprintf("Message-ID: %s\r\n", msg.MessageID))
	}
	if msg.InReplyTo != "" {
		body.WriteString(fmt.Sprintf("In-Reply-To: %s\r\n", msg.InReplyTo))
	}
	if msg.References != "" {
		body.WriteString(fmt.Sprintf("References: %s\r\n", msg.References))
	}

	// Custom headers
	for key, value := range msg.Headers {
		body.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
	}

	body.WriteString("MIME-Version: 1.0\r\n")

	// Simple text/html multipart
	if msg.HTMLBody != "" && msg.TextBody != "" {
		boundary := "boundary-" + generateBoundary()
		body.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=%s\r\n", boundary))
		body.WriteString("\r\n")

		// Text part
		body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		body.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		body.WriteString("\r\n")
		body.WriteString(msg.TextBody)
		body.WriteString("\r\n")

		// HTML part
		body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		body.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		body.WriteString("\r\n")
		body.WriteString(msg.HTMLBody)
		body.WriteString("\r\n")

		body.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	} else if msg.HTMLBody != "" {
		body.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		body.WriteString("\r\n")
		body.WriteString(msg.HTMLBody)
	} else {
		body.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		body.WriteString("\r\n")
		body.WriteString(msg.TextBody)
	}

	return []byte(body.String()), nil
}

func generateBoundary() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// TestConnection tests SMTP connection
func (c *SMTPClient) TestConnection(ctx context.Context, connector *models.EmailConnector) error {
	if connector.SMTPHost == nil || connector.SMTPPort == nil {
		return fmt.Errorf("SMTP configuration incomplete")
	}

	addr := fmt.Sprintf("%s:%d", *connector.SMTPHost, *connector.SMTPPort)

	// Try to establish connection
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	// Try STARTTLS if configured
	if connector.SMTPUseTLS != nil && *connector.SMTPUseTLS {
		tlsConfig := &tls.Config{ServerName: *connector.SMTPHost}
		if err = client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("failed to start TLS: %w", err)
		}
	}

	// Try authentication if configured
	if connector.SMTPUsername != nil && connector.SMTPPasswordEnc != nil {
		// TODO: Decrypt password using KMS/Vault
		password := string(connector.SMTPPasswordEnc) // This should be decrypted
		auth := smtp.PlainAuth("", *connector.SMTPUsername, password, *connector.SMTPHost)
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}
	}

	c.logger.Info().
		Str("smtp_host", *connector.SMTPHost).
		Int("smtp_port", *connector.SMTPPort).
		Msg("SMTP connection test successful")

	return nil
}
