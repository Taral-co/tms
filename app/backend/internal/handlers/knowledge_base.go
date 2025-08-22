package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// KnowledgeBaseHandler handles knowledge base HTTP requests
type KnowledgeBaseHandler struct {
	kbService *service.KnowledgeBaseService
}

// NewKnowledgeBaseHandler creates a new knowledge base handler
func NewKnowledgeBaseHandler(kbService *service.KnowledgeBaseService) *KnowledgeBaseHandler {
	return &KnowledgeBaseHandler{
		kbService: kbService,
	}
}

// RegisterRoutes registers knowledge base routes
func (h *KnowledgeBaseHandler) RegisterRoutes(rg *gin.RouterGroup) {
	kb := rg.Group("/kb")
	{
		// Categories
		kb.POST("/categories", h.CreateCategory)
		kb.GET("/categories", h.GetCategories)

		// Articles
		kb.POST("/articles", h.CreateArticle)
		kb.GET("/articles", h.SearchArticles)
		kb.GET("/articles/:id", h.GetArticle)
		kb.GET("/articles/slug/:slug", h.GetArticleBySlug)
		kb.POST("/articles/:id/view", h.RecordArticleView)
		kb.POST("/articles/:id/feedback", h.SubmitFeedback)

		// Search and Q&A
		kb.POST("/search", h.SearchArticles)
		kb.POST("/answer", h.AnswerQuestion)
		kb.POST("/suggest", h.SuggestAnswers)

		// Analytics
		kb.GET("/stats", h.GetStats)

		// Auto-generation
		kb.POST("/generate", h.GenerateFromTickets)
	}
}

// Categories

