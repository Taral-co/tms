# Knowledge Base AI System

An AI-powered knowledge base system for the Ticket Management System (TMS) that helps answer questions using tickets, emails, and chat data.

## 🌟 Features

### Core Knowledge Base
- **Article Management**: Create, edit, and organize knowledge base articles
- **Category System**: Hierarchical categorization of articles
- **Full-Text Search**: PostgreSQL-based search with ranking
- **Version Control**: Track article changes and versions
- **Analytics**: View counts, feedback, and usage statistics

### AI-Powered Capabilities
- **Intelligent Q&A**: Answer questions using AI and knowledge base context
- **Vector Search**: Semantic similarity search using embeddings
- **Auto-Generation**: Generate KB articles from resolved tickets
- **Content Enhancement**: AI-powered summaries, keywords, and improvements
- **Smart Suggestions**: Recommend related articles and content

### Search & Discovery
- **Hybrid Search**: Combine keyword and semantic search
- **Vector Similarity**: Find similar content using embeddings
- **Contextual Results**: Rank results based on relevance and popularity
- **Real-time Suggestions**: Get instant recommendations as you type

### Integration Points
- **Ticket Integration**: Generate KB from resolved tickets
- **Email Integration**: Extract knowledge from email conversations
- **Chat Integration**: Learn from chat interactions
- **Agent Console**: Integrated into support workflows
- **Public View**: Customer-facing knowledge base

## 🏗️ Architecture

### Core Services
- **Backend API** (Go): Main TMS API with KB endpoints
- **KB AI Service** (Python/FastAPI): AI and ML capabilities
- **PostgreSQL**: Primary database with full-text search
- **Redis**: Caching and session management

### AI/ML Stack
- **Ollama**: Local LLM for question answering
- **Sentence Transformers**: Text embeddings
- **Qdrant**: Vector database for similarity search
- **Elasticsearch**: Advanced search capabilities

### Supporting Services
- **MinIO**: Object storage for attachments
- **MailHog**: Email testing
- **pgAdmin**: Database administration

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- At least 8GB RAM (16GB recommended for AI features)
- 10GB free disk space

### Option 1: Full AI System (Recommended)
```bash
cd deploy
./start-kb-system.sh
```

### Option 2: Manual Setup
```bash
cd deploy
docker-compose up -d
```

### Access Points
- **Agent Console**: http://localhost:5173
- **Public Knowledge Base**: http://localhost:5174
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:8081
- **Database Admin**: http://localhost:5050

## 📚 API Documentation

### Backend API (Go)
Available at: http://localhost:8080/docs

#### Knowledge Base Endpoints
```
GET    /api/v1/kb/categories           # List categories
POST   /api/v1/kb/categories           # Create category
GET    /api/v1/kb/articles             # Search articles
POST   /api/v1/kb/articles             # Create article
GET    /api/v1/kb/articles/:id         # Get article
POST   /api/v1/kb/articles/:id/view    # Record view
POST   /api/v1/kb/articles/:id/feedback # Submit feedback
POST   /api/v1/kb/search               # Search articles
POST   /api/v1/kb/answer               # Answer question
GET    /api/v1/kb/stats                # Get statistics
```

### AI Service API (Python)
Available at: http://localhost:8081/docs

#### AI Endpoints
```
POST   /api/v1/ai/answer               # AI-powered Q&A
POST   /api/v1/ai/summarize            # Generate summaries
POST   /api/v1/ai/keywords             # Suggest keywords
POST   /api/v1/ai/improve              # Improve content

POST   /api/v1/search/articles         # Vector search
POST   /api/v1/search/similar          # Find similar content

POST   /api/v1/embeddings/generate     # Generate embeddings
POST   /api/v1/embeddings/similarity   # Compute similarity
```

## 🛠️ Configuration

### Environment Variables

#### Core Settings
```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=tms
DB_USER=tms
DB_PASSWORD=tms123

# Redis
REDIS_URL=redis://redis:6379

# AI Settings
OLLAMA_URL=http://ollama:11434
QDRANT_URL=http://qdrant:6333
ELASTICSEARCH_URL=http://elasticsearch:9200
EMBEDDING_MODEL=all-minilm-l6-v2
LLM_MODEL=llama2:7b
```

#### AI Model Configuration
```bash
# Embedding settings
EMBEDDING_DIMENSION=384
MAX_CONTENT_LENGTH=8000
CHUNK_SIZE=512
CHUNK_OVERLAP=50

# AI settings
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=500
MAX_CONTEXT_LENGTH=4000
```

