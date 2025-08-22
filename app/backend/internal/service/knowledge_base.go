package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// KnowledgeBaseService handles knowledge base business logic
type KnowledgeBaseService struct {
	kbRepo *repo.KnowledgeBaseRepo
}

// NewKnowledgeBaseService creates a new knowledge base service
func NewKnowledgeBaseService(kbRepo *repo.KnowledgeBaseRepo) *KnowledgeBaseService {
	return &KnowledgeBaseService{
		kbRepo: kbRepo,
	}
}

// Categories

// CreateCategory creates a new knowledge base category
func (s *KnowledgeBaseService) CreateCategory(ctx context.Context, tenantID, projectID uuid.UUID, req models.CreateKBCategoryRequest) (*models.KBCategory, error) {
	return s.kbRepo.CreateCategory(ctx, tenantID, projectID, req)
}

// GetCategories gets categories for a project
func (s *KnowledgeBaseService) GetCategories(ctx context.Context, tenantID, projectID uuid.UUID) ([]models.KBCategory, error) {
	return s.kbRepo.GetCategories(ctx, tenantID, projectID)
}

// Articles

// CreateArticle creates a new knowledge base article
func (s *KnowledgeBaseService) CreateArticle(ctx context.Context, tenantID, projectID, authorID uuid.UUID, req models.CreateKBArticleRequest) (*models.KBArticle, error) {
	// Validate category if provided
	if req.CategoryID != nil {
		categories, err := s.kbRepo.GetCategories(ctx, tenantID, projectID)
		if err != nil {
			return nil, fmt.Errorf("failed to validate category: %w", err)
		}

		categoryExists := false
		for _, cat := range categories {
			if cat.ID == *req.CategoryID {
				categoryExists = true
				break
			}
		}

		if !categoryExists {
			return nil, fmt.Errorf("category not found")
		}
	}

	return s.kbRepo.CreateArticle(ctx, tenantID, projectID, authorID, req)
}

// GetArticle gets an article by ID
func (s *KnowledgeBaseService) GetArticle(ctx context.Context, tenantID, projectID, articleID uuid.UUID) (*models.KBArticle, error) {
	return s.kbRepo.GetArticle(ctx, tenantID, projectID, articleID)
}

// GetArticleBySlug gets an article by slug
func (s *KnowledgeBaseService) GetArticleBySlug(ctx context.Context, tenantID, projectID uuid.UUID, slug string) (*models.KBArticle, error) {
	return s.kbRepo.GetArticleBySlug(ctx, tenantID, projectID, slug)
}

// SearchArticles searches for articles using full-text search
func (s *KnowledgeBaseService) SearchArticles(ctx context.Context, tenantID, projectID uuid.UUID, req models.KBSearchRequest) (*models.KBSearchResponse, error) {
	return s.kbRepo.SearchArticles(ctx, tenantID, projectID, req)
}

// RecordArticleView records an article view with context
func (s *KnowledgeBaseService) RecordArticleView(ctx context.Context, tenantID, projectID, articleID uuid.UUID, viewContext models.KBArticleView) error {
	viewContext.TenantID = tenantID
	viewContext.ProjectID = projectID
	viewContext.ArticleID = articleID

	return s.kbRepo.RecordArticleView(ctx, viewContext)
}

// SubmitFeedback submits feedback for an article
func (s *KnowledgeBaseService) SubmitFeedback(ctx context.Context, tenantID, projectID, articleID uuid.UUID, feedback models.KBFeedback) error {
	feedback.TenantID = tenantID
	feedback.ProjectID = projectID
	feedback.ArticleID = articleID

	return s.kbRepo.SubmitFeedback(ctx, feedback)
}

// GetStats gets knowledge base statistics
func (s *KnowledgeBaseService) GetStats(ctx context.Context, tenantID, projectID uuid.UUID) (*models.KBStats, error) {
	return s.kbRepo.GetStats(ctx, tenantID, projectID)
}

// AI/Auto-generation methods

// GenerateKnowledgeFromTickets analyzes resolved tickets and generates knowledge base entries
func (s *KnowledgeBaseService) GenerateKnowledgeFromTickets(ctx context.Context, tenantID, projectID uuid.UUID, req models.KBAutoGenerateRequest) ([]models.KBAutoEntry, error) {
	// Get resolved tickets
	tickets, err := s.getRelevantTickets(ctx, tenantID, projectID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get tickets: %w", err)
	}

	var autoEntries []models.KBAutoEntry

	for _, ticket := range tickets {
		// Analyze ticket for KB potential
		entry, err := s.analyzeTicketForKB(ctx, ticket)
		if err != nil {
			log.Error().Err(err).Str("ticket_id", ticket.ID.String()).Msg("Failed to analyze ticket for KB")
			continue
		}

		if entry != nil && entry.ConfidenceScore >= req.MinConfidence {
			autoEntries = append(autoEntries, *entry)
		}
	}

	return autoEntries, nil
}

// SuggestAnswers suggests knowledge base articles for a given question/query
func (s *KnowledgeBaseService) SuggestAnswers(ctx context.Context, tenantID, projectID uuid.UUID, query string, limit int) ([]models.KBSearchResult, error) {
	if limit <= 0 {
		limit = 5
	}

	searchReq := models.KBSearchRequest{
		Query:      query,
		Limit:      limit,
		PublicOnly: false, // Include internal articles for agents
		SortBy:     "relevance",
	}

	response, err := s.kbRepo.SearchArticles(ctx, tenantID, projectID, searchReq)
	if err != nil {
		return nil, fmt.Errorf("failed to search articles: %w", err)
	}

	return response.Results, nil
}

