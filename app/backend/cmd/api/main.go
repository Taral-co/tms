package main

import (
	"context"
	"database/sql"
	"fmt"
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
	"github.com/bareuptime/tms/internal/mail"
	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/redis"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/bareuptime/tms/internal/service"
	"github.com/bareuptime/tms/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
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
	ticketRepo := repo.NewTicketRepository(database.DB.DB)
	agentRepo := repo.NewAgentRepository(database.DB.DB)
	customerRepo := repo.NewCustomerRepository(database.DB.DB)
	messageRepo := repo.NewTicketMessageRepository(database.DB.DB)
	projectRepo := repo.NewProjectRepository(database.DB)
	integrationRepo := repo.NewIntegrationRepository(database.DB)
	emailRepo := repo.NewEmailRepo(database.DB)
	apiKeyRepo := repo.NewApiKeyRepository(database.DB)
	settingsRepo := repo.NewSettingsRepository(database.DB.DB)
	tenantRepo := repo.NewTenantRepository(database.DB.DB)
	emailInboxRepo := repo.NewEmailInboxRepository(database.DB.DB)
	domainValidationRepo := repo.NewDomainValidationRepo(database.DB)
	notificationRepo := repo.NewNotificationRepo(database.DB)

	// Chat repositories
	chatWidgetRepo := repo.NewChatWidgetRepo(database.DB)
	chatSessionRepo := repo.NewChatSessionRepo(database.DB)
	chatMessageRepo := repo.NewChatMessageRepo(database.DB)

	// Initialize mail service
	mailLogger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	mailService := mail.NewService(mailLogger)

	// Initialize Redis service
	redisAddr := fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port)
	redisService := redis.NewService(redisAddr, cfg.Redis.Password, cfg.Redis.DB)

	// Initialize services
	authService := service.NewAuthService(agentRepo, rbacService, jwtAuth)
	projectService := service.NewProjectService(projectRepo)
	agentService := service.NewAgentService(agentRepo, projectRepo, rbacService)
	tenantService := service.NewTenantService(tenantRepo, agentRepo, rbacService)
	// customerService := service.NewCustomerService(customerRepo, rbacService) // Reserved for future use
	messageService := service.NewMessageService(messageRepo, ticketRepo, customerRepo, agentRepo, rbacService)
	publicService := service.NewPublicService(ticketRepo, messageRepo, jwtAuth, messageService)
	ticketService := service.NewTicketService(ticketRepo, customerRepo, agentRepo, messageRepo, rbacService, mailService, publicService)
	emailInboxService := service.NewEmailInboxService(emailInboxRepo, ticketRepo, messageRepo, customerRepo, emailRepo, mailService, mailLogger)
	domainValidationService := service.NewDomainValidationService(domainValidationRepo, mailService)

	// Chat services
	chatWidgetService := service.NewChatWidgetService(chatWidgetRepo, domainValidationRepo)
	chatSessionService := service.NewChatSessionService(chatSessionRepo, chatMessageRepo, chatWidgetRepo, customerRepo, ticketService, agentService)

	// Integration services
	integrationService := service.NewIntegrationService(integrationRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, publicService)
	projectHandler := handlers.NewProjectHandler(projectService)
	ticketHandler := handlers.NewTicketHandler(ticketService, messageService)
	publicHandler := handlers.NewPublicHandler(publicService)
	integrationHandler := handlers.NewIntegrationHandler(integrationService)
	emailHandler := handlers.NewEmailHandler(emailRepo, redisService, mailService)
	emailInboxHandler := handlers.NewEmailInboxHandler(emailInboxService)
	agentHandler := handlers.NewAgentHandler(agentService)
	apiKeyHandler := handlers.NewApiKeyHandler(apiKeyRepo)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	tenantHandler := handlers.NewTenantHandler(tenantService)
	domainValidationHandler := handlers.NewDomainValidationHandler(domainValidationService)

	// Chat handlers
	chatWidgetHandler := handlers.NewChatWidgetHandler(chatWidgetService)
	chatSessionHandler := handlers.NewChatSessionHandler(chatSessionService, chatWidgetService)

	// Initialize enterprise connection manager
	connectionManager := websocket.NewConnectionManager(redisService.GetClient())
	defer connectionManager.Shutdown()

	// Notification service (needs connection manager for WebSocket delivery)
	notificationService := service.NewNotificationService(notificationRepo, connectionManager)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	chatWebSocketHandler := handlers.NewChatWebSocketHandler(chatSessionService, connectionManager, notificationService)
	agentWebSocketHandler := handlers.NewAgentWebSocketHandler(chatSessionService, connectionManager, agentService)

	// Set up combined message handling - ChatWebSocketHandler handles all Redis pub/sub messages
	// since it manages both visitor and agent connections
	agentWebSocketHandler.SetChatWSHandler(chatWebSocketHandler)

	// Setup router
	router := setupRouter(database.DB.DB, jwtAuth, authHandler, projectHandler, ticketHandler, publicHandler, integrationHandler, emailHandler, emailInboxHandler, agentHandler, apiKeyHandler, settingsHandler, tenantHandler, domainValidationHandler, notificationHandler, chatWidgetHandler, chatSessionHandler, chatWebSocketHandler, agentWebSocketHandler)

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

