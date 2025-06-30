/**
 * Integration test for unified email ingestion pipeline
 */

import { IngestionPipeline } from '../../../src/ingestion/core/pipeline/ingestion-pipeline';
import { EmailSource } from '../../../src/ingestion/sources/email/email-source';

describe('Unified Email Ingestion Pipeline', () => {
  let pipeline: IngestionPipeline;

  beforeEach(() => {
    pipeline = new IngestionPipeline();
  });

  it('should process .eml files through unified pipeline', async () => {
    // Implementation pending when EmailSource is fully implemented
    const emailSource = new EmailSource({
      name: 'test-email-source',
      enabled: true,
      provider: 'eml',
      directory: './test-emails'
    });

    // For now, just test that the pipeline can be created
    expect(pipeline).toBeDefined();
    expect(emailSource).toBeDefined();
    
    // TODO: Uncomment when implementation is complete
    // const result = await pipeline.process(emailSource);
    // expect(result.success).toBe(true);
    // expect(result.itemsProcessed).toBeGreaterThan(0);
  });

  it('should provide pipeline metrics', () => {
    const metrics = pipeline.monitor();
    
    expect(metrics).toBeDefined();
    expect(metrics.status).toBeDefined();
    expect(metrics.lastRun).toBeInstanceOf(Date);
  });
});
