#!/bin/bash

# Test script to generate a magic link for the public view
# Make sure your backend is running on localhost:8080

echo "Generating magic link for testing..."

# You'll need to replace these UUIDs with actual values from your database
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"
PROJECT_ID="550e8400-e29b-41d4-a716-446655440001"
TICKET_ID="550e8400-e29b-41d4-a716-446655440050"
CUSTOMER_ID="550e8400-e29b-41d4-a716-446655440020"

# Generate magic link
response=$(curl -s -X POST http://localhost:8080/v1/public/generate-magic-link \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_id\": \"$TENANT_ID\",
    \"project_id\": \"$PROJECT_ID\",
    \"ticket_id\": \"$TICKET_ID\",
    \"customer_id\": \"$CUSTOMER_ID\"
  }")

echo "Response: $response"

# Extract the public_url from the response
public_url=$(echo $response | grep -o '"public_url":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$public_url" ]; then
    echo ""
    echo "Generated public URL:"
    echo "$public_url"
    echo ""
    echo "To test the public view:"
    echo "1. Make sure your backend is running on localhost:8080"
    echo "2. Open the URL above in your browser"
    echo ""
    echo "Or copy this URL to your browser:"
    echo "$public_url"
else
    echo "Failed to generate magic link. Check if your backend is running and the UUIDs are valid."
fi
