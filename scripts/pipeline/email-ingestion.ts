// Email Ingestion Pipeline Demo - spaCy Microservice Version
// Advanced entity extraction using a dedicated microservice from real .eml files

import 'reflect-metadata';
import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser, ParsedMail } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { Session } from 'neo4j-driver';
import axios from 'axios';
import { container } from 'tsyringe';
import { registerAllOntologies } from '@src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { resetDatabase } from '../database/reset-neo4j';
import { flattenEnrichmentData } from '../../src/platform/processing/utils/enrichment.utils';
import { OntologyDrivenReasoningService } from '@platform/reasoning/ontology-driven-reasoning.service';

let INDEXABLE_LABELS: string[] = []; // will be populated after ontologies are loaded

// --- Type Definitions for Clarity ---
interface IngestionEntity {
  id: string;
  name: string;
  type: string;
  label: string;
  embedding?: number[];
  resolvedId?: string;
  category?: string;
  createdAt?: Date;
  properties?: { [key: string]: any };
  getOntologicalType?: () => string;
  enrichedData?: any;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
}

interface ParsedEmailWithSource extends ParsedMail {
  sourceFile: string;
}

interface ProcessingResult {
  entities: IngestionEntity[];
  relationships: Relationship[];
}

function getLabelInfo(entity: IngestionEntity, validOntologyTypes: string[]): { primary: string; candidates: string[] } {
    const primaryLabel = entity.getOntologicalType ? entity.getOntologicalType() : entity.type;

    if (!validOntologyTypes.includes(primaryLabel)) {
        console.warn(`[Label Validation] Received type "${primaryLabel}" is not a registered ontology type. Defaulting to 'Thing'. This may indicate a mismatch between the NLP model's output and the loaded ontologies.`);
        return { primary: 'Thing', candidates: ['Thing'] };
    }
    
    // The type is valid. Use it as the primary label.
    // Candidate labels for vector search are only those explicitly marked for indexing.
    const candidateLabels = [primaryLabel]
        .filter(l => INDEXABLE_LABELS.includes(l));

    return { primary: primaryLabel, candidates: [...new Set(candidateLabels)] };
}

/**
 * Splits the provided entities into two groups: property entities (those that should become
 * properties on their parent node) and non-property entities. The list of property entity
 * types comes from the ontology service so we avoid hard-coding domain knowledge here.
 */
export function separatePropertyEntities(
  entities: IngestionEntity[],
  propertyEntityTypes: string[],
): {
  propertyEntities: IngestionEntity[];
  nonPropertyEntities: IngestionEntity[];
} {
  const propertyEntities = entities.filter(entity =>
    propertyEntityTypes.includes(entity.type),
  );
  const nonPropertyEntities = entities.filter(
    entity => !propertyEntityTypes.includes(entity.type),
  );
  return { propertyEntities, nonPropertyEntities };
}

