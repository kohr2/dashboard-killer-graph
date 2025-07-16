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
  relationships?: OntologyRelationship[];
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

export interface OntologyRelationship {
  name: string;
  description: {
    _: string;
    $?: Record<string, any>;
  };
  source: string;
  target: string;
  documentation?: string;
}

export interface OntologyConfig {
  name: string;
  source: {
    url: string;
    type: string;
    version: string;
    description: string;
  };
  extraction?: any;
  overrides?: any;
  metadata?: any;
  emailGeneration?: {
    currencies?: string[];
    locations?: string[];
    statuses?: string[];
    emailTypes?: string[];
    categories?: string[];
    vendors?: string[];
    promptTemplate?: string;
    systemPrompt?: string;
  };
}

export interface EmailGenerationOptions {
  ontologyName: string;
  count?: number;
  outputDir?: string;
}

@singleton()
export class EmailFixtureGenerationService {
  // Generic first names and last names that can work with any ontology
  private readonly FIRST_NAMES = [
    'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Amanda', 'James',
    'Patricia', 'Christopher', 'Maria', 'Nicole', 'Mark', 'Alexander', 'Rebecca',
    'John', 'Emily', 'Daniel', 'Jessica', 'Matthew', 'Ashley', 'Andrew', 'Stephanie'
  ];

  private readonly LAST_NAMES = [
    'Mitchell', 'Chen', 'Rodriguez', 'Thompson', 'Anderson', 'Williams', 'Garcia', 'Johnson',
    'Martinez', 'Davis', 'Gonzalez', 'Kim', 'Brown', 'Wilson', 'Taylor', 'Smith',
    'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Wright'
  ];

  private readonly GENERIC_TITLES = [
    'Manager', 'Specialist', 'Coordinator', 'Analyst', 'Supervisor', 'Director',
    'Lead', 'Consultant', 'Advisor', 'Representative', 'Officer', 'Administrator'
  ];

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

