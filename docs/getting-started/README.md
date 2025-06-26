# 🚀 Quick Start Guide

Get your Extensible CRM Platform up and running in **5 minutes**!

## ⚡ Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** ([Download](https://www.docker.com/get-started))
- **Git** ([Download](https://git-scm.com/))

## 🏃‍♂️ Quick Setup

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/your-org/dashboard-killer-graph.git

# Navigate to the project directory
cd dashboard-killer-graph

# Install dependencies
npm install
```

### 2. Start Infrastructure
```bash
# Start Neo4j and other services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Run the Application
```bash
# Start development server
npm run dev

# In another terminal, run tests
npm test
```

### 4. Access the Application
- **Web Interface**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Neo4j Browser**: http://localhost:7474

## 🎯 What You Get

### ✅ Working Features
- **CRM Core**: Contact and communication management
- **Financial Extension**: Deal tracking (in development)
- **Platform Framework**: Extension loading system
- **API Gateway**: RESTful endpoints
- **Test Suite**: Comprehensive TDD setup

### 🔧 Development Tools
- **Hot Reload**: Automatic code reloading
- **Test Watch**: Continuous testing
- **Linting**: Code quality checks
- **Type Safety**: Full TypeScript support

## 🧪 Verify Installation

### Run Core Tests
```bash
# Test CRM core functionality
npm run test:crm

# Test financial extension
npm run test:financial

# Test platform framework
npm run test:platform
```

### API Health Check
```bash
# Check API status
curl http://localhost:3000/health

# Expected response:
# {"status": "healthy", "extensions": ["financial"]}
```

### Database Connection
```bash
# Test Neo4j connection
npm run test:integration -- --grep "database"
```

## 📊 Project Structure Overview

```
dashboard-killer-graph/
├── 🏛️ src/crm/        # Generic CRM foundation
├── 💰 src/extensions/       # Domain-specific extensions
├── 🔧 src/platform/         # Extension framework
├── 🤝 src/shared/           # Cross-cutting utilities
├── 🧪 test/                 # Comprehensive test suite
├── 📁 config/               # Configuration files
└── 📚 docs/                 # Documentation
```

## 🎯 Next Steps

### For Developers
1. **[Development Setup](development.md)** - Detailed dev environment
2. **[Architecture Overview](../architecture/overview.md)** - System design
3. **[TDD Approach](../development/tdd-approach.md)** - Testing methodology

### For Business Users
1. **[User Guide](../user-guide/README.md)** - How to use the CRM
2. **[Financial Features](../user-guide/financial-extension.md)** - Deal tracking
3. **[API Reference](../development/api-reference.md)** - Integration guide

### For Contributors
1. **[Contributing Guide](../development/contributing.md)** - How to contribute
2. **[Extension Development](../development/extension-guide.md)** - Build extensions
3. **[Troubleshooting](../operations/troubleshooting.md)** - Common issues

## 🆘 Need Help?

### Quick Fixes
```bash
# Reset everything
docker-compose down -v
docker-compose up -d
npm run dev

# Clear node modules
rm -rf node_modules
npm install

# Reset database
docker-compose restart neo4j
```

### Get Support
- **📖 Documentation**: Browse [docs/](../)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/your-org/dashboard-killer-graph/issues)
- **💬 Ask Questions**: [GitHub Discussions](https://github.com/your-org/dashboard-killer-graph/discussions)
- **📜 Review History**: See the [project history](../project-history.md)

---

**🎉 You're ready to build with the Extensible CRM Platform!**

**Next**: [Detailed Installation](installation.md) | [Development Setup](development.md) 