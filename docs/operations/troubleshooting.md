# 🔧 Troubleshooting Guide

Common issues and solutions for the Extensible CRM Platform.

## 🚨 Quick Fixes

### Application Won't Start
```bash
# Check if ports are available
lsof -i :3000  # Web server
lsof -i :7474  # Neo4j
lsof -i :7687  # Neo4j Bolt

# Kill processes if needed
kill -9 <PID>

# Restart everything
docker-compose down -v
docker-compose up -d
npm run dev
```

### Tests Failing
```bash
# Clear Jest cache
npm run test -- --clearCache

# Reset test database
docker-compose restart neo4j-test

# Run tests in isolation
npm run test:unit -- --runInBand
```

### Dependencies Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for version conflicts
npm ls --depth=0
```

## 🏛️ CRM Core Issues

### Database Connection Failed

**Symptoms**: 
- Neo4j connection timeout
- "Database unavailable" errors
- Tests failing with database errors

**Solutions**:
```bash
# Check Neo4j status
docker-compose ps neo4j

# View Neo4j logs
docker-compose logs neo4j

# Reset Neo4j data
docker-compose down neo4j
docker volume rm financial-kill-the-crm_neo4j_data
docker-compose up -d neo4j

# Test connection
npm run test:integration -- --grep "database connection"
```

### Contact Entity Validation Errors

**Symptoms**:
- "Invalid email format" errors
- Contact creation failing in tests
- Validation rules not working

**Solutions**:
```typescript
// Check email validation logic
describe('Contact Entity Validation', () => {
  it('should validate email format', () => {
    // Debug the validation logic
    const contact = new Contact({
      name: 'Test User',
      email: 'test@example.com'  // Ensure valid format
    });
    expect(contact.isValid()).toBe(true);
  });
});
```

### External API Integration Issues

**Symptoms**:
- Microsoft Graph API authentication failures
- Email sync not working
- Rate limiting errors

**Solutions**:
```bash
# Check API credentials
cat .env | grep GRAPH_API

# Test API connection
curl -H "Authorization: Bearer $GRAPH_TOKEN" \
  https://graph.microsoft.com/v1.0/me

# Mock API calls in tests
const mockGraphAPI = {
  getEmails: jest.fn().mockResolvedValue([])
};
```

## 💰 Financial Extension Issues

### Deal Probability Calculation Errors

**Symptoms**:
- Probability values outside 0-1 range
- NaN or undefined probability values
- Calculation logic throwing errors

**Solutions**:
```typescript
// Debug probability calculation
describe('Deal Probability Debug', () => {
  it('should calculate valid probability', () => {
    const deal = new Deal({
      stage: DealStage.LOI,
      engagement: 'high',
      lastContact: new Date()
    });
    
    console.log('Deal data:', deal.getData());
    const probability = deal.calculateProbability();
    console.log('Calculated probability:', probability);
    
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).toBeLessThanOrEqual(1);
  });
});
```

### Deal Stage Transition Errors

**Symptoms**:
- Invalid stage transition errors
- Deal stage not updating
- State machine logic failing

**Solutions**:
```typescript
// Check valid transitions
const VALID_TRANSITIONS = {
  [DealStage.SOURCING]: [DealStage.LOI],
  [DealStage.LOI]: [DealStage.DILIGENCE],
  [DealStage.DILIGENCE]: [DealStage.CLOSING, DealStage.DEAD]
};

// Debug transition logic
deal.moveToStage(DealStage.LOI);  // Should work
deal.moveToStage(DealStage.CLOSING);  // Should fail - skips DILIGENCE
```

### Financial Data Source Issues

**Symptoms**:
- Market data API failures
- Valuation data not loading
- External financial service timeouts

**Solutions**:
```bash
# Check API endpoints
curl -X GET "https://api.marketdata.com/v1/company/COMP123" \
  -H "Authorization: Bearer $MARKET_DATA_API_KEY"

# Enable debug logging
DEBUG=financial:api npm run dev

# Use fallback data in development
export USE_MOCK_FINANCIAL_DATA=true
```

## 🔧 Platform Issues

### Extension Loading Failures

**Symptoms**:
- Extensions not discovered
- "Extension not found" errors
- Platform initialization failures

**Solutions**:
```typescript
// Debug extension registration
describe('Extension Loading Debug', () => {
  it('should discover and load financial extension', () => {
    const registry = new ExtensionRegistry();
    const discoveredExtensions = registry.discoverExtensions('./src/extensions');
    
    console.log('Discovered extensions:', discoveredExtensions);
    expect(discoveredExtensions).toContain('financial');
  });
});

