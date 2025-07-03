import * as fs from 'fs';
import * as path from 'path';
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

// Generic ontology source interface
interface OntologySource {
  name: string;
  canHandle(source: string): boolean;
  extractEntities(source: string): Promise<Record<string, any>>;
  extractRelationships(source: string): Promise<Record<string, any>>;
  validateEntity(entityName: string, source: string): Promise<{ found: boolean; documentation?: string }>;
  validateRelationship(relationshipName: string, source: string): Promise<{ found: boolean; documentation?: string }>;
}

// Generic text-based source handler
class GenericTextSource implements OntologySource {
  name = 'Generic Text Source';

  canHandle(source: string): boolean {
    return source.startsWith('http') || source.startsWith('https');
  }

  async extractEntities(source: string): Promise<Record<string, any>> {
    console.log(`Extracting entities from generic source: ${source}`);
    return {};
  }

  async extractRelationships(source: string): Promise<Record<string, any>> {
    console.log(`Extracting relationships from generic source: ${source}`);
    return {};
  }

  async validateEntity(entityName: string, source: string): Promise<{ found: boolean; documentation?: string }> {
    try {
      const res = await fetch(source);
      if (!res.ok) return { found: false };
      
      const content = await res.text();
      const found = content.toLowerCase().includes(entityName.toLowerCase());
      
      return {
        found,
        documentation: found ? `${source}#entity-${entityName}` : undefined
      };
    } catch (e) {
      return { found: false };
    }
  }

  async validateRelationship(relationshipName: string, source: string): Promise<{ found: boolean; documentation?: string }> {
    try {
      const res = await fetch(source);
      if (!res.ok) return { found: false };
      
      const content = await res.text();
      const found = content.toLowerCase().includes(relationshipName.toLowerCase());
      
      return {
        found,
        documentation: found ? `${source}#relationship-${relationshipName}` : undefined
      };
    } catch (e) {
      return { found: false };
    }
  }
}

// FIBO-specific source handler
class FiboSource implements OntologySource {
  name = 'FIBO';

  canHandle(source: string): boolean {
    return source.includes('edmcouncil.org/fibo') || source.includes('fibo');
  }

