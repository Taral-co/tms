package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"strings"

	"github.com/bareuptime/tms/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuthMiddleware handles JWT authentication
func AuthMiddleware(jwtAuth *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for public endpoints
		if strings.HasPrefix(c.Request.URL.Path, "/v1/public/") {
			c.Next()
			return
		}

		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check Bearer prefix
		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := authHeader[len(bearerPrefix):]

		// Validate token
		claims, err := jwtAuth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Check token type (should be access token for API endpoints)
		if claims.TokenType != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token type"})
			c.Abort()
			return
		}

		// Validate mandatory fields
		if claims.AgentID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "agent_id missing from token"})
			c.Abort()
			return
		}

		if claims.TenantID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id missing from token"})
			c.Abort()
			return
		}

		if claims.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email missing from token"})
			c.Abort()
			return
		}

		if claims.RoleBindings == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "role_bindings missing from token"})
			c.Abort()
			return
		}

		// Validate UUID format for agent_id
		if _, err := uuid.Parse(claims.AgentID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid agent_id format in token"})
			c.Abort()
			return
		}

		// Validate UUID format for tenant_id
		if _, err := uuid.Parse(claims.TenantID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id format in token"})
			c.Abort()
			return
		}

		// Validate that role_bindings has at least one role
		for projectID, roles := range claims.RoleBindings {
			if len(roles) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "no roles found for project " + projectID})
				c.Abort()
				return
			}
		}

		// Store validated claims in context
		c.Set("user_id", claims.Subject)
		c.Set("tenant_id", claims.TenantID)
		c.Set("email", claims.Email)
		c.Set("agent_id", claims.AgentID)
		c.Set("role_bindings", claims.RoleBindings)
		c.Set("claims", claims)

		c.Next()
	}
}

// TenantMiddleware sets up tenant context for RLS
func TenantMiddleware(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.GetString("tenant_id")
		if tenantID == "" {
			// Try to get from URL params for public endpoints
			tenantID = c.Param("tenant_id")
		}

		if tenantID != "" {
			// Validate tenant ID format
			if _, err := uuid.Parse(tenantID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID format"})
				c.Abort()
				return
			}

			// Set RLS context in database
			ctx := context.WithValue(c.Request.Context(), "tenant_id", tenantID)
			c.Request = c.Request.WithContext(ctx)

			// Execute SET statement for RLS
			if db != nil {
				_, err := db.ExecContext(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenantID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set tenant context"})
					c.Abort()
					return
				}
			}

			c.Set("tenant_id", tenantID)
		}

		c.Next()
	}
}

// CORSMiddleware handles CORS headers
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ErrorHandlerMiddleware handles panics and errors
func ErrorHandlerMiddleware() gin.HandlerFunc {
	return gin.Recovery()
}

// RequestIDMiddleware adds a request ID to each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// ValidationMiddleware handles request validation
func ValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// This will be used by handlers to validate requests
		c.Next()
	}
}

// Helper functions to extract values from context

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			return id
		}
	}
	return ""
}

// GetTenantID extracts tenant ID from context
func GetTenantID(c *gin.Context) string {
	if tenantID, exists := c.Get("tenant_id"); exists {
		if id, ok := tenantID.(string); ok {
			return id
		}
	}
	return ""
}

// GetClaims extracts JWT claims from context
func GetClaims(c *gin.Context) *auth.Claims {
	if claims, exists := c.Get("claims"); exists {
		if cl, ok := claims.(*auth.Claims); ok {
			return cl
		}
	}
	return nil
}

// TenantAdminMiddleware ensures only tenant admins can access the endpoint
func TenantAdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No valid claims found"})
			c.Abort()
			return
		}

		if !claims.IsTenantAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Tenant admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
