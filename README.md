# 🏗️ Extensible CRM Platform

[![CI/CD](https://github.com/your-org/financial-kill-the-crm/workflows/test/badge.svg)](https://github.com/your-org/financial-kill-the-crm/actions)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](./docs/testing/coverage-report.md)
[![Architecture](https://img.shields.io/badge/architecture-clean-brightgreen.svg)](./docs/architecture/overview.md)

A **modular, extensible CRM platform** built with Clean Architecture + DDD, featuring pluggable domain extensions and AI-powered insights.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/financial-kill-the-crm.git
cd financial-kill-the-crm
npm install

# 2. Start Core Infrastructure (Databases)
# This starts Neo4j and other backing services.
docker-compose up -d

# 3. Start AI Service (in a separate terminal)
# For full functionality like entity extraction, the Python NLP service must be running.
# See `python-services/README.md` for first-time setup (virtual env, dependencies).
cd python-services/nlp-service
uvicorn main:app --reload # Requires an activated venv with dependencies installed

# 4. Start Main Application (in another terminal)
npm run dev

# 5. Run tests
npm test

# 6. Build project
npm run build
```

## 🏛️ Architecture Overview

This platform implements a **modular architecture** with clear separation of concerns:

```
🏛️ CRM Core          # Generic CRM foundation
└── 💰 Financial     # Deal tracking extension
└── 🏠 Real Estate   # Future: Property management  
└── 🏥 Healthcare    # Future: Patient tracking
└── ⚖️ Legal         # Future: Case management
```

**Key Benefits:**
- 🔧 **Extensible**: Add new business domains without changing core
- 🎯 **Modular**: Independent development and deployment
- 🧪 **Testable**: Comprehensive TDD approach with 85%+ coverage
- 🚀 **Scalable**: Enterprise-grade patterns and performance

## 📚 Documentation

### 🎯 Getting Started
- [**Quick Start Guide**](docs/getting-started/README.md) - Get up and running in 5 minutes
- [**Installation Guide**](docs/getting-started/installation.md) - Detailed setup instructions
- [**Development Setup**](docs/getting-started/development.md) - Dev environment configuration

### 🏗️ Architecture  
- [**Architecture Overview**](docs/architecture/overview.md) - System design and patterns
- [**Extension System**](docs/architecture/extensions.md) - How to build domain extensions
- [**Data Flow**](docs/architecture/data-flow.md) - Request/response lifecycle
- [**Design Decisions**](docs/architecture/decisions.md) - ADRs and technical choices

### 💻 Development
- [**TDD Methodology**](docs/development/tdd-approach.md) - Test-driven development process
- [**API Documentation**](docs/development/api-reference.md) - REST API endpoints
- [**Extension Development**](docs/development/extension-guide.md) - Building new domain extensions
- [**Contributing Guide**](docs/development/contributing.md) - How to contribute

### 🚀 Deployment
- [**Production Deployment**](docs/deployment/production.md) - Production setup guide
- [**Docker Guide**](docs/deployment/docker.md) - Containerization instructions
- [**Monitoring**](docs/deployment/monitoring.md) - Observability and metrics

### 🔧 Operations
- [**Troubleshooting**](docs/operations/troubleshooting.md) - Common issues and solutions
- [**Performance Tuning**](docs/operations/performance.md) - Optimization guide
- [**Backup & Recovery**](docs/operations/backup.md) - Data protection strategies

## 🎯 Current Status

### ✅ Completed
- [x] **Extensible Architecture**: Modular CRM + extension system
- [x] **Platform Framework**: Extension loading and orchestration  
- [x] **TDD Foundation**: Comprehensive test structure
- [x] **Configuration Management**: Centralized config system

### 🔄 In Progress (Current Sprint)
- [ ] **CRM Core Implementation**: Contact, Communication, Task entities
- [ ] **Financial Extension**: Deal tracking domain logic
- [ ] **API Development**: REST endpoints for CRM + Financial
- [ ] **UI Components**: React components for CRM and deals

### 📋 Roadmap
- **Phase 1** (Weeks 1-4): CRM Core + Financial Extension
- **Phase 2** (Weeks 5-8): External Integrations (Graph API, Neo4j)
- **Phase 3** (Weeks 9-12): AI Agents + NLP Intelligence
- **Phase 4** (Weeks 13-16): Production Deployment + Monitoring

**📋 Detailed roadmap**: [Development Roadmap](docs/development/roadmap.md)
**📜 Project history**: [Project Evolution](docs/project-history.md)

## 🧪 Testing

### Run Tests by Module
```bash
npm run test:crm      # Test CRM foundation
npm run test:financial     # Test deal tracking extension
npm run test:platform      # Test extension framework
npm run test:integration   # Test cross-module integration
npm run test:e2e          # Test complete user workflows
```

### Coverage Reports
- **Overall**: 85%+ target
- **CRM Core**: 90%+ (foundation stability)
- **Extensions**: 80%+ (domain-specific logic)
- **Platform**: 95%+ (framework reliability)

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, TypeScript, TailwindCSS |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Neo4j (graph), PostgreSQL (relational) |
| **AI/ML** | LangChain, OpenAI, spaCy |
| **Testing** | Jest, React Testing Library, Playwright |
| **DevOps** | Docker, GitHub Actions, Kubernetes |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/development/contributing.md) for details.

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement functionality
5. Ensure tests pass (`npm test`)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/financial-kill-the-crm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/financial-kill-the-crm/discussions)

---

**🎯 Built with ❤️ using Clean Architecture, DDD, and TDD principles** 