  async extractEntities(source: string): Promise<Record<string, any>> {
    console.log('Extracting FIBO entities...');
    
    // Use curated FIBO entities based on the FIBO Vocabulary Viewer
    const fiboEntities = {
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
    
    return fiboEntities;
  }

  async extractRelationships(source: string): Promise<Record<string, any>> {
    console.log('Extracting FIBO relationships...');
    
    const fiboRelationships = {
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
    
    return fiboRelationships;
  }

  async validateEntity(entityName: string, source: string): Promise<{ found: boolean; documentation?: string }> {
    // For FIBO, we have a curated list of entities
    const entities = await this.extractEntities(source);
    const found = entityName in entities;
    
    return {
      found,
      documentation: found ? entities[entityName].documentation : undefined
    };
  }

  async validateRelationship(relationshipName: string, source: string): Promise<{ found: boolean; documentation?: string }> {
    // For FIBO, we have a curated list of relationships
    const relationships = await this.extractRelationships(source);
    const found = relationshipName in relationships;
    
    return {
      found,
      documentation: found ? relationships[relationshipName].documentation : undefined
    };
  }
}

// O-CREAM specific source handler
class OcreamSource implements OntologySource {
  name = 'O-CREAM';

  canHandle(source: string): boolean {
    return source.includes('o-cream-ontology');
  }

  async extractEntities(source: string): Promise<Record<string, any>> {
    console.log('Extracting O-CREAM entities...');
    
    try {
      const owlUrl = 'https://raw.githubusercontent.com/meaningfy-ws/o-cream-ontology/main/o-cream.owl';
      const res = await fetch(owlUrl);
      if (!res.ok) {
        console.log('Could not fetch O-CREAM OWL file');
        return {};
      }
      
      const owlText = await res.text();
      const parser = new xml2js.Parser();
      const owl = await parser.parseStringPromise(owlText);
      
      const entities: Record<string, any> = {};
      
      // Extract classes from OWL
      if (owl.rdf && owl.rdf.Class) {
        const classes = Array.isArray(owl.rdf.Class) ? owl.rdf.Class : [owl.rdf.Class];
        
        for (const cls of classes) {
          if (cls.$ && cls.$.rdf_about) {
            const className = cls.$.rdf_about.split('#')[1];
            if (className && !className.includes('Thing') && !className.includes('Nothing')) {
              entities[className] = {
                description: `${className} as defined in O-CREAM ontology`,
                documentation: `${source}#class-${className}`,
                properties: {},
                keyProperties: ['name'],
                vectorIndex: true
              };
            }
          }
        }
      }
      
      return entities;
    } catch (e) {
      console.log('Error extracting O-CREAM entities:', (e as Error).message);
      return {};
    }
  }

  async extractRelationships(source: string): Promise<Record<string, any>> {
    console.log('Extracting O-CREAM relationships...');
    
    try {
      const owlUrl = 'https://raw.githubusercontent.com/meaningfy-ws/o-cream-ontology/main/o-cream.owl';
      const res = await fetch(owlUrl);
      if (!res.ok) {
        console.log('Could not fetch O-CREAM OWL file');
        return {};
      }
      
      const owlText = await res.text();
      const parser = new xml2js.Parser();
      const owl = await parser.parseStringPromise(owlText);
      
      const relationships: Record<string, any> = {};
      
      // Extract object properties from OWL
      if (owl.rdf && owl.rdf.ObjectProperty) {
        const props = Array.isArray(owl.rdf.ObjectProperty) ? owl.rdf.ObjectProperty : [owl.rdf.ObjectProperty];
        
        for (const prop of props) {
          if (prop.$ && prop.$.rdf_about) {
            const propName = prop.$.rdf_about.split('#')[1];
            if (propName && !propName.includes('Property')) {
              relationships[propName] = {
                description: `${propName} relationship from O-CREAM ontology`,
                documentation: `${source}#objectproperty-${propName}`,
                source: "Entity",
                target: "Entity"
              };
            }
          }
        }
      }
      
      return relationships;
    } catch (e) {
      console.log('Error extracting O-CREAM relationships:', (e as Error).message);
      return {};
    }
  }

  async validateEntity(entityName: string, source: string): Promise<{ found: boolean; documentation?: string }> {
    const entities = await this.extractEntities(source);
    const found = entityName in entities;
    
    return {
      found,
      documentation: found ? entities[entityName].documentation : undefined
    };
  }

  async validateRelationship(relationshipName: string, source: string): Promise<{ found: boolean; documentation?: string }> {
    const relationships = await this.extractRelationships(source);
    const found = relationshipName in relationships;
    
    return {
      found,
      documentation: found ? relationships[relationshipName].documentation : undefined
    };
  }
}

// Ontology source registry
class OntologySourceRegistry {
  private sources: OntologySource[] = [
    new FiboSource(),
    new OcreamSource(),
    new GenericTextSource()
  ];

  registerSource(source: OntologySource): void {
    this.sources.unshift(source); // Add to beginning for priority
  }

  getSource(sourceUrl: string): OntologySource {
    for (const source of this.sources) {
      if (source.canHandle(sourceUrl)) {
        return source;
      }
    }
    return new GenericTextSource(); // Default fallback
  }
}

// Main processing function
async function processOntologyFile(ontologyPath: string, registry: OntologySourceRegistry) {
  const data = fs.readFileSync(ontologyPath, 'utf8');
  const ontology: Ontology = JSON.parse(data);
  
  if (!ontology.source) {
    console.warn(`No source field in ${ontologyPath}, skipping.`);
    return;
  }
  
  const source = ontology.source;
  const ontologySource = registry.getSource(source);
  
  console.log(`Processing ${ontology.name} with ${ontologySource.name} handler...`);
  
  // Extract complete ontology if the source supports it
  const extractedEntities = await ontologySource.extractEntities(source);
  const extractedRelationships = await ontologySource.extractRelationships(source);
  
  if (Object.keys(extractedEntities).length > 0) {
    // Replace with extracted entities
    ontology.entities = extractedEntities;
    console.log(`Updated ${ontology.name} with ${Object.keys(extractedEntities).length} entities from ${ontologySource.name}`);
  } else {
    // Validate existing entities
    const newEntities: Record<string, OntologyEntity> = {};
    for (const [entity, def] of Object.entries(ontology.entities)) {
      process.stdout.write(`Checking entity '${entity}' in ${ontology.name}... `);
      const result = await ontologySource.validateEntity(entity, source);
      
      if (result.found) {
        process.stdout.write('FOUND\n');
        newEntities[entity] = {
          ...def,
          documentation: result.documentation
        };
      } else {
        process.stdout.write('NOT FOUND (will remove)\n');
      }
    }
    ontology.entities = newEntities;
  }
  
  if (Object.keys(extractedRelationships).length > 0) {
    // Replace with extracted relationships
    ontology.relationships = extractedRelationships;
    console.log(`Updated ${ontology.name} with ${Object.keys(extractedRelationships).length} relationships from ${ontologySource.name}`);
  } else if (ontology.relationships) {
    // Validate existing relationships
    const newRelationships: Record<string, any> = {};
    for (const [relationship, def] of Object.entries(ontology.relationships)) {
      process.stdout.write(`Checking relationship '${relationship}' in ${ontology.name}... `);
      const result = await ontologySource.validateRelationship(relationship, source);
      
      if (result.found) {
        process.stdout.write('FOUND\n');
        newRelationships[relationship] = {
          ...def,
          documentation: result.documentation
        };
      } else {
        process.stdout.write('NOT FOUND (will remove)\n');
      }
    }
    ontology.relationships = newRelationships;
  }
  
  fs.writeFileSync(ontologyPath, JSON.stringify(ontology, null, 2));
  console.log(`Updated ${ontologyPath}`);
}

// Main function
async function main() {
  const registry = new OntologySourceRegistry();
  
  // Find all ontology files
  const ontologyDir = path.join(process.cwd(), 'ontologies');
  const ontologyFiles: string[] = [];
  
  function findOntologyFiles(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findOntologyFiles(filePath);
      } else if (file === 'ontology.json') {
        ontologyFiles.push(filePath);
      }
    }
  }
  
  findOntologyFiles(ontologyDir);
  
  console.log(`Found ${ontologyFiles.length} ontology files`);
  
  // Process each ontology file
  for (const ontologyPath of ontologyFiles) {
    await processOntologyFile(ontologyPath, registry);
  }
  
  console.log('Ontology processing complete!');
}

if (require.main === module) {
  main().catch(console.error);
} 