func setupRouter(database *sql.DB, jwtAuth *auth.Service, authHandler *handlers.AuthHandler, projectHandler *handlers.ProjectHandler, ticketHandler *handlers.TicketHandler, publicHandler *handlers.PublicHandler, integrationHandler *handlers.IntegrationHandler, emailHandler *handlers.EmailHandler, emailInboxHandler *handlers.EmailInboxHandler, agentHandler *handlers.AgentHandler, apiKeyHandler *handlers.ApiKeyHandler, settingsHandler *handlers.SettingsHandler, tenantHandler *handlers.TenantHandler, domainNameHandler *handlers.DomainNameHandler, notificationHandler *handlers.NotificationHandler, chatWidgetHandler *handlers.ChatWidgetHandler, chatSessionHandler *handlers.ChatSessionHandler, chatWebSocketHandler *handlers.ChatWebSocketHandler, agentWebSocketHandler *handlers.AgentWebSocketHandler) *gin.Engine {
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
	publicRoutes := router.Group("/api/public")
	{
		publicRoutes.GET("/health", publicHandler.Health)
		publicRoutes.GET("/tickets/:token", publicHandler.GetTicketByMagicLink)
		publicRoutes.GET("/tickets/:token/messages", publicHandler.GetTicketMessagesByMagicLink)
		publicRoutes.POST("/tickets/:token/messages", publicHandler.AddMessageByMagicLink)
		// Testing endpoint - remove in production
		publicRoutes.POST("/generate-magic-link", publicHandler.GenerateMagicLink)
	}

	// Auth routes (not protected by auth middleware)
	authRoutes := router.Group("/v1/tenants/:tenant_id/auth")
	{
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/refresh", authHandler.Refresh)
	}

	// Enterprise admin routes (protected by auth middleware but cross-tenant)
	enterprise := router.Group("/v1/enterprise")
	enterprise.Use(middleware.AuthMiddleware(jwtAuth))
	{
		enterprise.GET("/tenants", tenantHandler.ListTenants)
	}

	// API routes (protected by auth middleware)
	api := router.Group("/v1/tenants/:tenant_id")
	api.Use(middleware.AuthMiddleware(jwtAuth))
	{
		// Global agent WebSocket endpoint (not session-specific)
		api.GET("/chat/agent/ws", agentWebSocketHandler.HandleAgentWebSocket)

		// Authentication endpoints that require auth
		auth := api.Group("/auth")
		{
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", authHandler.Me)
		}

		// Project management endpoints
		{
			api.GET("/projects", projectHandler.ListProjects)
			api.POST("/projects", projectHandler.CreateProject)
			api.GET("/projects/:project_id", projectHandler.GetProject)
			api.PUT("/projects/:project_id", projectHandler.UpdateProject)
			api.DELETE("/projects/:project_id", projectHandler.DeleteProject)
		}

		// Global integration endpoints (not project-scoped)
		// {
		// 	// Integration categories and templates
		// 	api.GET("/integrations/categories", integrationHandler.ListIntegrationCategories)
		// 	api.GET("/integrations/templates", integrationHandler.ListIntegrationTemplates)
		// 	api.GET("/integrations/templates/:type", integrationHandler.GetIntegrationTemplate)

		// 	// OAuth endpoints
		// 	api.POST("/integrations/oauth/start", integrationHandler.StartOAuth)
		// 	api.POST("/integrations/:type/oauth/callback", integrationHandler.HandleOAuthCallback)
		// }

		// Agent management endpoints
		{
			api.GET("/agents", agentHandler.ListAgents)
			api.POST("/agents", agentHandler.CreateAgent)
			api.GET("/agents/:agent_id", agentHandler.GetAgent)
			api.PATCH("/agents/:agent_id", agentHandler.UpdateAgent)
			api.DELETE("/agents/:agent_id", agentHandler.DeleteAgent)
			api.POST("/agents/:agent_id/roles", agentHandler.AssignRole)
			api.DELETE("/agents/:agent_id/roles", agentHandler.RemoveRole)
			api.GET("/agents/:agent_id/roles", agentHandler.GetAgentRoles)
			// Project assignment endpoints - restricted to tenant admins only
			api.POST("/agents/:agent_id/projects/:project_id", middleware.TenantAdminMiddleware(), agentHandler.AssignToProject)
			api.DELETE("/agents/:agent_id/projects/:project_id", middleware.TenantAdminMiddleware(), agentHandler.RemoveFromProject)
			api.GET("/agents/:agent_id/projects", agentHandler.GetAgentProjects)
		}

		// API Key management endpoints
		{
			api.GET("/api-keys", apiKeyHandler.ListApiKeys)
			api.POST("/api-keys", apiKeyHandler.CreateApiKey)
			api.GET("/api-keys/:key_id", apiKeyHandler.GetApiKey)
			api.PATCH("/api-keys/:key_id", apiKeyHandler.UpdateApiKey)
			api.DELETE("/api-keys/:key_id", apiKeyHandler.DeleteApiKey)
		}

		// Project-scoped endpoints
		projects := api.Group("/projects/:project_id")
		{
			// Tickets
			tickets := projects.Group("/tickets")
			tickets.Use(middleware.TicketAccessMiddleware())
			{
				tickets.GET("", ticketHandler.ListTickets)
				tickets.POST("", ticketHandler.CreateTicket)
				tickets.GET("/:ticket_id", ticketHandler.GetTicket)

				// Apply reassignment middleware for update operations
				tickets.PATCH("/:ticket_id", middleware.TicketReassignmentMiddleware(), ticketHandler.UpdateTicket)

				// Dedicated reassignment endpoint (requires admin permissions)
				tickets.POST("/:ticket_id/reassign", middleware.ProjectAdminMiddleware(), ticketHandler.ReassignTicket)

				// Delete ticket (requires admin permissions)
				tickets.DELETE("/:ticket_id", middleware.ProjectAdminMiddleware(), ticketHandler.DeleteTicket)

				// Customer validation and magic links
				tickets.POST("/:ticket_id/validate-customer", ticketHandler.ValidateCustomer)
				tickets.POST("/:ticket_id/send-magic-link", ticketHandler.SendMagicLink)

				// Ticket messages
				tickets.GET("/:ticket_id/messages", ticketHandler.GetTicketMessages)
				tickets.POST("/:ticket_id/messages", ticketHandler.AddMessage)
				tickets.PATCH("/:ticket_id/messages/:message_id", ticketHandler.UpdateMessage)
				tickets.DELETE("/:ticket_id/messages/:message_id", ticketHandler.DeleteMessage)

			}

			// Settings endpoints
			settings := projects.Group("/settings")
			{
				settings.GET("/branding", middleware.ProjectAdminMiddleware(), settingsHandler.GetBrandingSettings)
				settings.PUT("/branding", middleware.ProjectAdminMiddleware(), settingsHandler.UpdateBrandingSettings)
				settings.GET("/automation", middleware.ProjectAdminMiddleware(), settingsHandler.GetAutomationSettings)
				settings.PUT("/automation", middleware.ProjectAdminMiddleware(), settingsHandler.UpdateAutomationSettings)
			}

			// Notifications endpoints
			notifications := projects.Group("/notifications")
			{
				notifications.GET("", notificationHandler.GetNotifications)
				notifications.GET("/count", notificationHandler.GetNotificationCount)
				notifications.PUT("/:notification_id/read", notificationHandler.MarkNotificationAsRead)
				notifications.PUT("/mark-all-read", notificationHandler.MarkAllNotificationsAsRead)
			}

			// Integrations - using the available methods
			integrations := projects.Group("/integrations")
			{
				// Integration categories and templates
				integrations.GET("/categories", integrationHandler.ListIntegrationCategories)
				integrations.GET("/templates", integrationHandler.ListIntegrationTemplates)
				integrations.GET("/templates/:type", integrationHandler.GetIntegrationTemplate)

				// OAuth endpoints
				integrations.POST("/oauth/start", integrationHandler.StartOAuth)
				integrations.POST("/:type/oauth/callback", integrationHandler.HandleOAuthCallback)
				integrations.GET("", integrationHandler.ListIntegrations)
				integrations.POST("", integrationHandler.CreateIntegration)
				integrations.GET("/with-templates", integrationHandler.ListIntegrationsWithTemplates)
				integrations.GET("/:integration_id", integrationHandler.GetIntegration)
				integrations.PATCH("/:integration_id", integrationHandler.UpdateIntegration)
				integrations.DELETE("/:integration_id", integrationHandler.DeleteIntegration)
				// integrations.POST("/:integration_id/test", integrationHandler.TestIntegrationConnection)
				// integrations.GET("/:integration_id/metrics", integrationHandler.GetIntegrationMetrics)

				// Integration configurations
				// integrations.POST("/:integration_id/slack", integrationHandler.CreateSlackConfiguration)
				// integrations.POST("/:integration_id/jira", integrationHandler.CreateJiraConfiguration)
				// integrations.POST("/:integration_id/calendly", integrationHandler.CreateCalendlyConfiguration)
				// integrations.POST("/:integration_id/zapier", integrationHandler.CreateZapierConfiguration)

				// Webhook subscriptions
				// webhooks := integrations.Group("/:integration_id/webhooks")
				// {
				// 	webhooks.GET("", integrationHandler.ListWebhookSubscriptions)
				// 	webhooks.POST("", integrationHandler.CreateWebhookSubscription)
				// }
			}

			// Email connectors and mailboxes
			email := projects.Group("/email")
			{
				// Email connectors
				email.GET("/connectors", emailHandler.ListConnectors)
				email.POST("/connectors", emailHandler.CreateConnector)
				email.GET("/connectors/:connector_id", emailHandler.GetConnector)
				email.PATCH("/connectors/:connector_id", emailHandler.UpdateConnector)
				email.DELETE("/connectors/:connector_id", emailHandler.DeleteConnector)
				email.POST("/connectors/:connector_id/test", emailHandler.TestConnector)
				email.POST("/connectors/:connector_id/validate", emailHandler.ValidateConnector)
				email.POST("/connectors/:connector_id/verify-otp", emailHandler.VerifyConnectorOTP)

				// Email mailboxes
				email.GET("/mailboxes", emailHandler.ListMailboxes)
				email.POST("/mailboxes", emailHandler.CreateMailbox)
				email.GET("/mailboxes/:mailbox_id", emailHandler.GetMailbox)
				email.PUT("/mailboxes/:mailbox_id", emailHandler.UpdateMailbox)
				email.DELETE("/mailboxes/:mailbox_id", emailHandler.DeleteMailbox)

				// Email inbox
				inbox := email.Group("/inbox")
				{
					inbox.GET("", emailInboxHandler.ListEmails)
					inbox.GET("/:id", emailInboxHandler.GetEmail)
					inbox.POST("/:id/convert-to-ticket", emailInboxHandler.ConvertToTicket)
					inbox.POST("/:id/reply", emailInboxHandler.ReplyToEmail)
					inbox.POST("/:id/mark-read", emailInboxHandler.MarkAsRead)
					inbox.POST("/sync", emailInboxHandler.SyncEmails)
					inbox.GET("/sync-status", emailInboxHandler.GetSyncStatus)
				}

				// Domain validation
				domains := email.Group("/domains")
				{
					domains.GET("", domainNameHandler.ListDomainNames)
					domains.POST("", domainNameHandler.CreateDomainName)
					domains.POST("/:domain_id/verify", domainNameHandler.VerifyDomain)
					domains.DELETE("/:domain_id", domainNameHandler.DeleteDomainName)
				}
			}

			// Chat system endpoints
			chat := projects.Group("/chat")
			{
				// Chat widgets
				chat.GET("/widgets", chatWidgetHandler.ListChatWidgets)
				chat.POST("/widgets", chatWidgetHandler.CreateChatWidget)
				chat.GET("/widgets/:widget_id", chatWidgetHandler.GetChatWidget)
				chat.PATCH("/widgets/:widget_id", chatWidgetHandler.UpdateChatWidget)
				chat.DELETE("/widgets/:widget_id", chatWidgetHandler.DeleteChatWidget)

				// Chat sessions (agent endpoints)
				chat.GET("/sessions", chatSessionHandler.ListChatSessions)
				chat.GET("/sessions/:session_id", chatSessionHandler.GetChatSession)
				chat.POST("/sessions/:session_id/assign", chatSessionHandler.AssignAgent)
				chat.GET("/sessions/:session_id/messages", chatSessionHandler.GetChatMessages)
				chat.POST("/sessions/:session_id/messages", chatSessionHandler.SendMessage)
				chat.POST("/sessions/:session_id/messages/:message_id/read", chatSessionHandler.MarkAgentMessagesAsRead)

			}
		}

		// Public chat endpoints (no authentication required)
		publicChat := router.Group("/api/public/chat")
		{
			// Widget endpoints
			publicChat.GET("/widgets/domain/:domain", chatWidgetHandler.GetChatWidgetByDomain)

			// Widget initialization and chat initiation
			publicChat.POST("/widgets/:widget_id/initiate", chatSessionHandler.InitiateChat)

			// Public chat session endpoints (token-based auth)
			publicChat.POST("/sessions/:session_id/messages/:message_id/read", chatSessionHandler.MarkVisitorMessagesAsRead)

			publicChat.POST("/sessions/:session_id/messages", chatSessionHandler.SendVisitorMessage)

			// WebSocket endpoint for visitors
			publicChat.GET("/ws/:session_id", chatWebSocketHandler.HandleWebSocketPublic)
		}
	}

	return router
}
