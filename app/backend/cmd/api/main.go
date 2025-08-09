package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bareuptime/tms/internal/auth"
	"github.com/bareuptime/tms/internal/config"
	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/handlers"
	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	database, err := db.Connect(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize JWT auth
	jwtAuth := auth.NewService(
		cfg.JWT.Secret,
		int(cfg.JWT.AccessTokenExpiry.Seconds()),
		int(cfg.JWT.RefreshTokenExpiry.Seconds()),
		int(cfg.JWT.MagicLinkExpiry.Seconds()),
		int(cfg.JWT.UnauthTokenExpiry.Seconds()),
	)

	// Initialize RBAC service
	rbacService := rbac.NewService(database.DB.DB)

	// Initialize repositories
	agentRepo := repo.NewAgentRepository(database.DB.DB)
	customerRepo := repo.NewCustomerRepository(database.DB.DB)
	ticketRepo := repo.NewTicketRepository(database.DB.DB)
	messageRepo := repo.NewTicketMessageRepository(database.DB.DB)

	// Initialize services
	authService := service.NewAuthService(agentRepo, rbacService, jwtAuth)
	// agentService := service.NewAgentService(agentRepo, rbacService)      // Reserved for future use
	// customerService := service.NewCustomerService(customerRepo, rbacService) // Reserved for future use
	ticketService := service.NewTicketService(ticketRepo, customerRepo, messageRepo, rbacService)
	messageService := service.NewMessageService(messageRepo, ticketRepo, rbacService)
	publicService := service.NewPublicService(ticketRepo, messageRepo, jwtAuth)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, publicService)
	ticketHandler := handlers.NewTicketHandler(ticketService, messageService)
	publicHandler := handlers.NewPublicHandler(publicService)

	// Setup router
	router := setupRouter(database.DB.DB, jwtAuth, authHandler, ticketHandler, publicHandler)

	// Create HTTP server
	server := &http.Server{
		Addr:    cfg.Server.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on port %s", cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func setupRouter(database *sql.DB, jwtAuth *auth.Service, authHandler *handlers.AuthHandler, ticketHandler *handlers.TicketHandler, publicHandler *handlers.PublicHandler) *gin.Engine {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Global middleware
	router.Use(middleware.ErrorHandlerMiddleware())
	router.Use(middleware.RequestIDMiddleware())
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.TenantMiddleware(database))

	// Public routes
	publicRoutes := router.Group("/v1/public")
	{
		publicRoutes.GET("/health", publicHandler.Health)
		publicRoutes.GET("/ticket", publicHandler.GetTicketByMagicLink)
		publicRoutes.GET("/ticket/messages", publicHandler.GetTicketMessagesByMagicLink)
		publicRoutes.POST("/ticket/messages", publicHandler.AddMessageByMagicLink)
	}

	// API routes
	api := router.Group("/v1/tenants/:tenant_id")
	api.Use(middleware.AuthMiddleware(jwtAuth))
	{
		// Authentication endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", authHandler.Me)
		}

		// Project-scoped endpoints
		projects := api.Group("/projects/:project_id")
		{
			// Tickets
			tickets := projects.Group("/tickets")
			{
				tickets.GET("", ticketHandler.ListTickets)
				tickets.POST("", ticketHandler.CreateTicket)
				tickets.GET("/:ticket_id", ticketHandler.GetTicket)
				tickets.PATCH("/:ticket_id", ticketHandler.UpdateTicket)

				// Ticket messages
				tickets.GET("/:ticket_id/messages", ticketHandler.GetTicketMessages)
				tickets.POST("/:ticket_id/messages", ticketHandler.AddMessage)
				tickets.PATCH("/:ticket_id/messages/:message_id", ticketHandler.UpdateMessage)
				tickets.DELETE("/:ticket_id/messages/:message_id", ticketHandler.DeleteMessage)

				// Magic links
				tickets.POST("/:ticket_id/magic-link", authHandler.GenerateMagicLink)
			}
		}
	}

	return router
}