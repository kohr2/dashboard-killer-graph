# 🚀 TDD Development Plan for Deal Tracker App

## 📋 Overview

This document outlines a Test-Driven Development (TDD) approach for building the Deal Tracker App. We'll follow the Red-Green-Refactor cycle for each component, ensuring high test coverage and maintainable code.

## 🎯 TDD Principles
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code quality while keeping tests green

## 📅 Development Phases

### Phase 1: Foundation & Infrastructure (Weeks 1-2)

#### 1.1 Project Setup & CI/CD
**Tests First:**
```typescript
// test/setup/project.test.ts
describe('Project Infrastructure', () => {
  it('should have all required configuration files', () => {
    expect(fileExists('.env.example')).toBe(true);
    expect(fileExists('tsconfig.json')).toBe(true);
    expect(fileExists('jest.config.js')).toBe(true);
  });
  
  it('should have CI/CD pipeline configured', () => {
    expect(fileExists('.github/workflows/test.yml')).toBe(true);
  });
});
```

**Implementation:**
- Set up TypeScript, Jest, ESLint, Prettier
- Configure GitHub Actions for automated testing
- Docker compose for Neo4j and other services

#### 1.2 Ontology Models
**Tests First:**
```typescript
// test/ontology/crm-ontology.test.ts
describe('CRM Ontology', () => {
  it('should define Task class with required properties', () => {
    const ontology = new CRMOntology();
    const taskClass = ontology.getClass('Task');
    expect(taskClass.properties).toContain('dueDate');
    expect(taskClass.properties).toContain('assignee');
    expect(taskClass.properties).toContain('status');
  });
  
  it('should define Email class with relationships', () => {
    const ontology = new CRMOntology();
    const emailClass = ontology.getClass('Email');
    expect(emailClass.relationships).toContain('RELATES_TO_DEAL');
    expect(emailClass.relationships).toContain('SENT_BY');
  });
});

// test/ontology/finance-ontology.test.ts
describe('Finance Ontology', () => {
  it('should define Deal stages', () => {
    const ontology = new FinanceOntology();
    const stages = ontology.getDealStages();
    expect(stages).toContain('Sourcing');
    expect(stages).toContain('LOI');
    expect(stages).toContain('Diligence');
    expect(stages).toContain('Closing');
  });
});
```

### Phase 2: Data Layer & Graph Database (Weeks 3-4)

#### 2.1 Neo4j Connection & Basic Operations
**Tests First:**
```typescript
// test/graph/neo4j-connection.test.ts
describe('Neo4j Connection', () => {
  it('should connect to Neo4j instance', async () => {
    const connection = new Neo4jConnection();
    const result = await connection.testConnection();
    expect(result.connected).toBe(true);
  });
  
  it('should create and retrieve a node', async () => {
    const db = new Neo4jConnection();
    const node = await db.createNode('Deal', { name: 'Project Gotham' });
    expect(node.id).toBeDefined();
    
    const retrieved = await db.getNode(node.id);
    expect(retrieved.properties.name).toBe('Project Gotham');
  });
});
```

#### 2.2 RDF to Neo4j Ingestion
**Tests First:**
```typescript
// test/graph/rdf-ingestion.test.ts
describe('RDF Ingestion', () => {
  it('should convert RDF triple to Neo4j node', async () => {
    const ingester = new RDFIngester();
    const triple = new Triple('Deal:Gotham', 'hasStage', 'LOI');
    
    await ingester.ingest(triple);
    
    const result = await db.query(
      'MATCH (d:Deal {id: "Gotham"})-[:HAS_STAGE]->(s:Stage {name: "LOI"}) RETURN d, s'
    );
    expect(result.records).toHaveLength(1);
  });
});
```

### Phase 3: External Integrations (Weeks 5-6)

#### 3.1 Microsoft Graph API Integration
**Tests First:**
```typescript
// test/integrations/microsoft-graph.test.ts
describe('Microsoft Graph API', () => {
  it('should authenticate with Graph API', async () => {
    const client = new GraphAPIClient();
    const token = await client.authenticate();
    expect(token).toBeDefined();
    expect(token.expiresIn).toBeGreaterThan(0);
  });
  
  it('should fetch emails for a specific deal', async () => {
    const client = new GraphAPIClient();
    const emails = await client.getEmailsBySubject('Project Gotham');
    expect(emails).toBeInstanceOf(Array);
    expect(emails[0]).toHaveProperty('subject');
    expect(emails[0]).toHaveProperty('from');
    expect(emails[0]).toHaveProperty('receivedDateTime');
  });
});
```