// CreateCategory creates a new knowledge base category
func (h *KnowledgeBaseHandler) CreateCategory(c *gin.Context) {
	var req models.CreateKBCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category, err := h.kbService.CreateCategory(c.Request.Context(), tenantID, projectID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// GetCategories gets categories for a project
func (h *KnowledgeBaseHandler) GetCategories(c *gin.Context) {
	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	categories, err := h.kbService.GetCategories(c.Request.Context(), tenantID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// Articles

// CreateArticle creates a new knowledge base article
func (h *KnowledgeBaseHandler) CreateArticle(c *gin.Context) {
	var req models.CreateKBArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get author ID from context (assuming it's set by auth middleware)
	authorID, err := h.getAgentID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	article, err := h.kbService.CreateArticle(c.Request.Context(), tenantID, projectID, authorID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, article)
}

// GetArticle gets an article by ID
func (h *KnowledgeBaseHandler) GetArticle(c *gin.Context) {
	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	article, err := h.kbService.GetArticle(c.Request.Context(), tenantID, projectID, articleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	c.JSON(http.StatusOK, article)
}

// GetArticleBySlug gets an article by slug
func (h *KnowledgeBaseHandler) GetArticleBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Slug is required"})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	article, err := h.kbService.GetArticleBySlug(c.Request.Context(), tenantID, projectID, slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	c.JSON(http.StatusOK, article)
}

// SearchArticles searches for articles
func (h *KnowledgeBaseHandler) SearchArticles(c *gin.Context) {
	var req models.KBSearchRequest
	
	// Handle both GET and POST requests
	if c.Request.Method == "GET" {
		req.Query = c.Query("q")
		if limit := c.Query("limit"); limit != "" {
			if l, err := strconv.Atoi(limit); err == nil {
				req.Limit = l
			}
		}
		if offset := c.Query("offset"); offset != "" {
			if o, err := strconv.Atoi(offset); err == nil {
				req.Offset = o
			}
		}
		req.SortBy = c.Query("sort_by")
		req.SortOrder = c.Query("sort_order")
		req.PublicOnly = c.Query("public_only") == "true"
	} else {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if req.Query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query is required"})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.kbService.SearchArticles(c.Request.Context(), tenantID, projectID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// RecordArticleView records an article view
func (h *KnowledgeBaseHandler) RecordArticleView(c *gin.Context) {
	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build view context
	view := models.KBArticleView{
		Source:    getStringPointer(c.Query("source")),
		SearchQuery: getStringPointer(c.Query("search_query")),
		UserAgent: getStringPointer(c.GetHeader("User-Agent")),
		IPAddress: getStringPointer(c.ClientIP()),
		SessionID: getStringPointer(c.Query("session_id")),
	}

	// Try to get customer or agent ID
	if customerID, err := h.getCustomerID(c); err == nil {
		view.CustomerID = &customerID
	} else if agentID, err := h.getAgentID(c); err == nil {
		view.AgentID = &agentID
	}

	// Get chat session or ticket ID if provided
	if chatSessionID := c.Query("chat_session_id"); chatSessionID != "" {
		if id, err := uuid.Parse(chatSessionID); err == nil {
			view.ChatSessionID = &id
		}
	}
	if ticketID := c.Query("ticket_id"); ticketID != "" {
		if id, err := uuid.Parse(ticketID); err == nil {
			view.TicketID = &id
		}
	}

	err = h.kbService.RecordArticleView(c.Request.Context(), tenantID, projectID, articleID, view)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "View recorded"})
}

// SubmitFeedback submits feedback for an article
func (h *KnowledgeBaseHandler) SubmitFeedback(c *gin.Context) {
	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	var req struct {
		IsHelpful bool    `json:"is_helpful" binding:"required"`
		Comment   *string `json:"comment,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feedback := models.KBFeedback{
		IsHelpful: req.IsHelpful,
		Comment:   req.Comment,
	}

	// Try to get customer or agent ID
	if customerID, err := h.getCustomerID(c); err == nil {
		feedback.CustomerID = &customerID
	} else if agentID, err := h.getAgentID(c); err == nil {
		feedback.AgentID = &agentID
	}

	// Get chat session or ticket ID if provided
	if chatSessionID := c.Query("chat_session_id"); chatSessionID != "" {
		if id, err := uuid.Parse(chatSessionID); err == nil {
			feedback.ChatSessionID = &id
		}
	}
	if ticketID := c.Query("ticket_id"); ticketID != "" {
		if id, err := uuid.Parse(ticketID); err == nil {
			feedback.TicketID = &id
		}
	}

	err = h.kbService.SubmitFeedback(c.Request.Context(), tenantID, projectID, articleID, feedback)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback submitted"})
}

// Q&A and Search

// AnswerQuestion attempts to answer a question using the knowledge base
func (h *KnowledgeBaseHandler) AnswerQuestion(c *gin.Context) {
	var req struct {
		Question string `json:"question" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	answer, err := h.kbService.AnswerQuestion(c.Request.Context(), tenantID, projectID, req.Question)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, answer)
}

// SuggestAnswers suggests knowledge base articles for a query
func (h *KnowledgeBaseHandler) SuggestAnswers(c *gin.Context) {
	var req struct {
		Query string `json:"query" binding:"required"`
		Limit int    `json:"limit,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Limit <= 0 {
		req.Limit = 5
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	suggestions, err := h.kbService.SuggestAnswers(c.Request.Context(), tenantID, projectID, req.Query, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"suggestions": suggestions})
}

// Analytics

// GetStats gets knowledge base statistics
func (h *KnowledgeBaseHandler) GetStats(c *gin.Context) {
	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stats, err := h.kbService.GetStats(c.Request.Context(), tenantID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// Auto-generation

// GenerateFromTickets generates knowledge base entries from tickets
func (h *KnowledgeBaseHandler) GenerateFromTickets(c *gin.Context) {
	var req models.KBAutoGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, projectID, err := h.getTenantAndProject(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	entries, err := h.kbService.GenerateKnowledgeFromTickets(c.Request.Context(), tenantID, projectID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"generated_entries": entries})
}

// Helper methods

func (h *KnowledgeBaseHandler) getTenantAndProject(c *gin.Context) (uuid.UUID, uuid.UUID, error) {
	// This would typically get tenant and project from auth context
	// For now, return error - implement based on your auth system
	return uuid.Nil, uuid.Nil, fmt.Errorf("tenant and project context not implemented")
}

func (h *KnowledgeBaseHandler) getAgentID(c *gin.Context) (uuid.UUID, error) {
	// This would typically get agent ID from auth context
	// For now, return error - implement based on your auth system
	return uuid.Nil, fmt.Errorf("agent context not implemented")
}

func (h *KnowledgeBaseHandler) getCustomerID(c *gin.Context) (uuid.UUID, error) {
	// This would typically get customer ID from auth context
	// For now, return error - implement based on your auth system
	return uuid.Nil, fmt.Errorf("customer context not implemented")
}

func getStringPointer(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