// AnswerQuestion attempts to answer a question using the knowledge base
func (s *KnowledgeBaseService) AnswerQuestion(ctx context.Context, tenantID, projectID uuid.UUID, question string) (*models.KBAnswerResponse, error) {
	// Search for relevant articles
	results, err := s.SuggestAnswers(ctx, tenantID, projectID, question, 3)
	if err != nil {
		return nil, fmt.Errorf("failed to get suggestions: %w", err)
	}

	if len(results) == 0 {
		return &models.KBAnswerResponse{
			Question:    question,
			HasAnswer:   false,
			Confidence:  0.0,
			Suggestions: []string{"No relevant articles found. Consider creating a new knowledge base article."},
		}, nil
	}

	// Take the best match
	bestMatch := results[0]
	
	// Simple confidence calculation based on search score
	confidence := bestMatch.Score
	if confidence > 1.0 {
		confidence = 1.0
	}

	hasAnswer := confidence > 0.3 // Threshold for considering it a good answer

	answer := &models.KBAnswerResponse{
		Question:   question,
		HasAnswer:  hasAnswer,
		Confidence: confidence,
		ArticleID:  &bestMatch.ID,
		Title:      bestMatch.Title,
		Content:    bestMatch.Content,
		Summary:    bestMatch.Summary,
		URL:        fmt.Sprintf("/kb/articles/%s", bestMatch.ID),
	}

	// Add suggestions from other results
	for i, result := range results {
		if i > 0 && i < 5 { // Add up to 4 more suggestions
			answer.Suggestions = append(answer.Suggestions, result.Title)
		}
	}

	return answer, nil
}

// Helper methods

func (s *KnowledgeBaseService) getRelevantTickets(ctx context.Context, tenantID, projectID uuid.UUID, req models.KBAutoGenerateRequest) ([]models.Ticket, error) {
	// This would use the ticket repository to get tickets based on criteria
	// For now, return empty slice - implement based on your ticket repo methods
	return []models.Ticket{}, nil
}

func (s *KnowledgeBaseService) analyzeTicketForKB(ctx context.Context, ticket models.Ticket) (*models.KBAutoEntry, error) {
	// This is a simplified analysis - in a real implementation, you might use:
	// - NLP libraries to extract key information
	// - Machine learning models to determine if a ticket is KB-worthy
	// - Templates to format the content

	// Basic heuristics for KB worthiness:
	// 1. Ticket is resolved
	// 2. Has multiple messages (shows interaction)
	// 3. Contains certain keywords or patterns

	if ticket.Status != "resolved" && ticket.Status != "closed" {
		return nil, nil
	}

	// Simple scoring based on subject and message count
	score := 0.5
	
	// Check for common KB indicators in subject
	kbKeywords := []string{"how to", "error", "setup", "configure", "install", "troubleshoot", "guide"}
	subjectLower := strings.ToLower(ticket.Subject)
	
	for _, keyword := range kbKeywords {
		if strings.Contains(subjectLower, keyword) {
			score += 0.1
		}
	}

	// Would need to get ticket messages to analyze further
	// For now, create a basic entry if score is reasonable
	if score < 0.5 {
		return nil, nil
	}

	entry := &models.KBAutoEntry{
		ID:              uuid.New(),
		TenantID:        ticket.TenantID,
		ProjectID:       ticket.ProjectID,
		SourceType:      "ticket",
		SourceID:        ticket.ID,
		Title:           generateKBTitle(ticket.Subject),
		Content:         generateKBContent(ticket),
		Summary:         generateKBSummary(ticket),
		Keywords:        extractKeywords(ticket.Subject),
		ConfidenceScore: score,
		Status:          "pending",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	return entry, nil
}

func generateKBTitle(subject string) string {
	// Clean up the subject to make it more KB-friendly
	title := strings.TrimSpace(subject)
	if !strings.HasSuffix(title, "?") && !strings.Contains(strings.ToLower(title), "how to") {
		title = "How to resolve: " + title
	}
	return title
}

func generateKBContent(ticket models.Ticket) string {
	// This would analyze the ticket messages and generate helpful content
	// For now, return a template
	return fmt.Sprintf(`**Issue**: %s

**Resolution**: This issue was resolved in ticket #%d. 

*This article was automatically generated from a resolved ticket. Please review and enhance the content before publishing.*

**Related**: Ticket #%d`, ticket.Subject, ticket.Number, ticket.Number)
}

func generateKBSummary(ticket models.Ticket) *string {
	summary := fmt.Sprintf("Auto-generated from resolved ticket #%d regarding: %s", ticket.Number, ticket.Subject)
	return &summary
}

func extractKeywords(subject string) []string {
	// Simple keyword extraction
	words := strings.Fields(strings.ToLower(subject))
	var keywords []string

	// Filter out common words and keep meaningful terms
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "and": true, "or": true, "but": true,
		"in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
		"with": true, "by": true, "is": true, "are": true, "was": true, "were": true,
		"be": true, "been": true, "have": true, "has": true, "had": true, "do": true,
		"does": true, "did": true, "will": true, "would": true, "could": true, "should": true,
	}

	for _, word := range words {
		if len(word) > 3 && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}

	return keywords
}