#### 3.2 Salesforce Integration
**Tests First:**
```typescript
// test/integrations/salesforce.test.ts
describe('Salesforce API', () => {
  it('should sync tasks from Salesforce', async () => {
    const sf = new SalesforceClient();
    const tasks = await sf.getTasks({ status: 'Open' });
    expect(tasks).toBeInstanceOf(Array);
    expect(tasks[0]).toHaveProperty('Subject');
    expect(tasks[0]).toHaveProperty('WhoId');
  });
  
  it('should create task in Salesforce', async () => {
    const sf = new SalesforceClient();
    const task = await sf.createTask({
      Subject: 'Follow up on Project Gotham',
      DueDate: '2024-01-15'
    });
    expect(task.id).toBeDefined();
    expect(task.success).toBe(true);
  });
});
```

### Phase 4: NLP & Entity Extraction (Weeks 7-8)

#### 4.1 Entity Extraction Pipeline
**Tests First:**
```typescript
// test/nlp/entity-extraction.test.ts
describe('Entity Extraction', () => {
  it('should extract deal names from email text', () => {
    const extractor = new EntityExtractor();
    const text = "Following up on Project Gotham. Audax seems interested.";
    const entities = extractor.extract(text);
    
    expect(entities.deals).toContain('Project Gotham');
    expect(entities.investors).toContain('Audax');
  });
  
  it('should identify deal stage mentions', () => {
    const extractor = new EntityExtractor();
    const text = "We've sent the LOI for review. Expecting signatures by Friday.";
    const entities = extractor.extract(text);
    
    expect(entities.stage).toBe('LOI');
    expect(entities.intent).toBe('document_sent');
  });
});
```

#### 4.2 Ontology Mapping
**Tests First:**
```typescript
// test/nlp/ontology-mapping.test.ts
describe('Ontology Mapping', () => {
  it('should map extracted entities to RDF triples', () => {
    const mapper = new OntologyMapper();
    const entities = {
      deals: ['Project Gotham'],
      investors: ['Audax'],
      stage: 'LOI'
    };
    
    const triples = mapper.mapToRDF(entities);
    expect(triples).toContainEqual(
      new Triple('Deal:Gotham', 'hasInvestor', 'Investor:Audax')
    );
    expect(triples).toContainEqual(
      new Triple('Deal:Gotham', 'hasStage', 'Stage:LOI')
    );
  });
});
```

### Phase 5: Core Business Logic (Weeks 9-10)

#### 5.1 Deal Probability Calculator
**Tests First:**
```typescript
// test/expertsys/bid-probability.test.ts
describe('Bid Probability Calculator', () => {
  it('should calculate high probability for engaged investor', async () => {
    const calc = new BidProbabilityCalculator();
    const dealData = {
      dealId: 'Gotham',
      investor: 'Audax',
      emailCount: 5,
      lastContact: new Date(),
      stage: 'LOI'
    };
    
    const probability = await calc.calculate(dealData);
    expect(probability).toBeGreaterThan(0.7);
  });
  
  it('should calculate low probability for inactive investor', async () => {
    const calc = new BidProbabilityCalculator();
    const dealData = {
      dealId: 'Gotham',
      investor: 'BlueOwl',
      emailCount: 1,
      lastContact: new Date('2023-01-01'),
      stage: 'Sourcing'
    };
    
    const probability = await calc.calculate(dealData);
    expect(probability).toBeLessThan(0.3);
  });
});
```

#### 5.2 Insight Engine
**Tests First:**
```typescript
// test/insights/insight-engine.test.ts
describe('Insight Engine', () => {
  it('should detect stalling deals', async () => {
    const engine = new InsightEngine();
    await setupTestDeal({
      name: 'Project Gotham',
      lastActivity: new Date('2023-12-01')
    });
    
    const insights = await engine.generateInsights();
    expect(insights).toContainEqual({
      type: 'Risk',
      message: 'No updates on Project Gotham in 10+ days',
      linkedTo: 'Project Gotham'
    });
  });
  
  it('should identify hot investors', async () => {
    const engine = new InsightEngine();
    await setupInvestorActivity({
      investor: 'Audax',
      emailCount: 3,
      timeframe: 'this_week'
    });
    
    const insights = await engine.generateInsights();
    expect(insights).toContainEqual({
      type: 'Opportunity',
      message: 'Audax engaged 3x this week - high interest signal',
      linkedTo: 'Audax'
    });
  });
});
```

### Phase 6: Cursor Agents (Weeks 11-12)

#### 6.1 CRM Agent
**Tests First:**
```typescript
// test/agents/crm-agent.test.ts
describe('CRM Agent', () => {
  it('should answer deal status questions', async () => {
    const agent = new CRMAgent();
    const response = await agent.query("What's the latest on Project Gotham?");
    
    expect(response).toContain('Project Gotham');
    expect(response).toMatch(/stage|status|update/i);
  });
  
  it('should identify task owners', async () => {
    const agent = new CRMAgent();
    await setupTestTask({
      title: 'Follow up with Audax',
      assignee: 'John Doe'
    });
    
    const response = await agent.query("Who owns the Audax follow-up task?");
    expect(response).toContain('John Doe');
  });
});
```

