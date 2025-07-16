# 💬 Chat System Guide

The conversational knowledge platform includes a powerful chat system that can work with any ontology. This guide covers how to use the chat system with different ontologies and databases.

## 🚀 Quick Start

### 1. List Available Ontologies
```bash
npm run chat:list
```
This will show all available ontologies with their metadata, entity counts, and relationship counts.

### 2. Launch Chat with Specific Ontology
```bash
# Launch with procurement ontology (default)
npm run chat:procurement

# Launch with FIBO financial ontology
npm run chat:fibo

# Launch with GeoNames geographic ontology
npm run chat:geonames

# Launch with ISCO occupational ontology
npm run chat:isco

# Launch with S&P 500 market ontology
npm run chat:sp500

# Launch with test ontology
npm run chat:testont

# Launch with core system ontology
npm run chat:default
```

### 3. Access the Chat Interface
- **Chat UI**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **NLP Service**: http://localhost:8001

## 📋 Available NPM Commands

### Chat Launchers
```bash
# Smart launcher (prompts for ontology selection)
npm run chat:launch

# Direct ontology launchers
npm run chat:procurement    # Procurement & tendering data
npm run chat:fibo          # Financial Industry Business Ontology
npm run chat:geonames      # Geographic and location data
npm run chat:isco          # International Standard Classification of Occupations
npm run chat:sp500         # S&P 500 companies and market data
npm run chat:testont       # Test ontology for development
npm run chat:default       # Core system ontology
```

### Individual Services
```bash
# Launch individual components
npm run chat:ui            # Just the React chat interface
npm run chat:backend       # Just the Node.js API backend
npm run chat:nlp           # Just the Python NLP service

# Launch all services together
npm run chat:all           # UI + Backend + NLP services
```

### Discovery and Information
```bash
# List all available ontologies with metadata
npm run chat:list
```

## 🏗️ Ontology-Agnostic Architecture

The chat system is designed to be **ontology-agnostic**, meaning:

- ✅ **No hardcoded ontology logic** in the chat system
- ✅ **Dynamic configuration** from actual ontology `config.json` files
- ✅ **Automatic discovery** of new ontologies
- ✅ **Real metadata** from ontology files (entity counts, descriptions, versions)

### How It Works

1. **Configuration**: Each ontology has a `config.json` file with metadata
2. **Discovery**: The system scans the `ontologies/` directory for available ontologies
3. **Loading**: When you launch a chat, it reads the actual ontology configuration
4. **Display**: Shows real information like entity counts, descriptions, and versions

### Example Ontology Information Display
```
📚 procurement
   Description: eProcurement Ontology (ePO) by Publications Office of the EU
   Version: 2024.06
   Entities: 148
   Relationships: 395
   Config: ontologies/procurement/config.json
```

## 🗄️ Database Configuration

Each ontology can use its own database:

### Environment Variables
```bash
# Set the target database for the chat session
export NEO4J_DATABASE=procurement
export MCP_ACTIVE_ONTOLOGIES=procurement
```

### Available Databases
- **`procurement`**: Procurement and tendering data
- **`fibo`**: Financial Industry Business Ontology data
- **`geonames`**: Geographic and location data
- **`isco`**: Occupational classification data
- **`sp500`**: S&P 500 companies and market data
- **`testont`**: Test data for development
- **`neo4j`**: Default system database

## 💬 Example Queries by Ontology

### Procurement Ontology
```bash
npm run chat:procurement
```
**Example Queries:**
- "show all contracts"
- "list all buyers"
- "find tenders related to [company]"
- "show award decisions"
- "list all procedures"

### FIBO Financial Ontology
```bash
npm run chat:fibo
```
**Example Queries:**
- "show all organizations"
- "list all deals"
- "find companies related to [company]"
- "show investments"
- "list all persons"

### GeoNames Geographic Ontology
```bash
npm run chat:geonames
```
**Example Queries:**
- "show all cities"
- "list all countries"
- "find locations in [country]"
- "show geographic features"
- "list all regions"

### ISCO Occupational Ontology
```bash
npm run chat:isco
```
**Example Queries:**
- "show all occupations"
- "list all job categories"
- "find skills related to [occupation]"
- "show professional classifications"
- "list all employment types"

### S&P 500 Market Ontology
```bash
npm run chat:sp500
```
**Example Queries:**
- "show all companies"
- "list all stocks"
- "find companies in [sector]"
- "show market data"
- "list all sectors"

## 🔧 Advanced Usage

### Custom Ontology Configuration

The chat system reads from `scripts/chat-config.json` which references actual ontology config files:

```json
{
  "chat_configurations": {
    "procurement": {
      "database": "procurement",
      "ontology": "procurement",
      "config_path": "ontologies/procurement/config.json",
      "description": "Uses procurement ontology configuration"
    }
  }
}
```

### Adding New Ontologies

1. **Create ontology directory**: `ontologies/your-ontology/`
2. **Add config.json**: Define metadata and settings
3. **Add ontology.json**: Define entities and relationships
4. **Update chat config**: Add entry to `scripts/chat-config.json`
5. **Launch**: `npm run chat:your-ontology`

### Manual Service Launch

If you prefer to launch services individually:

```bash
# Terminal 1: Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d

# Terminal 2: Start NLP Service
cd python-services/nlp-service
source venv/bin/activate
uvicorn main:app --reload --port 8001

# Terminal 3: Start Backend API
npm run dev

# Terminal 4: Start Chat UI
cd chat-ui
npm run dev
```

## 🐛 Troubleshooting

### Common Issues

**1. Ontology not found**
```bash
# Check if ontology exists
npm run chat:list

# Verify config file exists
ls ontologies/[ontology-name]/config.json
```

**2. Database connection issues**
```bash
# Check Neo4j is running
docker ps | grep neo4j

# Restart Neo4j
docker-compose -f docker-compose.neo4j.yml restart
```

**3. Services not starting**
```bash
# Check ports are available
lsof -i :3001  # Backend API
lsof -i :8001  # NLP Service
lsof -i :5173  # Chat UI
```

**4. NLP Service issues**
```bash
# Check Python environment
cd python-services/nlp-service
source venv/bin/activate
python -c "import fastapi; print('NLP dependencies OK')"
```

### Debug Mode

Enable debug logging by setting environment variables:

```bash
export DEBUG=true
export LOG_LEVEL=debug
npm run chat:procurement
```

## 📊 Performance Tips

### For Large Ontologies
- Use the compact ontology format (automatically generated)
- Enable entity/relationship filtering in config
- Use specific database for each ontology

### For Development
- Use `testont` for testing new features
- Enable hot reload with `npm run chat:all`
- Monitor service logs for performance issues

## 🔗 Related Documentation

- [**Architecture Overview**](../architecture/overview.md)
- [**Ontology Development Guide**](../architecture/ontologies.md)
- [**API Reference**](../development/api-reference.md)
- [**Entity Extraction Guide**](../architecture/entity-extraction-guide.md)
- [**Email Ingestion Guide**](../features/email-ingestion-ontology.md)

## 🎯 Next Steps

The chat system is designed to be extensible. Future enhancements include:

- **Multi-ontology queries**: Query across multiple ontologies simultaneously
- **Advanced analytics**: Complex aggregations and statistical queries
- **User preferences**: Save favorite queries and ontology combinations
- **Real-time updates**: Live data streaming and notifications
- **Advanced NLP**: Better entity recognition and relationship inference

---

**Need help?** Check the [troubleshooting section](#-troubleshooting) or create an issue in the repository. 