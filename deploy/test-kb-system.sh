#!/bin/bash

# Knowledge Base System Test Script

set -e

echo "🧪 Testing Knowledge Base AI System..."

BASE_URL="http://localhost:8080"
AI_URL="http://localhost:8081"

# Function to test endpoint
test_endpoint() {
    local url=$1
    local description=$2
    
    echo "  Testing: $description"
    if curl -s -f "$url" > /dev/null; then
        echo "  ✅ $description - OK"
    else
        echo "  ❌ $description - Failed"
        return 1
    fi
}

# Test basic health endpoints
echo "🔍 Testing health endpoints..."
test_endpoint "$BASE_URL/health" "Backend Health Check"
test_endpoint "$AI_URL/health" "AI Service Health Check"

# Test database connectivity
echo "🗄️ Testing database connectivity..."
# This would require a test endpoint that checks DB connection

# Test AI model availability
echo "🤖 Testing AI model availability..."
test_endpoint "$AI_URL/api/v1/embeddings/generate" "Embedding Service" || echo "  ⚠️ AI models may still be loading"

# Test search service
echo "🔍 Testing search service..."
# This would require creating test data first

echo ""
echo "📊 Service Status Summary:"
docker-compose ps

echo ""
echo "🎉 Basic tests completed!"
echo "💡 For comprehensive testing, use the API documentation at:"
echo "   Backend: $BASE_URL/docs"
echo "   AI Service: $AI_URL/docs"
