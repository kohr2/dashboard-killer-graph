# Procurement Entity Recognition Analysis & Improvements

## Current State Analysis

### ✅ **What's Working Well**

1. **OpenAI Integration**: Using GPT-4o for entity extraction
2. **Ontology Scoping**: Procurement ontology (148 entities) is being used correctly
3. **Rich Entity Types**: Recognizes procurement-specific entities like:
   - `Contractor`, `Buyer`, `MonetaryValue`, `ProcurementObject`, `Contract`
   - `ProcurementDocument`, `Business`, `Notice`, `AwardCriteriaSummary`
4. **Meaningful Relationships**: Creates procurement-specific relationships
5. **Batch Processing**: Efficient processing of multiple documents

### 🔍 **Identified Issues**

Based on the observation "only one Project, one ProcurementObject, one Buyer over 200 emails":

1. **Entity Recognition Patterns**: LLM may not recognize all instances
2. **Context Understanding**: Limited understanding of procurement workflows
3. **Entity Deduplication**: Potential over-deduplication of similar entities
4. **Prompt Engineering**: Generic prompt not optimized for procurement

## Improvement Recommendations

### 1. **Enhanced Prompt Engineering**

**Current Prompt Issues:**
- Too generic ("expert financial analyst")
- No procurement-specific context
- Limited guidance on entity recognition patterns

**Recommended Improvements:**
```python
prompt = f"""
You are an expert procurement analyst specializing in public procurement and contract management. 
Your goal is to extract entities and relationships from procurement documents to build a knowledge graph.

**Procurement Context:**
- Focus on procurement-specific entities: contracts, tenders, suppliers, buyers, monetary amounts
- Recognize procurement workflows: RFQ → Tender → Award → Contract
- Identify procurement roles: Buyer, Contractor, Supplier, Tenderer
- Extract procurement objects: services, goods, works

**Entity Recognition Guidelines:**
1. **Companies/Organizations**: Extract all mentioned companies, not just the main ones
2. **Monetary Values**: Capture all amounts, currencies, and financial terms
3. **Procurement Objects**: Identify what is being procured (services, goods, works)
4. **Dates and References**: Extract contract numbers, reference codes, dates
5. **Roles**: Identify all procurement roles (buyer, contractor, supplier, etc.)

**Ontology:**
{json.dumps(compact_ontology, indent=2)}

**Instructions:**
1. Analyze the text carefully for ALL procurement-related entities
2. Extract entities that match the ontology types
3. Identify relationships between entities
4. Be comprehensive - extract multiple instances of the same entity type
5. Focus on procurement-specific terminology and workflows

**Text to Analyze:**
---
{text}
---
"""
```

### 2. **Entity Recognition Patterns**

**Add Procurement-Specific Patterns:**
```python
# Add to SpacyEntityExtractor patterns
patterns = [
    # Existing patterns...
    {"label": "ContractNumber", "pattern": [{"TEXT": {"REGEX": r"PROCUREMENT-\d+"}}]},
    {"label": "MonetaryAmount", "pattern": [{"TEXT": {"REGEX": r"\$[\d,]+(?:\.\d{2})?[MK]?"}}]},
    {"label": "Currency", "pattern": [{"TEXT": {"REGEX": r"\b(GBP|USD|EUR|CAD)\b"}}]},
    {"label": "ProcurementObject", "pattern": [{"LOWER": {"IN": ["services", "goods", "works", "transport", "software", "maintenance"]}}]},
]
```

### 3. **Context-Aware Entity Extraction**

**Improve Entity Recognition by Context:**
- **Email Subject Analysis**: Use subject lines to identify procurement document types
- **Sender/Recipient Analysis**: Identify procurement roles from email addresses
- **Document Type Detection**: RFQ, Tender, Contract Award, etc.

### 4. **Entity Deduplication Strategy**

**Current Issue**: Over-deduplication of similar entities
**Solution**: Implement smarter deduplication:
- Allow multiple instances of the same entity type
- Use context to differentiate similar entities
- Implement confidence-based deduplication

### 5. **Procurement-Specific Training**

**Enhance LLM Understanding:**
- Add procurement terminology to the prompt
- Include examples of procurement entity extraction
- Provide procurement workflow context

## Implementation Plan

### Phase 1: Prompt Enhancement
1. Update the LLM prompt with procurement-specific context
2. Add procurement terminology and examples
3. Test with sample procurement emails

### Phase 2: Pattern Recognition
1. Add procurement-specific regex patterns
2. Implement context-aware entity extraction
3. Enhance entity type recognition

### Phase 3: Deduplication Strategy
1. Review current deduplication logic
2. Implement context-aware deduplication
3. Allow multiple instances of same entity type

### Phase 4: Performance Monitoring
1. Track entity extraction metrics
2. Monitor entity diversity across emails
3. Measure relationship extraction quality

## Expected Outcomes

After implementing these improvements:

1. **Increased Entity Diversity**: More unique entities per email
2. **Better Context Understanding**: Improved recognition of procurement workflows
3. **Enhanced Relationship Quality**: More meaningful procurement relationships
4. **Higher Entity Count**: More entities extracted per document
5. **Improved Accuracy**: Better recognition of procurement-specific terminology

## Testing Strategy

1. **Baseline Measurement**: Current entity extraction performance
2. **A/B Testing**: Compare old vs. new prompts
3. **Entity Diversity Analysis**: Measure unique entities per email
4. **Relationship Quality Assessment**: Evaluate relationship relevance
5. **End-to-End Testing**: Full procurement email ingestion pipeline 