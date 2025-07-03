import 'reflect-metadata';
import { bootstrap } from '../../src/bootstrap';
import { demonstrateSpacyEmailIngestionPipeline } from './email-ingestion';

// Bootstrap the application
bootstrap();

// Run the pipeline
demonstrateSpacyEmailIngestionPipeline()
  .then(() => {
    console.log('✅ Email ingestion pipeline completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Email ingestion pipeline failed:', error);
    process.exit(1);
  }); 