package repo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// KnowledgeBaseRepo handles knowledge base operations
type KnowledgeBaseRepo struct {
	db *sqlx.DB
}

// NewKnowledgeBaseRepo creates a new knowledge base repository
func NewKnowledgeBaseRepo(db *sqlx.DB) *KnowledgeBaseRepo {
	return &KnowledgeBaseRepo{db: db}
}

// Categories

// CreateCategory creates a new knowledge base category
func (r *KnowledgeBaseRepo) CreateCategory(ctx context.Context, tenantID, projectID uuid.UUID, req models.CreateKBCategoryRequest) (*models.KBCategory, error) {
	category := &models.KBCategory{
		ID:          uuid.New(),
		TenantID:    tenantID,
		ProjectID:   projectID,
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		SortOrder:   req.SortOrder,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	query := `
		INSERT INTO kb_categories (id, tenant_id, project_id, name, description, parent_id, sort_order, is_active, created_at, updated_at)
		VALUES (:id, :tenant_id, :project_id, :name, :description, :parent_id, :sort_order, :is_active, :created_at, :updated_at)`

	_, err := r.db.NamedExecContext(ctx, query, category)
	if err != nil {
		return nil, fmt.Errorf("failed to create category: %w", err)
	}

	return category, nil
}

// GetCategories gets categories for a project
func (r *KnowledgeBaseRepo) GetCategories(ctx context.Context, tenantID, projectID uuid.UUID) ([]models.KBCategory, error) {
	var categories []models.KBCategory

	query := `
		SELECT id, tenant_id, project_id, name, description, parent_id, sort_order, is_active, created_at, updated_at
		FROM kb_categories
		WHERE tenant_id = $1 AND project_id = $2 AND is_active = true
		ORDER BY sort_order, name`

	err := r.db.SelectContext(ctx, &categories, query, tenantID, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}

	return categories, nil
}

// Articles

// CreateArticle creates a new knowledge base article
func (r *KnowledgeBaseRepo) CreateArticle(ctx context.Context, tenantID, projectID, authorID uuid.UUID, req models.CreateKBArticleRequest) (*models.KBArticle, error) {
	article := &models.KBArticle{
		ID:        uuid.New(),
		TenantID:  tenantID,
		ProjectID: projectID,
		CategoryID: req.CategoryID,
		Title:     req.Title,
		Content:   req.Content,
		Summary:   req.Summary,
		Slug:      generateSlug(req.Title),
		Tags:      req.Tags,
		Keywords:  req.Keywords,
		Status:    "draft",
		IsPublic:  req.IsPublic,
		AuthorID:  &authorID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if req.Status == "published" {
		article.Status = "published"
		now := time.Now()
		article.PublishedAt = &now
	}

	query := `
		INSERT INTO kb_articles (id, tenant_id, project_id, category_id, title, content, summary, slug, tags, keywords, status, is_public, author_id, published_at, created_at, updated_at)
		VALUES (:id, :tenant_id, :project_id, :category_id, :title, :content, :summary, :slug, :tags, :keywords, :status, :is_public, :author_id, :published_at, :created_at, :updated_at)`

	_, err := r.db.NamedExecContext(ctx, query, article)
	if err != nil {
		return nil, fmt.Errorf("failed to create article: %w", err)
	}

	return article, nil
}

// GetArticle gets an article by ID
func (r *KnowledgeBaseRepo) GetArticle(ctx context.Context, tenantID, projectID, articleID uuid.UUID) (*models.KBArticle, error) {
	var article models.KBArticle

	query := `
		SELECT a.id, a.tenant_id, a.project_id, a.category_id, a.title, a.content, a.summary, a.slug, 
		       a.tags, a.keywords, a.status, a.is_public, a.author_id, a.view_count, a.helpful_count, 
		       a.not_helpful_count, a.published_at, a.created_at, a.updated_at
		FROM kb_articles a
		WHERE a.tenant_id = $1 AND a.project_id = $2 AND a.id = $3`

	err := r.db.GetContext(ctx, &article, query, tenantID, projectID, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get article: %w", err)
	}

	return &article, nil
}

// GetArticleBySlug gets an article by slug
func (r *KnowledgeBaseRepo) GetArticleBySlug(ctx context.Context, tenantID, projectID uuid.UUID, slug string) (*models.KBArticle, error) {
	var article models.KBArticle

	query := `
		SELECT a.id, a.tenant_id, a.project_id, a.category_id, a.title, a.content, a.summary, a.slug, 
		       a.tags, a.keywords, a.status, a.is_public, a.author_id, a.view_count, a.helpful_count, 
		       a.not_helpful_count, a.published_at, a.created_at, a.updated_at
		FROM kb_articles a
		WHERE a.tenant_id = $1 AND a.project_id = $2 AND a.slug = $3`

	err := r.db.GetContext(ctx, &article, query, tenantID, projectID, slug)
	if err != nil {
		return nil, fmt.Errorf("failed to get article by slug: %w", err)
	}

	return &article, nil
}

// SearchArticles searches for articles using full-text search
func (r *KnowledgeBaseRepo) SearchArticles(ctx context.Context, tenantID, projectID uuid.UUID, req models.KBSearchRequest) (*models.KBSearchResponse, error) {
	startTime := time.Now()

	// Build the search query
	searchQuery := strings.TrimSpace(req.Query)
	if searchQuery == "" {
		return &models.KBSearchResponse{
			Results: []models.KBSearchResult{},
			Total:   0,
			Query:   req.Query,
			Took:    int(time.Since(startTime).Milliseconds()),
		}, nil
	}

	// Set defaults
	if req.Limit <= 0 {
		req.Limit = 10
	}
	if req.Limit > 100 {
		req.Limit = 100
	}
	if req.SortBy == "" {
		req.SortBy = "relevance"
	}

	// Build WHERE conditions
	conditions := []string{
		"si.tenant_id = $1",
		"si.project_id = $2",
	}
	args := []interface{}{tenantID, projectID}
	argIndex := 3

	if req.PublicOnly {
		conditions = append(conditions, "a.is_public = true")
	}

	if len(req.Status) > 0 {
		conditions = append(conditions, fmt.Sprintf("a.status = ANY($%d)", argIndex))
		args = append(args, pq.Array(req.Status))
		argIndex++
	}

	// Build search vector query
	conditions = append(conditions, fmt.Sprintf("si.combined_vector @@ plainto_tsquery('english', $%d)", argIndex))
	args = append(args, searchQuery)
	argIndex++

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Build ORDER BY clause
	var orderClause string
	switch req.SortBy {
	case "date":
		orderClause = "ORDER BY a.created_at DESC"
	case "popularity":
		orderClause = "ORDER BY a.view_count DESC, a.helpful_count DESC"
	case "title":
		orderClause = "ORDER BY a.title ASC"
	default: // relevance
		orderClause = fmt.Sprintf("ORDER BY ts_rank(si.combined_vector, plainto_tsquery('english', $%d)) DESC", len(args))
		args = append(args, searchQuery)
	}

	// Main search query
	query := fmt.Sprintf(`
		SELECT DISTINCT
			CASE 
				WHEN a.id IS NOT NULL THEN a.id
				ELSE ae.id
			END as id,
			CASE 
				WHEN a.id IS NOT NULL THEN 'article'
				ELSE 'auto_entry'
			END as type,
			COALESCE(a.title, ae.title) as title,
			COALESCE(a.content, ae.content) as content,
			COALESCE(a.summary, ae.summary) as summary,
			ts_rank(si.combined_vector, plainto_tsquery('english', $%d)) as score,
			COALESCE(a.tags, '{}') as tags,
			COALESCE(a.keywords, ae.keywords, '{}') as keywords,
			c.name as category_name,
			ag.name as author_name,
			COALESCE(a.view_count, 0) as view_count,
			COALESCE(a.helpful_count, 0) as helpful_count,
			COALESCE(a.created_at, ae.created_at) as created_at,
			COALESCE(a.updated_at, ae.updated_at) as updated_at,
			a.published_at
		FROM kb_search_index si
		LEFT JOIN kb_articles a ON si.article_id = a.id
		LEFT JOIN kb_auto_entries ae ON si.auto_entry_id = ae.id
		LEFT JOIN kb_categories c ON a.category_id = c.id
		LEFT JOIN agents ag ON a.author_id = ag.id
		%s
		%s
		LIMIT $%d OFFSET $%d`,
		len(args)+1, whereClause, orderClause, len(args)+2, len(args)+3)

	args = append(args, searchQuery, req.Limit, req.Offset)

	var results []models.KBSearchResult
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search articles: %w", err)
	}
	defer rows.Close()

	rank := req.Offset + 1
	var maxScore float64

	for rows.Next() {
		var result models.KBSearchResult
		var tags, keywords pq.StringArray

		err := rows.Scan(
			&result.ID, &result.Type, &result.Title, &result.Content, &result.Summary,
			&result.Score, &tags, &keywords, &result.CategoryName, &result.AuthorName,
			&result.ViewCount, &result.HelpfulCount, &result.CreatedAt, &result.UpdatedAt,
			&result.PublishedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}

		result.Tags = []string(tags)
		result.Keywords = []string(keywords)
		result.Rank = rank
		result.Snippet = generateSnippet(result.Content, searchQuery, 200)

		if result.Score > maxScore {
			maxScore = result.Score
		}

		results = append(results, result)
		rank++
	}

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN a.id ELSE ae.id END)
		FROM kb_search_index si
		LEFT JOIN kb_articles a ON si.article_id = a.id
		LEFT JOIN kb_auto_entries ae ON si.auto_entry_id = ae.id
		%s`, whereClause)

	var total int
	err = r.db.QueryRowContext(ctx, countQuery, args[:len(args)-2]...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get search count: %w", err)
	}

	took := int(time.Since(startTime).Milliseconds())

	return &models.KBSearchResponse{
		Results:  results,
		Total:    total,
		Query:    req.Query,
		Took:     took,
		Page:     (req.Offset / req.Limit) + 1,
		PerPage:  req.Limit,
		MaxScore: maxScore,
	}, nil
}

// RecordArticleView records an article view
func (r *KnowledgeBaseRepo) RecordArticleView(ctx context.Context, view models.KBArticleView) error {
	view.ID = uuid.New()
	view.CreatedAt = time.Now()

	query := `
		INSERT INTO kb_article_views (id, tenant_id, project_id, article_id, customer_id, agent_id, source, search_query, user_agent, ip_address, session_id, chat_session_id, ticket_id, created_at)
		VALUES (:id, :tenant_id, :project_id, :article_id, :customer_id, :agent_id, :source, :search_query, :user_agent, :ip_address, :session_id, :chat_session_id, :ticket_id, :created_at)`

	_, err := r.db.NamedExecContext(ctx, query, view)
	if err != nil {
		return fmt.Errorf("failed to record article view: %w", err)
	}

	// Update view count
	updateQuery := `
		UPDATE kb_articles 
		SET view_count = view_count + 1, updated_at = NOW()
		WHERE id = $1`

	_, err = r.db.ExecContext(ctx, updateQuery, view.ArticleID)
	if err != nil {
		return fmt.Errorf("failed to update view count: %w", err)
	}

	return nil
}

// SubmitFeedback submits feedback for an article
func (r *KnowledgeBaseRepo) SubmitFeedback(ctx context.Context, feedback models.KBFeedback) error {
	feedback.ID = uuid.New()
	feedback.CreatedAt = time.Now()

	query := `
		INSERT INTO kb_feedback (id, tenant_id, project_id, article_id, customer_id, agent_id, is_helpful, comment, chat_session_id, ticket_id, created_at)
		VALUES (:id, :tenant_id, :project_id, :article_id, :customer_id, :agent_id, :is_helpful, :comment, :chat_session_id, :ticket_id, :created_at)`

	_, err := r.db.NamedExecContext(ctx, query, feedback)
	if err != nil {
		return fmt.Errorf("failed to submit feedback: %w", err)
	}

	// Update helpful counts
	var updateQuery string
	if feedback.IsHelpful {
		updateQuery = `
			UPDATE kb_articles 
			SET helpful_count = helpful_count + 1, updated_at = NOW()
			WHERE id = $1`
	} else {
		updateQuery = `
			UPDATE kb_articles 
			SET not_helpful_count = not_helpful_count + 1, updated_at = NOW()
			WHERE id = $1`
	}

	_, err = r.db.ExecContext(ctx, updateQuery, feedback.ArticleID)
	if err != nil {
		return fmt.Errorf("failed to update feedback count: %w", err)
	}

	return nil
}

// GetStats gets knowledge base statistics
func (r *KnowledgeBaseRepo) GetStats(ctx context.Context, tenantID, projectID uuid.UUID) (*models.KBStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_articles,
			COUNT(CASE WHEN status = 'published' THEN 1 END) as published_articles,
			COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_articles,
			COALESCE(SUM(view_count), 0) as total_views,
			COALESCE(AVG(CASE WHEN helpful_count + not_helpful_count > 0 THEN helpful_count::float / (helpful_count + not_helpful_count) END), 0) as avg_helpful_rating
		FROM kb_articles
		WHERE tenant_id = $1 AND project_id = $2`

	var stats models.KBStats
	row := r.db.QueryRowContext(ctx, query, tenantID, projectID)
	err := row.Scan(&stats.TotalArticles, &stats.PublishedArticles, &stats.DraftArticles, &stats.TotalViews, &stats.AvgHelpfulRating)
	if err != nil {
		return nil, fmt.Errorf("failed to get article stats: %w", err)
	}

	// Get category count
	categoryQuery := `SELECT COUNT(*) FROM kb_categories WHERE tenant_id = $1 AND project_id = $2 AND is_active = true`
	err = r.db.QueryRowContext(ctx, categoryQuery, tenantID, projectID).Scan(&stats.TotalCategories)
	if err != nil {
		return nil, fmt.Errorf("failed to get category count: %w", err)
	}

	// Get auto entries count
	autoQuery := `SELECT COUNT(*), COUNT(CASE WHEN status = 'pending' THEN 1 END) FROM kb_auto_entries WHERE tenant_id = $1 AND project_id = $2`
	err = r.db.QueryRowContext(ctx, autoQuery, tenantID, projectID).Scan(&stats.AutoEntries, &stats.PendingReview)
	if err != nil {
		return nil, fmt.Errorf("failed to get auto entry stats: %w", err)
	}

	return &stats, nil
}

// Helper functions

func generateSlug(title string) string {
	// Simple slug generation - replace spaces with hyphens and make lowercase
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters (basic implementation)
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

func generateSnippet(content, query string, maxLength int) string {
	if len(content) <= maxLength {
		return content
	}

	// Try to find the query in the content
	lowerContent := strings.ToLower(content)
	lowerQuery := strings.ToLower(query)

	if idx := strings.Index(lowerContent, lowerQuery); idx != -1 {
		// Found the query, create snippet around it
		start := idx - maxLength/4
		if start < 0 {
			start = 0
		}
		end := start + maxLength
		if end > len(content) {
			end = len(content)
		}

		snippet := content[start:end]
		if start > 0 {
			snippet = "..." + snippet
		}
		if end < len(content) {
			snippet = snippet + "..."
		}
		return snippet
	}

	// Query not found, return beginning of content
	if len(content) > maxLength {
		return content[:maxLength] + "..."
	}
	return content
}
