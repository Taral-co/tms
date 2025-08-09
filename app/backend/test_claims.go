package main

import (
	"fmt"
	"github.com/bareuptime/tms/internal/auth"
)

func main() {
	service := auth.NewService("test", 3600, 86400, 86400, 3600)
	claims := &auth.Claims{
		TenantID:  "test",
		TokenType: "access",
	}
	fmt.Printf("TenantID type: %T, TokenType: %s\n", claims.TenantID, claims.TokenType)
}
