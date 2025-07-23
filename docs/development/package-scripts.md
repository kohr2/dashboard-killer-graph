# Package Scripts Documentation

This document describes the simplified and organized npm scripts available in the Dashboard Killer Graph project.

## 🚀 **Development Scripts**

### **Core Development**
```bash
npm run dev              # Start development server with hot reload
npm run dev:nlp          # Start NLP service
npm run dev:all          # Start all services (API + NLP)
npm run dev:mcp          # Start MCP server (stdio mode)
npm run dev:mcp:http     # Start MCP server (HTTP mode)
```

### **Build & Start**
```bash
npm run build            # Build the project
npm start                # Start production server
npm run clean            # Clean build artifacts and coverage
```

## 🧪 **Testing Scripts**

### **Test Execution**
```bash
npm test                 # Run all tests
npm run test:unit        # Run unit tests only
npm run test:e2e         # Run e2e tests only
npm run test:coverage    # Run with coverage
npm run test:watch       # Run in watch mode
npm run test:ci          # Run in CI mode
```

### **Test Configuration**
- **Unit Tests**: Fast, isolated tests with mocked dependencies
- **E2E Tests**: Integration tests with real external services
- **Coverage**: Comprehensive coverage reporting
- **CI Mode**: Optimized for continuous integration

## 🔧 **Code Quality Scripts**

### **Type Checking & Linting**
```bash
npm run type-check       # TypeScript type checking
npm run lint             # ESLint code linting
npm run lint:fix         # Fix linting issues automatically
npm run format           # Prettier code formatting
npm run format:check     # Check formatting without fixing
npm run validate         # Full validation (type-check + lint + test)
```

### **Quality Assurance**
- **Type Checking**: Ensures TypeScript type safety
- **Linting**: Enforces code style and best practices
- **Formatting**: Maintains consistent code formatting
- **Validation**: Comprehensive quality check

## 🐳 **Docker Scripts**

### **Service Management**
```bash
npm run docker:up        # Start all services with Docker Compose
npm run docker:down      # Stop all services
npm run docker:logs      # View service logs
npm run docker:build     # Build Docker images
npm run docker:clean     # Clean Docker resources
```

### **Neo4j Database**
```bash
npm run neo4j:start      # Start Neo4j database
npm run neo4j:stop       # Stop Neo4j database
npm run neo4j:logs       # View Neo4j logs
npm run neo4j:reset      # Reset Neo4j database
```

## 💬 **Chat System Scripts**

### **Launch & Management**
```bash
npm run chat:launch      # Launch chat system
npm run chat:list        # List available ontologies
npm run chat:ui          # Start UI only
npm run chat:backend     # Start backend only
npm run chat:all         # Start all chat components
```

### **Ontology Support**
- **Default**: Launches with procurement ontology
- **Custom**: Support for specific ontologies (fibo, geonames, etc.)
- **Flexible**: Configurable ports and settings

## 🏗️ **Ontology Scripts**

### **Code Generation**
```bash
npm run ontologies:generate  # Generate ontology code
npm run ontologies:build     # Build ontology plugins
npm run ontologies:validate  # Validate ontology configurations
```

### **Management**
- **Code Generation**: Creates TypeScript types from ontology definitions
- **Validation**: Ensures ontology configurations are correct
- **Building**: Compiles ontology plugins

## 🔧 **Maintenance Scripts**

### **Environment Setup**
```bash
npm run setup:nlp         # Setup NLP service environment
npm run setup:dev         # Setup development environment
npm run setup:test        # Setup test environment
```

### **Dependency Management**
```bash
npm run deps:update       # Update dependencies
npm run deps:check        # Check for outdated dependencies
npm run deps:audit        # Security audit of dependencies
npm run security:audit    # Comprehensive security audit
```

### **System Maintenance**
```bash
npm run prepare           # Husky pre-commit hooks setup
npm run clean:all         # Clean all build artifacts
npm run cache:clear       # Clear all caches
```

## 📊 **Script Categories Summary**

### **Development (5 scripts)**
- Core development server management
- Service orchestration
- Build and deployment

### **Testing (6 scripts)**
- Unit and e2e test execution
- Coverage reporting
- CI/CD integration

### **Code Quality (5 scripts)**
- TypeScript validation
- Code linting and formatting
- Quality assurance

### **Docker (8 scripts)**
- Service containerization
- Database management
- Resource cleanup

### **Chat System (5 scripts)**
- Chat application management
- Ontology integration
- Component orchestration

### **Maintenance (6 scripts)**
- Environment setup
- Dependency management
- System maintenance

## 🎯 **Script Usage Patterns**

### **Daily Development Workflow**
```bash
# 1. Start development environment
npm run dev:all

# 2. Run tests
npm run test:unit

# 3. Check code quality
npm run validate

# 4. Launch chat system
npm run chat:launch
```

### **CI/CD Pipeline**
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
npm run setup:test

# 3. Run validation
npm run validate

# 4. Run tests
npm run test:ci

# 5. Build for production
npm run build
```

### **Production Deployment**
```bash
# 1. Build application
npm run build

# 2. Start services
npm run docker:up

