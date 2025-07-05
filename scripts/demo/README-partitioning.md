# Prompt Partitioning System

This system helps manage large LLM prompts by breaking them into manageable chunks that can be combined in different ways based on your needs.

## Overview

Large ontologies can generate prompts with thousands of relationship patterns, making them too large for LLM token limits. This partitioning system:

1. **Breaks down the prompt** into logical chunks
2. **Filters out generic relationships** (like Entity->Entity patterns)
3. **Provides different strategies** for combining chunks
4. **Estimates token usage** to stay within limits

## Quick Start

### 1. Generate Partitions

```bash
npx ts-node -T -r tsconfig-paths/register -r reflect-metadata scripts/demo/partition-prompt.ts \
  --ontology=procurement \
  --email=test/fixtures/procurement/emails/001-contract-award-abc-corp.eml \
  --output-dir=./prompt-partitions
```

This creates:
- `metadata.json` - Information about the partitioning
- `00-instructions.txt` - Core instructions and output format
- `02-entities.txt` - Entity types from the ontology
- `03-relationships-*.txt` - Relationship patterns (split into chunks)
- `04-text-*.txt` - Email content (split if large)
- `combined-prompt.txt` - Full prompt for reference
- `README.md` - Usage instructions

### 2. Use Different Strategies

```bash
# Minimal prompt (smallest, fastest)
npx ts-node -T -r tsconfig-paths/register scripts/demo/use-partitioned-prompt.ts \
  --partitions-dir=./prompt-partitions \
  --strategy=minimal \
  --output=./minimal-prompt.txt

# Standard prompt (balanced)
npx ts-node -T -r tsconfig-paths/register scripts/demo/use-partitioned-prompt.ts \
  --partitions-dir=./prompt-partitions \
  --strategy=standard \
  --output=./standard-prompt.txt

# Comprehensive prompt (most complete)
npx ts-node -T -r tsconfig-paths/register scripts/demo/use-partitioned-prompt.ts \
  --partitions-dir=./prompt-partitions \
  --strategy=comprehensive \
  --output=./comprehensive-prompt.txt
```

## Prompt Strategies

### Minimal Strategy
- **Use case**: Quick testing, simple documents
- **Includes**: Instructions + entities + essential relationships + first text chunk
- **Token limit**: ~4,000 tokens
- **Best for**: Simple entity extraction, basic relationship detection

### Standard Strategy
- **Use case**: Most common scenarios
- **Includes**: Full instructions + all entities + first 2 relationship chunks + full text
- **Token limit**: ~8,000 tokens
- **Best for**: Balanced extraction quality and performance

### Comprehensive Strategy
- **Use case**: Complex documents, maximum accuracy
- **Includes**: Everything - all partitions
- **Token limit**: ~16,000 tokens
- **Best for**: Complex relationship extraction, maximum recall

### Custom Strategy
- **Use case**: Specific requirements
- **Includes**: User-defined partition selection
- **Token limit**: ~6,000 tokens
- **Best for**: Tailored extraction needs

## Available Commands

### List Strategies
```bash
npx ts-node -T -r tsconfig-paths/register scripts/demo/use-partitioned-prompt.ts \
  --partitions-dir=./prompt-partitions \
  --list-strategies
```

### List Partitions
```bash
npx ts-node -T -r tsconfig-paths/register scripts/demo/use-partitioned-prompt.ts \
  --partitions-dir=./prompt-partitions \
  --list-partitions
```

### Generate Original Prompt
```bash
npx ts-node -T -r tsconfig-paths/register -r reflect-metadata scripts/demo/print-prompt.ts \
  --ontology=procurement \
  --email=test/fixtures/procurement/emails/001-contract-award-abc-corp.eml
```

## Relationship Filtering

The system automatically filters out generic relationships to reduce prompt size:

**Filtered out:**
- `Entity->Entity` patterns
- `Entity-hasProperty->Entity`
- `Entity-hasAttribute->Entity`
- `Entity-hasValue->Entity`
- `Entity-hasType->Entity`
- `Entity-hasName->Entity`
- `Entity-hasId->Entity`

**Kept:**
- Domain-specific relationships like `Organization-awardsContract->Contract`
- Specific entity type relationships like `Person-managesProject->Project`

## Token Estimation

The system provides rough token estimation:
- **Estimation method**: 1 token ≈ 4 characters
- **Accuracy**: Approximate, actual tokenization may vary by LLM
- **Recommendation**: Stay 20% below limits for safety

## Integration with NLP Service

To use partitioned prompts with the NLP service:

1. **Generate partitions** for your ontology and email
2. **Choose appropriate strategy** based on your needs
3. **Save the prompt** to a file
4. **Use the prompt** in your NLP service calls

Example integration:
```typescript
import { readFileSync } from 'fs';

// Load the partitioned prompt
const prompt = readFileSync('./standard-prompt.txt', 'utf8');

// Use with NLP service
const response = await axios.post('http://localhost:8000/extract-graph', {
  text: prompt,
  // other parameters...
});
```

## Best Practices

### 1. Start with Minimal Strategy
- Test with minimal strategy first
- Check if extraction quality is sufficient
- Move to standard/comprehensive if needed

### 2. Monitor Token Usage
- Keep track of actual token consumption
- Adjust strategy based on your LLM's limits
- Consider cost implications of larger prompts

### 3. Customize for Your Domain
- Modify the filtering logic for your specific needs
- Add domain-specific relationship patterns
- Adjust partition sizes based on your content

### 4. Version Control
- Include partition directories in version control
- Document which strategy works best for each use case
- Track performance metrics across strategies

## Troubleshooting

### Prompt Too Large
- Use a smaller strategy (minimal → standard → comprehensive)
- Reduce `--max-size` parameter when generating partitions
- Filter out more generic relationships

### Missing Relationships
- Use comprehensive strategy
- Check if important relationships were filtered out
- Modify filtering logic in `partition-prompt.ts`

### Poor Extraction Quality
- Try comprehensive strategy
- Check if relevant relationships are included
- Verify ontology registration is correct

### Performance Issues
- Use minimal strategy for faster processing
- Reduce text chunk sizes
- Consider batching multiple smaller prompts

## Advanced Usage

### Custom Partition Selection
```typescript
import { loadPartitionedPrompt, buildPromptFromPartitions } from './use-partitioned-prompt';

const { partitions } = loadPartitionedPrompt('./prompt-partitions');
const customPrompt = buildPromptFromPartitions(partitions, [
  '01-instructions',
  '02-entities', 
  '03-relationships-01',
  '04-text-01'
]);
```

### Dynamic Strategy Selection
```typescript
function selectStrategy(documentComplexity: 'simple' | 'medium' | 'complex'): PromptStrategy {
  switch (documentComplexity) {
    case 'simple': return 'minimal';
    case 'medium': return 'standard';
    case 'complex': return 'comprehensive';
  }
}
```

### Batch Processing
```bash
# Process multiple emails with same ontology
for email in test/fixtures/procurement/emails/*.eml; do
  npx ts-node -T -r tsconfig-paths/register -r reflect-metadata scripts/demo/partition-prompt.ts \
    --ontology=procurement \
    --email="$email" \
    --output-dir="./partitions/$(basename "$email" .eml)"
done
``` 