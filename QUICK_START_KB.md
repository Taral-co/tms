# Knowledge Base AI System - Quick Start Guide

## 🚀 Getting Started

### 1. Start the System
```bash
cd deploy
./start-kb-system.sh
```

Wait for all services to start (this may take 5-10 minutes, especially on first run as AI models are downloaded).

### 2. Apply Database Migrations
```bash
cd app/backend
./bin/api migrate
```

### 3. Create Demo Data (Optional)
```bash
cd deploy
./create-demo-data.sh
```

### 4. Access the System
- **Public Knowledge Base**: http://localhost:5174
- **Agent Console**: http://localhost:5173  
- **Backend API**: http://localhost:8080/docs
- **AI Service**: http://localhost:8081/docs

## 🧪 Testing the Knowledge Base

### Search for Articles
```bash
curl -X POST http://localhost:8080/api/v1/kb/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "password reset",
    "limit": 5
  }'
```

### Ask AI a Question
```bash
curl -X POST http://localhost:8081/api/v1/ai/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I reset my password?",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

### Create a New Article
```bash
curl -X POST http://localhost:8080/api/v1/kb/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to Contact Support",
    "content": "You can contact our support team by...",
    "tags": ["support", "contact", "help"],
    "is_public": true,
    "status": "published"
  }'
```

### Generate Text Embeddings
```bash
curl -X POST http://localhost:8081/api/v1/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "How to reset password"
  }'
```

### Find Similar Articles
```bash
curl -X POST http://localhost:8081/api/v1/search/similar \
  -H "Content-Type: application/json" \
  -d '{
    "text": "login problems",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440001",
    "limit": 5,
    "threshold": 0.7
  }'
```

## 🛠️ Common Tasks

### Check System Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f kb-ai-service
docker-compose logs -f backend
```

### Restart a Service
```bash
docker-compose restart kb-ai-service
```

### Stop the System
```bash
docker-compose down
```

### Update and Restart
```bash
git pull
docker-compose pull
docker-compose up -d --force-recreate
```

## 🔧 AI Model Management

### Check Available Models
```bash
docker-compose exec ollama ollama list
```

### Pull Additional Models
```bash
# Smaller, faster model
docker-compose exec ollama ollama pull phi3:mini

# Larger, more capable model  
docker-compose exec ollama ollama pull llama2:13b
```

### Update AI Service Configuration
Edit `deploy/.env`:
```bash
LLM_MODEL=phi3:mini
EMBEDDING_MODEL=all-minilm-l6-v2
```

Then restart:
```bash
docker-compose restart kb-ai-service
```

## 📊 Monitoring

### Database Administration
Visit http://localhost:5050
- Email: admin@admin.com
- Password: admin

### Vector Database UI
Visit http://localhost:6333/dashboard

### Object Storage UI
Visit http://localhost:9001
- Username: minioadmin
- Password: minioadmin123

### Email Testing
Visit http://localhost:8025 (MailHog web interface)

## ❗ Troubleshooting

### AI Service Won't Start
```bash
# Check if models are downloaded
docker-compose exec ollama ollama list

# Restart AI service
docker-compose restart kb-ai-service

# Check logs
docker-compose logs kb-ai-service
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U tms -d tms -c "SELECT 1;"

# Restart database
docker-compose restart postgres
```

### Vector Search Not Working
```bash
# Check Qdrant health
curl http://localhost:6333/health

# Check collections
curl http://localhost:6333/collections

# Restart Qdrant
docker-compose restart qdrant
```

### Frontend Issues
```bash
# Check if backend is accessible
curl http://localhost:8080/health

# Restart frontend
docker-compose restart agent-console public-view
```

## 🎯 Next Steps

1. **Integrate with your authentication system** - Update auth middleware in handlers
2. **Customize the UI** - Modify frontend components in `app/frontend/`
3. **Add more AI models** - Configure additional models in Ollama
4. **Set up production monitoring** - Add metrics and alerting
5. **Configure backup strategy** - Set up database and vector store backups

## 📚 Additional Resources

- [Backend API Documentation](http://localhost:8080/docs)
- [AI Service API Documentation](http://localhost:8081/docs)
- [Full README](../KNOWLEDGE_BASE_README.md)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Ollama Documentation](https://ollama.ai/docs)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
