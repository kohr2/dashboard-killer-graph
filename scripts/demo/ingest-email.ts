#!/usr/bin/env ts-node
import 'reflect-metadata';
import { join } from 'path';
import { promises as fs } from 'fs';
import { simpleParser, ParsedMail } from 'mailparser';
import { container } from 'tsyringe';

import { OntologyEmailIngestionService } from '../../src/platform/processing/ontology-email-ingestion.service';
import { GenericIngestionPipeline, IngestionInput } from '../../src/ingestion/pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from '../../src/platform/processing/content-processing.service';
import { Neo4jIngestionService } from '../../src/platform/processing/neo4j-ingestion.service';
import { registerAllOntologies } from '../../src/register-ontologies';
import { OntologyService } from '../../src/platform/ontology/ontology.service';
import { resetDatabase } from '../database/reset-neo4j';
import { logger } from '../../src/common/utils/logger';
import { ReasoningOrchestratorService } from '../../src/platform/reasoning/reasoning-orchestrator.service';

interface ParsedEmailWithSource extends ParsedMail { sourceFile: string; }

interface CliFlags {
  ontology?: string;
  generate?: boolean;
  email?: string;
  folder?: string;
  file?: string;
  database?: string;
  limit?: number;
  resetDb?: boolean;
  mode: 'ontology' | 'bulk';
  // Build options
  topEntities?: number;
  topRelationships?: number;
  includeExternal?: boolean;
  configPath?: string;
  outputDir?: string;
}

function parseCliFlags(): CliFlags {
  const args = process.argv.slice(2);
  
  // Helper function to get flag value
  function flag(name: string, def?: string): string | undefined {
    const raw = args.find(a => a.startsWith(`--${name}=`));
    return raw ? raw.split('=')[1] : def;
  }

  // Helper function to check for boolean flags
  function hasFlag(name: string): boolean {
    return args.includes(`--${name}`);
  }

  // Helper function to get numeric flag value
  function numericFlag(name: string, def?: number): number | undefined {
    const value = flag(name);
    return value ? parseInt(value) : def;
  }

  // Determine mode based on arguments
  const hasOntologyArg = args[0] && !args[0].startsWith('--');
  const hasBulkFlags = hasFlag('folder') || hasFlag('file') || flag('limit') !== undefined;
  
  let mode: 'ontology' | 'bulk';
  if (hasOntologyArg && !hasBulkFlags) {
    mode = 'ontology';
  } else if (hasBulkFlags) {
    mode = 'bulk';
  } else {
    mode = 'ontology'; // default to ontology mode
  }

  return {
    ontology: hasOntologyArg ? args[0] : flag('ontology'),
    generate: hasFlag('generate'),
    email: flag('email'),
    folder: flag('folder', 'emails'),
    file: flag('file'),
    database: flag('database', 'neo4j'),
    limit: parseInt(flag('limit', '0') as string) || 0,
    resetDb: hasFlag('reset-db'),
    mode,
    // Build options
    topEntities: numericFlag('top-entities'),
    topRelationships: numericFlag('top-relationships'),
    includeExternal: hasFlag('include-external'),
    configPath: flag('config-path'),
    outputDir: flag('output-dir')
  };
}

function printUsage(): void {
  console.log(`
Email Ingestion Script - Unified tool for ontology-specific and bulk email processing

USAGE:
  # Ontology-specific mode (default)
  npx ts-node scripts/demo/ingest-email.ts <ontologyName> [options]
  
  # Bulk processing mode
  npx ts-node scripts/demo/ingest-email.ts [options]

OPTIONS:
  # Ontology-specific options
  --generate              Generate new fixture email for ontology
  --email=<path>          Use specific email file path
  
  # Bulk processing options
  --folder=<path>         Folder under test/fixtures (default: emails)
  --file=<filename>       Specific email file to process
  --limit=<number>        Limit number of emails to process (default: all)
  
  # Build options (ontology mode only)
  --top-entities=<number>     Limit number of top entities (default: 10)
  --top-relationships=<number> Limit number of top relationships (default: 10)
  --include-external          Include external entities/relationships
  --config-path=<path>        Custom config path for ontology build
  --output-dir=<path>         Custom output directory for ontology build
  
  # Common options
  --ontology=<name>       Ontology name (for bulk mode) or override (for ontology mode)
  --database=<name>       Neo4j database name (default: neo4j)
  --reset-db              Clear database before ingesting
  --help, -h              Show this help message

EXAMPLES:
  # Process single ontology with generated email
  npx ts-node scripts/demo/ingest-email.ts fibo --generate
  
  # Process single ontology with specific email and build options
  npx ts-node scripts/demo/ingest-email.ts procurement --email=./custom-email.eml --top-entities=20 --top-relationships=15
  
  # Process single ontology with custom build configuration
  npx ts-node scripts/demo/ingest-email.ts fibo --generate --top-entities=50 --include-external
  
  # Bulk process all emails from procurement folder
  npx ts-node scripts/demo/ingest-email.ts --folder=procurement/emails --ontology=procurement
  
  # Bulk process specific file
  npx ts-node scripts/demo/ingest-email.ts --file=email1.eml --folder=financial/emails
  
  # Bulk process with limit and database reset
  npx ts-node scripts/demo/ingest-email.ts --folder=emails --limit=10 --reset-db
`);
}

