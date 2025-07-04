#!/usr/bin/env ts-node
/**
 * Script: generate-email-fixtures.ts
 * ----------------------------------
 * Utility to create a set of sample `.eml` files representing typical
 * emails related to different ontologies (procurement, financial, CRM, etc.)
 * that align with the specified ontology.
 *
 * – Generates emails under `test/fixtures/{ontology}/emails` (directory is
 *   created if it does not exist).
 * – File naming convention: `001-{email-type}-{vendor}.eml`.
 * – Each email uses simple RFC-2822 headers and plain-text bodies so they can
 *   be parsed by existing ingestion pipelines.
 * – No attachments are included; pipelines that require attachments can add
 *   them later.
 *
 * Run with:  `npx ts-node scripts/fixtures/generate-procurement-email-fixtures.ts --ontology=procurement --count=100`
 */

import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { promises as fs } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

// ----------------------- CLI OPTIONS -------------------------
const argvFlags = process.argv.slice(2);
const COUNT_ARG = argvFlags.find((arg) => arg.startsWith('--count='));
const ONTOLOGY_ARG = argvFlags.find((arg) => arg.startsWith('--ontology='));

const EMAIL_COUNT_OVERRIDE = COUNT_ARG ? parseInt(COUNT_ARG.split('=')[1], 10) : undefined;
const ONTOLOGY = ONTOLOGY_ARG ? ONTOLOGY_ARG.split('=')[1] : 'procurement';

const FIXTURE_ROOT = join(__dirname, `../../test/fixtures/${ONTOLOGY}/emails`);
const DEFAULT_EMAIL_COUNT = 100;

// Check for required OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required. Please set it in your .env file.');
  process.exit(1);
}

// -------------------- ONTOLOGY LOADING --------------------
interface OntologyEntity {
  name: string;
  description: {
    _: string;
    $?: Record<string, any>;
  };
  properties?: Record<string, any>;
  keyProperties?: string[];
  vectorIndex?: boolean;
  documentation?: string;
}

interface SourceOntology {
  name: string;
  source: {
    url: string;
    type: string;
    version: string;
    description: string;
  };
  entities: OntologyEntity[];
  relationships?: any[];
  metadata?: any;
}

