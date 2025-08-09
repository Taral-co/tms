package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/bareuptime/tms/internal/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// DB wraps the database connection and provides RLS support
type DB struct {
	*sqlx.DB
}

// Connect creates a new database connection
func Connect(cfg *config.DatabaseConfig) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	sqlDB, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db := sqlx.NewDb(sqlDB, "postgres")
	return &DB{DB: db}, nil
}

// BeginTxWithRLS begins a transaction and sets RLS variables
func (db *DB) BeginTxWithRLS(ctx context.Context, tenantID, agentID string, projectIDs []string) (*sqlx.Tx, error) {
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}

	// Set RLS variables
	if tenantID != "" {
		if _, err := tx.ExecContext(ctx, "SET LOCAL app.tenant_id = $1", tenantID); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to set tenant_id: %w", err)
		}
	}

	if agentID != "" {
		if _, err := tx.ExecContext(ctx, "SET LOCAL app.agent_id = $1", agentID); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to set agent_id: %w", err)
		}
	}

	if len(projectIDs) > 0 {
		projectIDsStr := ""
		for i, id := range projectIDs {
			if i > 0 {
				projectIDsStr += ","
			}
			projectIDsStr += id
		}
		if _, err := tx.ExecContext(ctx, "SET LOCAL app.project_ids = $1", projectIDsStr); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to set project_ids: %w", err)
		}
	}

	return tx, nil
}

// SetRLSVariables sets RLS variables for the current connection
func (db *DB) SetRLSVariables(ctx context.Context, tenantID, agentID string, projectIDs []string) error {
	if tenantID != "" {
		if _, err := db.ExecContext(ctx, "SET LOCAL app.tenant_id = $1", tenantID); err != nil {
			return fmt.Errorf("failed to set tenant_id: %w", err)
		}
	}

	if agentID != "" {
		if _, err := db.ExecContext(ctx, "SET LOCAL app.agent_id = $1", agentID); err != nil {
			return fmt.Errorf("failed to set agent_id: %w", err)
		}
	}

	if len(projectIDs) > 0 {
		projectIDsStr := ""
		for i, id := range projectIDs {
			if i > 0 {
				projectIDsStr += ","
			}
			projectIDsStr += id
		}
		if _, err := db.ExecContext(ctx, "SET LOCAL app.project_ids = $1", projectIDsStr); err != nil {
			return fmt.Errorf("failed to set project_ids: %w", err)
		}
	}

	return nil
}
