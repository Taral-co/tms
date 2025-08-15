package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/crypto"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/util"
	"github.com/rs/zerolog"
)

// SMTPClient handles SMTP email sending
type SMTPClient struct {
	logger     zerolog.Logger
	encryption *crypto.PasswordEncryption
}

// NewSMTPClient creates a new SMTP client
func NewSMTPClient(logger zerolog.Logger, encryption *crypto.PasswordEncryption) *SMTPClient {
	return &SMTPClient{
		logger:     logger,
		encryption: encryption,
	}
}

// SendMessage sends an email via SMTP
func (c *SMTPClient) SendMessage(ctx context.Context, connector *models.EmailConnector, msg *Message) error {
	// Build email message
	emailBody, err := c.buildMessage(msg)
	if err != nil {
		return fmt.Errorf("failed to build email message: %w", err)
	}

	addr := fmt.Sprintf("%s:%d", *connector.SMTPHost, *connector.SMTPPort)

	// Send email with proper TLS support
	start := time.Now()
	err = c.sendWithTLS(addr, connector, msg.From, msg.To, emailBody)
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

// sendWithTLS sends email with proper TLS support
func (c *SMTPClient) sendWithTLS(addr string, connector *models.EmailConnector, from string, to []string, message []byte) error {
	// Create connection
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	// Start TLS - Auto-enable for secure ports regardless of connector setting
	needsTLS := false
	if connector.SMTPPort != nil {
		// Auto-enable TLS for common secure SMTP ports
		switch *connector.SMTPPort {
		case 587, 465: // Gmail, Outlook, and other modern SMTP providers always need TLS
			needsTLS = true
		case 25:
			// Port 25 may use STARTTLS for modern providers
			if connector.SMTPHost != nil && (strings.Contains(*connector.SMTPHost, "gmail") || strings.Contains(*connector.SMTPHost, "outlook")) {
				needsTLS = true
			} else if connector.SMTPUseTLS != nil && *connector.SMTPUseTLS {
				needsTLS = true
			}
		default:
			// For other ports, respect the connector setting
			if connector.SMTPUseTLS != nil && *connector.SMTPUseTLS {
				needsTLS = true
			}
		}
	} else if connector.SMTPUseTLS != nil && *connector.SMTPUseTLS {
		needsTLS = true
	}

	if needsTLS {
		tlsConfig := &tls.Config{ServerName: *connector.SMTPHost}
		if err = client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("failed to start TLS: %w", err)
		}
	}

	// Authenticate if credentials provided
	if connector.SMTPUsername != nil && connector.SMTPPasswordEnc != nil {
		// Decrypt password using AES encryption
		password, err := c.encryption.Decrypt(connector.SMTPPasswordEnc)
		if err != nil {
			return fmt.Errorf("failed to decrypt SMTP password: %w", err)
		}
		fmt.Println("Decrypted SMTP password:", password)
		fmt.Println("Using SMTP host:", *connector.SMTPHost)
		fmt.Println("Using SMTP username:", *connector.SMTPUsername)
		auth := smtp.PlainAuth("", *connector.SMTPUsername, password, *connector.SMTPHost)
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}
	}

	// Set sender
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipients - extract bare email addresses for SMTP protocol
	for _, recipient := range to {
		// Extract email address from "Display Name <email@domain.com>" format
		email := util.ExtractEmailAddress(recipient)
		if err = client.Rcpt(email); err != nil {
			return fmt.Errorf("failed to set recipient %s: %w", email, err)
		}
	}

	// Send message data
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = writer.Write(message)
	if err != nil {
		writer.Close()
		return fmt.Errorf("failed to write message: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return fmt.Errorf("failed to close message writer: %w", err)
	}

	return client.Quit()
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

	// Custom headers (but not Content-Type which is handled below)
	for key, value := range msg.Headers {
		if key != "Content-Type" {
			body.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
		}
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
		// Decrypt password using AES encryption
		password, err := c.encryption.Decrypt(connector.SMTPPasswordEnc)
		if err != nil {
			return fmt.Errorf("failed to decrypt SMTP password: %w", err)
		}
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