  /**
   * Load ontology from file
   */
  async loadOntology(ontologyName: string): Promise<SourceOntology> {
    const ontologyPath = join(process.cwd(), `ontologies/${ontologyName}/source.ontology.json`);
    
    try {
      const content = await fs.readFile(ontologyPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load ontology from ${ontologyPath}:`, error);
      throw error;
    }
  }

  /**
   * Load ontology config from file
   */
  async loadOntologyConfig(ontologyName: string): Promise<OntologyConfig> {
    const configPath = join(process.cwd(), `ontologies/${ontologyName}/config.json`);
    
    try {
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load ontology config from ${configPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate people data dynamically based on ontology entities
   */
  private generatePeopleFromOntology(ontology: SourceOntology): Array<{ firstName: string; lastName: string; title: string; email: string }> {
    const people: Array<{ firstName: string; lastName: string; title: string; email: string }> = [];
    
    // Select a random subset of entities to generate people from
    const shuffledEntities = [...ontology.entities].sort(() => Math.random() - 0.5);
    const selectedEntities = shuffledEntities.slice(0, 10);

    // Generate people for selected entities
    selectedEntities.forEach((entity) => {
      const firstName = this.random(this.FIRST_NAMES);
      const lastName = this.random(this.LAST_NAMES);
      const title = this.generateTitleFromEntity(entity);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;
      
      // Avoid duplicates
      if (!people.find(p => p.email === email)) {
        people.push({ firstName, lastName, title, email });
      }
    });

    // Add some generic people if we don't have enough
    while (people.length < 15) {
      const firstName = this.random(this.FIRST_NAMES);
      const lastName = this.random(this.LAST_NAMES);
      const title = this.random(this.GENERIC_TITLES);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;
      
      // Avoid duplicates
      if (!people.find(p => p.email === email)) {
        people.push({ firstName, lastName, title, email });
      }
    }

    return people;
  }

  /**
   * Generate title from entity name dynamically
   */
  private generateTitleFromEntity(entity: OntologyEntity): string {
    const name = entity.name;
    
    // Extract the last meaningful word from the entity name as a potential title
    const words = name.replace(/([A-Z])/g, ' $1').trim().split(' ');
    const lastWord = words[words.length - 1];
    
    // If the last word looks like a role/title, use it
    if (lastWord && lastWord.length > 3 && /^[A-Z]/.test(lastWord)) {
      return lastWord;
    }
    
    // Otherwise use a generic title
    return this.random(this.GENERIC_TITLES);
  }

  /**
   * Extract relevant entities for email generation
   */
  private extractRelevantEntities(ontology: SourceOntology): OntologyEntity[] {
    // Get all entities, prioritizing those with descriptions
    return ontology.entities
      .filter(entity => entity.description && entity.description._)
      .sort((a, b) => {
        // Prioritize entities with more detailed descriptions
        const aDescLength = a.description._?.length || 0;
        const bDescLength = b.description._?.length || 0;
        return bDescLength - aDescLength;
      })
      .slice(0, 20); // Limit to top 20 most relevant entities
  }

  /**
   * Extract relevant relationships for email generation
   */
  private extractRelevantRelationships(ontology: SourceOntology): OntologyRelationship[] {
    if (!ontology.relationships) return [];
    
    return ontology.relationships
      .filter(rel => rel.description && rel.description._)
      .sort((a, b) => {
        // Prioritize relationships with more detailed descriptions
        const aDescLength = a.description._?.length || 0;
        const bDescLength = b.description._?.length || 0;
        return bDescLength - aDescLength;
      })
      .slice(0, 10); // Limit to top 10 most relevant relationships
  }

  /**
   * Generate mock data based on ontology config
   */
  private generateMockDataFromConfig(config: OntologyConfig): {
    referenceNumbers: string[];
    amounts: string[];
    currencies: string[];
    dates: string[];
    locations: string[];
    statuses: string[];
    emailTypes: string[];
    categories: string[];
    vendors: string[];
  } {
    const emailConfig = config.emailGeneration || {};
    
    const mockData = {
      referenceNumbers: [] as string[],
      amounts: [] as string[],
      currencies: emailConfig.currencies || ['USD', 'EUR', 'GBP'],
      dates: [] as string[],
      locations: emailConfig.locations || ['Headquarters', 'Main Office'],
      statuses: emailConfig.statuses || ['Pending', 'Approved', 'In Progress'],
      emailTypes: emailConfig.emailTypes || ['notification', 'request', 'update'],
      categories: emailConfig.categories || ['services', 'materials'],
      vendors: emailConfig.vendors || ['ABC Corp', 'Global Solutions']
    };

    // Generate reference numbers based on ontology name
    for (let i = 0; i < 10; i++) {
      const refNum = `${config.name.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
      mockData.referenceNumbers.push(refNum);
    }

    // Generate amounts
    for (let i = 0; i < 10; i++) {
      const amount = (Math.random() * 50000 + 500).toFixed(2);
      mockData.amounts.push(amount);
    }

    // Generate dates
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      mockData.dates.push(date.toISOString().split('T')[0]);
    }

    return mockData;
  }

  /**
   * Generate email content using LLM with ontology-agnostic approach
   */
  private async generateEmailWithLLM(
    ontology: SourceOntology,
    config: OntologyConfig,
    emailType: string, 
    vendor: string, 
    category: string, 
    referenceNumber: string, 
    amount: string, 
    currency: string, 
    sender: any, 
    recipient: any
  ): Promise<{ subject: string; body: string }> {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY not found, using fallback email generation');
      return this.generateFallbackEmail(emailType, vendor, category, sender, recipient);
    }

    try {
      const openai = new OpenAI();
      
      // Extract relevant entities and relationships dynamically
      const relevantEntities = this.extractRelevantEntities(ontology);
      const relevantRelationships = this.extractRelevantRelationships(ontology);
      
      // Create entity context
      const entityInfo = relevantEntities.map(entity => 
        `${entity.name}: ${entity.description._}`
      ).join('\n');
      
      // Create relationship context
      const relationshipInfo = relevantRelationships.map(rel => 
        `${rel.name}: ${rel.description._} (${rel.source} → ${rel.target})`
      ).join('\n');
      
      // Get prompt template from config or use default
      const emailConfig = config.emailGeneration || {};
      const promptTemplate = emailConfig.promptTemplate || this.getDefaultPromptTemplate();
      const systemPrompt = emailConfig.systemPrompt || this.getDefaultSystemPrompt();
      
      // Replace placeholders in prompt template
      const prompt = promptTemplate
        .replace(/{senderName}/g, `${sender.firstName} ${sender.lastName}`)
        .replace(/{senderTitle}/g, sender.title)
        .replace(/{ontologyName}/g, ontology.name)
        .replace(/{ontologyDescription}/g, ontology.source.description)
        .replace(/{ontologyVersion}/g, ontology.source.version)
        .replace(/{emailType}/g, emailType)
        .replace(/{category}/g, category)
        .replace(/{vendor}/g, vendor)
        .replace(/{referenceNumber}/g, referenceNumber)
        .replace(/{amount}/g, amount)
        .replace(/{currency}/g, currency)
        .replace(/{date}/g, new Date().toLocaleDateString())
        .replace(/{recipientName}/g, `${recipient.firstName} ${recipient.lastName}`)
        .replace(/{recipientTitle}/g, recipient.title)
        .replace(/{entityInfo}/g, entityInfo)
        .replace(/{relationshipInfo}/g, relationshipInfo);

      const finalSystemPrompt = systemPrompt.replace(/{ontologyName}/g, ontology.name);

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: finalSystemPrompt,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
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
      logger.warn('LLM generation failed, using fallback email generation:', error);
      return this.generateFallbackEmail(emailType, vendor, category, sender, recipient);
    }
  }

