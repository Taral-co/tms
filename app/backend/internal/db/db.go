package db

import (
	"context"
	"fmt"
	"time"

	"github.com/bareuptime/tms/internal/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
	"github.com/rs/zerolog/log"
)

type DB struct {
	*sqlx.DB
}

// Connect establishes a database connection
func Connect(cfg *config.DatabaseConfig) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().Msg("Successfully connected to database")
	return &DB{DB: db}, nil
}

// RunMigrations runs database migrations
func (db *DB) RunMigrations(migrationsDir string) error {
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	if err := goose.Up(db.DB.DB, migrationsDir); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info().Msg("Database migrations completed successfully")
	return nil
}

// SetTenantContext sets the tenant context for RLS
func (db *DB) SetTenantContext(ctx context.Context, tenantID string, agentID *string, projectIDs []string) error {
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Set tenant ID
	if _, err := tx.ExecContext(ctx, "SET LOCAL app.tenant_id = $1", tenantID); err != nil {
		return fmt.Errorf("failed to set tenant_id: %w", err)
	}

	// Set agent ID if provided
	if agentID != nil {
		if _, err := tx.ExecContext(ctx, "SET LOCAL app.agent_id = $1", *agentID); err != nil {
			return fmt.Errorf("failed to set agent_id: %w", err)
		}
	}

	// Set project IDs if provided
	if len(projectIDs) > 0 {
		projectIDsStr := "{" + fmt.Sprintf("'%s'", projectIDs[0])
		for _, pid := range projectIDs[1:] {
			projectIDsStr += fmt.Sprintf(",'%s'", pid)
		}
		projectIDsStr += "}"
		
		if _, err := tx.ExecContext(ctx, "SET LOCAL app.project_ids = $1", projectIDsStr); err != nil {
			return fmt.Errorf("failed to set project_ids: %w", err)
		}
	}

	return tx.Commit()
}

// WithTransaction executes a function within a database transaction
func (db *DB) WithTransaction(ctx context.Context, fn func(*sqlx.Tx) error) error {
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// HealthCheck checks database health
func (db *DB) HealthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var result int
	if err := db.GetContext(ctx, &result, "SELECT 1"); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	return nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}