// Check extension structure
const financialExtension = require('./src/extensions/financial');
console.log('Extension exports:', Object.keys(financialExtension));
```

### Cross-Extension Communication Issues

**Symptoms**:
- Events not being published/received
- Extension-to-extension calls failing
- Event bus not working

**Solutions**:
```typescript
// Debug event bus
describe('Event Bus Debug', () => {
  it('should publish and receive events', async () => {
    const eventBus = new EventBus();
    let receivedEvent = null;
    
    eventBus.subscribe('DealCreated', (event) => {
      receivedEvent = event;
    });
    
    await eventBus.publish('DealCreated', { dealId: '123' });
    
    expect(receivedEvent).not.toBeNull();
    console.log('Received event:', receivedEvent);
  });
});
```

### Extension Validation Errors

**Symptoms**:
- Extension fails validation
- "Invalid extension structure" errors
- Platform rejects extension

**Solutions**:
```typescript
// Check extension interface compliance
class FinancialExtension implements Extension {
  readonly name = 'financial';
  readonly version = '1.0.0';
  readonly dependencies = ['crm-core'];
  
  // Ensure all required methods are implemented
  async initialize(crmCore: CRMCore): Promise<void> { /* */ }
  getRoutes(): Route[] { return []; }
  getComponents(): Component[] { return []; }
  getUseCases(): UseCase[] { return []; }
  async shutdown(): Promise<void> { /* */ }
}
```

## 🧪 Testing Issues

### Test Suite Performance

**Symptoms**:
- Tests running slowly
- Test timeouts
- Memory usage issues

**Solutions**:
```bash
# Run tests in parallel
npm run test -- --maxWorkers=4

# Run specific test suites
npm run test:unit -- --testPathPattern=crm-core

# Increase timeout for slow tests
jest.setTimeout(30000);

# Use test database
TEST_DATABASE_URL=neo4j://localhost:7688 npm test
```

### Mock and Stub Issues

**Symptoms**:
- Mocks not being called
- External dependencies not stubbed
- Test isolation failures

**Solutions**:
```typescript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Verify mock calls
const mockRepo = { save: jest.fn() };
await useCase.execute(data);
expect(mockRepo.save).toHaveBeenCalledWith(expect.any(Contact));

// Stub external dependencies
jest.mock('./external-api', () => ({
  GraphAPI: {
    getEmails: jest.fn().mockResolvedValue([])
  }
}));
```

### Coverage Issues

**Symptoms**:
- Coverage below threshold
- Untested code paths
- Coverage reports not generating

**Solutions**:
```bash
# Generate detailed coverage report
npm run test:coverage -- --coverage-reporter=html

# View coverage report
open coverage/lcov-report/index.html

# Check specific file coverage
npm run test:coverage -- src/crm-core/domain/entities/contact.ts

# Exclude files from coverage
// jest.config.js
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/test/',
  '/.gitkeep'
]
```

## 🚀 Performance Issues

### Slow API Responses

**Symptoms**:
- API endpoints taking >1 second
- Database queries timing out
- UI loading slowly

**Solutions**:
```typescript
// Add database indexes
CREATE INDEX FOR (c:Contact) ON (c.email);
CREATE INDEX FOR (d:Deal) ON (d.stage);

// Optimize queries
MATCH (c:Contact)-[:HAS_DEAL]->(d:Deal)
WHERE d.stage = 'LOI'
RETURN c, d
LIMIT 50;

// Add caching
const cachedResult = await cache.get(cacheKey);
if (cachedResult) return cachedResult;
```

### Memory Leaks

**Symptoms**:
- Application memory usage growing
- Node.js heap out of memory errors
- Performance degrading over time

**Solutions**:
```bash
# Monitor memory usage
node --inspect --max-old-space-size=4096 src/server.js

# Use heap profiler
npm install -g clinic
clinic doctor -- node src/server.js

# Check for event listener leaks
process.on('warning', (warning) => {
  console.warn(warning.name);
  console.warn(warning.message);
  console.warn(warning.stack);
});
```

## 🛡️ Security Issues

### Authentication Failures

**Symptoms**:
- JWT token validation failing
- Unauthorized access errors
- Session issues

**Solutions**:
```bash
# Check JWT secret
echo $JWT_SECRET | base64 -d

# Verify token structure
node -e "console.log(require('jsonwebtoken').decode('$TOKEN'))"

# Test authentication endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Data Validation Issues

**Symptoms**:
- SQL injection vulnerabilities
- Input validation bypassed
- Data integrity issues

**Solutions**:
```typescript
// Use parameterized queries
const query = `
  MATCH (c:Contact)
  WHERE c.email = $email
  RETURN c
`;
const result = await session.run(query, { email: userInput });

// Validate all inputs
const contactSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});
```

## 📞 Getting Help

### Debug Logging
```bash
# Enable debug mode
DEBUG=* npm run dev

# Module-specific logging
DEBUG=crm-core:* npm run dev
DEBUG=financial:* npm run dev
DEBUG=platform:* npm run dev
```

### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/database

# Extension health
curl http://localhost:3000/health/extensions
```

### Support Channels
- **📖 Documentation**: [docs/](../)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/your-org/financial-kill-the-crm/issues)
- **💬 Questions**: [GitHub Discussions](https://github.com/your-org/financial-kill-the-crm/discussions)
- **🔧 Development**: [Contributing Guide](../development/contributing.md)

---

**Need immediate help?** Check our [FAQ](faq.md) or [create an issue](https://github.com/your-org/financial-kill-the-crm/issues/new). 