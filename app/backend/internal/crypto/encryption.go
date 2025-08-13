package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"os"
)

// PasswordEncryption handles password encryption and decryption
type PasswordEncryption struct {
	gcm cipher.AEAD
}

// NewPasswordEncryption creates a new password encryption service
func NewPasswordEncryption() (*PasswordEncryption, error) {
	// Get encryption key from environment variable
	// In production, this should come from a secure key management service
	encryptionKey := os.Getenv("TMS_ENCRYPTION_KEY")
	if encryptionKey == "" {
		// For development, use a default key (NOT for production!)
		encryptionKey = "MySecretKey12345MySecretKey12345" // 32 bytes for AES-256
	}

	// Create AES cipher
	block, err := aes.NewCipher([]byte(encryptionKey)[:32]) // Use first 32 bytes for AES-256
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	return &PasswordEncryption{gcm: gcm}, nil
}

// Encrypt encrypts a password and returns base64 encoded encrypted data
func (pe *PasswordEncryption) Encrypt(password string) ([]byte, error) {
	if password == "" {
		return nil, nil
	}

	// Create a random nonce
	nonce := make([]byte, pe.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt the password
	ciphertext := pe.gcm.Seal(nonce, nonce, []byte(password), nil)

	// Encode to base64 for storage
	encoded := base64.StdEncoding.EncodeToString(ciphertext)
	return []byte(encoded), nil
}

// Decrypt decrypts a base64 encoded encrypted password
func (pe *PasswordEncryption) Decrypt(encryptedData []byte) (string, error) {
	if len(encryptedData) == 0 {
		return "", nil
	}

	// Decode from base64
	ciphertext, err := base64.StdEncoding.DecodeString(string(encryptedData))
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Extract nonce
	nonceSize := pe.gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Decrypt
	plaintext, err := pe.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}
