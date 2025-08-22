package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// KBCategory represents a knowledge base category
type KBCategory struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	TenantID    uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID   uuid.UUID  `db:"project_id" json:"project_id"`
	Name        string     `db:"name" json:"name"`
	Description *string    `db:"description" json:"description,omitempty"`
	ParentID    *uuid.UUID `db:"parent_id" json:"parent_id,omitempty"`
	SortOrder   int        `db:"sort_order" json:"sort_order"`
	IsActive    bool       `db:"is_active" json:"is_active"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`

	// Nested relationships
	Children []KBCategory `json:"children,omitempty"`
	Parent   *KBCategory  `json:"parent,omitempty"`
}

// KBArticle represents a knowledge base article
type KBArticle struct {
	ID              uuid.UUID      `db:"id" json:"id"`
	TenantID        uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	ProjectID       uuid.UUID      `db:"project_id" json:"project_id"`
	CategoryID      *uuid.UUID     `db:"category_id" json:"category_id,omitempty"`
	Title           string         `db:"title" json:"title"`
	Content         string         `db:"content" json:"content"`
	Summary         *string        `db:"summary" json:"summary,omitempty"`
	Slug            string         `db:"slug" json:"slug"`
	Tags            pq.StringArray `db:"tags" json:"tags"`
	Keywords        pq.StringArray `db:"keywords" json:"keywords"`
	Status          string         `db:"status" json:"status"` // draft, published, archived
	IsPublic        bool           `db:"is_public" json:"is_public"`
	AuthorID        *uuid.UUID     `db:"author_id" json:"author_id,omitempty"`
	ViewCount       int            `db:"view_count" json:"view_count"`
	HelpfulCount    int            `db:"helpful_count" json:"helpful_count"`
	NotHelpfulCount int            `db:"not_helpful_count" json:"not_helpful_count"`
	PublishedAt     *time.Time     `db:"published_at" json:"published_at,omitempty"`
	CreatedAt       time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time      `db:"updated_at" json:"updated_at"`

	// Relationships
	Category *KBCategory `json:"category,omitempty"`
	Author   *Agent      `json:"author,omitempty"`
}

// KBAutoEntry represents an auto-generated knowledge base entry
type KBAutoEntry struct {
	ID              uuid.UUID      `db:"id" json:"id"`
	TenantID        uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	ProjectID       uuid.UUID      `db:"project_id" json:"project_id"`
	SourceType      string         `db:"source_type" json:"source_type"` // ticket, email, chat
	SourceID        uuid.UUID      `db:"source_id" json:"source_id"`
	Title           string         `db:"title" json:"title"`
	Content         string         `db:"content" json:"content"`
	Summary         *string        `db:"summary" json:"summary,omitempty"`
	Keywords        pq.StringArray `db:"keywords" json:"keywords"`
	ConfidenceScore float64        `db:"confidence_score" json:"confidence_score"`
	Status          string         `db:"status" json:"status"` // pending, approved, rejected, needs_review
	ReviewedBy      *uuid.UUID     `db:"reviewed_by" json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time     `db:"reviewed_at" json:"reviewed_at,omitempty"`
	ArticleID       *uuid.UUID     `db:"article_id" json:"article_id,omitempty"`
	CreatedAt       time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time      `db:"updated_at" json:"updated_at"`

	// Relationships
	Reviewer *Agent     `json:"reviewer,omitempty"`
	Article  *KBArticle `json:"article,omitempty"`
}

// KBSearchResult represents a search result with ranking
type KBSearchResult struct {
	ID       uuid.UUID `json:"id"`
	Type     string    `json:"type"` // article, auto_entry
	Title    string    `json:"title"`
	Content  string    `json:"content"`
	Summary  *string   `json:"summary,omitempty"`
	Score    float64   `json:"score"`
	Rank     int       `json:"rank"`
	Snippet  string    `json:"snippet"`
	URL      string    `json:"url,omitempty"`
	Tags     []string  `json:"tags,omitempty"`
	Keywords []string  `json:"keywords,omitempty"`

	// Additional context
	CategoryName *string    `json:"category_name,omitempty"`
	AuthorName   *string    `json:"author_name,omitempty"`
	ViewCount    int        `json:"view_count"`
	HelpfulCount int        `json:"helpful_count"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	PublishedAt  *time.Time `json:"published_at,omitempty"`
}