## 🔄 Usage Examples

### Creating a Knowledge Base Article
```bash
curl -X POST http://localhost:8080/api/v1/kb/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to Reset Password",
    "content": "Step-by-step guide to reset your password...",
    "tags": ["password", "reset", "login"],
    "is_public": true,
    "status": "published"
  }'
```

### Searching Articles
```bash
curl -X POST http://localhost:8080/api/v1/kb/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "password reset",
    "limit": 10,
    "sort_by": "relevance"
  }'
```

### AI-Powered Question Answering
```bash
curl -X POST http://localhost:8081/api/v1/ai/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I reset my password?",
    "tenant_id": "uuid-here",
    "project_id": "uuid-here"
  }'
```

### Vector Similarity Search
```bash
curl -X POST http://localhost:8081/api/v1/search/similar \
  -H "Content-Type: application/json" \
  -d '{
    "text": "login issues",
    "tenant_id": "uuid-here", 
    "project_id": "uuid-here",
    "limit": 5,
    "threshold": 0.7
  }'
```

## 📊 Database Schema

### Knowledge Base Tables
- `kb_categories`: Article categories and hierarchy
- `kb_articles`: Main article content and metadata
- `kb_auto_entries`: AI-generated article suggestions
- `kb_search_index`: Full-text search vectors
- `kb_article_views`: Analytics and view tracking
- `kb_feedback`: User feedback on articles

### Key Features
- Full-text search with PostgreSQL
- Vector storage for embeddings
- Multi-tenant isolation
- Audit logging
- Performance analytics

## 🤖 AI Features

### Question Answering
The system uses a hybrid approach:
1. **Vector Search**: Find semantically similar articles
2. **Context Building**: Combine relevant articles
3. **AI Generation**: Use LLM to generate answers
4. **Confidence Scoring**: Rate answer quality

### Auto-Generation
Automatically create KB articles from:
- **Resolved Tickets**: Extract solutions from ticket history
- **Email Threads**: Identify helpful email exchanges
- **Chat Logs**: Learn from successful chat resolutions

### Content Enhancement
- **Smart Summaries**: AI-generated article summaries
- **Keyword Extraction**: Automatic tag and keyword suggestions
- **Content Improvement**: Enhance clarity based on feedback
- **Translation**: Multi-language support (future)

## 🔧 Development

### Local Development Setup
```bash
# Start development environment
cd deploy
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Run backend in development mode
cd app/backend
go run cmd/api/main.go

# Run AI service in development mode
cd app/kb-ai-service
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Backend tests
cd app/backend
go test ./...

# AI service tests
cd app/kb-ai-service
pytest

# Integration tests
cd deploy
./run-tests.sh
```

## 📈 Monitoring

### Health Checks
- Backend: http://localhost:8080/health
- AI Service: http://localhost:8081/health
- Database: Check via pgAdmin
- Vector DB: http://localhost:6333/health

### Logs
```bash
# View all logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f kb-ai-service
docker-compose logs -f backend
```

### Metrics
- Article view counts
- Search query analytics
- AI response confidence scores
- System performance metrics

## 🔒 Security

### Authentication
- JWT-based authentication
- Multi-tenant isolation
- Role-based access control

### Data Protection
- Encrypted sensitive data
- Audit logging
- Rate limiting
- Input validation

## 🚀 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with secrets
docker-compose -f docker-compose.prod.yml up -d
```

### Scaling
- Horizontal scaling for AI service
- Read replicas for database
- Redis clustering
- Load balancing

## 🛟 Troubleshooting

### Common Issues

#### AI Models Not Loading
```bash
# Check Ollama status
docker-compose exec ollama ollama list

# Pull models manually
docker-compose exec ollama ollama pull llama2:7b
```

#### Vector Database Issues
```bash
# Check Qdrant status
curl http://localhost:6333/health

# Recreate collection
curl -X DELETE http://localhost:6333/collections/kb_articles
```

#### Search Not Working
```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Rebuild search index
curl -X POST http://localhost:8081/api/v1/search/reindex
```

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review Docker logs: `docker-compose logs [service]`
- Check API documentation at `/docs` endpoints
- File issues with detailed error logs

## 🔄 Updates

To update the system:
```bash
git pull origin main
docker-compose pull
docker-compose up -d --force-recreate
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
