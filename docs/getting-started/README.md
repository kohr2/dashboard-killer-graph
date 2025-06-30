# 🚀 Quick Start Guide

Get your Conversational Knowledge Platform up and running in **5 minutes**!

## ⚡ Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** ([Download](https://www.docker.com/get-started))
- **Git** ([Download](https://git-scm.com/))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

## 🏃‍♂️ Quick Setup

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/your-org/dashboard-killer-graph.git

# Navigate to the project directory
cd dashboard-killer-graph

# Install dependencies
npm install

# Install chat UI dependencies
cd chat-ui && npm install && cd ..
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file and add your OpenAI API key
# OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start Infrastructure
```bash
# Start Neo4j database
docker-compose -f docker-compose.neo4j.yml up -d

# Verify Neo4j is running
docker-compose -f docker-compose.neo4j.yml ps
```

### 4. Start the Application Services
```bash
# Terminal 1: Start the main API server
npm run dev

# Terminal 2: Start the Chat UI
cd chat-ui && npm run dev

# Terminal 3 (Optional): Start MCP Server for Claude Desktop
npm run dev:mcp
```

### 5. Access the Application
- **Chat Interface**: http://localhost:5173/ (or 5174 if port is busy)
- **API Server**: http://localhost:3001
- **Neo4j Browser**: http://localhost:7474 (username: neo4j, password: password)

## 🎯 What You Get

### ✅ Working Features
- **💬 Chat Interface**: Natural language queries with real-time responses
- **🧠 AI-Powered**: OpenAI GPT-4o-mini for query translation and response generation
- **📊 Knowledge Graph**: Neo4j database with CRM, Financial, and Procurement ontologies
- **🔌 Extensible**: Plugin architecture for adding new domains
- **🌐 Multi-language**: Works in English, French, and other languages
- **🤖 MCP Integration**: Claude Desktop integration for AI assistance

### 🎮 Try These Queries
Open the chat interface and try:
```
"show me all deals"
"list all people"
"show me organizations"
"find persons named Rick"
"show all contacts"
```

### 🔧 Development Tools
- **Hot Reload**: Automatic code reloading for both API and UI
- **Debug Endpoints**: `/debug/schema` and `/debug/translate` for troubleshooting
- **Test Suite**: Comprehensive TDD setup
- **Type Safety**: Full TypeScript support

## 🧪 Verify Installation

### Test Chat Functionality
```bash
# Test via curl
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "show all deals"}'

# Expected: JSON response with deal information
```

### Check Ontology Loading
```bash
# Check loaded schema
curl http://localhost:3001/api/chat/debug/schema

# Expected: 34 entities, 24 relationships
```

### Database Connection
```bash
# Check Neo4j status
docker-compose -f docker-compose.neo4j.yml logs neo4j

# Access Neo4j browser at http://localhost:7474
# Username: neo4j, Password: password
```

## 📊 Project Structure Overview

```
dashboard-killer-graph/
├── 💬 chat-ui/              # React chat interface
├── 🏛️ src/platform/        # Core platform services
├── 🧠 src/ontologies/       # Domain-specific extensions
│   ├── crm/                 # CRM ontology (contacts, orgs)
│   ├── financial/           # Financial ontology (deals, investors)
│   └── procurement/         # Procurement ontology
├── 🔌 src/mcp/              # MCP server for Claude Desktop
├── 🧪 test/                 # Comprehensive test suite
├── 📁 config/               # Configuration files
└── 📚 docs/                 # Documentation
```

## 🎯 Next Steps

### For Users
1. **[Chat Interface Guide](../features/chat-interface.md)** - Learn advanced query techniques
2. **[API Reference](../development/api-reference.md)** - Integrate with external systems
3. **[Troubleshooting](../operations/troubleshooting.md)** - Common issues and solutions

### For Developers
1. **[Development Setup](development.md)** - Detailed dev environment
2. **[Architecture Overview](../architecture/overview.md)** - System design
3. **[TDD Approach](../development/tdd-approach.md)** - Testing methodology
4. **[Extension Development](../development/extension-guide.md)** - Build new ontologies

### For Contributors
1. **[Contributing Guide](../development/contributing.md)** - How to contribute
2. **[Code Standards](../development/code-standards.md)** - Coding guidelines
3. **[Testing Guide](../development/testing.md)** - Test writing best practices

## 🆘 Need Help?

### Quick Fixes
```bash
# Reset everything
docker-compose -f docker-compose.neo4j.yml down -v
docker-compose -f docker-compose.neo4j.yml up -d
npm run dev

# Clear node modules
rm -rf node_modules chat-ui/node_modules
npm install
cd chat-ui && npm install && cd ..

# Check service status
curl http://localhost:3001/api/health
curl http://localhost:3001/api/chat/debug/schema
```

### Common Issues

**Chat returns "I'm sorry, I can only show resources"**
- Check that your OpenAI API key is set in `.env`
- Verify the API server is running on port 3001
- Check debug endpoint: `curl http://localhost:3001/api/chat/debug/schema`

**Neo4j connection failed**
- Ensure Docker is running
- Check Neo4j container: `docker-compose -f docker-compose.neo4j.yml ps`
- Restart Neo4j: `docker-compose -f docker-compose.neo4j.yml restart`

**Chat UI won't start**
- Check if port 5173 is available
- Try: `cd chat-ui && npm install && npm run dev`
- UI will automatically use port 5174 if 5173 is busy

### Get Support
- **📖 Documentation**: Browse [docs/](../)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/your-org/dashboard-killer-graph/issues)
- **💬 Ask Questions**: [GitHub Discussions](https://github.com/your-org/dashboard-killer-graph/discussions)
- **📜 Review History**: See the [project history](../project-history.md)

---

**🎉 You're ready to chat with your knowledge graph!**

**Next**: [Chat Interface Guide](../features/chat-interface.md) | [Development Setup](development.md) 