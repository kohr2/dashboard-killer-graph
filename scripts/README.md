# Scripts Organization

This directory contains unified utility scripts organized by category for better maintainability and developer experience.

## 🚀 **Unified Scripts (Recommended)**

The following unified scripts provide a single, configurable solution for common operations:

### **`launch.sh`** - Unified Launcher
Provides a single interface for launching the chat system with different configurations.

```bash
# Launch with default configuration (procurement)
./scripts/launch.sh

# Launch specific ontology
./scripts/launch.sh fibo

# Launch with custom ports
./scripts/launch.sh procurement 8002 3002 5174 3003

# Show help
./scripts/launch.sh --help
```

### **`deploy.sh`** - Unified Deployment
Manages deployment of various services in the system.

```bash
# Deploy NLP service
./scripts/deploy.sh nlp

# Deploy MCP server
./scripts/deploy.sh mcp 3002

# Deploy all services
./scripts/deploy.sh all

# Show help
./scripts/deploy.sh --help
```

### **`test.sh`** - Unified Testing
Provides comprehensive testing for all system components.

```bash
# Test MCP protocol
./scripts/test.sh mcp

# Test Neo4j connection
./scripts/test.sh neo4j

# Test MCP transport options
./scripts/test.sh transport

# Run all tests
./scripts/test.sh all

# Show help
./scripts/test.sh --help
```

### **`ontologies.sh`** - Unified Ontology Management
Manages ontology operations and provides information about available ontologies.

```bash
# List all ontologies
./scripts/ontologies.sh list

# Show ontology details
./scripts/ontologies.sh info procurement

# Validate ontology
./scripts/ontologies.sh validate fibo

# Show ontology status
./scripts/ontologies.sh status

# Show help
./scripts/ontologies.sh --help
```

## 📚 **Common Library**

### **`lib/common.sh`** - Shared Functions
Contains all common functions used across the unified scripts:

- **Logging**: `print_status()`, `print_success()`, `print_warning()`, `print_error()`
- **Prerequisites**: `check_node()`, `check_docker()`, `check_neo4j()`, `check_port()`
- **Service Management**: `start_service()`, `wait_for_service()`, `check_service()`
- **Configuration**: `get_config()`, `get_ontology_info()`, `validate_config()`
- **Utilities**: `setup_cleanup_trap()`, `show_help()`, `get_arg_value()`

## 🗄️ **Database Scripts**

### **`database/manage.ts`** - Unified Database Management
Provides a single interface for all database operations.

```bash
# Show help
npx ts-node scripts/database/manage.ts --help

# Database management
npx ts-node scripts/database/manage.ts create procurement_db
npx ts-node scripts/database/manage.ts list
npx ts-node scripts/database/manage.ts reset procurement_db

# Data operations
npx ts-node scripts/database/manage.ts stats procurement_db
npx ts-node scripts/database/manage.ts query procurement_db "MATCH (n) RETURN count(n)"

# Ingestion operations
npx ts-node scripts/database/manage.ts ingest-emails procurement --folder /path/to/emails
npx ts-node scripts/database/manage.ts ingest-dataset procurement --file /path/to/data.json
```

### **`database/lib/database-utils.ts`** - Database Utilities
Shared utilities for database operations with connection management and error handling.

## 🏗️ **Directory Structure**

```
scripts/
├── lib/
│   └── common.sh              # ✅ Shared functions library
├── database/                  # ✅ Database management scripts
│   ├── lib/
│   │   └── database-utils.ts  # ✅ Database utilities
│   ├── manage.ts              # ✅ Unified database management
│   ├── reset.ts               # ✅ Database reset
│   ├── query.ts               # ✅ Database queries
│   └── README.md              # ✅ Database documentation
├── ontology/                  # ✅ Ontology processing scripts
├── codegen/                   # ✅ Code generation scripts
├── fixtures/                  # ✅ Test fixture generation
├── cache/                     # ✅ Cached data files
├── launch.sh                  # ✅ Unified launcher
├── deploy.sh                  # ✅ Unified deployment
├── test.sh                    # ✅ Unified testing
├── ontologies.sh              # ✅ Unified ontology management
├── start-external-agent-server.sh # ✅ MCP server launcher
├── chat-config.json           # ✅ Chat configuration
├── tsconfig.json              # ✅ TypeScript configuration
└── README.md                  # ✅ This documentation
```

## 🎯 **Benefits of Unified Scripts**

### **1. Consistency**
- Single interface for similar operations
- Consistent error handling and logging
- Uniform help and documentation

### **2. Maintainability**
- Shared functions reduce code duplication
- Centralized configuration management
- Easier to update and extend

### **3. Usability**
- Intuitive command-line interface
- Comprehensive help system
- Better error messages and validation

### **4. Flexibility**
- Configurable ports and settings
- Support for multiple ontologies
- Easy to customize for different environments

## 🚀 **Quick Start Examples**

