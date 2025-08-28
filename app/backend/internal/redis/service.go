package redis

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/redis/go-redis/v9"
)

// Service provides Redis operations for OTP and caching
type Service struct {
	client redis.UniversalClient
}

// NewService creates a new Redis service
// Uses REDIS_URL for local development or REDIS_SENTINELS for production
func NewService(config RedisConfig) *Service {
	var rdb redis.UniversalClient

	if config.URL != "" {
		// Use Redis URL for local development
		opt, err := redis.ParseURL(config.URL)
		if err != nil {
			panic(fmt.Sprintf("failed to parse Redis URL: %v", err))
		}

		// Configure connection pool settings based on environment
		configureForEnvironment(opt, config.Environment)

		rdb = redis.NewClient(opt)
		fmt.Printf("Redis client connected to: %s (environment: %s)\n", opt.Addr, config.Environment)
	} else if len(config.Sentinels) > 0 {
		// Use Redis Sentinel for production
		masterName := config.MasterName
		if masterName == "" {
			masterName = "mymaster" // Default master name
		}

		fmt.Printf("Connecting to Redis via sentinels: %v (environment: %s)\n", config.Sentinels, config.Environment)
		fmt.Printf("Master name: %s\n", masterName)

		// Create Redis Failover Cluster client for Sentinel
		failoverOpts := &redis.FailoverOptions{
			MasterName:    masterName,
			SentinelAddrs: config.Sentinels,
			Password:      config.Password,
			DB:            0,

			// Sentinel-specific settings
			SentinelPassword: config.SentinelPassword, // Sentinel authentication
			RouteByLatency:   true,                    // Route read operations to closest replica
			RouteRandomly:    false,                   // Don't route randomly
		}

		// Configure failover options based on environment
		configureFailoverForEnvironment(failoverOpts, config.Environment)

		rdb = redis.NewFailoverClusterClient(failoverOpts)
	} else {
		panic("either REDIS_URL or REDIS_SENTINELS must be configured")
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		panic(fmt.Sprintf("failed to connect to Redis: %v", err))
	}

	fmt.Printf("Redis connection established successfully (environment: %s)\n", config.Environment)
	return &Service{
		client: rdb,
	}
}

// RedisConfig represents Redis configuration
type RedisConfig struct {
	Sentinels        []string // Redis Sentinel URLs
	URL              string   // Redis URL for local development
	Password         string   // Password for Redis master
	SentinelPassword string   // Password for Sentinel authentication
	MasterName       string   // Redis master name
	Environment      string   // Environment (development, staging, production)
}

// Close closes the Redis connection
func (s *Service) Close() error {
	return s.client.Close()
}

// GetClient returns the underlying Redis client for advanced operations
func (s *Service) GetClient() redis.UniversalClient {
	return s.client
}

// Ping tests the Redis connection
func (s *Service) Ping(ctx context.Context) error {
	return s.client.Ping(ctx).Err()
}

// GenerateAndStoreOTP generates a 6-digit OTP and stores it in Redis
func (s *Service) GenerateAndStoreOTP(ctx context.Context, key string, expiration time.Duration) (string, error) {
	// Generate 6-digit OTP
	otp, err := generateOTP(6)
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}

	// Store in Redis with expiration
	err = s.client.Set(ctx, key, otp, expiration).Err()
	if err != nil {
		return "", fmt.Errorf("failed to store OTP in Redis: %w", err)
	}

	return otp, nil
}

// VerifyOTP verifies an OTP against the stored value
func (s *Service) VerifyOTP(ctx context.Context, key, providedOTP string) (bool, error) {
	storedOTP, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return false, nil // OTP not found or expired
		}
		return false, fmt.Errorf("failed to get OTP from Redis: %w", err)
	}

	// Compare OTPs
	if storedOTP == providedOTP {
		// Delete the OTP after successful verification
		s.client.Del(ctx, key)
		return true, nil
	}

	return false, nil
}

// DeleteOTP deletes an OTP from Redis
func (s *Service) DeleteOTP(ctx context.Context, key string) error {
	return s.client.Del(ctx, key).Err()
}

// StoreValidationToken stores a validation token for domain verification
func (s *Service) StoreValidationToken(ctx context.Context, key, token string, expiration time.Duration) error {
	return s.client.Set(ctx, key, token, expiration).Err()
}

// GetValidationToken retrieves a validation token
func (s *Service) GetValidationToken(ctx context.Context, key string) (string, error) {
	return s.client.Get(ctx, key).Result()
}

// IncrementAttempts increments failed attempts counter
func (s *Service) IncrementAttempts(ctx context.Context, key string, expiration time.Duration) (int64, error) {
	pipe := s.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, expiration)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return incr.Val(), nil
}

