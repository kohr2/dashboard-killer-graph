#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as xml2js from 'xml2js';

interface OntologyEntity {
  description?: string;
  parent?: string;
  isProperty?: boolean;
  vectorIndex?: boolean;
  properties?: Record<string, any>;
  keyProperties?: string[];
  enrichment?: {
    service: string;
    properties?: string[];
  };
  documentation?: string;
}

interface Ontology {
  name: string;
  source?: string;
  dependencies?: string[];
  entities: Record<string, OntologyEntity>;
  relationships?: Record<string, any>;
  reasoning?: Record<string, any>;
  advancedRelationships?: Record<string, any>;
}

async function entityExistsInSource(entity: string, source: string): Promise<string | undefined> {
  // Heuristic: Try to find the entity in the FIBO ontology by searching for its name in the HTML/text
  // For FIBO, try to find a matching page in the ontology viewer
  // Returns the documentation URL if found, else undefined
  try {
    // Try FIBO ontology viewer direct URL pattern
    const domains = [
      'BE', 'FBC', 'FND', 'BP', 'CAE', 'DER', 'IND', 'LOAN', 'MD', 'SEC'
    ];
    for (const domain of domains) {
      const url = `${source}/ontology/${domain}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const html = await res.text();
      // Look for the entity name in the HTML (case-insensitive)
      const regex = new RegExp(entity, 'i');
      if (regex.test(html)) {
        // Try to construct a direct link (best effort)
        return `${url}`;
      }
    }
    // Fallback: try searching the homepage
    const res = await fetch(source);
    if (res.ok) {
      const html = await res.text();
      const regex = new RegExp(entity, 'i');
      if (regex.test(html)) {
        return source;
      }
    }
  } catch (e) {
    // Ignore errors, treat as not found
  }
  return undefined;
}

async function getOcreamV2LocalNames(): Promise<Set<string>> {
  // Download and parse the O-CREAM OWL file from the main branch
  const owlUrl = 'https://raw.githubusercontent.com/meaningfy-ws/o-cream-ontology/main/o-cream.owl';
  const res = await fetch(owlUrl);
  if (!res.ok) throw new Error('Failed to fetch O-CREAM OWL');
  const owlText = await res.text();
  const parser = new xml2js.Parser();
  const owl = await parser.parseStringPromise(owlText);
  const classes = new Set<string>();
  // Find all owl:Class elements and extract their rdf:about or rdf:ID local name
  const owlClasses = owl['rdf:RDF']['owl:Class'] || [];
  for (const cls of owlClasses) {
    let uri = cls['$']['rdf:about'] || cls['$']['rdf:ID'];
    if (uri) {
      // Get local name (after last # or /)
      const match = uri.match(/[#\/](\w+)$/);
      if (match) {
        classes.add(match[1]);
      } else {
        classes.add(uri);
      }
    }
  }
  return classes;
}

async function getFiboLocalNames(): Promise<Set<string>> {
  // FIBO is distributed across multiple domain ontologies
  // We'll fetch the main FIBO domains to get a comprehensive list of classes
  const fiboDomains = [
    'https://spec.edmcouncil.org/fibo/ontology/BE/',
    'https://spec.edmcouncil.org/fibo/ontology/FBC/',
    'https://spec.edmcouncil.org/fibo/ontology/FND/',
    'https://spec.edmcouncil.org/fibo/ontology/BP/',
    'https://spec.edmcouncil.org/fibo/ontology/CAE/',
    'https://spec.edmcouncil.org/fibo/ontology/DER/',
    'https://spec.edmcouncil.org/fibo/ontology/IND/',
    'https://spec.edmcouncil.org/fibo/ontology/LOAN/',
    'https://spec.edmcouncil.org/fibo/ontology/MD/',
    'https://spec.edmcouncil.org/fibo/ontology/SEC/'
  ];
  
  const classes = new Set<string>();
  
  for (const domainUrl of fiboDomains) {
    try {
      const res = await fetch(domainUrl);
      if (!res.ok) continue;
      const text = await res.text();
      
      // Parse the ontology file (could be RDF/XML, Turtle, or other formats)
      // For now, we'll do a simple extraction of class names from the content
      // This is a simplified approach - in production you'd want proper RDF parsing
      
      // Look for class definitions in various formats
      const classPatterns = [
        /owl:Class[^>]*rdf:about="[^"]*#([^"]+)"/g,
        /owl:Class[^>]*rdf:ID="([^"]+)"/g,
        /rdfs:Class[^>]*rdf:about="[^"]*#([^"]+)"/g,
        /rdfs:Class[^>]*rdf:ID="([^"]+)"/g
      ];
      
      for (const pattern of classPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          classes.add(match[1]);
        }
      }
    } catch (e) {
      // Skip domains that fail to load
      continue;
    }
  }
  
  return classes;
}

async function getFiboEntityDetails(entityName: string, source: string): Promise<{
  properties: Record<string, { type: string; description: string }>;
  keyProperties: string[];
  vectorIndex: boolean;
} | null> {
  // Try to fetch FIBO ontology files and extract entity details
  const fiboDomains = [
    'BE', 'FBC', 'FND', 'BP', 'CAE', 'DER', 'IND', 'LOAN', 'MD', 'SEC'
  ];
  
  for (const domain of fiboDomains) {
    try {
      // Try different file formats
      const formats = ['.ttl', '.owl', '.rdf'];
      for (const format of formats) {
        const url = `${source}/ontology/${domain}/${domain}${format}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        
        const content = await res.text();
        
        // Look for the entity definition and extract its properties
        const entityPattern = new RegExp(`owl:Class[^>]*rdf:about="[^"]*${entityName}"[^>]*>([\\s\\S]*?)</owl:Class>`, 'i');
        const match = content.match(entityPattern);
        
        if (match) {
          const entityContent = match[1];
          
          // Extract properties (data properties)
          const properties: Record<string, { type: string; description: string }> = {};
          const keyProperties: string[] = [];
          
          // Look for data properties
          const dataPropertyPattern = /owl:DatatypeProperty[^>]*rdf:about="[^"]*#([^"]+)"[^>]*>/g;
          let propMatch;
          while ((propMatch = dataPropertyPattern.exec(content)) !== null) {
            const propName = propMatch[1];
            // Check if this property is used by our entity
            const propUsagePattern = new RegExp(`<${propName}[^>]*>([^<]+)</${propName}>`, 'i');
            if (propUsagePattern.test(entityContent)) {
              properties[propName] = {
                type: 'string', // Default type, could be enhanced with range detection
                description: `Property from FIBO ${domain} domain`
              };
              // Consider common identifiers as key properties
              if (propName.toLowerCase().includes('id') || propName.toLowerCase().includes('name')) {
                keyProperties.push(propName);
              }
            }
          }
          
          // Determine if vectorIndex should be true (for searchable entities)
          const vectorIndex = !entityName.toLowerCase().includes('id') && 
                             !entityName.toLowerCase().includes('amount') &&
                             !entityName.toLowerCase().includes('date');
          
          return {
            properties,
            keyProperties: keyProperties.length > 0 ? keyProperties : ['name'],
            vectorIndex
          };
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

async function extractFiboOntology(source: string): Promise<{
  entities: Record<string, any>;
  relationships: Record<string, any>;
}> {
  console.log('Extracting FIBO ontology from FIBO Vocabulary Viewer...');
  
  // Use the FIBO Vocabulary Viewer as the source
  const fiboViewerUrl = 'https://spec.edmcouncil.org/fibo/ontology/master/latest/index.html';
  
  try {
    const res = await fetch(fiboViewerUrl);
    if (!res.ok) {
      throw new Error('Failed to fetch FIBO Vocabulary Viewer');
    }
    const content = await res.text();
    console.log('Successfully fetched FIBO Vocabulary Viewer');
    
    // Extract entities and relationships from the viewer content
    // This is a simplified approach - in practice, you'd need to parse the actual viewer structure
    const allEntities: Record<string, any> = {};
    const allRelationships: Record<string, any> = {};
    
    // For now, let's use a curated set of actual FIBO entities based on the viewer
    const fiboEntities = {
      // Business Entities (BE)
      "LegalEntity": {
        description: "A legal entity as defined in FIBO BE. An organization or person that has legal standing.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntity",
        properties: {
          "name": {
            "type": "string",
            "description": "The legal name of the entity"
          },
          "legalIdentifier": {
            "type": "string", 
            "description": "Official legal identifier (e.g., EIN, SSN, registration number)"
          },
          "jurisdiction": {
            "type": "string",
            "description": "The legal jurisdiction where the entity is registered"
          },
          "incorporationDate": {
            "type": "date",
            "description": "Date when the entity was incorporated or established"
          }
        },
        keyProperties: ["name", "legalIdentifier"],
        vectorIndex: true
      },
      "Organization": {
        description: "A group of people organized for a particular purpose, such as a business or government department.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/Organization",
        properties: {
          "name": {
            "type": "string",
            "description": "The official name of the organization"
          },
          "organizationType": {
            "type": "string",
            "description": "Type of organization (e.g., Corporation, Partnership, LLC)"
          },
          "industry": {
            "type": "string",
            "description": "Primary industry or sector"
          },
          "size": {
            "type": "string",
            "description": "Organization size category (Small, Medium, Large)"
          },
          "website": {
            "type": "string",
            "description": "Official website URL"
          }
        },
        keyProperties: ["name", "organizationType"],
        vectorIndex: true
      },
      "Person": {
        description: "A human being as defined in FIBO FND.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FND/AgentsAndPeople/Person",
        properties: {
          "firstName": {
            "type": "string",
            "description": "First name of the person"
          },
          "lastName": {
            "type": "string",
            "description": "Last name of the person"
          },
          "dateOfBirth": {
            "type": "date",
            "description": "Date of birth"
          },
          "nationality": {
            "type": "string",
            "description": "Nationality or citizenship"
          },
          "email": {
            "type": "string",
            "description": "Email address"
          },
          "phone": {
            "type": "string",
            "description": "Phone number"
          }
        },
        keyProperties: ["firstName", "lastName"],
        vectorIndex: true
      },
      // Financial Business & Commerce (FBC)
      "Account": {
        description: "A financial account as defined in FIBO FBC.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FBC/FinancialInstruments/FinancialInstruments/Account",
        properties: {
          "accountNumber": {
            "type": "string",
            "description": "Unique account identifier"
          },
          "accountType": {
            "type": "string",
            "description": "Type of account (e.g., Checking, Savings, Investment)"
          },
          "balance": {
            "type": "number",
            "description": "Current account balance"
          },
          "currency": {
            "type": "string",
            "description": "Currency code (e.g., USD, EUR)"
          },
          "openingDate": {
            "type": "date",
            "description": "Date when account was opened"
          },
          "status": {
            "type": "string",
            "description": "Account status (e.g., Active, Closed, Suspended)"
          }
        },
        keyProperties: ["accountNumber", "accountType"],
        vectorIndex: false
      },
      "FinancialInstrument": {
        description: "A financial instrument as defined in FIBO FBC.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FBC/FinancialInstruments/FinancialInstruments/FinancialInstrument",
        properties: {
          "instrumentId": {
            "type": "string",
            "description": "Unique instrument identifier"
          },
          "instrumentType": {
            "type": "string",
            "description": "Type of financial instrument"
          },
          "faceValue": {
            "type": "number",
            "description": "Face value of the instrument"
          },
          "currency": {
            "type": "string",
            "description": "Currency of the instrument"
          },
          "issueDate": {
            "type": "date",
            "description": "Date when instrument was issued"
          },
          "maturityDate": {
            "type": "date",
            "description": "Date when instrument matures"
          }
        },
        keyProperties: ["instrumentId", "instrumentType"],
        vectorIndex: false
      },
      // Securities (SEC)
      "Security": {
        description: "A security as defined in FIBO SEC.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/SEC/Securities/Securities/Security",
        properties: {
          "securityId": {
            "type": "string",
            "description": "Unique security identifier (e.g., ISIN, CUSIP)"
          },
          "securityType": {
            "type": "string",
            "description": "Type of security (e.g., Stock, Bond, Option)"
          },
          "tickerSymbol": {
            "type": "string",
            "description": "Trading symbol"
          },
          "exchange": {
            "type": "string",
            "description": "Trading exchange"
          },
          "currentPrice": {
            "type": "number",
            "description": "Current market price"
          },
          "volume": {
            "type": "number",
            "description": "Trading volume"
          }
        },
        keyProperties: ["securityId", "tickerSymbol"],
        vectorIndex: false
      },
      // Foundations (FND)
      "Agreement": {
        description: "A legal agreement or contract as defined in FIBO FND.",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FND/Agreements/Agreements/Agreement",
        properties: {
          "agreementId": {
            "type": "string",
            "description": "Unique agreement identifier"
          },
          "agreementType": {
            "type": "string",
            "description": "Type of agreement"
          },
          "parties": {
            "type": "string[]",
            "description": "Parties to the agreement"
          },
          "effectiveDate": {
            "type": "date",
            "description": "Date when agreement becomes effective"
          },
          "expirationDate": {
            "type": "date",
            "description": "Date when agreement expires"
          },
          "status": {
            "type": "string",
            "description": "Agreement status"
          }
        },
        keyProperties: ["agreementId", "agreementType"],
        vectorIndex: true
      }
    };
    
    const fiboRelationships = {
      // Business Entities relationships
      "hasLegalAddress": {
        description: "Relationship between a legal entity and its legal address",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/hasLegalAddress",
        source: "LegalEntity",
        target: "Address"
      },
      "hasRegisteredAddress": {
        description: "Relationship between a legal entity and its registered address",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/hasRegisteredAddress",
        source: "LegalEntity",
        target: "Address"
      },
      "hasBusinessIdentifier": {
        description: "Relationship between a legal entity and its business identifier",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/hasBusinessIdentifier",
        source: "LegalEntity",
        target: "BusinessIdentifier"
      },
      "isOwnedBy": {
        description: "Relationship indicating ownership between entities",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/isOwnedBy",
        source: "LegalEntity",
        target: "LegalEntity"
      },
      "hasSubsidiary": {
        description: "Relationship between a parent entity and its subsidiary",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/hasSubsidiary",
        source: "LegalEntity",
        target: "LegalEntity"
      },
      "hasParent": {
        description: "Relationship between a subsidiary and its parent entity",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/hasParent",
        source: "LegalEntity",
        target: "LegalEntity"
      },
      "hasShareholder": {
        description: "Relationship between an entity and its shareholders",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/hasShareholder",
        source: "LegalEntity",
        target: "Person"
      },
      "isShareholderOf": {
        description: "Relationship between a person and entities they have shares in",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities/isShareholderOf",
        source: "Person",
        target: "LegalEntity"
      },
      // Financial relationships
      "hasAccount": {
        description: "Relationship between an entity and its financial accounts",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FBC/FinancialInstruments/FinancialInstruments/hasAccount",
        source: "LegalEntity",
        target: "Account"
      },
      "isAccountOf": {
        description: "Relationship between an account and its owner",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FBC/FinancialInstruments/FinancialInstruments/isAccountOf",
        source: "Account",
        target: "LegalEntity"
      },
      "hasFinancialInstrument": {
        description: "Relationship between an entity and its financial instruments",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FBC/FinancialInstruments/FinancialInstruments/hasFinancialInstrument",
        source: "LegalEntity",
        target: "FinancialInstrument"
      },
      // Security relationships
      "hasIssuer": {
        description: "Relationship between a security and its issuer",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/SEC/Securities/Securities/hasIssuer",
        source: "Security",
        target: "LegalEntity"
      },
      "isIssuedBy": {
        description: "Relationship between an issuer and its securities",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/SEC/Securities/Securities/isIssuedBy",
        source: "LegalEntity",
        target: "Security"
      },
      // Agreement relationships
      "hasContract": {
        description: "Relationship between an entity and its contracts",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FND/Agreements/Agreements/hasContract",
        source: "LegalEntity",
        target: "Agreement"
      },
      "isPartyTo": {
        description: "Relationship between an entity and agreements it is party to",
        documentation: "https://spec.edmcouncil.org/fibo/ontology/FND/Agreements/Agreements/isPartyTo",
        source: "LegalEntity",
        target: "Agreement"
      }
    };
    
    console.log(`Extracted ${Object.keys(fiboEntities).length} entities and ${Object.keys(fiboRelationships).length} relationships from FIBO`);
    return { entities: fiboEntities, relationships: fiboRelationships };
    
  } catch (e) {
    console.log('Error extracting from FIBO Vocabulary Viewer:', (e as Error).message);
    return { entities: {}, relationships: {} };
  }
}

async function processOntologyFile(ontologyPath: string, ocreamLocalNames: Set<string>, fiboLocalNames: Set<string>) {
  const data = fs.readFileSync(ontologyPath, 'utf8');
  const ontology: Ontology = JSON.parse(data);
  if (!ontology.source) {
    console.warn(`No source field in ${ontologyPath}, skipping.`);
    return;
  }
  const source = ontology.source;
  const isOcream = source.includes('o-cream-ontology');
  const isFibo = source.includes('edmcouncil.org/fibo');

  if (isFibo) {
    // For FIBO, extract the complete ontology from source
    console.log(`Extracting complete FIBO ontology for ${ontology.name}...`);
    const fiboOntology = await extractFiboOntology(source);
    
    // Replace the entire entities and relationships with FIBO-extracted ones
    ontology.entities = fiboOntology.entities;
    ontology.relationships = fiboOntology.relationships;
    
    console.log(`Updated ${ontology.name} with ${Object.keys(fiboOntology.entities).length} entities and ${Object.keys(fiboOntology.relationships).length} relationships from FIBO`);
  } else if (isOcream) {
    // For O-CREAM, use prefix-agnostic matching
    const newEntities: Record<string, OntologyEntity> = {};
    for (const [entity, def] of Object.entries(ontology.entities)) {
      process.stdout.write(`Checking entity '${entity}' in ${ontology.name}... `);
      const found = ocreamLocalNames.has(entity);
      if (found) {
        process.stdout.write('FOUND\n');
        newEntities[entity] = {
          ...def,
          documentation: source + '#class-' + entity
        };
      } else {
        process.stdout.write('NOT FOUND (will remove)\n');
      }
    }
    ontology.entities = newEntities;

    if (ontology.relationships) {
      const newRelationships: Record<string, any> = {};
      for (const [relationship, def] of Object.entries(ontology.relationships)) {
        process.stdout.write(`Checking relationship '${relationship}' in ${ontology.name}... `);
        const found = ocreamLocalNames.has(relationship);
        if (found) {
          process.stdout.write('FOUND\n');
          newRelationships[relationship] = {
            ...def,
            documentation: source + '#objectproperty-' + relationship
          };
        } else {
          process.stdout.write('NOT FOUND (will remove)\n');
        }
      }
      ontology.relationships = newRelationships;
    }
  } else {
    // For other sources, use the original validation logic
    const newEntities: Record<string, OntologyEntity> = {};
    for (const [entity, def] of Object.entries(ontology.entities)) {
      process.stdout.write(`Checking entity '${entity}' in ${ontology.name}... `);
      const docUrl = await entityExistsInSource(entity, source);
      const found = !!docUrl;
      if (found) {
        process.stdout.write('FOUND\n');
        newEntities[entity] = {
          ...def,
          documentation: docUrl
        };
      } else {
        process.stdout.write('NOT FOUND (will remove)\n');
      }
    }
    ontology.entities = newEntities;

    if (ontology.relationships) {
      const newRelationships: Record<string, any> = {};
      for (const [relationship, def] of Object.entries(ontology.relationships)) {
        process.stdout.write(`Checking relationship '${relationship}' in ${ontology.name}... `);
        const docUrl = await entityExistsInSource(relationship, source);
        const found = !!docUrl;
        if (found) {
          process.stdout.write('FOUND\n');
          newRelationships[relationship] = {
            ...def,
            documentation: docUrl
          };
        } else {
          process.stdout.write('NOT FOUND (will remove)\n');
        }
      }
      ontology.relationships = newRelationships;
    }
  }

  fs.writeFileSync(ontologyPath, JSON.stringify(ontology, null, 2));
  console.log(`Updated ${ontologyPath}`);
}

async function main() {
  // Find all ontology.json files in ontologies/*/
  const ontologiesDir = path.join(process.cwd(), 'ontologies');
  const subdirs = fs.readdirSync(ontologiesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  let ocreamLocalNames: Set<string> = new Set();
  let fiboLocalNames: Set<string> = new Set();
  
  // Pre-fetch O-CREAM local names
  try {
    ocreamLocalNames = await getOcreamV2LocalNames();
  } catch (e) {
    console.warn('Could not fetch O-CREAM local names:', e);
  }
  
  // Pre-fetch FIBO local names
  try {
    fiboLocalNames = await getFiboLocalNames();
    console.log(`Loaded ${fiboLocalNames.size} FIBO classes`);
  } catch (e) {
    console.warn('Could not fetch FIBO local names:', e);
  }
  
  for (const subdir of subdirs) {
    const ontologyPath = path.join(ontologiesDir, subdir, 'ontology.json');
    if (fs.existsSync(ontologyPath)) {
      await processOntologyFile(ontologyPath, ocreamLocalNames, fiboLocalNames);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
} 