```bash
# 1. Launch the system with default settings
./scripts/launch.sh

# 2. Deploy NLP service for production
./scripts/deploy.sh nlp 8000

# 3. Test all components
./scripts/test.sh all

# 4. List available ontologies
./scripts/ontologies.sh list

# 5. Manage databases
npx ts-node scripts/database/manage.ts list

# 6. Start external agent server
./scripts/start-external-agent-server.sh
```

## 🔧 **Configuration**

All scripts use the shared configuration file `scripts/chat-config.json` for ontology settings and service configurations.

## 🆘 **Getting Help**

All unified scripts provide comprehensive help:

```bash
./scripts/launch.sh --help
./scripts/deploy.sh --help
./scripts/test.sh --help
./scripts/ontologies.sh --help
npx ts-node scripts/database/manage.ts --help
```

## 📋 **Removed Legacy Scripts**

The following legacy scripts have been removed in favor of the unified scripts:

### **Removed Launch Scripts**
- `launch-chat.sh` → Use `launch.sh`
- `launch-chat-simple.sh` → Use `launch.sh`
- `launch-chat-with-ontology.sh` → Use `launch.sh`
- `launch-procurement-chat.sh` → Use `launch.sh procurement`

### **Removed Deployment Scripts**
- `deploy-nlp-service.sh` → Use `deploy.sh nlp`

### **Removed Test Scripts**
- `test-mcp-protocol.js` → Use `test.sh mcp`
- `test-mcp-transport.sh` → Use `test.sh transport`
- `test-neo4j-connection.js` → Use `test.sh neo4j`

### **Removed Ontology Scripts**
- `list-ontologies.sh` → Use `ontologies.sh list`

### **Removed Demo Scripts**
- All scripts in `demo/` directory (development/testing scripts)
- `demo-path-alias-registration.ts` (temporary demonstration)
- `demo-path-alias-simple.ts` (temporary demonstration)

### **Removed Duplicate Database Scripts**
- `query-db.ts` → Use `database/query.ts`
- `reset-neo4j.ts` → Use `database/reset.ts`

## 🔄 **Migration Guide**

### **From Old Scripts to New**

| Old Script | New Script | Notes |
|------------|------------|-------|
| `./scripts/launch-chat.sh` | `./scripts/launch.sh` | Same functionality |
| `./scripts/launch-procurement-chat.sh` | `./scripts/launch.sh procurement` | More flexible |
| `./scripts/deploy-nlp-service.sh` | `./scripts/deploy.sh nlp` | Unified interface |
| `./scripts/test-mcp-protocol.js` | `./scripts/test.sh mcp` | Better integration |
| `./scripts/list-ontologies.sh` | `./scripts/ontologies.sh list` | More features |

### **New Workflows**

**Development Workflow:**
```bash
./scripts/launch.sh procurement  # Launch with procurement ontology
./scripts/test.sh all            # Test all components
./scripts/deploy.sh nlp          # Deploy NLP service
```

**Database Management:**
```bash
npx ts-node scripts/database/manage.ts list     # List databases
npx ts-node scripts/database/manage.ts create procurement_db  # Create database
npx ts-node scripts/database/manage.ts reset procurement_db   # Reset database
```

**Ontology Management:**
```bash
./scripts/ontologies.sh list     # List all ontologies
./scripts/ontologies.sh info procurement  # Show details
./scripts/ontologies.sh validate fibo     # Validate ontology
```

## 🎯 **Script Categories**

### **Core Scripts**
- **`launch.sh`** - System launcher with ontology support
- **`deploy.sh`** - Service deployment and management
- **`test.sh`** - Comprehensive testing suite
- **`ontologies.sh`** - Ontology discovery and management

### **Database Scripts**
- **`database/manage.ts`** - Unified database operations
- **`database/lib/database-utils.ts`** - Shared database utilities
- **`database/reset.ts`** - Database reset functionality
- **`database/query.ts`** - Database query interface

### **Specialized Scripts**
- **`start-external-agent-server.sh`** - MCP HTTP server launcher
- **`fixtures/generate-email-fixtures.ts`** - Test fixture generation
- **`codegen/generate-ontologies.ts`** - Ontology code generation

## 📊 **Script Statistics**

- **Total Scripts**: 15 (down from 32)
- **Unified Scripts**: 4 main scripts
- **Database Scripts**: 7 specialized scripts
- **Specialized Scripts**: 4 utility scripts
- **Reduction**: 53% fewer scripts to maintain

## 🔮 **Future Enhancements**

### **Planned Improvements**
- **Plugin System**: Support for custom script plugins
- **Configuration UI**: Web-based configuration interface
- **Monitoring**: Built-in script performance monitoring
- **Templates**: Script templates for common operations

### **Integration Goals**
- **CI/CD Integration**: Better integration with CI/CD pipelines
- **Cloud Deployment**: Enhanced cloud deployment support
- **Multi-Environment**: Better multi-environment support
- **Automation**: Increased automation for common tasks

The scripts directory is now clean, organized, and maintainable with all functionality consolidated into logical, unified interfaces! 