#!/usr/bin/env ts-node

import 'reflect-metadata';
import { join } from 'path';
import { promises as fs } from 'fs';
import { simpleParser, ParsedMail } from 'mailparser';
import { container } from 'tsyringe';

import { GenericIngestionPipeline, IngestionInput } from '@ingestion/pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { Neo4jIngestionService } from '@platform/processing/neo4j-ingestion.service';
import { registerAllOntologies } from '@src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { resetDatabase } from '../database/reset-neo4j';
import { logger } from '@common/utils/logger';

interface ParsedEmailWithSource extends ParsedMail { sourceFile: string; }

(async () => {
  // ------------------ CLI FLAGS ------------------
  const argvFlags = process.argv.slice(2);
  function flag(name: string, def?: string): string | undefined {
    const raw = argvFlags.find(a => a.startsWith(`--${name}=`));
    return raw ? raw.split('=')[1] : def;
  }
  if (argvFlags.includes('--help') || argvFlags.includes('-h')) {
    console.log(`Email-ingestion demo
    --folder=<path>    Folder under test/fixtures (default: emails)
    --database=<name>  Neo4j DB (default: neo4j)
    --ontology=<name> Limit ontologies to given plugin (always includes core)
    --reset-db         Clear DB before ingesting`);
    process.exit(0);
  }
  const EMAIL_FOLDER = flag('folder', 'emails') as string;
  const DATABASE_NAME = flag('database', 'neo4j') as string;
  const ONTOLOGY_NAME = flag('ontology');
  const RESET = argvFlags.includes('--reset-db');

  process.env.NEO4J_DATABASE = DATABASE_NAME;
  logger.info(`🗄️  Target DB: ${DATABASE_NAME}`);

  // Build ontology set (all enabled plugins or a single selected one)
  if (ONTOLOGY_NAME) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerSelectedOntologies } = require('@src/register-ontologies');
    registerSelectedOntologies([ONTOLOGY_NAME]);
  } else {
    registerAllOntologies();
  }
  const ontologyService = container.resolve(OntologyService);
  logger.info(`🏛️  Loaded ${ontologyService.getAllEntityTypes().length} entity types.`);

  if (RESET) {
    await resetDatabase();
    logger.info('🧹 Database cleared');
  }

  // Services
  const contentProcessing = container.resolve(ContentProcessingService);
  const neo4jService = container.resolve(Neo4jIngestionService);
  await neo4jService.initialize();

  const pipeline = new GenericIngestionPipeline(contentProcessing, neo4jService);

  // -------------- Read emails --------------
  const dir = join(process.cwd(), 'test', 'fixtures', EMAIL_FOLDER);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.eml')).sort();
  if (!files.length) {
    logger.warn(`No .eml files found in ${dir}`);
    process.exit(0);
  }

  const inputs: IngestionInput[] = [];
  for (const file of files) {
    const raw = await fs.readFile(join(dir, file), 'utf-8');
    const parsed = await simpleParser(raw);
    const body = typeof parsed.text === 'string' ? parsed.text : (parsed.html || '').replace(/<[^>]*>/g, '');
    inputs.push({ id: file, content: body, meta: { sourceFile: file } });
  }

  logger.info(`📧 Ingesting ${inputs.length} emails from ${EMAIL_FOLDER}...`);
  await pipeline.run(inputs);
  logger.info('✅ All emails ingested.');

  await neo4jService.close();
})(); 