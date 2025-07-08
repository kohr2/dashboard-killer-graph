# Chat Configuration Guide

## 🗄️ Database Setup

### Environment Variables
```bash
# Required
NEO4J_DATABASE=fibo          # Target database
OPENAI_API_KEY=your_key_here # For natural language processing

# Optional (defaults shown)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
```

### Available Databases
- **`fibo`** - Financial Industry Business Ontology
- **`dashboard-killer`** - Default application database
- **`neo4j`** - System default

### Switch Database
```bash
# Method 1: Edit .env
NEO4J_DATABASE=fibo

# Method 2: Environment variable
export NEO4J_DATABASE=fibo && npm run dev
```

## 🚀 API Usage

### Chat Endpoint
```bash
POST /api/chat
Content-Type: application/json

{
  "query": "show all organizations"
}
```

### Example Queries
```bash
# English
curl -X POST http://localhost:3001/api/chat \
  -d '{"query": "show all organizations"}'

# French
curl -X POST http://localhost:3001/api/chat \
  -d '{"query": "trouve moi les entreprises"}'

# Relationships
curl -X POST http://localhost:3001/api/chat \
  -d '{"query": "show deals related to Thoma Bravo"}'
```

## 🧪 Testing

```bash
# Basic test
npm test

# Direct query translator test
npx ts-node -r tsconfig-paths/register test-query-translator.ts

# Database verification
docker exec -it neo4j cypher-shell -u neo4j -p password
```

## 🐞 Troubleshooting

### Common Issues

**"No information found"**
```bash
# Check database config
cat .env | grep NEO4J_DATABASE

# Verify data exists
docker exec -it neo4j cypher-shell -u neo4j -p password
> USE fibo;
> MATCH (n:Organization) RETURN count(n);
```

**OpenAI API errors**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Check logs
npm run dev | grep -i openai
```

**Database connection issues**
```bash
# Check Neo4j status
docker-compose -f docker-compose.neo4j.yml ps

# Test connection
docker exec -it neo4j cypher-shell -u neo4j -p password
```

## 🔧 Architecture Notes

### Key Components
- **ChatService** - Main orchestrator
- **QueryTranslator** - Natural language → structured queries
- **Neo4jConnection** - Database session management
- **OntologyService** - Entity validation

### Important Code Patterns
```typescript
// ✅ Correct - uses configured database
const session = this.neo4j.getSession();

// ❌ Wrong - uses default database
const session = this.neo4j.getDriver().session();
```

### Service Dependencies
```typescript
@injectable()
export class ChatService {
  constructor(
    private neo4j: Neo4jConnection,
    private ontologyService: OntologyService,
    private queryTranslator: QueryTranslator
  ) {}
}
```

## 📊 Performance Tips

1. **Use indexes**: `CREATE INDEX FOR (n:Organization) ON (n.id)`
2. **Limit results**: Queries automatically limit to 20 results
3. **Session cleanup**: Services properly close sessions
4. **Connection pooling**: Neo4j driver handles automatically

## 🔐 Security

- API keys stored in `.env` (not committed)
- Input validation on entity types
- Access control via `AccessControlService`
- Parameterized queries prevent injection 