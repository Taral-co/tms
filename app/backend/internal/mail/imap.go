package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"strings"

	"github.com/bareuptime/tms/internal/crypto"
	"github.com/bareuptime/tms/internal/models"
	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message"
	"github.com/rs/zerolog"
)

// IMAPClient handles IMAP email fetching
type IMAPClient struct {
	logger     zerolog.Logger
	encryption *crypto.PasswordEncryption
}

// NewIMAPClient creates a new IMAP client
func NewIMAPClient(logger zerolog.Logger, encryption *crypto.PasswordEncryption) *IMAPClient {
	return &IMAPClient{
		logger:     logger,
		encryption: encryption,
	}
}

// FetchMessages fetches new messages from IMAP server
func (c *IMAPClient) FetchMessages(ctx context.Context, connector *models.EmailConnector, lastUID uint32) ([]*ParsedMessage, error) {
	if connector.IMAPHost == nil || connector.IMAPPort == nil {
		return nil, fmt.Errorf("IMAP configuration incomplete")
	}

	// Connect to IMAP server
	client, err := c.connect(connector)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer client.Close()

	// Login
	if err := c.authenticate(client, connector); err != nil {
		return nil, fmt.Errorf("IMAP authentication failed: %w", err)
	}

	// Select mailbox
	mbox, err := client.Select(connector.IMAPFolder, false)
	if err != nil {
		return nil, fmt.Errorf("failed to select mailbox: %w", err)
	}

	c.logger.Info().
		Str("folder", connector.IMAPFolder).
		Uint32("total_messages", mbox.Messages).
		Uint32("unseen", mbox.Unseen).
		Uint32("last_uid", lastUID).
		Msg("Selected IMAP mailbox")

	// Search for messages newer than lastUID
	var searchCriteria *imap.SearchCriteria
	if lastUID > 0 {
		searchCriteria = &imap.SearchCriteria{
			Uid: &imap.SeqSet{},
		}
		searchCriteria.Uid.AddRange(lastUID+1, 0) // 0 means no upper limit
	} else {
		searchCriteria = &imap.SearchCriteria{
			WithoutFlags: []string{imap.SeenFlag},
		}
	}

	uids, err := client.UidSearch(searchCriteria)
	if err != nil {
		return nil, fmt.Errorf("IMAP search failed: %w", err)
	}

	if len(uids) == 0 {
		c.logger.Debug().Msg("No new messages found")
		return nil, nil
	}

	c.logger.Info().
		Int("message_count", len(uids)).
		Msg("Found new messages")

	// Fetch messages
	seqset := &imap.SeqSet{}
	seqset.AddNum(uids...)

	messages := make(chan *imap.Message, len(uids))
	done := make(chan error, 1)

	go func() {
		done <- client.UidFetch(seqset, []imap.FetchItem{
			imap.FetchEnvelope,
			imap.FetchRFC822Header,
			imap.FetchRFC822Text,
			imap.FetchRFC822,
		}, messages)
	}()

	var parsedMessages []*ParsedMessage
	for msg := range messages {
		parsed, err := c.parseMessage(msg)
		if err != nil {
			c.logger.Error().
				Err(err).
				Uint32("uid", msg.Uid).
				Msg("Failed to parse message")
			continue
		}
		parsedMessages = append(parsedMessages, parsed)
	}

	if err := <-done; err != nil {
		return nil, fmt.Errorf("IMAP fetch failed: %w", err)
	}

	// Mark as seen if configured
	if connector.IMAPSeenStrategy == models.SeenStrategyMarkAfterParse {
		client.UidStore(seqset, imap.FormatFlagsOp(imap.AddFlags, true), []interface{}{imap.SeenFlag}, nil)
	}

	return parsedMessages, nil
}

// TestConnection tests IMAP connection
func (c *IMAPClient) TestConnection(ctx context.Context, connector *models.EmailConnector) error {
	client, err := c.connect(connector)
	if err != nil {
		return fmt.Errorf("failed to connect to IMAP: %w", err)
	}
	defer client.Close()

	if err := c.authenticate(client, connector); err != nil {
		return fmt.Errorf("IMAP authentication failed: %w", err)
	}

	// Try to select the configured folder
	_, err = client.Select(connector.IMAPFolder, true) // readonly
	if err != nil {
		return fmt.Errorf("failed to select mailbox '%s': %w", connector.IMAPFolder, err)
	}

	c.logger.Info().
		Str("imap_host", *connector.IMAPHost).
		Int("imap_port", *connector.IMAPPort).
		Str("folder", connector.IMAPFolder).
		Msg("IMAP connection test successful")

	return nil
}

