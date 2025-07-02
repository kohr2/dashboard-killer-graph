export interface ResolvableEntity {
    type: string;
    value: string;
    metadata?: Record<string, any>;
}

const ENTITY_ALIAS_MAP: Record<string, string> = {
  'GS': 'Goldman Sachs',
  'JPM': 'JPMorgan Chase & Co.',
  'MS': 'Morgan Stanley',
  'Citi': 'Citigroup',
  'BoA': 'Bank of America',
  'BofA': 'Bank of America',
  'DB': 'Deutsche Bank',
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOG': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'NVDA': 'NVIDIA Corporation',
};

export class EntityResolutionService {
    public resolve(entities: ResolvableEntity[]): ResolvableEntity[] {
        return entities.map(entity => {
            const canonicalName = ENTITY_ALIAS_MAP[entity.value.toUpperCase()];
            if (canonicalName) {
                return {
                    ...entity,
                    value: canonicalName,
                    metadata: {
                        ...entity.metadata,
                        originalValue: entity.value,
                        resolved: true,
                    },
                };
            }
            return entity;
        });
    }
} 