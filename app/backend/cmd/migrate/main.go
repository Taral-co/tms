package main

import (
	"fmt"
	"log"
	"os"

	"github.com/bareuptime/tms/internal/config"
	"github.com/bareuptime/tms/internal/db"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run cmd/migrate/main.go [up|down|version]")
	}

	command := os.Args[1]

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	database, err := db.NewConnection(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	switch command {
	case "up":
		err = runMigrations(database)
		if err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		fmt.Println("Migrations completed successfully")
	case "down":
		// In a real system, you might want to implement rollback functionality
		fmt.Println("Migration rollback not implemented")
	case "version":
		version, err := getCurrentMigrationVersion(database)
		if err != nil {
			log.Fatalf("Failed to get migration version: %v", err)
		}
		fmt.Printf("Current migration version: %s\n", version)
	default:
		log.Fatalf("Unknown command: %s", command)
	}
}

func runMigrations(database *db.DB) error {
	// This is a simple approach - in production you might want to use
	// a proper migration library like golang-migrate
	migrations := []string{
		"migrations/001_initial_schema.sql",
		"migrations/002_rls_policies.sql",
		"migrations/003_seed_data.sql",
	}

	for _, migration := range migrations {
		fmt.Printf("Running migration: %s\n", migration)
		content, err := os.ReadFile(migration)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", migration, err)
		}

		_, err = database.Exec(string(content))
		if err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", migration, err)
		}
	}

	return nil
}

func getCurrentMigrationVersion(database *db.DB) (string, error) {
	// This is a simple implementation - in production you'd track migration versions properly
	var count int
	err := database.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents'").Scan(&count)
	if err != nil {
		return "", err
	}

	if count > 0 {
		return "003_seed_data", nil
	}

	return "none", nil
}
