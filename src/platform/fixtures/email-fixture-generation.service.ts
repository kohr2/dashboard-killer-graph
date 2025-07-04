import { singleton } from 'tsyringe';
import { logger } from '@common/utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

export interface SourceOntology {
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

export interface OntologyEntity {
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

export interface EmailGenerationOptions {
  ontologyName: string;
  count?: number;
  outputDir?: string;
}

@singleton()
export class EmailFixtureGenerationService {
  private readonly FAKE_PEOPLE = {
    procurement: [
      { firstName: 'Sarah', lastName: 'Mitchell', title: 'Procurement Manager', email: 'sarah.mitchell@company.com' },
      { firstName: 'Michael', lastName: 'Chen', title: 'Senior Buyer', email: 'michael.chen@company.com' },
      { firstName: 'Jennifer', lastName: 'Rodriguez', title: 'Procurement Specialist', email: 'jennifer.rodriguez@company.com' },
      { firstName: 'David', lastName: 'Thompson', title: 'Strategic Sourcing Manager', email: 'david.thompson@company.com' },
      { firstName: 'Lisa', lastName: 'Anderson', title: 'Contract Manager', email: 'lisa.anderson@company.com' },
      { firstName: 'Robert', lastName: 'Williams', title: 'Procurement Director', email: 'robert.williams@company.com' },
      { firstName: 'Amanda', lastName: 'Garcia', title: 'Supplier Relations Manager', email: 'amanda.garcia@company.com' },
      { firstName: 'James', lastName: 'Johnson', title: 'Category Manager', email: 'james.johnson@company.com' }
    ],
    financial: [
      { firstName: 'Alexandra', lastName: 'Smith', title: 'Investment Manager', email: 'alexandra.smith@company.com' },
      { firstName: 'Christopher', lastName: 'Brown', title: 'Portfolio Manager', email: 'christopher.brown@company.com' },
      { firstName: 'Victoria', lastName: 'Davis', title: 'Financial Analyst', email: 'victoria.davis@company.com' },
      { firstName: 'Daniel', lastName: 'Wilson', title: 'Deal Manager', email: 'daniel.wilson@company.com' },
      { firstName: 'Rachel', lastName: 'Taylor', title: 'Investment Director', email: 'rachel.taylor@company.com' },
      { firstName: 'Kevin', lastName: 'Martinez', title: 'Fund Manager', email: 'kevin.martinez@company.com' },
      { firstName: 'Nicole', lastName: 'Garcia', title: 'Financial Controller', email: 'nicole.garcia@company.com' },
      { firstName: 'Thomas', lastName: 'Lee', title: 'Investment Analyst', email: 'thomas.lee@company.com' }
    ],
    crm: [
      { firstName: 'Emily', lastName: 'Clark', title: 'Sales Manager', email: 'emily.clark@company.com' },
      { firstName: 'Ryan', lastName: 'Lewis', title: 'Account Executive', email: 'ryan.lewis@company.com' },
      { firstName: 'Jessica', lastName: 'Walker', title: 'Customer Success Manager', email: 'jessica.walker@company.com' },
      { firstName: 'Andrew', lastName: 'Hall', title: 'Sales Director', email: 'andrew.hall@company.com' },
      { firstName: 'Stephanie', lastName: 'Young', title: 'Lead Development Rep', email: 'stephanie.young@company.com' },
      { firstName: 'Brandon', lastName: 'Allen', title: 'Account Manager', email: 'brandon.allen@company.com' },
      { firstName: 'Lauren', lastName: 'King', title: 'Sales Operations Manager', email: 'lauren.king@company.com' },
      { firstName: 'Matthew', lastName: 'Wright', title: 'Customer Relations Director', email: 'matthew.wright@company.com' }
    ],
    legal: [
      { firstName: 'Patricia', lastName: 'Scott', title: 'General Counsel', email: 'patricia.scott@company.com' },
      { firstName: 'Jonathan', lastName: 'Green', title: 'Senior Legal Counsel', email: 'jonathan.green@company.com' },
      { firstName: 'Michelle', lastName: 'Baker', title: 'Legal Manager', email: 'michelle.baker@company.com' },
      { firstName: 'Steven', lastName: 'Adams', title: 'Compliance Officer', email: 'steven.adams@company.com' },
      { firstName: 'Ashley', lastName: 'Nelson', title: 'Legal Director', email: 'ashley.nelson@company.com' },
      { firstName: 'Brian', lastName: 'Carter', title: 'Contract Attorney', email: 'brian.carter@company.com' },
      { firstName: 'Kimberly', lastName: 'Mitchell', title: 'Legal Specialist', email: 'kimberly.mitchell@company.com' },
      { firstName: 'Jason', lastName: 'Perez', title: 'Regulatory Counsel', email: 'jason.perez@company.com' }
    ],
    healthcare: [
      { firstName: 'Dr. Samantha', lastName: 'Roberts', title: 'Medical Director', email: 'samantha.roberts@company.com' },
      { firstName: 'Dr. Mark', lastName: 'Turner', title: 'Clinical Research Manager', email: 'mark.turner@company.com' },
      { firstName: 'Dr. Rebecca', lastName: 'Phillips', title: 'Regulatory Affairs Director', email: 'rebecca.phillips@company.com' },
      { firstName: 'Dr. Jeffrey', lastName: 'Campbell', title: 'Medical Affairs Manager', email: 'jeffrey.campbell@company.com' },
      { firstName: 'Dr. Nicole', lastName: 'Parker', title: 'Clinical Trial Manager', email: 'nicole.parker@company.com' },
      { firstName: 'Dr. Timothy', lastName: 'Evans', title: 'Medical Officer', email: 'timothy.evans@company.com' },
      { firstName: 'Dr. Amanda', lastName: 'Edwards', title: 'Regulatory Specialist', email: 'amanda.edwards@company.com' },
      { firstName: 'Dr. Robert', lastName: 'Stewart', title: 'Clinical Director', email: 'robert.stewart@company.com' }
    ],
    fibo: [
      { firstName: 'Caroline', lastName: 'Sanchez', title: 'Risk Manager', email: 'caroline.sanchez@company.com' },
      { firstName: 'Gregory', lastName: 'Morris', title: 'Compliance Director', email: 'gregory.morris@company.com' },
      { firstName: 'Hannah', lastName: 'Rogers', title: 'Financial Risk Analyst', email: 'hannah.rogers@company.com' },
      { firstName: 'Nathan', lastName: 'Reed', title: 'Regulatory Manager', email: 'nathan.reed@company.com' },
      { firstName: 'Olivia', lastName: 'Cook', title: 'Risk Director', email: 'olivia.cook@company.com' },
      { firstName: 'Philip', lastName: 'Morgan', title: 'Compliance Analyst', email: 'philip.morgan@company.com' },
      { firstName: 'Sophia', lastName: 'Bell', title: 'Financial Controller', email: 'sophia.bell@company.com' },
      { firstName: 'William', lastName: 'Murphy', title: 'Regulatory Affairs Manager', email: 'william.murphy@company.com' }
    ]
  };