# 3. Launch chat system
npm run chat:launch
```

## 🔍 **Script Details**

### **Development Scripts**

#### **`npm run dev`**
- **Purpose**: Start development server with hot reload
- **Command**: `ts-node-dev --respawn --transpile-only src/api.ts`
- **Features**: Auto-restart on file changes, TypeScript compilation

#### **`npm run dev:nlp`**
- **Purpose**: Start NLP service
- **Command**: `cd python-services/nlp-service && source venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8000`
- **Features**: Python virtual environment, FastAPI server

#### **`npm run dev:all`**
- **Purpose**: Start all development services
- **Command**: `concurrently -n "API,NLP" -c "blue,magenta" "npm:dev" "npm:dev:nlp"`
- **Features**: Parallel service execution, colored output

### **Testing Scripts**

#### **`npm test`**
- **Purpose**: Run all tests
- **Command**: `jest --config jest.config.js`
- **Features**: Unit and e2e tests, balanced configuration

#### **`npm run test:unit`**
- **Purpose**: Run unit tests only
- **Command**: `jest --config jest.unit.config.js`
- **Features**: Fast execution, mocked dependencies

#### **`npm run test:e2e`**
- **Purpose**: Run e2e tests only
- **Command**: `jest --config jest.e2e.config.js`
- **Features**: Integration testing, real services

### **Code Quality Scripts**

#### **`npm run type-check`**
- **Purpose**: TypeScript type checking
- **Command**: `tsc --noEmit`
- **Features**: Type safety validation

#### **`npm run lint`**
- **Purpose**: ESLint code linting
- **Command**: `eslint . --ext .ts,.tsx`
- **Features**: Code style enforcement

#### **`npm run format`**
- **Purpose**: Prettier code formatting
- **Command**: `prettier --write .`
- **Features**: Consistent code formatting

### **Docker Scripts**

#### **`npm run docker:up`**
- **Purpose**: Start all services
- **Command**: `docker-compose -f docker-compose.production.yml up -d`
- **Features**: Production-ready service orchestration

#### **`npm run neo4j:start`**
- **Purpose**: Start Neo4j database
- **Command**: `docker-compose -f docker-compose.neo4j.yml up -d`
- **Features**: Graph database management

### **Chat System Scripts**

#### **`npm run chat:launch`**
- **Purpose**: Launch chat system
- **Command**: `./scripts/launch.sh`
- **Features**: Unified launcher with ontology support

#### **`npm run chat:list`**
- **Purpose**: List available ontologies
- **Command**: `./scripts/ontologies.sh list`
- **Features**: Ontology discovery

## 🔧 **Configuration**

### **Environment Variables**
Scripts use environment variables for configuration:
- `NODE_ENV`: Environment (development, test, production)
- `NEO4J_DATABASE`: Target database name
- `MCP_ACTIVE_ONTOLOGIES`: Active ontology plugins
- `LOG_LEVEL`: Logging verbosity

### **Configuration Files**
- `scripts/chat-config.json`: Chat system configuration
- `jest.config.*.js`: Test configuration files
- `tsconfig.json`: TypeScript configuration
- `docker-compose.*.yml`: Docker service definitions

## 🚀 **Performance Optimization**

### **Parallel Execution**
- **Development**: Concurrent service execution
- **Testing**: Parallel test execution
- **Building**: Optimized build processes

### **Caching**
- **Dependencies**: npm cache optimization
- **Builds**: TypeScript compilation caching
- **Tests**: Jest test result caching

### **Resource Management**
- **Memory**: Efficient memory usage
- **CPU**: Optimized CPU utilization
- **I/O**: Reduced file system operations

## 🔄 **Migration from Legacy Scripts**

### **Removed Scripts**
The following legacy scripts have been removed and replaced:

| Old Script | New Script | Reason |
|------------|------------|--------|
| `npm run chat` | `npm run chat:launch` | More descriptive naming |
| `npm run test:integration` | `npm run test:e2e` | Consistent terminology |
| `npm run graph:*` | `npm run neo4j:*` | Clearer naming |
| `npm run extension:*` | Removed | Functionality moved to scripts |

### **New Scripts Added**
- **`npm run dev:all`**: Unified development environment
- **`npm run validate`**: Comprehensive quality check
- **`npm run setup:*`**: Environment setup automation
- **`npm run deps:*`**: Dependency management

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Script Not Found**
```bash
# Check if script exists
npm run

# Verify package.json
cat package.json | grep -A 20 '"scripts"'
```

#### **Permission Issues**
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Run with sudo if needed
sudo npm run docker:up
```

#### **Environment Issues**
```bash
# Check environment variables
env | grep NODE_ENV

# Set environment variables
NODE_ENV=development npm run dev
```

### **Debug Commands**
```bash
# Run with verbose output
npm run dev -- --verbose

# Check script execution
npm run dev -- --dry-run

# Debug specific script
DEBUG=* npm run dev
```

## 📋 **Best Practices**

### **Script Organization**
- Group related scripts together
- Use consistent naming conventions
- Provide clear documentation
- Include help and examples

### **Error Handling**
- Implement proper error handling
- Provide meaningful error messages
- Include cleanup procedures
- Handle edge cases

### **Performance**
- Optimize for speed where possible
- Use parallel execution when safe
- Implement caching strategies
- Monitor resource usage

### **Maintenance**
- Keep scripts up to date
- Remove deprecated functionality
- Test script changes
- Document modifications

The simplified package.json provides a clean, organized, and maintainable script interface for the Dashboard Killer Graph project! 