async function runOntologyMode(flags: CliFlags): Promise<void> {
  logger.info(`🚀 [DEBUG] Starting runOntologyMode with flags:`, JSON.stringify(flags));
  if (!flags.ontology) {
    throw new Error('Ontology name is required for ontology mode');
  }

  logger.info(`🚀 Starting ontology-specific email ingestion for: ${flags.ontology}`);
  
  // Set database if specified
  if (flags.database) {
    process.env.NEO4J_DATABASE = flags.database;
    logger.info(`🗄️  Target DB: ${flags.database}`);
  }
  
  // Reset database if requested
  if (flags.resetDb) {
    logger.info(`🧹 [DEBUG] About to reset database`);
    await resetDatabase();
    logger.info('🧹 Database cleared');
  }

  // Prepare build options if any are specified
  const buildOptions: any = {};
  if (flags.topEntities !== undefined) buildOptions.topEntities = flags.topEntities;
  if (flags.topRelationships !== undefined) buildOptions.topRelationships = flags.topRelationships;
  if (flags.includeExternal !== undefined) buildOptions.includeExternal = flags.includeExternal;
  if (flags.configPath) buildOptions.configPath = flags.configPath;
  if (flags.outputDir) buildOptions.outputDir = flags.outputDir;
  
  logger.info(`🔧 [DEBUG] About to create OntologyEmailIngestionService`);
  const service = new OntologyEmailIngestionService();
  logger.info(`✅ [DEBUG] OntologyEmailIngestionService created successfully`);
  
  try {
    logger.info(`🚀 [DEBUG] About to call service.ingestOntologyEmail`);
    await service.ingestOntologyEmail(
      flags.ontology,
      Object.keys(buildOptions).length > 0 ? buildOptions : undefined,
      flags.generate || false,
      flags.email
    );
    logger.info('✅ Ontology email ingestion complete.');
  } catch (err) {
    logger.error('❌ Ontology email ingestion failed:', err);
    logger.error(`❌ [DEBUG] Error JSON: ${JSON.stringify(err)}`);
    logger.error(`❌ [DEBUG] Error type: ${typeof err}`);
    throw err;
  }
}

async function runBulkMode(flags: CliFlags): Promise<void> {
  logger.info(`🚀 Starting bulk email ingestion`);
  
  // Set database
  process.env.NEO4J_DATABASE = flags.database;
  logger.info(`🗄️  Target DB: ${flags.database}`);

  // Register ontologies
  if (flags.ontology) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerSelectedOntologies } = require('@src/register-ontologies');
    registerSelectedOntologies([flags.ontology]);
    logger.info(`🏛️  Loaded selected ontology: ${flags.ontology}`);
  } else {
    registerAllOntologies();
    logger.info(`🏛️  Loaded all ontologies`);
  }
  
  const ontologyService = container.resolve(OntologyService);
  logger.info(`🏛️  Loaded ${ontologyService.getAllEntityTypes().length} entity types.`);

  // Reset database if requested
  if (flags.resetDb) {
    await resetDatabase();
    logger.info('🧹 Database cleared');
  }

  // Initialize services
  const contentProcessing = container.resolve(ContentProcessingService);
  const neo4jService = container.resolve(Neo4jIngestionService);
  await neo4jService.initialize();

  const reasoningOrchestrator = container.resolve(ReasoningOrchestratorService);
  const pipeline = new GenericIngestionPipeline(
    contentProcessing, 
    neo4jService, 
    reasoningOrchestrator,
    (input: IngestionInput) => input.content,
    flags.ontology // Pass ontology name to pipeline
  );

  // Read emails from directory
  const dir = join(process.cwd(), 'test', 'fixtures', flags.folder!);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.eml')).sort();
  
  if (!files.length) {
    logger.warn(`No .eml files found in ${dir}`);
    return;
  }

  // Determine files to process
  let filesToProcess: string[];
  if (flags.file) {
    if (!files.includes(flags.file)) {
      logger.error(`File ${flags.file} not found in ${dir}`);
      logger.info(`Available files: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
      throw new Error(`File ${flags.file} not found`);
    }
    filesToProcess = [flags.file];
    logger.info(`📧 Processing specific file: ${flags.file}`);
  } else {
    const limit = flags.limit || 0;
    filesToProcess = limit > 0 ? files.slice(0, limit) : files;
    logger.info(`📧 Processing ${filesToProcess.length} emails from ${flags.folder}${limit > 0 ? ` (limited to ${limit})` : ''}...`);
  }

  // Prepare inputs
  const inputs: IngestionInput[] = [];
  for (const file of filesToProcess) {
    const raw = await fs.readFile(join(dir, file), 'utf-8');
    const parsed = await simpleParser(raw);
    const body = typeof parsed.text === 'string' ? parsed.text : (parsed.html || '').replace(/<[^>]*>/g, '');
    inputs.push({ 
      id: file, 
      content: body, 
      meta: { 
        sourceFile: file,
        source: 'bulk-ingestion',
        folder: flags.folder
      } 
    });
  }

  // Process through pipeline
  logger.info(`📧 Ingesting ${inputs.length} emails...`);
  await pipeline.run(inputs);
  logger.info('✅ All emails ingested.');

  await neo4jService.close();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const flags = parseCliFlags();
  
  try {
    if (flags.mode === 'ontology') {
      await runOntologyMode(flags);
    } else {
      await runBulkMode(flags);
    }
  } catch (err) {
    logger.error('❌ Email ingestion failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  console.log('NEO4J_DATABASE at startup:', process.env.NEO4J_DATABASE);
  main().catch((err: any) => {
    logger.error('❌ Uncaught error in email ingestion script:', err && (err.stack || err.message || err));
    console.error(err);
    process.exit(1);
  });
} 