  private readonly VENDOR_CONTACTS = [
    { firstName: 'John', lastName: 'Smith', title: 'Account Manager', email: 'john.smith' },
    { firstName: 'Maria', lastName: 'Garcia', title: 'Sales Director', email: 'maria.garcia' },
    { firstName: 'Robert', lastName: 'Johnson', title: 'Business Development Manager', email: 'robert.johnson' },
    { firstName: 'Lisa', lastName: 'Williams', title: 'Client Relations Manager', email: 'lisa.williams' },
    { firstName: 'David', lastName: 'Brown', title: 'Sales Manager', email: 'david.brown' },
    { firstName: 'Jennifer', lastName: 'Davis', title: 'Account Executive', email: 'jennifer.davis' },
    { firstName: 'Michael', lastName: 'Miller', title: 'Business Development Director', email: 'michael.miller' },
    { firstName: 'Sarah', lastName: 'Wilson', title: 'Client Success Manager', email: 'sarah.wilson' },
    { firstName: 'Christopher', lastName: 'Moore', title: 'Sales Representative', email: 'christopher.moore' },
    { firstName: 'Amanda', lastName: 'Taylor', title: 'Account Director', email: 'amanda.taylor' }
  ];

  private readonly EMAIL_CONFIGS = {
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

  /**
   * Load ontology from file
   */
  async loadOntology(ontologyName: string): Promise<SourceOntology> {
    const ontologyPath = join(process.cwd(), `ontologies/${ontologyName}/source.ontology.json`);
    
    try {
      const content = await fs.readFile(ontologyPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`❌ Failed to load ontology from ${ontologyPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate email content using LLM
   */
  private async generateEmailWithLLM(ontology: SourceOntology, emailType: string, vendor: string, category: string, poNumber: string, amount: string, currency: string, sender: any, recipient: any): Promise<{ subject: string; body: string }> {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('⚠️ OPENAI_API_KEY not found, using fallback email generation');
      return this.generateFallbackEmail(emailType, vendor, category, sender, recipient);
    }

    try {
      const openai = new OpenAI();
      
      // Extract entity names and descriptions from the ontology
      const entityInfo = ontology.entities.slice(0, 10).map(entity => 
        `${entity.name}: ${entity.description._ || entity.description}`
      ).join('\n');
      
      // Extract relationship names from the ontology
      const relationshipInfo = ontology.relationships ? 
        ontology.relationships.slice(0, 5).map(rel => 
          `${rel.name}: ${typeof rel.description === 'string' ? rel.description : rel.description?._ || 'No description'}`
        ).join('\n') : 'No relationships defined';
      
      const prompt = `You are ${sender.firstName} ${sender.lastName}, ${sender.title} at the ${ontology.name} department. Generate a professional email for ${emailType} regarding ${category} with vendor ${vendor}.

Ontology Context:
- Name: ${ontology.name}
- Source: ${ontology.source.description}
- Version: ${ontology.source.version}
- URL: ${ontology.source.url}

Relevant Entities from this ontology (use these entity names in your email):
${entityInfo}

Relevant Relationships from this ontology (use these relationship names in your email):
${relationshipInfo}

Email Context:
- Email Type: ${emailType}
- Vendor: ${vendor}
- Category: ${category}
- Reference Number: ${poNumber}
- Amount: ${amount} ${currency}
- Date: ${new Date().toLocaleDateString()}
- Sender: ${sender.firstName} ${sender.lastName} (${sender.title})
- Recipient: ${recipient.firstName} ${recipient.lastName} (${recipient.title})

Requirements:
- Generate both a subject line and email body
- Keep the email professional and concise (under 150 words)
- Use appropriate tone for ${ontology.name} operations
- Include relevant details like reference numbers and amounts
- Reference specific entities from the ontology where appropriate (use the exact entity names listed above)
- Reference specific relationships from the ontology where appropriate (use the exact relationship names listed above)
- End with appropriate signature including sender's name and title
- Address the recipient by their name

Format your response as:
SUBJECT: [subject line]
BODY: [email body]`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional email writer specializing in ${ontology.name} communications. Always respond with SUBJECT: and BODY: sections. Use the provided ontology entities and relationships to make emails more specific and accurate.`,
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
    } catch (error) {
      logger.warn('⚠️ LLM generation failed, using fallback email generation:', error);
      return this.generateFallbackEmail(emailType, vendor, category, sender, recipient);
    }
  }

  /**
   * Generate fallback email content without LLM
   */
  private generateFallbackEmail(emailType: string, vendor: string, category: string, sender: any, recipient: any): { subject: string; body: string } {
    const subject = `${emailType.replace(/-/g, ' ').toUpperCase()} for ${category} - ${vendor}`;
    const body = `Dear ${recipient.firstName} ${recipient.lastName},

I hope this message finds you well. We are reaching out regarding ${emailType.replace(/-/g, ' ')} for ${category} services.

Vendor: ${vendor}
Category: ${category}
Email Type: ${emailType.replace(/-/g, ' ')}

Please provide the necessary information and documentation as requested.

We look forward to your prompt response.

Best regards,
${sender.firstName} ${sender.lastName}
${sender.title}`;

    return { subject, body };
  }

  /**
   * Basic slugifier for filenames
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  /**
   * Get random item from array
   */
  private random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Create a simple RFC-2822 formatted email string
   */
  private async buildEmail(ontology: SourceOntology, index: number): Promise<{ filename: string; content: string }> {
    const config = this.EMAIL_CONFIGS[ontology.name as keyof typeof this.EMAIL_CONFIGS];
    if (!config) {
      throw new Error(`No email configuration found for ontology: ${ontology.name}`);
    }
    
    const emailType = this.random(config.emailTypes);
    const vendor = this.random(config.vendors);
    const category = this.random(config.categories);
    const amount = (Math.random() * 50000 + 500).toFixed(2);
    const currency = this.random(['USD', 'EUR', 'GBP', 'CAD']);
    const poNumber = `${ontology.name.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const date = new Date().toUTCString();

    // Get random sender and recipient
    const senders = this.FAKE_PEOPLE[ontology.name as keyof typeof this.FAKE_PEOPLE] || this.FAKE_PEOPLE.procurement;
    const sender = this.random(senders);
    const recipient = this.random(this.VENDOR_CONTACTS);
    
    // Generate vendor domain from vendor name
    const vendorDomain = this.slugify(vendor).replace(/-/g, '') + '.com';
    const recipientEmail = `${recipient.email}@${vendorDomain}`;

    const { subject, body } = await this.generateEmailWithLLM(ontology, emailType, vendor, category, poNumber, amount, currency, sender, recipient);

    const messageId = `<${poNumber.toLowerCase()}@${ontology.name}.company.com>`;

    const email = `Message-ID: ${messageId}
From: "${sender.firstName} ${sender.lastName}" <${sender.email}>
To: "${recipient.firstName} ${recipient.lastName}" <${recipientEmail}>
Subject: ${subject}
Date: ${date}
Content-Type: text/plain; charset="UTF-8"

${body}`;

    const filename = `${index.toString().padStart(3, '0')}-${emailType}-${this.slugify(vendor)}.eml`;
    return { filename, content: email };
  }

  /**
   * Generate email fixtures for an ontology
   */
  async generateEmailFixtures(options: EmailGenerationOptions): Promise<string[]> {
    const { ontologyName, count = 1, outputDir } = options;
    
    logger.info(`📚 Loading ontology: ${ontologyName}`);
    const ontology = await this.loadOntology(ontologyName);
    logger.info(`✅ Loaded ${ontology.entities.length} entities from ${ontology.name} ontology`);
    
    // Determine output directory
    const fixtureRoot = outputDir || join(process.cwd(), 'test', 'fixtures', ontologyName, 'emails');
    await fs.mkdir(fixtureRoot, { recursive: true });

    const emails: string[] = [];
    
    logger.info(`🤖 Generating ${count} emails...`);
    
    for (let i = 0; i < count; i++) {
      const email = await this.buildEmail(ontology, i + 1);
      const emailPath = join(fixtureRoot, email.filename);
      
      await fs.writeFile(emailPath, email.content, 'utf8');
      emails.push(emailPath);
      
      if ((i + 1) % 10 === 0) {
        logger.info(`   Generated ${i + 1}/${count} emails...`);
      }
    }

    logger.info(`✅ Generated ${count} ${ontology.name} email fixtures in ${fixtureRoot}`);
    return emails;
  }

  /**
   * Generate a single email fixture
   */
  async generateSingleEmailFixture(ontologyName: string, outputDir?: string): Promise<string> {
    const emails = await this.generateEmailFixtures({
      ontologyName,
      count: 1,
      outputDir
    });
    return emails[0];
  }
} 