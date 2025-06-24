# 🕸️ Knowledge Graph Database Setup

Transform your CRM data into a powerful **Knowledge Graph** using **Neo4j**! This guide shows you how to leverage graph database technology for superior relationship modeling and insights.

## 🎯 **Why Knowledge Graph for CRM?**

Traditional databases store data in tables. **Knowledge Graphs** store data as **connected entities** with **rich relationships**:

- **🔗 Natural Relationships**: Contacts ↔ Organizations ↔ Communications ↔ Tasks
- **🔍 Pattern Discovery**: "Find high-priority tasks for contacts at Large Healthcare organizations"
- **🌐 Graph Traversal**: Shortest paths, relationship networks, influence mapping
- **📊 Advanced Analytics**: Network analysis, relationship strength, predictive patterns

---

## 🚀 **Quick Start**

### 1. **Start Neo4j Database**
```bash
# Start Neo4j in Docker (requires Docker installed)
npm run graph:start

# Verify it's running
docker ps | grep neo4j
```

### 2. **Access Neo4j Browser**
Open [http://localhost:7474](http://localhost:7474) in your browser:
- **URI**: `bolt://localhost:7687`
- **Username**: `neo4j`
- **Password**: `password`

### 3. **Run the Demo**
```bash
# Execute the knowledge graph demo
npm run graph:demo
```

### 4. **Explore the Graph**
In the Neo4j Browser, run:
```cypher
MATCH (n) RETURN n LIMIT 25
```

---

## 🏗️ **Architecture Overview**

```
📊 CRM Knowledge Graph Architecture

   ┌─────────────────────────────────────────────────┐
   │                 Application Layer                │
   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
   │  │Use Cases    │ │Services     │ │Controllers  ││
   │  └─────────────┘ └─────────────┘ └─────────────┘│
   └─────────────────────┬───────────────────────────┘
                         │
   ┌─────────────────────▼───────────────────────────┐
   │               Repository Layer                   │
   │  ┌─────────────────────────────────────────────┐│
   │  │     Repository Interfaces (Domain)          ││
   │  │  ContactRepo │ OrgRepo │ CommRepo │ TaskRepo ││
   │  └─────────────────────────────────────────────┘│
   └─────────────────────┬───────────────────────────┘
                         │
   ┌─────────────────────▼───────────────────────────┐
   │            Infrastructure Layer                  │
   │  ┌─────────────────────────────────────────────┐│
   │  │      Neo4j Repository Implementations       ││
   │  │  Neo4jContactRepo │ Advanced Graph Queries  ││
   │  └─────────────────────────────────────────────┘│
   │  ┌─────────────────────────────────────────────┐│
   │  │         Neo4j Knowledge Graph               ││
   │  │    Nodes │ Relationships │ Properties       ││
   │  └─────────────────────────────────────────────┘│
   └─────────────────────────────────────────────────┘
```

---

## 🔍 **Graph Data Model**

### **Nodes (Entities)**
- **:Contact** - People in your CRM
- **:Organization** - Companies and institutions  
- **:Communication** - Emails, calls, meetings
- **:Task** - To-dos and action items

### **Relationships (Connections)**
- **WORKS_AT** - Contact → Organization (with role, start date)
- **PARTICIPANT_IN** - Contact → Communication
- **ASSIGNED_TO** - Task → Contact
- **RELATED_TO** - Task → Communication
- **PARTNERS_WITH** - Organization → Organization
- **CLIENT_OF** - Organization → Organization

### **Properties (Attributes)**
All entities have rich properties like names, dates, statuses, priorities, etc.

---

## 📊 **Sample Graph Queries**

### **Basic Queries**
```cypher
// Find all contacts
MATCH (c:Contact) RETURN c

// Find contacts at specific organization
MATCH (c:Contact)-[:WORKS_AT]->(o:Organization {name: 'TechCorp'})
RETURN c.name, c.email

// Find high-priority tasks
MATCH (t:Task) 
WHERE t.priority IN ['high', 'urgent']
RETURN t.title, t.dueDate
```

### **Relationship Queries**
```cypher
// Communication network analysis
MATCH (c1:Contact)-[:PARTICIPANT_IN]->(comm:Communication)<-[:PARTICIPANT_IN]-(c2:Contact)
WHERE c1 <> c2
RETURN c1.name, c2.name, count(comm) as interactions
ORDER BY interactions DESC

// Find overdue tasks by organization size
MATCH (c:Contact)-[:WORKS_AT]->(o:Organization),
      (t:Task)-[:ASSIGNED_TO]->(c)
WHERE o.size = 'Large' 
  AND t.dueDate < datetime()
  AND t.status <> 'completed'
RETURN c.name, o.name, t.title, t.dueDate
```

### **Advanced Analytics**
```cypher
// Organization influence score
MATCH (o:Organization)<-[:WORKS_AT]-(c:Contact)
OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
OPTIONAL MATCH (t:Task)-[:ASSIGNED_TO]->(c)
WITH o, 
     count(DISTINCT c) as employeeCount,
     count(DISTINCT comm) as totalCommunications,
     count(DISTINCT t) as totalTasks
RETURN o.name,
       (employeeCount * 2 + totalCommunications + totalTasks) as influenceScore
ORDER BY influenceScore DESC
```

---

## 🛠️ **Development Commands**

### **Database Management**
```bash
# Start Neo4j database
npm run graph:start

# Stop Neo4j database  
npm run graph:stop

# Clean database (removes all data)
npm run graph:clean

# View database logs
npm run graph:logs
```

### **Development & Testing**
```bash
# Run integration tests (requires Neo4j running)
npm run test:integration

# Run repository tests (in-memory)
npm run test:repositories

# Run full demo with sample data
npm run graph:demo
```

---

## 🔧 **Configuration**

### **Environment Variables**
Create `.env` file:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
```

### **Docker Configuration**
The `docker-compose.neo4j.yml` provides:
- **Persistent Storage** - Data survives container restarts
- **Optimized Memory** - 1GB heap, 256MB page cache
- **APOC Procedures** - Advanced graph algorithms
- **Multiple Ports** - Bolt (7687), HTTP (7474), HTTPS (7473)

---

## 📈 **Query Performance Tips**

### **1. Use Indexes and Constraints**
```cypher
// Create unique constraints (auto-creates indexes)
CREATE CONSTRAINT contact_id_unique FOR (c:Contact) REQUIRE c.id IS UNIQUE;

// Create property indexes
CREATE INDEX contact_email_idx FOR (c:Contact) ON (c.email);
```

### **2. Efficient Query Patterns**
```cypher
// ✅ Good: Start with specific nodes
MATCH (c:Contact {email: 'john@example.com'})
MATCH (c)-[:WORKS_AT]->(o:Organization)
RETURN o.name

// ❌ Avoid: Scanning all nodes  
MATCH (c:Contact)-[:WORKS_AT]->(o:Organization)
WHERE c.email = 'john@example.com'
RETURN o.name
```

### **3. Use EXPLAIN and PROFILE**
```cypher
// Analyze query performance
EXPLAIN MATCH (c:Contact)-[:WORKS_AT]->(o:Organization) RETURN c, o

// Profile actual execution
PROFILE MATCH (c:Contact)-[:WORKS_AT]->(o:Organization) RETURN c, o
```

---

## 🔮 **Advanced Features**

### **Graph Algorithms**
```cypher
// Shortest path between contacts
MATCH path = shortestPath((c1:Contact)-[*..5]-(c2:Contact))
WHERE c1.name = 'John Smith' AND c2.name = 'Emma Davis'
RETURN path

// PageRank for contact influence
CALL gds.pageRank.stream('contact-network')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name as contact, score
ORDER BY score DESC
```

### **Temporal Queries**
```cypher
// Communication trends over time
MATCH (c:Communication)
WITH c, duration.between(c.createdAt, datetime()) as age
WHERE age.days <= 30
RETURN extract(day FROM c.createdAt) as day,
       count(c) as communications
ORDER BY day
```

### **Predictive Analytics**
```cypher
// Identify at-risk contacts (low engagement)
MATCH (c:Contact)
OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
WHERE comm.createdAt > datetime() - duration({months: 2})
WITH c, count(comm) as recentCommunications
WHERE recentCommunications < 2
RETURN c.name, c.email, recentCommunications,
       'High Risk - Low Engagement' as riskLevel
```

---

## 🚨 **Troubleshooting**

### **Connection Issues**
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Check logs for errors
npm run graph:logs

# Restart database
npm run graph:stop && npm run graph:start
```

### **Performance Issues**
- Add indexes for frequently queried properties
- Use `LIMIT` clauses for large result sets
- Optimize query patterns (start with specific nodes)
- Monitor memory usage in Docker

### **Data Issues**
```cypher
// Check database contents
CALL db.labels();  // Show all node types
CALL db.relationshipTypes();  // Show all relationship types
CALL db.schema.visualization();  // Show schema
```

---

## 🎓 **Learning Resources**

- **[Neo4j Documentation](https://neo4j.com/docs/)**
- **[Cypher Query Language](https://neo4j.com/developer/cypher/)**
- **[Graph Data Science](https://neo4j.com/docs/graph-data-science/)**
- **[APOC Procedures](https://neo4j.com/developer/neo4j-apoc/)**

---

## 🎯 **Next Steps**

1. **🔍 Explore the Demo** - Run `npm run graph:demo` and explore the generated graph
2. **🛠️ Build Custom Queries** - Create queries specific to your CRM needs
3. **📊 Add Analytics** - Implement business intelligence dashboards
4. **🔗 Extend Relationships** - Add more entity types and connections
5. **🚀 Production Deploy** - Set up Neo4j in production environment

**Ready to unlock the power of your CRM data? Start with `npm run graph:start`!** 🚀 