// GetAttempts gets the current attempt count
func (s *Service) GetAttempts(ctx context.Context, key string) (int64, error) {
	val, err := s.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

// generateOTP generates a random numeric OTP of specified length
func generateOTP(length int) (string, error) {
	const digits = "0123456789"
	otp := make([]byte, length)

	for i := range otp {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		otp[i] = digits[num.Int64()]
	}

	return string(otp), nil
}

// EmailOTPKey generates a Redis key for email OTP validation
func EmailOTPKey(tenantID, projectID, email string) string {
	return fmt.Sprintf("email_otp:%s:%s:%s", tenantID, projectID, email)
}

// ValidationAttemptsKey generates a Redis key for tracking validation attempts
func ValidationAttemptsKey(tenantID, projectID, email string) string {
	return fmt.Sprintf("validation_attempts:%s:%s:%s", tenantID, projectID, email)
}

// DomainValidationKey generates a Redis key for domain validation tokens
func DomainValidationKey(tenantID, projectID, domain string) string {
	return fmt.Sprintf("domain_validation:%s:%s:%s", tenantID, projectID, domain)
}

// configureForEnvironment applies optimal Redis client settings based on environment
func configureForEnvironment(opts *redis.Options, environment string) {
	switch environment {
	case "production":
		// Production: High performance, many connections
		opts.PoolSize = 50
		opts.MinIdleConns = 15
		opts.ConnMaxLifetime = 30 * time.Minute
		opts.ConnMaxIdleTime = 10 * time.Minute
		opts.PoolTimeout = 5 * time.Second
		opts.ReadTimeout = 3 * time.Second
		opts.WriteTimeout = 3 * time.Second
		opts.MaxRetries = 3
		opts.MinRetryBackoff = 8 * time.Millisecond
		opts.MaxRetryBackoff = 512 * time.Millisecond
		opts.DialTimeout = 5 * time.Second

	case "staging":
		// Staging: Balanced settings
		opts.PoolSize = 25
		opts.MinIdleConns = 8
		opts.ConnMaxLifetime = 20 * time.Minute
		opts.ConnMaxIdleTime = 8 * time.Minute
		opts.PoolTimeout = 8 * time.Second
		opts.ReadTimeout = 5 * time.Second
		opts.WriteTimeout = 5 * time.Second
		opts.MaxRetries = 2
		opts.MinRetryBackoff = 8 * time.Millisecond
		opts.MaxRetryBackoff = 512 * time.Millisecond
		opts.DialTimeout = 5 * time.Second

	case "development":
		// Development: Lower resource usage, longer timeouts for debugging
		opts.PoolSize = 10
		opts.MinIdleConns = 3
		opts.ConnMaxLifetime = 10 * time.Minute
		opts.ConnMaxIdleTime = 5 * time.Minute
		opts.PoolTimeout = 10 * time.Second
		opts.ReadTimeout = 10 * time.Second
		opts.WriteTimeout = 10 * time.Second
		opts.MaxRetries = 1
		opts.MinRetryBackoff = 8 * time.Millisecond
		opts.MaxRetryBackoff = 512 * time.Millisecond
		opts.DialTimeout = 10 * time.Second

	default:
		// Default to production settings if environment is not specified
		configureForEnvironment(opts, "production")
	}
}

// configureFailoverForEnvironment applies optimal Redis failover settings based on environment
func configureFailoverForEnvironment(opts *redis.FailoverOptions, environment string) {
	switch environment {
	case "production":
		// Production: High performance, many connections
		opts.PoolSize = 50
		opts.MinIdleConns = 15
		opts.ConnMaxLifetime = 30 * time.Minute
		opts.ConnMaxIdleTime = 10 * time.Minute
		opts.PoolTimeout = 5 * time.Second
		opts.ReadTimeout = 3 * time.Second
		opts.WriteTimeout = 3 * time.Second
		opts.MaxRetries = 3
		opts.MinRetryBackoff = 8 * time.Millisecond
		opts.MaxRetryBackoff = 512 * time.Millisecond
		opts.DialTimeout = 5 * time.Second

	case "staging":
		// Staging: Balanced settings
		opts.PoolSize = 25
		opts.MinIdleConns = 8
		opts.ConnMaxLifetime = 20 * time.Minute
		opts.ConnMaxIdleTime = 8 * time.Minute
		opts.PoolTimeout = 8 * time.Second
		opts.ReadTimeout = 5 * time.Second
		opts.WriteTimeout = 5 * time.Second
		opts.MaxRetries = 2
		opts.MinRetryBackoff = 8 * time.Millisecond
		opts.MaxRetryBackoff = 512 * time.Millisecond
		opts.DialTimeout = 5 * time.Second

	case "development":
		// Development: Lower resource usage, longer timeouts for debugging
		opts.PoolSize = 10
		opts.MinIdleConns = 3
		opts.ConnMaxLifetime = 10 * time.Minute
		opts.ConnMaxIdleTime = 5 * time.Minute
		opts.PoolTimeout = 10 * time.Second
		opts.ReadTimeout = 10 * time.Second
		opts.WriteTimeout = 10 * time.Second
		opts.MaxRetries = 1
		opts.MinRetryBackoff = 8 * time.Millisecond
		opts.MaxRetryBackoff = 512 * time.Millisecond
		opts.DialTimeout = 10 * time.Second

	default:
		// Default to production settings if environment is not specified
		configureFailoverForEnvironment(opts, "production")
	}
}