async function loadOntology(ontologyName: string): Promise<SourceOntology> {
  const ontologyPath = join(__dirname, `../../ontologies/${ontologyName}/source.ontology.json`);
  
  try {
    const content = await fs.readFile(ontologyPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to load ontology from ${ontologyPath}:`, error);
    process.exit(1);
  }
}

// -------------------- EMAIL CONFIGURATIONS --------------------
const EMAIL_CONFIGS = {
  procurement: {
    emailTypes: ['contract-award', 'rfq-request', 'purchase-order', 'supplier-evaluation', 'tender-notification'],
    vendors: ['ABC Corp', 'Global Supplies Ltd', 'BlueOcean Logistics', 'Helix Manufacturing', 'Vertex Construction'],
    categories: ['raw materials', 'office equipment', 'IT hardware', 'transport services', 'maintenance services']
  },
  financial: {
    emailTypes: ['deal-announcement', 'investment-update', 'fund-raising', 'merger-notification', 'ipo-announcement'],
    vendors: ['Goldman Sachs', 'Morgan Stanley', 'BlackRock', 'Vanguard', 'Fidelity Investments'],
    categories: ['private equity', 'venture capital', 'real estate', 'infrastructure', 'debt financing']
  },
  crm: {
    emailTypes: ['lead-qualification', 'opportunity-update', 'customer-onboarding', 'account-review', 'sales-pitch'],
    vendors: ['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'Oracle CRM', 'SAP CRM'],
    categories: ['lead management', 'opportunity tracking', 'customer service', 'account management', 'sales automation']
  },
  legal: {
    emailTypes: ['contract-review', 'legal-consultation', 'compliance-alert', 'litigation-update', 'regulatory-notice'],
    vendors: ['Baker McKenzie', 'Skadden', 'Latham & Watkins', 'Kirkland & Ellis', 'Sullivan & Cromwell'],
    categories: ['contract law', 'corporate law', 'compliance', 'litigation', 'regulatory']
  },
  healthcare: {
    emailTypes: ['patient-referral', 'medical-supply-order', 'clinical-trial-update', 'regulatory-approval', 'insurance-claim'],
    vendors: ['Johnson & Johnson', 'Pfizer', 'Merck', 'Novartis', 'Roche'],
    categories: ['pharmaceuticals', 'medical devices', 'clinical trials', 'regulatory affairs', 'insurance']
  },
  fibo: {
    emailTypes: ['financial-instrument-trade', 'risk-assessment', 'compliance-report', 'market-data-update', 'regulatory-filing'],
    vendors: ['Bloomberg', 'Reuters', 'S&P Global', 'Moody\'s', 'Fitch Ratings'],
    categories: ['financial instruments', 'risk management', 'compliance', 'market data', 'regulatory reporting']
  }
};

// -------------------- LLM HELPER FUNCTION --------------------
const openai = new OpenAI();

async function generateEmailWithLLM(ontology: SourceOntology, emailType: string, vendor: string, category: string, poNumber: string, amount: string, currency: string): Promise<{ subject: string; body: string }> {
  // Extract entity names and descriptions from the ontology
  const entityInfo = ontology.entities.slice(0, 10).map(entity => 
    `${entity.name}: ${entity.description._}`
  ).join('\n');
  
  const prompt = `You are a ${ontology.name} department representative. Generate a professional email for ${emailType} regarding ${category} with vendor ${vendor}.

Ontology Context:
- Name: ${ontology.name}
- Source: ${ontology.source.description}
- Version: ${ontology.source.version}
- URL: ${ontology.source.url}

Relevant Entities from this ontology:
${entityInfo}

Email Context:
- Email Type: ${emailType}
- Vendor: ${vendor}
- Category: ${category}
- Reference Number: ${poNumber}
- Amount: ${amount} ${currency}
- Date: ${new Date().toLocaleDateString()}

Requirements:
- Generate both a subject line and email body
- Keep the email professional and concise (under 150 words)
- Use appropriate tone for ${ontology.name} operations
- Include relevant details like reference numbers and amounts
- Reference specific entities from the ontology where appropriate
- End with appropriate signature

Format your response as:
SUBJECT: [subject line]
BODY: [email body]`;

  const completion = await openai!.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a professional email writer specializing in ${ontology.name} communications. Always respond with SUBJECT: and BODY: sections. Use the provided ontology entities to make emails more specific and accurate.`,
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 400,
    temperature: 0.8,
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('OpenAI API returned empty content');
  }
  
  // Parse the response to extract subject and body
  const subjectMatch = content.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = content.match(/BODY:\s*([\s\S]+)/i);
  
  if (!subjectMatch || !bodyMatch) {
    throw new Error('OpenAI API response format invalid. Expected SUBJECT: and BODY: sections.');
  }
  
  return {
    subject: subjectMatch[1].trim(),
    body: bodyMatch[1].trim()
  };
}

/** Basic slugifier for filenames */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

const currencySymbols = ['USD', 'EUR', 'GBP', 'CAD'];

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Create a simple RFC-2822 formatted email string */
async function buildEmail(ontology: SourceOntology, index: number): Promise<{ filename: string; content: string }> {
  const config = EMAIL_CONFIGS[ontology.name as keyof typeof EMAIL_CONFIGS];
  if (!config) {
    throw new Error(`No email configuration found for ontology: ${ontology.name}`);
  }
  
  const emailType = random(config.emailTypes);
  const vendor = random(config.vendors);
  const category = random(config.categories);
  const amount = (Math.random() * 50000 + 500).toFixed(2);
  const currency = random(currencySymbols);
  const poNumber = `${ontology.name.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const date = new Date().toUTCString();

  const { subject, body } = await generateEmailWithLLM(ontology, emailType, vendor, category, poNumber, amount, currency);

  const messageId = `<${poNumber.toLowerCase()}@${ontology.name}.example.com>`;

  const email = `Message-ID: ${messageId}
From: "${ontology.name.charAt(0).toUpperCase() + ontology.name.slice(1)} Department" <${ontology.name}@example.com>
To: "${vendor}" <contact@${slugify(vendor)}.com>
Subject: ${subject}
Date: ${date}
Content-Type: text/plain; charset="UTF-8"

${body}`;

  const filename = `${index.toString().padStart(3, '0')}-${emailType}-${slugify(vendor)}.eml`;
  return { filename, content: email };
}

async function main() {
  // Load the ontology
  console.log(`📚 Loading ontology: ${ONTOLOGY}`);
  const ontology = await loadOntology(ONTOLOGY);
  console.log(`✅ Loaded ${ontology.entities.length} entities from ${ontology.name} ontology`);
  
  await fs.mkdir(FIXTURE_ROOT, { recursive: true });

  const emailCount = EMAIL_COUNT_OVERRIDE || DEFAULT_EMAIL_COUNT;
  const emails = [];
  
  console.log(`🤖 Generating ${emailCount} emails using LLM...`);
  
  for (let i = 0; i < emailCount; i++) {
    const email = await buildEmail(ontology, i + 1);
    emails.push(email);
    
    if ((i + 1) % 10 === 0) {
      console.log(`   Generated ${i + 1}/${emailCount} emails...`);
    }
  }
  
  const tasks = emails.map(({ filename, content }) => 
    fs.writeFile(join(FIXTURE_ROOT, filename), content, 'utf8')
  );

  await Promise.all(tasks);
  // eslint-disable-next-line no-console
  console.log(`✅ Generated ${emailCount} ${ontology.name} email fixtures in ${FIXTURE_ROOT}`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main(); 