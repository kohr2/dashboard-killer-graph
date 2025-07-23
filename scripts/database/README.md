# Database Management Scripts

This directory contains unified database management scripts for Neo4j operations.

## 🚀 **Unified Database Management**

### **`manage.ts`** - Main Database Management Script
Provides a single interface for all database operations with comprehensive functionality.

```bash
# Show help
npx ts-node scripts/database/manage.ts --help

# Database Management
npx ts-node scripts/database/manage.ts create procurement_db
npx ts-node scripts/database/manage.ts list
npx ts-node scripts/database/manage.ts drop procurement_db
npx ts-node scripts/database/manage.ts info procurement_db
npx ts-node scripts/database/manage.ts reset procurement_db

# Schema & Setup
npx ts-node scripts/database/manage.ts init-schema procurement_db
npx ts-node scripts/database/manage.ts cleanup-labels procurement_db

# Data Operations
npx ts-node scripts/database/manage.ts stats procurement_db
npx ts-node scripts/database/manage.ts query procurement_db "MATCH (n) RETURN count(n)"
npx ts-node scripts/database/manage.ts ingest-emails procurement_db
npx ts-node scripts/database/manage.ts build-graph procurement_db

# Maintenance
npx ts-node scripts/database/manage.ts health-check procurement_db
npx ts-node scripts/database/manage.ts optimize procurement_db
```

## 📚 **Available Commands**

### **Database Management**
- **`create <name>`** - Create a new database
- **`list`** - List all databases
- **`drop <name>`** - Drop a database (cannot drop system databases)
- **`info <name>`** - Show database information
- **`reset [name]`** - Reset database (clear all data)

### **Schema & Setup**
- **`init-schema [name]`** - Initialize database schema
- **`cleanup-labels [name]`** - Clean up unused database labels

### **Data Operations**
- **`stats [name]`** - Show database statistics
- **`query [name] <cypher>`** - Execute a Cypher query
- **`ingest-emails [name]`** - Ingest email data
- **`build-graph [name]`** - Build graph from extraction report

### **Maintenance**
- **`health-check [name]`** - Check database health
- **`optimize [name]`** - Optimize database performance

## 🔧 **Supporting Scripts**

### **`lib/database-utils.ts`** - Shared Database Utilities
Singleton class providing common database operations:
- Connection management
- Session handling
- Database statistics
- Schema operations
- Label cleanup
- Graph building
- Email ingestion
- Performance optimization

### **Legacy Scripts (Still Available)**
- **`create-database.ts`** - Database creation (functionality in manage.ts)
- **`reset.ts`** - Database reset (functionality in manage.ts)
- **`query.ts`** - Database queries (functionality in manage.ts)
- **`cleanup-db-labels.ts`** - Label cleanup (functionality in manage.ts)
- **`build-neo4j-graph.ts`** - Graph building (functionality in manage.ts)
- **`run-neo4j-ingestion.ts`** - Email ingestion (functionality in manage.ts)
- **`run-full-ingestion.ts`** - Full ingestion pipeline
- **`initialize-schema.ts`** - Schema initialization (functionality in manage.ts)

## 🎯 **Key Features**

### **Unified Interface**
- Single command-line interface for all database operations
- Consistent error handling and logging
- Comprehensive help system
- Configurable options and parameters

### **Comprehensive Functionality**
- **Database Lifecycle**: Create, list, drop, reset databases
- **Schema Management**: Initialize schema, cleanup labels
- **Data Operations**: Statistics, queries, ingestion, graph building
- **Maintenance**: Health checks, performance optimization

### **Error Handling**
- Robust error handling for all operations
- Detailed error messages and logging
- Graceful failure recovery
- Connection management

### **Performance Optimization**
- Batch processing for large operations
- Connection pooling and reuse
- Transaction management
- Index creation for performance

## 📊 **Usage Examples**

### **Development Workflow**
```bash
# 1. Create a new database for development
npx ts-node scripts/database/manage.ts create dev_procurement

# 2. Initialize schema
npx ts-node scripts/database/manage.ts init-schema dev_procurement

# 3. Ingest test data
npx ts-node scripts/database/manage.ts ingest-emails dev_procurement

# 4. Check database health
npx ts-node scripts/database/manage.ts health-check dev_procurement

# 5. View statistics
npx ts-node scripts/database/manage.ts stats dev_procurement
```