export async function demonstrateSpacyEmailIngestionPipeline() {
  // --- Check for reset flag ---
  if (process.argv.includes('--reset-db')) {
    console.log('🔄 --reset-db flag found. Resetting database before ingestion...');
    await resetDatabase();
    console.log('✅ Database reset complete.');
  }

  // --- INITIALIZATION ---
  registerAllOntologies();
  const ontologyService = container.resolve(OntologyService);
  const bridge: any = container.resolve('FinancialToCrmBridge');
  const validEntityTypes = ontologyService.getAllEntityTypes();
  const propertyEntityTypes = ontologyService.getPropertyEntityTypes();
  const validRelationshipTypes = ontologyService.getAllRelationshipTypes();

  // Populate dynamic indexable labels from ontology
  INDEXABLE_LABELS = ontologyService.getIndexableEntityTypes();

  console.log('🏛️ Registered Ontology Types:', validEntityTypes.length);
  console.log('🏠 Registered Property Types:', propertyEntityTypes.length);
  console.log('🔗 Registered Relationship Types:', validRelationshipTypes.length);

  // --- NEW: Sync ontology with Python NLP Service ---
  try {
    console.log('   ⚡ Syncing ontology with NLP service...');
    await axios.post('http://127.0.0.1:8000/ontologies', {
        entity_types: validEntityTypes,
        property_types: propertyEntityTypes,
        relationship_types: validRelationshipTypes
    });
    console.log('   ✅ Ontology synced successfully.');
  } catch (error: any) {
    console.error('   ❌ Failed to sync ontology with NLP service. The service might not be running or the endpoint is incorrect.', error.message);
    console.warn('   ⚠️ Continuing without NLP ontology sync. Some NLP features may be disabled.');
  }
  // --- END INITIALIZATION ---

  console.log('📧 Email Ingestion Pipeline Demo - Direct to Neo4j');
  console.log('='.repeat(100));

  const connection = container.resolve(Neo4jConnection);
  const contentProcessingService = container.resolve(ContentProcessingService);
  let session: Session | null = null;

  try {
    console.log('\n⚡ Connecting to Neo4j...');
    await connection.connect();
    session = connection.getDriver().session();
    console.log('   ✅ Neo4j connection established.');

    if (!session) {
      throw new Error('Failed to create Neo4j session.');
    }

    // --- NEW: Create Vector Index for all relevant labels ---
    console.log('   ⚡ Ensuring vector indexes exist...');
    for (const label of INDEXABLE_LABELS) {
        const indexName = `${label.toLowerCase()}_embeddings`;
        // Drop the index first to ensure clean state (optional, good for dev)
        await session.run(`DROP INDEX ${indexName} IF EXISTS`);
        const query = `CREATE VECTOR INDEX ${indexName} IF NOT EXISTS FOR (n:${label}) ON (n.embedding) OPTIONS {indexConfig: { \`vector.dimensions\`: 384, \`vector.similarity_function\`: 'cosine' }}`;
        await session.run(query);
        console.log(`      -> Vector index '${indexName}' is ready for label '${label}'.`);
    }

    const testEmailsDir = join(process.cwd(), 'test-emails');
    const allFiles = await fs.readdir(testEmailsDir);
    const emailFiles = allFiles.filter(f => f.endsWith('.eml')).sort();
    const filesToProcess = emailFiles; // Process all emails
    const emailBodies: string[] = [];
    const parsedEmails: ParsedEmailWithSource[] = [];

    console.log(
      `\n📂 Found ${emailFiles.length} email files, parsing all of them before batch processing in '${testEmailsDir}'`,
    );

    for (const emailFile of filesToProcess) {
        const filePath = join(testEmailsDir, emailFile);
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const parsedEmail = await simpleParser(fileContent);
            const emailBody = typeof parsedEmail.text === 'string'
                ? parsedEmail.text
                : (parsedEmail.html || '').replace(/<[^>]*>/g, '');
            emailBodies.push(emailBody);
            parsedEmails.push({ ...parsedEmail, sourceFile: emailFile } as ParsedEmailWithSource);
        } catch (e: any) {
            console.error(`   ❌ Error reading or parsing email file ${emailFile}:`, e.message);
        }
    }

    console.log(`\n[1] All ${emailBodies.length} emails parsed. Starting batch ingestion...`);
    const batchResults = await contentProcessingService.processContentBatch(emailBodies) as ProcessingResult[];
    console.log(`[2] Batch processing complete. Ingesting ${batchResults.length} results into Neo4j...`);

    let emailIndex = 0;
    for (const result of batchResults) {
      const parsedEmail = parsedEmails[emailIndex];
      const emailFile = parsedEmail.sourceFile;
      emailIndex++;

      console.log('\n' + '='.repeat(100));
      console.log(`Ingesting results for: ${emailFile}`);
      console.log('='.repeat(100));
      
      try {
        const { entities, relationships } = result;

        // --- Neo4j Ingestion Start ---
        console.log('   [3] Starting Neo4j ingestion with vector search...');
        const entityMap = new Map<string, any>();

        // Separate property and non-property entities dynamically using the ontology-derived list
        const { propertyEntities, nonPropertyEntities } = separatePropertyEntities(
          entities,
          propertyEntityTypes,
        );

        // Prepare a set of relationship types that map to property entities, e.g. "Email" -> "HAS_EMAIL"
        const propertyRelationshipTypes = new Set(
          propertyEntityTypes.map(type => `HAS_${type.toUpperCase()}`),
        );
        
        // Create a map of property relationships for later property assignment
        const propertyRelationships = new Map<string, Map<string, string[]>>();
        relationships.forEach(rel => {
          if (propertyRelationshipTypes.has(rel.type)) {
            const sourceId = rel.source;
            const targetEntity = entities.find(e => e.id === rel.target);
            if (targetEntity && propertyEntityTypes.includes(targetEntity.type)) {
              if (!propertyRelationships.has(sourceId)) {
                propertyRelationships.set(sourceId, new Map());
              }
              const entityPropertyMap = propertyRelationships.get(sourceId)!;
              const propertyType = targetEntity.type.toLowerCase();
              if (!entityPropertyMap.has(propertyType)) {
                entityPropertyMap.set(propertyType, []);
              }
              entityPropertyMap.get(propertyType)!.push(targetEntity.name);
            }
          }
        });

        console.log(
          `      -> Found ${propertyEntities.length} property entities (${propertyEntityTypes.join(", ")}) to be converted to properties`,
        );
        console.log(`      -> Processing ${nonPropertyEntities.length} non-property entities`);

        // 1. Find or Create Entity Nodes using Vector Search (excluding property entities)
        for (const entity of nonPropertyEntities) {
          const { primary: primaryLabel, candidates: candidateLabels } = getLabelInfo(entity, validEntityTypes);
          let nodeId = entity.id || uuidv4();
          let foundExistingNode = false;

          if (primaryLabel === 'UnrecognizedEntity') {
            console.log(`      -> Skipping unrecognized entity '${entity.name}'.`);
            continue;
          }
          if (!entity.embedding && !INDEXABLE_LABELS.includes(primaryLabel)) {
            console.log(`      -> Skipping entity '${entity.name}' (type: ${primaryLabel}) because it has no embedding and is not an indexed type.`);
            continue;
          }
          if (entity.embedding && candidateLabels.length > 0 && primaryLabel !== 'Thing') {
            for (const label of candidateLabels) {
              const indexName = `${label.toLowerCase()}_embeddings`;
              const searchResult = await session.run(
                `CALL db.index.vector.queryNodes($indexName, $limit, $embedding) YIELD node, score`,
                { indexName, limit: 1, embedding: entity.embedding }
              );

              if (searchResult.records.length > 0 && searchResult.records[0].get('score') > 0.92) {
                const existingNode = searchResult.records[0].get('node');
                nodeId = existingNode.properties.id;
                console.log(`      -> Found existing '${label}' entity '${entity.name}' with score ${searchResult.records[0].get('score').toFixed(2)}. Reusing ID: ${nodeId}`);
                entityMap.set(entity.name, { ...existingNode.properties, labels: existingNode.labels });
                foundExistingNode = true;
                break;
              }
            }
          }

          if (!foundExistingNode) {
            const allLabels = [primaryLabel];
            // Apply CRM labels if the bridge defines them
            if (primaryLabel && bridge && typeof bridge === 'object' && 'getCrmLabelsForFinancialType' in bridge) {
              try {
                const crmLabels = (bridge as any).getCrmLabelsForFinancialType(primaryLabel);
                if (crmLabels && Array.isArray(crmLabels) && crmLabels.length > 0) {
                  allLabels.push(...crmLabels);
                }
              } catch (error: any) {
                console.error(`   ❌ Error getting CRM labels for ${primaryLabel}:`, error.message);
              }
            }
            const labelsCypher = allLabels.map(l => `\`${l}\``).join(':');

            // NEW: Add property values if this entity has associated properties
            const entityProperties = propertyRelationships.get(entity.id) || new Map();
            const additionalProperties: any = {};
            
            // Handle different property types
            if (entityProperties.has('email')) {
              const emails = entityProperties.get('email')!;
              additionalProperties.email = emails[0]; // Primary email
              if (emails.length > 1) {
                additionalProperties.additionalEmails = emails.slice(1);
              }
              console.log(`      -> Adding email properties to ${entity.name}: ${emails.join(', ')}`);
            }
            
            if (entityProperties.has('percent')) {
              const percents = entityProperties.get('percent')!;
              additionalProperties.percentage = percents[0]; // Primary percentage
              if (percents.length > 1) {
                additionalProperties.additionalPercentages = percents.slice(1);
              }
              console.log(`      -> Adding percent properties to ${entity.name}: ${percents.join(', ')}`);
            }
            
            if (entityProperties.has('date')) {
              const dates = entityProperties.get('date')!;
              additionalProperties.date = dates[0]; // Primary date
              if (dates.length > 1) {
                additionalProperties.additionalDates = dates.slice(1);
              }
              console.log(`      -> Adding date properties to ${entity.name}: ${dates.join(', ')}`);
            }
            
            if (entityProperties.has('monetaryamount')) {
              const amounts = entityProperties.get('monetaryamount')!;
              additionalProperties.amount = amounts[0]; // Primary amount
              if (amounts.length > 1) {
                additionalProperties.additionalAmounts = amounts.slice(1);
              }
              console.log(`      -> Adding monetary amount properties to ${entity.name}: ${amounts.join(', ')}`);
            }
            
            if (entityProperties.has('time')) {
              const times = entityProperties.get('time')!;
              additionalProperties.time = times[0]; // Primary time
              if (times.length > 1) {
                additionalProperties.additionalTimes = times.slice(1);
              }
              console.log(`      -> Adding time properties to ${entity.name}: ${times.join(', ')}`);
            }

            // Merge enriched data using utility to flatten nested structures (e.g., EDGAR address)
            if (entity.enrichedData) {
              const flattened = flattenEnrichmentData(entity.enrichedData);
              Object.assign(additionalProperties, flattened);
            }

            const mergeQuery = entity.embedding
              ? `
                MERGE (e {id: $id})
                ON CREATE SET e += $props
                ON MATCH SET e += $props
                SET e:${labelsCypher}
                RETURN e
              `
              : `
                MERGE (e {id: $id})
                ON CREATE SET e += $props
                SET e:${labelsCypher}
                RETURN e
              `;
            
            const mergeResult = await session.run(
              mergeQuery,
              {
                id: nodeId,
                props: {
                  id: nodeId,
                  name: entity.name,
                  category: entity.category || 'Generic',
                  createdAt: (entity.createdAt instanceof Date ? entity.createdAt : new Date(entity.createdAt || Date.now())).toISOString(),
                  embedding: entity.embedding,
                  ...(entity.properties || {}),
                  ...additionalProperties, // Add all property values here
                }
              }
            );
            const newNode = mergeResult.records[0].get('e');
            const action = mergeResult.summary.counters.updates().nodesCreated > 0 ? 'Created' : 'Matched';
            console.log(`      -> ${action} '${primaryLabel}' node for '${entity.name}' with ID: ${newNode.properties.id}`);
            entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });
            nodeId = newNode.properties.id;
            entity.resolvedId = nodeId;
          } else {
            // Existing node matched – we still need to update its properties (emails, percentages, EDGAR, etc.)

            const entityProperties = propertyRelationships.get(entity.id) || new Map();
            const additionalProps: any = {};

            if (entityProperties.has('email')) {
              const emails = entityProperties.get('email')!;
              additionalProps.email = emails[0];
              if (emails.length > 1) {
                additionalProps.additionalEmails = emails.slice(1);
              }
            }
            if (entityProperties.has('percent')) {
              const percents = entityProperties.get('percent')!;
              additionalProps.percentage = percents[0];
              if (percents.length > 1) {
                additionalProps.additionalPercentages = percents.slice(1);
              }
            }
            if (entityProperties.has('date')) {
              const dates = entityProperties.get('date')!;
              additionalProps.date = dates[0];
              if (dates.length > 1) {
                additionalProps.additionalDates = dates.slice(1);
              }
            }
            if (entityProperties.has('monetaryamount')) {
              const amounts = entityProperties.get('monetaryamount')!;
              additionalProps.amount = amounts[0];
              if (amounts.length > 1) {
                additionalProps.additionalAmounts = amounts.slice(1);
              }
            }
            if (entityProperties.has('time')) {
              const times = entityProperties.get('time')!;
              additionalProps.time = times[0];
              if (times.length > 1) {
                additionalProps.additionalTimes = times.slice(1);
              }
            }

            // Flatten enriched data if present
            if (entity.enrichedData) {
              const flattened = flattenEnrichmentData(entity.enrichedData);
              Object.assign(additionalProps, flattened);
            }

            // Only run update if we have at least one property to set (avoid empty SET clause)
            if (Object.keys(additionalProps).length > 0) {
              await session.run(
                `MATCH (e {id: $id}) SET e += $props`,
                {
                  id: nodeId,
                  props: additionalProps,
                },
              );
              console.log(`      -> Updated existing node '${entity.name}' with new properties.`);
            }

            entity.resolvedId = nodeId;
          }
        }
        
        // 2. Create Communication Node and link entities
        const communicationId = parsedEmail.messageId || uuidv4();
        await session.run(
          `
          MERGE (c:Communication {id: $id})
          ON CREATE SET c.subject = $subject, c.from = $from, c.date = datetime($date), c.sourceFile = $sourceFile
        `,
          {
            id: communicationId,
            subject: parsedEmail.subject || 'No Subject',
            from: parsedEmail.from?.text || 'Unknown Sender',
            date: (parsedEmail.date instanceof Date ? parsedEmail.date : new Date(parsedEmail.date || Date.now())).toISOString(),
            sourceFile: emailFile,
          },
        );
        console.log(`      -> Merged Communication node.`);
        
        // Only link non-property entities to communication (property entities are now properties)
        for (const entity of nonPropertyEntities) {
          if (entity.resolvedId) {
            const entityInfo = entityMap.get(entity.name);
            const labels = entityInfo.labels;
            const labelsCypher = labels.map((l: string) => `\`${l}\``).join(':');

            await session.run(
              `
              MATCH (c:Communication {id: $communicationId})
              MATCH (e:${labelsCypher} {id: $entityId})
              MERGE (c)-[:CONTAINS_ENTITY]->(e)
            `,
              {
                communicationId: communicationId,
                entityId: entity.resolvedId,
              },
            );
          }
        }
        console.log(
          `      -> Linked ${nonPropertyEntities.filter(e => e.resolvedId).length} non-property entities to communication.`,
        );

        // 3. Create relationships between entities (excluding HAS_EMAIL, HAS_PERCENT, HAS_DATE, HAS_MONETARY_AMOUNT, HAS_TIME since they are now properties)
        const entityIdMap = new Map<string, IngestionEntity>(nonPropertyEntities.map((e: IngestionEntity) => [e.id, e]));
        const nonPropertyRelationships = relationships.filter(rel => !['HAS_EMAIL', 'HAS_PERCENT', 'HAS_DATE', 'HAS_MONETARY_AMOUNT', 'HAS_TIME'].includes(rel.type));
        
        for (const rel of nonPropertyRelationships) {
            const sourceEntity = entityIdMap.get(rel.source);
            const targetEntity = entityIdMap.get(rel.target);
            
            if (sourceEntity && sourceEntity.resolvedId && targetEntity && targetEntity.resolvedId) {
                const sourceInfo = entityMap.get(sourceEntity.name);
                const targetInfo = entityMap.get(targetEntity.name);
                const sourceLabelsCypher = sourceInfo.labels.map((l: string) => `\`${l}\``).join(':');
                const targetLabelsCypher = targetInfo.labels.map((l: string) => `\`${l}\``).join(':');
                const relType = rel.type.replace(/ /g, '_').toUpperCase();

                await session.run(
                  `
                  MATCH (a:${sourceLabelsCypher} {id: $sourceId})
                  MATCH (b:${targetLabelsCypher} {id: $targetId})
                  MERGE (a)-[:\`${relType}\`]->(b)
                `,
                  {
                    sourceId: sourceEntity.resolvedId,
                    targetId: targetEntity.resolvedId,
                  },
                );
            }
        }
        console.log(
          `      -> Merged ${nonPropertyRelationships.length} non-property relationships between entities.`,
        );
        console.log('   [4] Neo4j ingestion complete for this email.');
        // --- Neo4j Ingestion End ---
      } catch (error: any) {
        console.error(`   ❌ Error during Neo4j processing for ${emailFile}:`, error.message);
      }
    }
  } catch (error) {
    console.error('An unexpected error occurred in the pipeline:', error);
  } finally {
    if (session) {
      await session.close();
      console.log('\n   ✅ Neo4j session closed.');
    }
    
    // Execute reasoning algorithms after all data is ingested
    try {
      console.log('\n🔍 Executing reasoning algorithms...');
      const reasoningService = container.resolve(OntologyDrivenReasoningService);
      await reasoningService.executeAllReasoning();
      console.log('✅ Reasoning algorithms completed successfully');
    } catch (reasoningError) {
      console.error('❌ Error during reasoning execution:', reasoningError);
    }
    
    await connection.close();
    console.log('   ✅ Neo4j connection closed.');
  }

  console.log('\n\n Demo Complete!');
}

if (require.main === module) {
    demonstrateSpacyEmailIngestionPipeline().catch(e => {
      console.error('An unexpected error occurred:', e);
      process.exit(1);
    });
} 