#### 6.2 Deal Expert Agent
**Tests First:**
```typescript
// test/agents/deal-expert-agent.test.ts
describe('Deal Expert Agent', () => {
  it('should predict investor behavior', async () => {
    const agent = new DealExpertAgent();
    const response = await agent.query("Is Audax likely to bid on Project Gotham?");
    
    expect(response).toMatch(/probability|likelihood|chance/i);
    expect(response).toMatch(/\d+%/);
  });
  
  it('should advise on deal stages', async () => {
    const agent = new DealExpertAgent();
    const response = await agent.query("Where are we in diligence for Project Helix?");
    
    expect(response).toMatch(/diligence|stage|phase/i);
    expect(response).toMatch(/documents|NDA|data room/i);
  });
});
```

### Phase 7: UI Components (Weeks 13-14)

#### 7.1 Timeline View Component
**Tests First:**
```typescript
// test/ui/timeline-view.test.tsx
import { render, screen } from '@testing-library/react';

describe('Timeline View', () => {
  it('should display deal events chronologically', () => {
    const events = [
      { date: '2024-01-01', type: 'email', content: 'Initial contact' },
      { date: '2024-01-05', type: 'task', content: 'Send teaser' }
    ];
    
    render(<TimelineView dealId="Gotham" events={events} />);
    
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Initial contact');
  });
  
  it('should highlight stage transitions', () => {
    const events = [
      { date: '2024-01-10', type: 'stage_change', from: 'Sourcing', to: 'LOI' }
    ];
    
    render(<TimelineView dealId="Gotham" events={events} />);
    
    const stageChange = screen.getByText(/LOI/);
    expect(stageChange).toHaveClass('stage-highlight');
  });
});
```

#### 7.2 Entity Panel Component
**Tests First:**
```typescript
// test/ui/entity-panel.test.tsx
describe('Entity Panel', () => {
  it('should display deal details', () => {
    const deal = {
      name: 'Project Gotham',
      stage: 'LOI',
      value: '$50M',
      probability: 0.75
    };
    
    render(<EntityPanel entity={deal} type="deal" />);
    
    expect(screen.getByText('Project Gotham')).toBeInTheDocument();
    expect(screen.getByText('LOI')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
```

### Phase 8: Integration Testing (Week 15)

**End-to-End Tests:**
```typescript
// test/e2e/deal-workflow.test.ts
describe('Deal Workflow E2E', () => {
  it('should process email and update deal stage', async () => {
    // 1. Ingest email
    await emailIngester.ingest({
      subject: 'RE: Project Gotham - LOI signed',
      from: 'investor@audax.com',
      body: 'LOI has been signed and returned.'
    });
    
    // 2. Verify entity extraction
    const deal = await db.getDeal('Gotham');
    expect(deal.stage).toBe('LOI');
    
    // 3. Verify insight generation
    const insights = await insightEngine.getInsights('Gotham');
    expect(insights).toContainEqual({
      type: 'Success',
      message: 'LOI signed by Audax'
    });
    
    // 4. Verify agent can answer questions
    const response = await crmAgent.query("What's the status of Project Gotham?");
    expect(response).toContain('LOI signed');
  });
});
```

## 🛠️ Testing Tools & Setup

### Required Dependencies
```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "nock": "^13.3.0"
  }
}
```

### Test Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 📊 Metrics & Quality Gates

### Code Coverage Requirements
- Overall: 80%
- Critical paths: 95%
- Integration points: 90%

### Performance Benchmarks
- Graph queries: < 100ms
- Entity extraction: < 500ms per email
- Agent response time: < 2s

### Quality Checks
- All tests pass in CI/CD
- No TypeScript errors
- ESLint rules satisfied
- Security scan passed

## 🎬 Getting Started

1. **Setup Development Environment**
```bash
npm install
docker-compose up -d  # Neo4j and other services
npm run test:watch
```

2. **Follow TDD Cycle**
- Write failing test
- Implement minimal code
- Refactor when green
- Commit frequently

3. **Run Full Test Suite**
```bash
npm run test
npm run test:coverage
npm run test:e2e
```

## 📚 Best Practices

1. **Test Naming**: Use descriptive names that explain the behavior
2. **Test Isolation**: Each test should be independent
3. **Mock External Services**: Use nock for API mocking
4. **Test Data Builders**: Create factories for test data
5. **Continuous Refactoring**: Keep tests and code clean

## 🚦 Definition of Done

- [ ] All tests written and passing
- [ ] Code coverage meets thresholds
- [ ] Code reviewed by peer
- [ ] Documentation updated
- [ ] CI/CD pipeline green
- [ ] Performance benchmarks met 