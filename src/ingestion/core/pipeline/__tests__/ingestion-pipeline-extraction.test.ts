import { IngestionPipeline } from '../../../../../src/ingestion/core/pipeline/ingestion-pipeline';
import { DataSource, SourceType } from '../../../../../src/ingestion/core/types/data-source.interface';
import { container } from 'tsyringe';

// A stub extractor to prove pluggability
class StubEntityExtractor {
  async extract(text: string) {
    return {
      entities: [{ id: 'e1', name: 'Test Entity', type: 'Thing' }],
      relationships: [],
    };
  }
}

// Simple mock DataSource emitting one item
class SingleItemSource implements DataSource {
  readonly id = 'single-item';
  readonly type = SourceType.EMAIL;
  readonly config = { name: 'single', enabled: true };
  async connect() {}
  async *fetch() {
    yield 'Hello world';
  }
  async disconnect() {}
  async healthCheck() {
    return { status: 'healthy' as const, lastCheck: new Date(), message: 'ok' };
  }
}

describe('IngestionPipeline entity extraction decoupling', () => {
  it('should delegate entity extraction to an injected extractor implementation', async () => {
    // Register stub extractor in DI container
    container.register('EntityExtractor', { useClass: StubEntityExtractor });

    const pipeline = container.resolve(IngestionPipeline);
    const source = new SingleItemSource();

    const result = await pipeline.process(source);

    expect(result.entitiesCreated).toBeGreaterThan(0);
  });
});

afterAll(() => {
  container.clearInstances();
  container.reset();
}); 