#!/bin/bash

# Knowledge Base AI System Startup Script

set -e

echo "🚀 Starting Knowledge Base AI System..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Navigate to deployment directory
cd "$(dirname "$0")"

# Check if .env file exists, create if not
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file with default values..."
    cat > .env << EOF
# Database
POSTGRES_DB=tms
POSTGRES_USER=tms
POSTGRES_PASSWORD=tms123

# Redis
REDIS_PASSWORD=

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# Email
MAIL_DOMAIN=localhost
MAX_MESSAGE_SIZE=1048576

# JWT
JWT_SECRET=your-jwt-secret-change-in-production

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# AI Settings
EMBEDDING_MODEL=all-minilm-l6-v2
LLM_MODEL=llama2:7b
EOF
    echo "✅ .env file created. Please review and update as needed."
fi

# Pull required Docker images
echo "📦 Pulling Docker images..."
docker-compose pull postgres redis minio mailhog elasticsearch qdrant ollama

# Start core services first
echo "🔧 Starting core services..."
docker-compose up -d postgres redis minio elasticsearch qdrant

# Wait for services to be healthy
echo "⏳ Waiting for core services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
for service in postgres redis minio elasticsearch qdrant; do
    echo "  Checking $service..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose ps $service | grep -q "healthy\|Up"; then
            echo "  ✅ $service is ready"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        echo "  ❌ $service failed to start properly"
        docker-compose logs $service
        exit 1
    fi
done

# Start Ollama and pull AI models
echo "🤖 Starting Ollama and pulling AI models..."
docker-compose up -d ollama

# Wait for Ollama to start
sleep 5

# Pull AI models
echo "📥 Pulling AI models (this may take a while)..."
docker-compose exec ollama ollama pull llama2:7b &
PULL_PID=$!

# Start the knowledge base AI service
echo "🧠 Starting Knowledge Base AI service..."
docker-compose up -d kb-ai-service

# Start backend service
echo "🔧 Starting backend service..."
docker-compose up -d backend

# Start email services
echo "📧 Starting email services..."
docker-compose up -d mailhog guerrilla-mail

# Start frontend services
echo "🎨 Starting frontend services..."
docker-compose up -d agent-console public-view

# Start pgAdmin for database management
echo "🗄️ Starting pgAdmin..."
docker-compose up -d pgadmin

# Wait for AI model to finish downloading
echo "⏳ Waiting for AI model download to complete..."
wait $PULL_PID || echo "Note: AI model pull may continue in background"

# Run database migrations
echo "🗄️ Running database migrations..."
sleep 5
docker-compose exec backend ./bin/api migrate || echo "⚠️ Migration failed - may need to run manually"

echo ""
echo "🎉 Knowledge Base AI System started successfully!"
echo ""
echo "📊 Service URLs:"
echo "  🎯 Agent Console:     http://localhost:5173"
echo "  🌐 Public View:       http://localhost:5174"
echo "  🔧 Backend API:       http://localhost:8080"
echo "  🧠 AI Service:        http://localhost:8081"
echo "  📧 MailHog:           http://localhost:8025"
echo "  🗄️ pgAdmin:           http://localhost:5050"
echo "  📊 MinIO:             http://localhost:9001"
echo "  🔍 Elasticsearch:     http://localhost:9200"
echo "  🚀 Qdrant:            http://localhost:6333"
echo "  🤖 Ollama:            http://localhost:11434"
echo ""
echo "🔑 Default Credentials:"
echo "  pgAdmin:     admin@admin.com / admin"
echo "  MinIO:       minioadmin / minioadmin123"
echo ""
echo "📚 API Documentation:"
echo "  Backend:     http://localhost:8080/docs"
echo "  AI Service:  http://localhost:8081/docs"
echo ""
echo "💡 To check service status: docker-compose ps"
echo "💡 To view logs: docker-compose logs [service-name]"
echo "💡 To stop all services: docker-compose down"