// connect establishes IMAP connection
func (c *IMAPClient) connect(connector *models.EmailConnector) (*client.Client, error) {
	addr := fmt.Sprintf("%s:%d", *connector.IMAPHost, *connector.IMAPPort)

	var imapClient *client.Client
	var err error

	if connector.IMAPUseTLS != nil && *connector.IMAPUseTLS {
		tlsConfig := &tls.Config{ServerName: *connector.IMAPHost}
		imapClient, err = client.DialTLS(addr, tlsConfig)
	} else {
		imapClient, err = client.Dial(addr)
	}

	return imapClient, err
}

// authenticate performs IMAP authentication
func (c *IMAPClient) authenticate(client *client.Client, connector *models.EmailConnector) error {
	if connector.IMAPUsername == nil || connector.IMAPPasswordEnc == nil {
		return fmt.Errorf("IMAP credentials not configured")
	}

	// Decrypt password
	password, err := c.encryption.Decrypt(connector.IMAPPasswordEnc)
	if err != nil {
		return fmt.Errorf("failed to decrypt IMAP password: %w", err)
	}

	return client.Login(*connector.IMAPUsername, password)
}

// parseMessage parses an IMAP message into our internal format
func (c *IMAPClient) parseMessage(msg *imap.Message) (*ParsedMessage, error) {
	if msg == nil || msg.Envelope == nil {
		return nil, fmt.Errorf("invalid message or envelope")
	}

	parsed := &ParsedMessage{
		MessageID: msg.Envelope.MessageId,
		From:      formatAddress(msg.Envelope.From),
		To:        formatAddresses(msg.Envelope.To),
		CC:        formatAddresses(msg.Envelope.Cc),
		Subject:   msg.Envelope.Subject,
		Date:      msg.Envelope.Date,
		Headers:   make(map[string][]string),
	}

	// Parse In-Reply-To and References
	if len(msg.Envelope.InReplyTo) > 0 {
		parsed.InReplyTo = string(msg.Envelope.InReplyTo)
	}

	// Get body section
	for _, item := range msg.Items {
		switch item := item.(type) {
		case *imap.BodySectionName:
			if section, ok := msg.Body[item]; ok {
				// Parse the message body
				entity, err := message.Read(section)
				if err != nil {
					c.logger.Error().Err(err).Msg("Failed to read message entity")
					continue
				}

				if err := c.parseMessageEntity(entity, parsed); err != nil {
					c.logger.Error().Err(err).Msg("Failed to parse message entity")
				}
			}
		}
	}

	return parsed, nil
}

// parseMessageEntity parses message entity for text/html content
func (c *IMAPClient) parseMessageEntity(entity *message.Entity, parsed *ParsedMessage) error {
	if mr := entity.MultipartReader(); mr != nil {
		// Handle multipart messages
		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				return err
			}

			if err := c.parseMessageEntity(part, parsed); err != nil {
				c.logger.Error().Err(err).Msg("Failed to parse message part")
			}
		}
		return nil
	}

	// Handle single part
	contentType, _, _ := entity.Header.ContentType()
	body, err := io.ReadAll(entity.Body)
	if err != nil {
		return err
	}

	switch strings.ToLower(contentType) {
	case "text/plain":
		parsed.TextBody = string(body)
	case "text/html":
		parsed.HTMLBody = string(body)
	}

	return nil
}

// formatAddress formats a single address
func formatAddress(addrs []*imap.Address) string {
	if len(addrs) == 0 {
		return ""
	}
	addr := addrs[0]
	if addr.PersonalName != "" {
		return fmt.Sprintf("%s <%s@%s>", addr.PersonalName, addr.MailboxName, addr.HostName)
	}
	return fmt.Sprintf("%s@%s", addr.MailboxName, addr.HostName)
}

// formatAddresses formats multiple addresses
func formatAddresses(addrs []*imap.Address) []string {
	if len(addrs) == 0 {
		return nil
	}

	result := make([]string, len(addrs))
	for i, addr := range addrs {
		if addr.PersonalName != "" {
			result[i] = fmt.Sprintf("%s <%s@%s>", addr.PersonalName, addr.MailboxName, addr.HostName)
		} else {
			result[i] = fmt.Sprintf("%s@%s", addr.MailboxName, addr.HostName)
		}
	}
	return result
}
