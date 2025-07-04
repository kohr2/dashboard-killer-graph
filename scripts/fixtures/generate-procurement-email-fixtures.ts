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
const USE_LLM = argvFlags.includes('--llm');
const COUNT_ARG = argvFlags.find((arg) => arg.startsWith('--count='));
const ONTOLOGY_ARG = argvFlags.find((arg) => arg.startsWith('--ontology='));

const EMAIL_COUNT_OVERRIDE = COUNT_ARG ? parseInt(COUNT_ARG.split('=')[1], 10) : undefined;
const ONTOLOGY = ONTOLOGY_ARG ? ONTOLOGY_ARG.split('=')[1] : 'procurement';

// Validate ontology
const VALID_ONTOLOGIES = ['procurement', 'financial', 'crm', 'legal', 'healthcare'];
if (!VALID_ONTOLOGIES.includes(ONTOLOGY)) {
  console.error(`❌ Invalid ontology: ${ONTOLOGY}. Valid options: ${VALID_ONTOLOGIES.join(', ')}`);
  process.exit(1);
}

const FIXTURE_ROOT = join(__dirname, `../../test/fixtures/${ONTOLOGY}/emails`);
const DEFAULT_EMAIL_COUNT = 100;

// Warn if LLM requested but no API key
if (USE_LLM && !process.env.OPENAI_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  --llm flag provided but OPENAI_API_KEY is not set. Falling back to template generation.');
}

