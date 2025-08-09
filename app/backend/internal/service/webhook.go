package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
)

type WebhookService struct {
	integrationRepo *repo.IntegrationRepository
	httpClient      *http.Client
}

func NewWebhookService(integrationRepo *repo.IntegrationRepository) *WebhookService {
	return &WebhookService{
		integrationRepo: integrationRepo,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (s *WebhookService) DeliverWebhook(ctx context.Context, subscription *models.WebhookSubscription, delivery *models.WebhookDelivery) error {
	// Prepare payload
	payloadBytes, err := json.Marshal(delivery.Payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", subscription.WebhookURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "TMS-Webhook/1.0")

	// Generate signature for verification
	signature := s.generateSignature(payloadBytes, subscription.Secret)
	req.Header.Set("X-TMS-Signature", signature)
	req.Header.Set("X-TMS-Event", string(delivery.EventType))
	req.Header.Set("X-TMS-Delivery", delivery.ID.String())

	// Record request headers
	delivery.RequestHeaders = s.headersToMap(req.Header)

	// Set timeout from subscription
	if subscription.TimeoutSeconds > 0 {
		timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(subscription.TimeoutSeconds)*time.Second)
		defer cancel()
		req = req.WithContext(timeoutCtx)
	}

	// Make the request
	start := time.Now()
	resp, err := s.httpClient.Do(req)
	duration := time.Since(start)

	if err != nil {
		// Update delivery with error
		delivery.ResponseStatus = nil
		errMsg := err.Error()
		delivery.ResponseBody = &errMsg
		delivery.NextRetryAt = s.calculateNextRetry(delivery.DeliveryAttempt, subscription.MaxRetries)

		// Save delivery record
		if saveErr := s.integrationRepo.CreateWebhookDelivery(ctx, delivery); saveErr != nil {
			return fmt.Errorf("failed to save delivery record: %w", saveErr)
		}

		return fmt.Errorf("webhook delivery failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	var responseBody bytes.Buffer
	_, readErr := responseBody.ReadFrom(resp.Body)
	responseBodyStr := responseBody.String()

	// Update delivery record
	delivery.ResponseStatus = &resp.StatusCode
	delivery.ResponseHeaders = s.headersToMap(resp.Header)
	if readErr == nil {
		delivery.ResponseBody = &responseBodyStr
	}

	// Check if delivery was successful
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		now := time.Now()
		delivery.DeliveredAt = &now
	} else {
		// Schedule retry if not max attempts
		delivery.NextRetryAt = s.calculateNextRetry(delivery.DeliveryAttempt, subscription.MaxRetries)
	}

	// Save delivery record
	if err := s.integrationRepo.CreateWebhookDelivery(ctx, delivery); err != nil {
		return fmt.Errorf("failed to save delivery record: %w", err)
	}

	// Log success or failure
	status := "success"
	errorMsg := ""
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		status = "error"
		errorMsg = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, responseBodyStr)
	}

	durationMs := int(duration.Milliseconds())
	responsePayload := models.JSONMap{"response": responseBodyStr}
	logErr := s.integrationRepo.CreateIntegrationSyncLog(ctx, &models.IntegrationSyncLog{
		ID:              delivery.ID, // Use same ID for correlation
		TenantID:        delivery.TenantID,
		ProjectID:       delivery.ProjectID,
		IntegrationID:   subscription.IntegrationID,
		Operation:       "webhook_delivery",
		Status:          status,
		RequestPayload:  delivery.Payload,
		ResponsePayload: responsePayload,
		ErrorMessage:    &errorMsg,
		DurationMs:      &durationMs,
		CreatedAt:       time.Now(),
	})

	if logErr != nil {
		fmt.Printf("Failed to log webhook delivery: %v\n", logErr)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned HTTP %d", resp.StatusCode)
	}

	return nil
}

func (s *WebhookService) RetryFailedDeliveries(ctx context.Context) error {
	// This would be called by a background worker to retry failed webhook deliveries
	// For now, return nil
	return nil
}

func (s *WebhookService) generateSignature(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return "sha256=" + hex.EncodeToString(h.Sum(nil))
}

func (s *WebhookService) headersToMap(headers http.Header) models.JSONMap {
	result := make(models.JSONMap)
	for name, values := range headers {
		if len(values) == 1 {
			result[name] = values[0]
		} else {
			result[name] = values
		}
	}
	return result
}

func (s *WebhookService) calculateNextRetry(attempt, maxRetries int) *time.Time {
	if attempt >= maxRetries {
		return nil // No more retries
	}

	// Exponential backoff: 1min, 2min, 4min, 8min, etc.
	delay := time.Duration(1<<attempt) * time.Minute
	next := time.Now().Add(delay)
	return &next
}
