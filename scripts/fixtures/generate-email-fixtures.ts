#!/usr/bin/env ts-node
/**
 * Script: generate-email-fixtures.ts
 * ----------------------------------
 * CLI wrapper around EmailFixtureGenerationService.
 * Generates `.eml` files for the requested ontology and writes them under
 * `test/fixtures/<ontology>/emails` (same location expected by the ingestion
 * pipeline). All heavy lifting lives in
 * `src/platform/fixtures/email-fixture-generation.service.ts`.
 *
 * Usage:
 *   npx ts-node scripts/fixtures/generate-email-fixtures.ts --ontology=procurement --count=100
 */

import 'reflect-metadata'; // make sure tsyringe & class-decorators work
import { container } from 'tsyringe';
import { EmailFixtureGenerationService } from '../../src/platform/fixtures/email-fixture-generation.service';
import { logger } from '../../src/shared/utils/logger';

// ----------------------- CLI OPTIONS -------------------------
const argvFlags = process.argv.slice(2);

function flag(name: string, defaultValue?: string): string | undefined {
  const raw = argvFlags.find(arg => arg.startsWith(`--${name}=`));
  return raw ? raw.split('=')[1] : defaultValue;
}

const ontologyName = flag('ontology', 'procurement');
const countFlag = flag('count');
const count = countFlag ? parseInt(countFlag, 10) : 100;
const outputDir = flag('outputDir');

if (!ontologyName) {
  // Should never happen because we default, but guard anyway
  console.error('❌ Missing --ontology flag.');
  process.exit(1);
}

(async () => {
  const fixtureService = container.resolve(EmailFixtureGenerationService);

  try {
    logger.info(`📧 Generating ${count} ${ontologyName} email fixture(s)...`);
    const files = await fixtureService.generateEmailFixtures({
      ontologyName,
      count,
      outputDir,
    });
    logger.info(`✅ Done – wrote ${files.length} files.`);
  } catch (err) {
    logger.error('❌ Fixture generation failed:', err);
    process.exit(1);
  }
})(); 