### **Production Operations**
```bash
# 1. Create production database
npx ts-node scripts/database/manage.ts create production_procurement

# 2. Initialize schema with constraints
npx ts-node scripts/database/manage.ts init-schema production_procurement

# 3. Build graph from extraction report
npx ts-node scripts/database/manage.ts build-graph production_procurement

# 4. Optimize performance
npx ts-node scripts/database/manage.ts optimize production_procurement

# 5. Monitor health
npx ts-node scripts/database/manage.ts health-check production_procurement
```

### **Maintenance Operations**
```bash
# 1. Check database status
npx ts-node scripts/database/manage.ts info production_procurement

# 2. Clean up unused labels
npx ts-node scripts/database/manage.ts cleanup-labels production_procurement

# 3. Run custom queries
npx ts-node scripts/database/manage.ts query production_procurement "MATCH (n:Organization) RETURN n.name LIMIT 10"

# 4. Reset for testing
npx ts-node scripts/database/manage.ts reset test_procurement
```

## 🔍 **Database Operations Details**

### **Database Creation**
- Creates new Neo4j database
- Validates database name
- Ensures proper permissions
- Initializes basic structure

### **Schema Initialization**
- Creates uniqueness constraints for entity types
- Creates vector indexes for searchable entities
- Configures proper indexing strategy
- Handles existing schema gracefully

### **Label Cleanup**
- Identifies unused labels from ontologies
- Removes unused labels from nodes
- Drops associated constraints and indexes
- Maintains data integrity

### **Graph Building**
- Processes extraction reports
- Creates nodes with proper labels
- Establishes relationships
- Handles batch processing for large datasets

### **Email Ingestion**
- Processes email files (.eml format)
- Extracts entities and relationships
- Stores data in graph format
- Handles errors gracefully

### **Performance Optimization**
- Creates performance indexes
- Optimizes query performance
- Configures database settings
- Monitors performance metrics

## 🛠️ **Configuration**

### **Environment Variables**
- `NEO4J_URI` - Neo4j connection URI
- `NEO4J_USERNAME` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `NEO4J_DATABASE` - Default database name

### **File Paths**
- **Extraction Reports**: `hybrid-extraction-report.json`
- **Email Directories**: `test-emails/`
- **Configuration**: Environment variables

## 🔄 **Migration from Legacy Scripts**

### **Old Scripts → New Commands**
| Old Script | New Command | Notes |
|------------|-------------|-------|
| `create-database.ts` | `manage.ts create` | Same functionality |
| `reset.ts` | `manage.ts reset` | Same functionality |
| `query.ts` | `manage.ts query` | Same functionality |
| `cleanup-db-labels.ts` | `manage.ts cleanup-labels` | Same functionality |
| `build-neo4j-graph.ts` | `manage.ts build-graph` | Same functionality |
| `run-neo4j-ingestion.ts` | `manage.ts ingest-emails` | Same functionality |

### **Benefits of Unified Script**
- **Single Interface**: One script for all operations
- **Better Error Handling**: Consistent error management
- **Improved Logging**: Detailed operation logging
- **Easier Maintenance**: Centralized functionality
- **Better Documentation**: Comprehensive help system

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Connection Problems**
```bash
# Check Neo4j is running
curl http://localhost:7474

# Verify credentials
echo $NEO4J_USERNAME
echo $NEO4J_PASSWORD
```

#### **Permission Issues**
```bash
# Check database permissions
npx ts-node scripts/database/manage.ts list

# Verify user has admin rights
npx ts-node scripts/database/manage.ts info neo4j
```

#### **Schema Issues**
```bash
# Reinitialize schema
npx ts-node scripts/database/manage.ts init-schema database_name

# Clean up labels
npx ts-node scripts/database/manage.ts cleanup-labels database_name
```

### **Debug Commands**
```bash
# Verbose output
DEBUG=* npx ts-node scripts/database/manage.ts list

# Check specific database
npx ts-node scripts/database/manage.ts health-check database_name

# Test connection
npx ts-node scripts/database/manage.ts query database_name "RETURN 1 as test"
```

## 📈 **Performance Considerations**

### **Large Datasets**
- Use batch processing for large operations
- Monitor memory usage during ingestion
- Consider database optimization after large imports
- Use appropriate indexes for query performance

### **Concurrent Operations**
- Avoid concurrent schema modifications
- Use separate databases for development/testing
- Monitor connection pool usage
- Implement proper error handling

### **Monitoring**
- Regular health checks
- Performance monitoring
- Error tracking
- Resource usage monitoring

The database management system is now fully unified and provides comprehensive functionality for all Neo4j operations! 