// KBArticleView represents an article view event
type KBArticleView struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	TenantID      uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID     uuid.UUID  `db:"project_id" json:"project_id"`
	ArticleID     uuid.UUID  `db:"article_id" json:"article_id"`
	CustomerID    *uuid.UUID `db:"customer_id" json:"customer_id,omitempty"`
	AgentID       *uuid.UUID `db:"agent_id" json:"agent_id,omitempty"`
	Source        *string    `db:"source" json:"source,omitempty"`
	SearchQuery   *string    `db:"search_query" json:"search_query,omitempty"`
	UserAgent     *string    `db:"user_agent" json:"user_agent,omitempty"`
	IPAddress     *string    `db:"ip_address" json:"ip_address,omitempty"`
	SessionID     *string    `db:"session_id" json:"session_id,omitempty"`
	ChatSessionID *uuid.UUID `db:"chat_session_id" json:"chat_session_id,omitempty"`
	TicketID      *uuid.UUID `db:"ticket_id" json:"ticket_id,omitempty"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
}

// KBFeedback represents feedback on an article
type KBFeedback struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	TenantID      uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID     uuid.UUID  `db:"project_id" json:"project_id"`
	ArticleID     uuid.UUID  `db:"article_id" json:"article_id"`
	CustomerID    *uuid.UUID `db:"customer_id" json:"customer_id,omitempty"`
	AgentID       *uuid.UUID `db:"agent_id" json:"agent_id,omitempty"`
	IsHelpful     bool       `db:"is_helpful" json:"is_helpful"`
	Comment       *string    `db:"comment" json:"comment,omitempty"`
	ChatSessionID *uuid.UUID `db:"chat_session_id" json:"chat_session_id,omitempty"`
	TicketID      *uuid.UUID `db:"ticket_id" json:"ticket_id,omitempty"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`

	// Relationships
	Customer *Customer `json:"customer,omitempty"`
	Agent    *Agent    `json:"agent,omitempty"`
	Article  *KBArticle `json:"article,omitempty"`
}

// KBSearchRequest represents a search request
type KBSearchRequest struct {
	Query      string   `json:"query" binding:"required"`
	Categories []string `json:"categories,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	Status     []string `json:"status,omitempty"`
	Limit      int      `json:"limit,omitempty"`
	Offset     int      `json:"offset,omitempty"`
	SortBy     string   `json:"sort_by,omitempty"` // relevance, date, popularity, title
	SortOrder  string   `json:"sort_order,omitempty"` // asc, desc
	PublicOnly bool     `json:"public_only,omitempty"`
}

// KBSearchResponse represents a search response
type KBSearchResponse struct {
	Results    []KBSearchResult `json:"results"`
	Total      int              `json:"total"`
	Query      string           `json:"query"`
	Took       int              `json:"took_ms"`
	Page       int              `json:"page"`
	PerPage    int              `json:"per_page"`
	MaxScore   float64          `json:"max_score"`
	Suggestion *string          `json:"suggestion,omitempty"`
}

// KBStats represents knowledge base statistics
type KBStats struct {
	TotalArticles     int `json:"total_articles"`
	PublishedArticles int `json:"published_articles"`
	DraftArticles     int `json:"draft_articles"`
	TotalViews        int `json:"total_views"`
	TotalCategories   int `json:"total_categories"`
	AutoEntries       int `json:"auto_entries"`
	PendingReview     int `json:"pending_review"`
	AvgHelpfulRating  float64 `json:"avg_helpful_rating"`
}

// CreateKBArticleRequest represents a request to create an article
type CreateKBArticleRequest struct {
	CategoryID *uuid.UUID `json:"category_id,omitempty"`
	Title      string     `json:"title" binding:"required"`
	Content    string     `json:"content" binding:"required"`
	Summary    *string    `json:"summary,omitempty"`
	Tags       []string   `json:"tags,omitempty"`
	Keywords   []string   `json:"keywords,omitempty"`
	IsPublic   bool       `json:"is_public"`
	Status     string     `json:"status,omitempty"` // draft, published
}

// UpdateKBArticleRequest represents a request to update an article
type UpdateKBArticleRequest struct {
	CategoryID *uuid.UUID `json:"category_id,omitempty"`
	Title      *string    `json:"title,omitempty"`
	Content    *string    `json:"content,omitempty"`
	Summary    *string    `json:"summary,omitempty"`
	Tags       []string   `json:"tags,omitempty"`
	Keywords   []string   `json:"keywords,omitempty"`
	IsPublic   *bool      `json:"is_public,omitempty"`
	Status     *string    `json:"status,omitempty"`
}

// CreateKBCategoryRequest represents a request to create a category
type CreateKBCategoryRequest struct {
	Name        string     `json:"name" binding:"required"`
	Description *string    `json:"description,omitempty"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty"`
	SortOrder   int        `json:"sort_order,omitempty"`
}

// KBAutoGenerateRequest represents a request to auto-generate KB entries
type KBAutoGenerateRequest struct {
	SourceType     string     `json:"source_type" binding:"required"` // ticket, email, chat
	SourceIDs      []uuid.UUID `json:"source_ids,omitempty"`
	DateFrom       *time.Time `json:"date_from,omitempty"`
	DateTo         *time.Time `json:"date_to,omitempty"`
	MinConfidence  float64    `json:"min_confidence,omitempty"`
	IncludeResolved bool      `json:"include_resolved,omitempty"`
}

// KBAnswerResponse represents a response to a question
type KBAnswerResponse struct {
	Question    string     `json:"question"`
	HasAnswer   bool       `json:"has_answer"`
	Confidence  float64    `json:"confidence"`
	ArticleID   *uuid.UUID `json:"article_id,omitempty"`
	Title       string     `json:"title,omitempty"`
	Content     string     `json:"content,omitempty"`
	Summary     *string    `json:"summary,omitempty"`
	URL         string     `json:"url,omitempty"`
	Suggestions []string   `json:"suggestions,omitempty"`
}