  /**
   * Get default prompt template if not provided in config
   */
  private getDefaultPromptTemplate(): string {
    return `You are {senderName}, {senderTitle} at the {ontologyName} department. Generate a professional email for {emailType} regarding {category} with vendor {vendor}.

Ontology Context:
- Name: {ontologyName}
- Source: {ontologyDescription}
- Version: {ontologyVersion}

Relevant Entities from this ontology (use these entity names naturally in your email):
{entityInfo}

Relevant Relationships from this ontology (use these relationship names naturally in your email):
{relationshipInfo}

Email Context:
- Email Type: {emailType}
- Vendor: {vendor}
- Category: {category}
- Reference Number: {referenceNumber}
- Amount: {amount} {currency}
- Date: {date}
- Sender: {senderName} ({senderTitle})
- Recipient: {recipientName} ({recipientTitle})

Requirements:
- Generate both a subject line and email body
- Keep the email professional and concise (under 200 words)
- Use appropriate tone for {ontologyName} operations
- Include relevant details like reference numbers and amounts
- Reference specific entities from the ontology naturally (use the exact entity names listed above)
- Reference specific relationships from the ontology naturally (use the exact relationship names listed above)
- End with appropriate signature including sender's name and title
- Address the recipient by their name
- Make the email realistic and contextually appropriate

Format your response as:
SUBJECT: [subject line]
BODY: [email body]`;
  }

  /**
   * Get default system prompt if not provided in config
   */
  private getDefaultSystemPrompt(): string {
    return `You are a professional email writer specializing in {ontologyName} communications. Always respond with SUBJECT: and BODY: sections. Use the provided ontology entities and relationships to make emails more specific and accurate.`;
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
  private async buildEmail(ontology: SourceOntology, config: OntologyConfig, index: number): Promise<{ filename: string; content: string }> {
    // Generate random data using config
    const mockData = this.generateMockDataFromConfig(config);
    const emailType = this.random(mockData.emailTypes);
    const vendor = this.random(mockData.vendors);
    const category = this.random(mockData.categories);
    const amount = this.random(mockData.amounts);
    const currency = this.random(mockData.currencies);
    const referenceNumber = this.random(mockData.referenceNumbers);

    const date = new Date().toUTCString();

    // Generate people data dynamically from ontology
    const people = this.generatePeopleFromOntology(ontology);
    const sender = this.random(people);
    const recipient = this.random(this.VENDOR_CONTACTS);
    
    // Generate vendor domain from vendor name
    const vendorDomain = this.slugify(vendor).replace(/-/g, '') + '.com';
    const recipientEmail = `${recipient.email}@${vendorDomain}`;

    const { subject, body } = await this.generateEmailWithLLM(
      ontology,
      config,
      emailType, 
      vendor, 
      category, 
      referenceNumber, 
      amount, 
      currency, 
      sender, 
      recipient
    );

    const messageId = `<${referenceNumber.toLowerCase()}@${ontology.name}.company.com>`;

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
    
    logger.info(`Loading ontology: ${ontologyName}`);
    const ontology = await this.loadOntology(ontologyName);
    const config = await this.loadOntologyConfig(ontologyName);
    logger.info(`Loaded ${ontology.entities.length} entities from ${ontology.name} ontology`);
    
    // Determine output directory
    const fixtureRoot = outputDir || join(process.cwd(), 'test', 'fixtures', ontologyName, 'emails');
    await fs.mkdir(fixtureRoot, { recursive: true });

    const emails: string[] = [];
    
    logger.info(`Generating ${count} emails...`);
    
    for (let i = 0; i < count; i++) {
      const email = await this.buildEmail(ontology, config, i + 1);
      const emailPath = join(fixtureRoot, email.filename);
      
      await fs.writeFile(emailPath, email.content, 'utf8');
      emails.push(emailPath);
      
      if ((i + 1) % 10 === 0) {
        logger.info(`   Generated ${i + 1}/${count} emails...`);
      }
    }

    logger.info(`Generated ${count} ${ontology.name} email fixtures in ${fixtureRoot}`);
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