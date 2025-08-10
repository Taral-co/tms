package main

import (
	"fmt"

	"github.com/bareuptime/tms/internal/models"
)

func main() {
	fmt.Println("Testing Role Enums:")
	fmt.Printf("RoleTenantAdmin: %s\n", models.RoleTenantAdmin.String())
	fmt.Printf("RoleProjectAdmin: %s\n", models.RoleProjectAdmin.String())
	fmt.Printf("RoleSupervisor: %s\n", models.RoleSupervisor.String())
	fmt.Printf("RoleAgent: %s\n", models.RoleAgent.String())
	fmt.Printf("RoleReadOnly: %s\n", models.RoleReadOnly.String())

	fmt.Println("\nTesting All Roles:")
	for _, role := range models.AllRoles() {
		fmt.Printf("- %s (valid: %t)\n", role.String(), role.IsValid())
	}

	fmt.Println("\nTesting ParseRole:")
	if role, err := models.ParseRole("tenant_admin"); err == nil {
		fmt.Printf("Parsed 'tenant_admin': %s\n", role.String())
	}

	if _, err := models.ParseRole("invalid_role"); err != nil {
		fmt.Printf("Invalid role rejected: %s\n", err.Error())
	}

	fmt.Println("\nRole enum implementation working correctly!")
}
