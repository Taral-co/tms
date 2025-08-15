package util

import (
	"crypto/rand"
	"math/big"
	"regexp"
	"strings"
)

func GenerateOTP(length int) (string, error) {
	const digits = "0123456789"
	result := make([]byte, length)

	for i := range result {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		result[i] = digits[num.Int64()]
	}

	return string(result), nil
}

// extractEmailAddress extracts the bare email address from formats like:
// "Display Name <email@domain.com>" -> "email@domain.com"
// "email@domain.com" -> "email@domain.com"
func ExtractEmailAddress(address string) string {
	// Use regex to extract email from "Display Name <email@domain.com>" format
	re := regexp.MustCompile(`<([^>]+)>`)
	matches := re.FindStringSubmatch(address)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	// If no angle brackets found, assume it's already a bare email
	return strings.TrimSpace(address)
}
