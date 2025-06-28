# Technical Debt Cleanup Plan

## 🎯 High Priority TODOs (Week 1-2)

### Core Infrastructure
- [ ] `src/platform/extension-framework/event-bus.ts:37` - Add proper logging system
- [ ] `src/ontologies/crm/application/services/contact.service.ts:110` - Implement robust search
- [ ] `src/ontologies/crm/infrastructure/repositories/neo4j-communication-repository.ts:180-215` - Implement missing methods

### Critical Missing Implementations
- [ ] `src/ingestion/sources/email/email-source.ts:40-72` - Complete email processing logic
- [ ] `src/ontologies/crm/infrastructure/repositories/neo4j-ocream-contact-repository.ts:107` - Additional email logic

## 📊 Medium Priority TODOs (Week 3-4)

### Unified Architecture Migration
- [ ] `src/ingestion/intelligence/nlp/entity-extractor.ts:11-58` - Migrate to unified types
- [ ] `src/ingestion/core/pipeline/ingestion-pipeline.ts:98-150` - Complete pipeline implementation
- [ ] `src/ingestion/sources/email/processors/email-processor.ts:12-54` - Update to unified interfaces

### Repository Pattern Completion
- [ ] All `i-*-repository.ts` files - Add missing repository methods (40+ files)

## 🔧 Low Priority TODOs (Week 5+)

### Documentation & Exports
- [ ] Multiple `index.ts` files - Add proper exports
- [ ] Interface definitions - Complete API and UI component exports

## 📈 Impact Assessment

| Category | Count | Estimated Hours | Business Impact |
|----------|-------|-----------------|-----------------|
| Critical | 8     | 40h            | High           |
| Medium   | 15    | 60h            | Medium         |
| Low      | 35+   | 80h            | Low            |

## 🎯 Recommended Approach

1. **Week 1**: Fix critical infrastructure TODOs
2. **Week 2**: Complete core repository implementations  
3. **Week 3-4**: Migrate to unified architecture
4. **Week 5+**: Clean up documentation and exports 