#!/usr/bin/env ts-node
/**
 * Script: generate-procurement-email-fixtures.ts
 * ----------------------------------------------
 * Utility to create a set of sample `.eml` files representing typical
 * procurement-related emails (purchase requisitions, RFQs, contract awards …)
 * that align with the procurement ontology.
 *
 * – Generates 100 files under `test/fixtures/procurement/emails` (directory is
 *   created if it does not exist).
 * – File naming convention: `001-contract-award-abc-corp.eml`.
 * – Each email uses simple RFC-2822 headers and plain-text bodies so they can
 *   be parsed by existing ingestion pipelines.
 * – No attachments are included; pipelines that require attachments can add
 *   them later.
 *
 * Run with:  `pnpm ts-node scripts/fixtures/generate-procurement-email-fixtures.ts`
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

const FIXTURE_ROOT = join(__dirname, '../../test/fixtures/procurement/emails');
const DEFAULT_EMAIL_COUNT = 100;

// ----------------------- CLI OPTIONS -------------------------
const argvFlags = process.argv.slice(2);
const USE_LLM = argvFlags.includes('--llm');
const COUNT_ARG = argvFlags.find((arg) => arg.startsWith('--count='));
const EMAIL_COUNT_OVERRIDE = COUNT_ARG ? parseInt(COUNT_ARG.split('=')[1], 10) : undefined;

// Warn if LLM requested but no API key
if (USE_LLM && !process.env.OPENAI_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  --llm flag provided but OPENAI_API_KEY is not set. Falling back to template generation.');
}

// -------------------- LLM HELPER FUNCTION --------------------
const openai = USE_LLM && process.env.OPENAI_API_KEY ? new OpenAI() : null;

async function buildEmailBodyWithLLM(vendor: string, category: string, poNumber: string, amount: string, currency: string): Promise<string> {
  if (!openai) {
    // Fallback plain-text template (similar to previous)
    return `Dear ${vendor},\n\nWe are pleased to inform you that your tender for ${category} has been accepted.\nThe Purchase Order number is ${poNumber} with a total value of ${amount} ${currency}.\n\nPlease confirm receipt of this Contract Award within two business days and provide an estimated delivery schedule.\n\nBest regards,\nProcurement Department`;
  }

  const prompt = `You are a procurement department representative. Draft a concise, professional contract award email informing a vendor that their tender for ${category} has been accepted. Include the purchase order number ${poNumber} and total value ${amount} ${currency}. End with a polite request for confirmation and delivery schedule.`;

  const completion = await openai!.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant writing business procurement emails.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 180,
    temperature: 0.8,
  });

  return completion.choices[0].message.content.trim();
}

/** Basic slugifier for filenames */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

const vendorNames = [
  'ABC Corp',
  'Global Supplies Ltd',
  'BlueOcean Logistics',
  'Helix Manufacturing',
  'Vertex Construction',
  'GreenLeaf Procurement',
  'Summit Electronics',
  'NovaTextiles',
  'Optima Consultancy',
  'PrimeSteel Industries',
];

const categories = [
  'raw materials',
  'office equipment',
  'IT hardware',
  'transport services',
  'maintenance services',
  'consultancy',
  'software licences',
  'protective gear',
  'machinery',
  'analytics tools',
];

const currencySymbols = ['USD', 'EUR', 'GBP', 'CAD'];

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Create a simple RFC-2822 formatted email string */
function buildEmail(index: number): { filename: string; content: string } {
  const vendor = random(vendorNames);
  const category = random(categories);
  const amount = (Math.random() * 50000 + 500).toFixed(2);
  const currency = random(currencySymbols);
  const poNumber = `PO-${Math.floor(100000 + Math.random() * 900000)}`;

  const subject = `Contract Award – ${vendor} (${category})`;

  const date = new Date().toUTCString();

  const body = `Dear ${vendor},

We are pleased to inform you that your tender for ${category} has been accepted.
The Purchase Order number is ${poNumber} with a total value of ${amount} ${currency}.

Please confirm receipt of this Contract Award within two business days and
provide an estimated delivery schedule.

Best regards,
Procurement Department
`;

  const messageId = `<${poNumber.toLowerCase()}@procurement.example.com>`;

  const email = `Message-ID: ${messageId}
From: "Procurement Department" <procurement@example.com>
To: "${vendor}" <sales@${slugify(vendor)}.com>
Subject: ${subject}
Date: ${date}
Content-Type: text/plain; charset="UTF-8"

${body}`;

  const filename = `${index.toString().padStart(3, '0')}-${slugify(subject)}.eml`;
  return { filename, content: email };
}

async function main() {
  await fs.mkdir(FIXTURE_ROOT, { recursive: true });

  const tasks = Array.from({ length: EMAIL_COUNT_OVERRIDE || DEFAULT_EMAIL_COUNT }, (_, i) => buildEmail(i + 1))
    .map(({ filename, content }) => fs.writeFile(join(FIXTURE_ROOT, filename), content, 'utf8'));

  await Promise.all(tasks);
  // eslint-disable-next-line no-console
  console.log(`✅ Generated ${EMAIL_COUNT_OVERRIDE || DEFAULT_EMAIL_COUNT} procurement email fixtures in ${FIXTURE_ROOT}`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main(); 