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

// FetchMessages fetches new messages from IMAP server for specific mailbox addresses
func (c *IMAPClient) FetchMessages(ctx context.Context, connector *models.EmailConnector, lastUID uint32, includeSeen bool) ([]*ParsedMessage, error) {
	return c.FetchMessagesForMailboxes(ctx, connector, lastUID, includeSeen, nil)
}

// FetchMessagesForMailboxes fetches new messages from IMAP server filtered by mailbox addresses
func (c *IMAPClient) FetchMessagesForMailboxes(ctx context.Context, connector *models.EmailConnector, lastUID uint32, includeSeen bool, mailboxAddresses []string) ([]*ParsedMessage, error) {
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
		// Also apply unseen filter if requested
		if !includeSeen {
			searchCriteria.WithoutFlags = []string{imap.SeenFlag}
		}
	} else {
		searchCriteria = &imap.SearchCriteria{}
		if !includeSeen {
			searchCriteria.WithoutFlags = []string{imap.SeenFlag}
		}
	}

	// Add TO filter for specific mailbox addresses if provided
	var uids []uint32
	
	if len(mailboxAddresses) > 0 {
		// Create OR criteria for multiple To addresses using IMAP search
		// Since go-imap doesn't support complex OR queries well, we'll search for each address separately
		var allUIDs []uint32
		for _, mailboxAddr := range mailboxAddresses {
			addressCriteria := *searchCriteria // Copy the base criteria
			if addressCriteria.Header == nil {
				addressCriteria.Header = make(map[string][]string)
			}
			addressCriteria.Header["To"] = []string{mailboxAddr}
			
			// Search for messages to this specific address
			addressUIDs, searchErr := client.UidSearch(&addressCriteria)
			if searchErr != nil {
				c.logger.Error().
					Err(searchErr).
					Str("mailbox_address", mailboxAddr).
					Msg("Failed to search for mailbox address")
				continue
			}
			allUIDs = append(allUIDs, addressUIDs...)
		}
		
		// Remove duplicates and use the combined UID list
		if len(allUIDs) > 0 {
			uidMap := make(map[uint32]bool)
			for _, uid := range allUIDs {
				uidMap[uid] = true
			}
			uids = make([]uint32, 0, len(uidMap))
			for uid := range uidMap {
				uids = append(uids, uid)
			}
		} else {
			uids = nil // No messages found for any of the mailbox addresses
		}
	} else {
		// Search without mailbox filtering
		var searchErr error
		uids, searchErr = client.UidSearch(searchCriteria)
		if searchErr != nil {
			return nil, fmt.Errorf("IMAP search failed: %w", searchErr)
		}
	}
	if err != nil {
		return nil, fmt.Errorf("IMAP search failed: %w", err)
	}

	if len(uids) == 0 {
		c.logger.Debug().Msg("No new messages found")
		return nil, nil
	}

	// Limit the number of messages to process to avoid overwhelming the system
	const maxMessagesToFetch = 10
	if len(uids) > maxMessagesToFetch {
		c.logger.Warn().
			Int("total_found", len(uids)).
			Int("limiting_to", maxMessagesToFetch).
			Msg("Too many messages found, limiting fetch")
		// Take the most recent messages (highest UIDs)
		uids = uids[len(uids)-maxMessagesToFetch:]
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
			imap.FetchBodyStructure,
			imap.FetchBody,
			"BODY.PEEK[]", // Fetch full message body without marking as seen
		}, messages)
	}()

	var parsedMessages []*ParsedMessage
	messageMap := make(map[uint32]*imap.Message)
	messageCount := 0

	// Collect all message parts first
	for msg := range messages {
		messageCount++
		if msg == nil {
			c.logger.Warn().Msg("Received nil message from IMAP fetch")
			continue
		}

		c.logger.Debug().
			Uint32("uid", msg.Uid).
			Int("items_count", len(msg.Items)).
			Bool("has_envelope", msg.Envelope != nil).
			Int("body_parts", len(msg.Body)).
			Strs("flags", msg.Flags).
			Msgf("Processing IMAP message part %d", messageCount)

		// Merge messages with the same UID
		if existing, exists := messageMap[msg.Uid]; exists {
			// Merge envelope if missing
			if existing.Envelope == nil && msg.Envelope != nil {
				existing.Envelope = msg.Envelope
			}
			// Merge body sections
			if existing.Body == nil {
				existing.Body = msg.Body
			} else {
				for k, v := range msg.Body {
					existing.Body[k] = v
				}
			}
			// Merge items
			for k, v := range msg.Items {
				existing.Items[k] = v
			}
		} else {
			messageMap[msg.Uid] = msg
		}
	}

	c.logger.Debug().
		Int("total_message_parts", messageCount).
		Int("unique_messages", len(messageMap)).
		Msg("IMAP fetch completed")

	// Parse collected messages (optionally skip seen ones)
	for _, msg := range messageMap {
		if !includeSeen {
			// Skip messages that have the Seen flag
			skip := false
			for _, f := range msg.Flags {
				if strings.EqualFold(f, imap.SeenFlag) {
					skip = true
					break
				}
			}
			if skip {
				c.logger.Debug().
					Uint32("uid", msg.Uid).
					Msg("Skipping seen message")
				continue
			}
		}
		parsed, err := c.parseMessage(msg)
		if err != nil {
			c.logger.Error().
				Err(err).
				Uint32("uid", msg.Uid).
				Msg("Failed to parse message")
			continue
		}

		if parsed != nil {
			parsedMessages = append(parsedMessages, parsed)
		}
	}

	c.logger.Debug().
		Int("parsed_messages", len(parsedMessages)).
		Msg("Message parsing completed")

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
	if msg == nil {
		return nil, fmt.Errorf("message is nil")
	}

	if msg.Envelope == nil {
		c.logger.Warn().
			Uint32("uid", msg.Uid).
			Msg("Message has nil envelope, skipping")
		return nil, fmt.Errorf("invalid message or envelope")
	}

	parsed := &ParsedMessage{
		MessageID: strings.Trim(msg.Envelope.MessageId, "<>"), // Remove angle brackets from message ID
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

	// Also check for RFC822 body if no body sections were processed and we have empty text/html body
	if parsed.TextBody == "" && parsed.HTMLBody == "" {
		for sectionName, reader := range msg.Body {
			if sectionName != nil && sectionName.Specifier == imap.EntireSpecifier {
				entity, err := message.Read(reader)
				if err != nil {
					c.logger.Error().Err(err).Msg("Failed to read RFC822 message entity")
					continue
				}

				if err := c.parseMessageEntity(entity, parsed); err != nil {
					c.logger.Error().Err(err).Msg("Failed to parse RFC822 message entity")
				}
				break
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