// -------------------- ONTOLOGY CONFIGURATIONS --------------------
const ONTOLOGY_CONFIGS = {
  procurement: {
    emailTypes: ['contract-award', 'rfq-request', 'purchase-order', 'supplier-evaluation', 'tender-notification'],
    vendors: ['ABC Corp', 'Global Supplies Ltd', 'BlueOcean Logistics', 'Helix Manufacturing', 'Vertex Construction'],
    categories: ['raw materials', 'office equipment', 'IT hardware', 'transport services', 'maintenance services'],
    subjects: {
      'contract-award': 'Contract Award – {vendor} ({category})',
      'rfq-request': 'Request for Quotation – {category}',
      'purchase-order': 'Purchase Order – {vendor}',
      'supplier-evaluation': 'Supplier Evaluation Results – {vendor}',
      'tender-notification': 'Tender Notification – {category}'
    },
    templates: {
      'contract-award': 'Dear {vendor},\n\nWe are pleased to inform you that your tender for {category} has been accepted.\nThe Purchase Order number is {poNumber} with a total value of {amount} {currency}.\n\nPlease confirm receipt of this Contract Award within two business days and provide an estimated delivery schedule.\n\nBest regards,\nProcurement Department',
      'rfq-request': 'Dear {vendor},\n\nWe are seeking quotations for {category} services.\nPlease provide your best pricing and delivery terms.\n\nBest regards,\nProcurement Department',
      'purchase-order': 'Dear {vendor},\n\nPlease find attached Purchase Order {poNumber} for {category}.\nTotal value: {amount} {currency}\n\nBest regards,\nProcurement Department',
      'supplier-evaluation': 'Dear {vendor},\n\nThank you for your recent proposal for {category}.\nWe have completed our evaluation and will contact you soon.\n\nBest regards,\nProcurement Department',
      'tender-notification': 'Dear {vendor},\n\nWe are announcing a new tender for {category}.\nPlease review the attached documents.\n\nBest regards,\nProcurement Department'
    }
  },
  financial: {
    emailTypes: ['deal-announcement', 'investment-update', 'fund-raising', 'merger-notification', 'ipo-announcement'],
    vendors: ['Goldman Sachs', 'Morgan Stanley', 'BlackRock', 'Vanguard', 'Fidelity Investments'],
    categories: ['private equity', 'venture capital', 'real estate', 'infrastructure', 'debt financing'],
    subjects: {
      'deal-announcement': 'Deal Announcement – {vendor} ({category})',
      'investment-update': 'Investment Update – {category}',
      'fund-raising': 'Fund Raising Update – {vendor}',
      'merger-notification': 'Merger Notification – {vendor}',
      'ipo-announcement': 'IPO Announcement – {vendor}'
    },
    templates: {
      'deal-announcement': 'Dear {vendor},\n\nWe are pleased to announce the successful completion of our {category} deal.\nDeal value: {amount} {currency}\n\nBest regards,\nInvestment Team',
      'investment-update': 'Dear {vendor},\n\nPlease find attached our quarterly investment update for {category}.\n\nBest regards,\nInvestment Team',
      'fund-raising': 'Dear {vendor},\n\nWe are pleased to announce the closing of our latest fund.\nFund size: {amount} {currency}\n\nBest regards,\nFund Management',
      'merger-notification': 'Dear {vendor},\n\nWe are writing to inform you of our upcoming merger.\nEffective date: {date}\n\nBest regards,\nCorporate Development',
      'ipo-announcement': 'Dear {vendor},\n\nWe are pleased to announce our initial public offering.\nOffering size: {amount} {currency}\n\nBest regards,\nCorporate Finance'
    }
  },
  crm: {
    emailTypes: ['lead-qualification', 'opportunity-update', 'customer-onboarding', 'account-review', 'sales-pitch'],
    vendors: ['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'Oracle CRM', 'SAP CRM'],
    categories: ['lead management', 'opportunity tracking', 'customer service', 'account management', 'sales automation'],
    subjects: {
      'lead-qualification': 'Lead Qualification – {vendor} ({category})',
      'opportunity-update': 'Opportunity Update – {category}',
      'customer-onboarding': 'Customer Onboarding – {vendor}',
      'account-review': 'Account Review – {vendor}',
      'sales-pitch': 'Sales Pitch – {category}'
    },
    templates: {
      'lead-qualification': 'Dear {vendor},\n\nThank you for your interest in our {category} solution.\nWe would like to schedule a qualification call.\n\nBest regards,\nSales Team',
      'opportunity-update': 'Dear {vendor},\n\nPlease find attached our latest proposal for {category}.\nProposed value: {amount} {currency}\n\nBest regards,\nSales Team',
      'customer-onboarding': 'Dear {vendor},\n\nWelcome to our platform!\nWe are excited to help you with {category}.\n\nBest regards,\nCustomer Success',
      'account-review': 'Dear {vendor},\n\nWe would like to schedule our quarterly account review.\n\nBest regards,\nAccount Management',
      'sales-pitch': 'Dear {vendor},\n\nWe believe our {category} solution would be perfect for your needs.\n\nBest regards,\nSales Team'
    }
  },
  legal: {
    emailTypes: ['contract-review', 'legal-consultation', 'compliance-alert', 'litigation-update', 'regulatory-notice'],
    vendors: ['Baker McKenzie', 'Skadden', 'Latham & Watkins', 'Kirkland & Ellis', 'Sullivan & Cromwell'],
    categories: ['contract law', 'corporate law', 'compliance', 'litigation', 'regulatory'],
    subjects: {
      'contract-review': 'Contract Review – {vendor} ({category})',
      'legal-consultation': 'Legal Consultation – {category}',
      'compliance-alert': 'Compliance Alert – {vendor}',
      'litigation-update': 'Litigation Update – {vendor}',
      'regulatory-notice': 'Regulatory Notice – {category}'
    },
    templates: {
      'contract-review': 'Dear {vendor},\n\nWe have completed our review of the {category} contract.\nPlease review our comments.\n\nBest regards,\nLegal Department',
      'legal-consultation': 'Dear {vendor},\n\nWe would like to schedule a consultation regarding {category}.\n\nBest regards,\nLegal Department',
      'compliance-alert': 'Dear {vendor},\n\nPlease be advised of a compliance issue.\nAction required within 30 days.\n\nBest regards,\nCompliance Team',
      'litigation-update': 'Dear {vendor},\n\nPlease find attached our latest litigation update.\n\nBest regards,\nLegal Department',
      'regulatory-notice': 'Dear {vendor},\n\nNew regulatory requirements for {category}.\n\nBest regards,\nRegulatory Affairs'
    }
  },
  healthcare: {
    emailTypes: ['patient-referral', 'medical-supply-order', 'clinical-trial-update', 'regulatory-approval', 'insurance-claim'],
    vendors: ['Johnson & Johnson', 'Pfizer', 'Merck', 'Novartis', 'Roche'],
    categories: ['pharmaceuticals', 'medical devices', 'clinical trials', 'regulatory affairs', 'insurance'],
    subjects: {
      'patient-referral': 'Patient Referral – {vendor} ({category})',
      'medical-supply-order': 'Medical Supply Order – {category}',
      'clinical-trial-update': 'Clinical Trial Update – {vendor}',
      'regulatory-approval': 'Regulatory Approval – {vendor}',
      'insurance-claim': 'Insurance Claim – {category}'
    },
    templates: {
      'patient-referral': 'Dear {vendor},\n\nPlease find attached patient referral for {category}.\nPatient ID: {poNumber}\n\nBest regards,\nMedical Staff',
      'medical-supply-order': 'Dear {vendor},\n\nPlease process our order for {category}.\nOrder value: {amount} {currency}\n\nBest regards,\nProcurement',
      'clinical-trial-update': 'Dear {vendor},\n\nPlease find attached our latest clinical trial update.\n\nBest regards,\nClinical Research',
      'regulatory-approval': 'Dear {vendor},\n\nWe are pleased to announce regulatory approval.\n\nBest regards,\nRegulatory Affairs',
      'insurance-claim': 'Dear {vendor},\n\nPlease process our insurance claim for {category}.\nClaim amount: {amount} {currency}\n\nBest regards,\nBilling Department'
    }
  }
};

// -------------------- LLM HELPER FUNCTION --------------------
const openai = USE_LLM && process.env.OPENAI_API_KEY ? new OpenAI() : null;

async function buildEmailBodyWithLLM(emailType: string, vendor: string, category: string, poNumber: string, amount: string, currency: string): Promise<string> {
  if (!openai) {
    // Fallback to template
    const config = ONTOLOGY_CONFIGS[ONTOLOGY as keyof typeof ONTOLOGY_CONFIGS];
    const template = config.templates[emailType as keyof typeof config.templates];
    return template
      .replace('{vendor}', vendor)
      .replace('{category}', category)
      .replace('{poNumber}', poNumber)
      .replace('{amount}', amount)
      .replace('{currency}', currency)
      .replace('{date}', new Date().toLocaleDateString());
  }

  const config = ONTOLOGY_CONFIGS[ONTOLOGY as keyof typeof ONTOLOGY_CONFIGS];
  const subject = config.subjects[emailType as keyof typeof config.subjects]
    .replace('{vendor}', vendor)
    .replace('{category}', category);

  const prompt = `You are a ${ONTOLOGY} department representative. Draft a concise, professional email for ${emailType} regarding ${category} with vendor ${vendor}. Include reference number ${poNumber} and amount ${amount} ${currency} if relevant. Keep it under 150 words.`;

  const completion = await openai!.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant writing business emails for ${ONTOLOGY} operations.`,
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 180,
    temperature: 0.8,
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('OpenAI API returned empty content');
  }
  return content.trim();
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
async function buildEmail(index: number): Promise<{ filename: string; content: string }> {
  const config = ONTOLOGY_CONFIGS[ONTOLOGY as keyof typeof ONTOLOGY_CONFIGS];
  const emailType = random(config.emailTypes);
  const vendor = random(config.vendors);
  const category = random(config.categories);
  const amount = (Math.random() * 50000 + 500).toFixed(2);
  const currency = random(currencySymbols);
  const poNumber = `${ONTOLOGY.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const subject = config.subjects[emailType as keyof typeof config.subjects]
    .replace('{vendor}', vendor)
    .replace('{category}', category);

  const date = new Date().toUTCString();

  const body = await buildEmailBodyWithLLM(emailType, vendor, category, poNumber, amount, currency);

  const messageId = `<${poNumber.toLowerCase()}@${ONTOLOGY}.example.com>`;

  const email = `Message-ID: ${messageId}
From: "${ONTOLOGY.charAt(0).toUpperCase() + ONTOLOGY.slice(1)} Department" <${ONTOLOGY}@example.com>
To: "${vendor}" <contact@${slugify(vendor)}.com>
Subject: ${subject}
Date: ${date}
Content-Type: text/plain; charset="UTF-8"

${body}`;

  const filename = `${index.toString().padStart(3, '0')}-${emailType}-${slugify(vendor)}.eml`;
  return { filename, content: email };
}

async function main() {
  await fs.mkdir(FIXTURE_ROOT, { recursive: true });

  const emailCount = EMAIL_COUNT_OVERRIDE || DEFAULT_EMAIL_COUNT;
  const emails = [];
  
  for (let i = 0; i < emailCount; i++) {
    const email = await buildEmail(i + 1);
    emails.push(email);
  }
  
  const tasks = emails.map(({ filename, content }) => 
    fs.writeFile(join(FIXTURE_ROOT, filename), content, 'utf8')
  );

  await Promise.all(tasks);
  // eslint-disable-next-line no-console
  console.log(`✅ Generated ${emailCount} ${ONTOLOGY} email fixtures in ${FIXTURE_ROOT}`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main(); 