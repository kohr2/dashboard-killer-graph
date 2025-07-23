# Scripts Organization

This directory contains various utility scripts organized by category for better maintainability.

## 🚀 **Unified Scripts (Recommended)**

The following unified scripts replace multiple individual scripts with a single, configurable solution:

### **`launch.sh`** - Unified Launcher
Replaces: `launch-chat.sh`, `launch-chat-simple.sh`, `launch-chat-with-ontology.sh`, `launch-procurement-chat.sh`

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
Replaces: `deploy-nlp-service.sh`

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
Replaces: `test-mcp-protocol.js`, `test-mcp-transport.sh`, `test-neo4j-connection.js`

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
Replaces: `list-ontologies.sh`

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

## 📁 **Legacy Scripts (Deprecated)**

The following scripts are now deprecated in favor of the unified scripts above:

### **Chat Launchers (Deprecated)**
- `launch-chat.sh` → Use `launch.sh`
- `launch-chat-simple.sh` → Use `launch.sh`
- `launch-chat-with-ontology.sh` → Use `launch.sh`
- `launch-procurement-chat.sh` → Use `launch.sh procurement`

### **Deployment Scripts (Deprecated)**
- `deploy-nlp-service.sh` → Use `deploy.sh nlp`

### **Test Scripts (Deprecated)**
- `test-mcp-protocol.js` → Use `test.sh mcp`
- `test-mcp-transport.sh` → Use `test.sh transport`
- `test-neo4j-connection.js` → Use `test.sh neo4j`

### **Ontology Scripts (Deprecated)**
- `list-ontologies.sh` → Use `ontologies.sh list`

## 🏗️ **Directory Structure**

```
scripts/
├── lib/
│   └── common.sh              # ✅ Shared functions library
├── launch.sh                  # ✅ Unified launcher
├── deploy.sh                  # ✅ Unified deployment
├── test.sh                    # ✅ Unified testing
├── ontologies.sh              # ✅ Unified ontology management
├── README.md                  # ✅ This documentation
├── chat-config.json           # ✅ Chat configuration
├── demo/                      # ✅ Demo scripts
├── database/                  # ✅ Database scripts
├── ontology/                  # ✅ Ontology scripts
├── maintenance/               # ✅ Maintenance scripts
└── [deprecated scripts]       # ❌ Legacy scripts
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

# 5. Validate a specific ontology
./scripts/ontologies.sh validate procurement
```

## 🔧 **Configuration**

All scripts use the shared configuration file `scripts/chat-config.json` for ontology settings and service configurations.

## 📝 **Migration Guide**

To migrate from legacy scripts to unified scripts:

1. **Replace launch commands:**
   ```bash
   # Old
   ./scripts/launch-procurement-chat.sh
   
   # New
   ./scripts/launch.sh procurement
   ```

2. **Replace deployment commands:**
   ```bash
   # Old
   ./scripts/deploy-nlp-service.sh
   
   # New
   ./scripts/deploy.sh nlp
   ```

3. **Replace test commands:**
   ```bash
   # Old
   node scripts/test-mcp-protocol.js
   
   # New
   ./scripts/test.sh mcp
   ```

4. **Replace ontology commands:**
   ```bash
   # Old
   ./scripts/list-ontologies.sh
   
   # New
   ./scripts/ontologies.sh list
   ```

## 🆘 **Getting Help**

All unified scripts provide comprehensive help:

```bash
./scripts/launch.sh --help
./scripts/deploy.sh --help
./scripts/test.sh --help
./scripts/ontologies.sh --help
``` 