#!/bin/bash

# Test script for magic link functionality
# This script tests the public magic link API endpoints

BASE_URL="http://localhost:8080"
CONTENT_TYPE="Content-Type: application/json"

echo "🧪 Testing Magic Link Functionality"
echo "========================================"

# First, let's try to generate a magic link (this endpoint should exist for testing)
echo "📧 Step 1: Generating magic link token..."

# Example request body - these would be real IDs in a real system
GENERATE_REQUEST='{
  "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "123e4567-e89b-12d3-a456-426614174001", 
  "ticket_id": "123e4567-e89b-12d3-a456-426614174002",
  "customer_id": "123e4567-e89b-12d3-a456-426614174003"
}'

MAGIC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/public/generate-magic-link" \
  -H "$CONTENT_TYPE" \
  -d "$GENERATE_REQUEST" 2>/dev/null)



if [ $? -eq 0 ] && echo "$MAGIC_RESPONSE" | grep -q "magic_token"; then
    MAGIC_TOKEN=$(echo "$MAGIC_RESPONSE" | grep -o '"magic_token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Magic token generated: ${MAGIC_TOKEN}"
    
    echo ""
    echo "🎫 Step 2: Testing public ticket access..."
    
    # Test accessing the ticket with the magic token
    TICKET_RESPONSE=$(curl -s "$BASE_URL/api/public/tickets/$MAGIC_TOKEN" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$TICKET_RESPONSE" | grep -q "valid"; then
        echo "✅ Public ticket access working"
        echo "📄 Response preview: $(echo "$TICKET_RESPONSE" | head -c 100)..."
    else
        echo "❌ Public ticket access failed"
        echo "Response: $TICKET_RESPONSE"
    fi
    
    echo ""
    echo "💬 Step 3: Testing message retrieval..."
    
    # Test getting messages
    MESSAGES_RESPONSE=$(curl -s "$BASE_URL/api/public/tickets/$MAGIC_TOKEN/messages" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "✅ Message retrieval endpoint accessible"
        echo "📄 Response preview: $(echo "$MESSAGES_RESPONSE" | head -c 100)..."
    else
        echo "❌ Message retrieval failed"
    fi
    
    echo ""
    echo "✉️ Step 4: Testing message posting..."
    
    # Test posting a message
    MESSAGE_REQUEST='{"body": "Test message from public interface"}'
    
    POST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/public/tickets/$MAGIC_TOKEN/messages" \
      -H "$CONTENT_TYPE" \
      -d "$MESSAGE_REQUEST" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "✅ Message posting endpoint accessible"
        echo "📄 Response preview: $(echo "$POST_RESPONSE")..."
    else
        echo "❌ Message posting failed"
    fi
    
else
    echo "❌ Failed to generate magic link token"
    echo "Response: $MAGIC_RESPONSE"
    echo ""
    echo "Note: This is expected if the backend isn't running or"
    echo "      if there's no test data in the database."
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "To run the frontend public view:"
echo "cd app/frontend/public-view && pnpm run dev"
echo ""
echo "To access a ticket with magic link:"
echo "http://localhost:3001/tickets/[MAGIC_TOKEN]"
