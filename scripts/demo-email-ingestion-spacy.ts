// Email Ingestion Pipeline Demo - spaCy Microservice Version
// Advanced entity extraction using a dedicated microservice from real .eml files

import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { Session } from 'neo4j-driver';
import axios from 'axios';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerAllOntologies } from 'src/register-ontologies';
import { OntologyService } from '@platform/ontology/ontology.service';
import { FinancialToCrmBridge } from '@financial/application/ontology-bridges/financial-to-crm.bridge';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { resetDatabase } from './reset-neo4j';

const LABELS_TO_INDEX = ['Person', 'Organization', 'Location', 'Product', 'Event', 'Project', 'Deal', 'RegulatoryInformation', 'LegalDocument'];

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
}

interface Relationship {
  source: string;
  target: string;
  type: string;
}

function getLabelInfo(entity: any, validOntologyTypes: string[]): { primary: string; candidates: string[] } {
    const primaryLabel = entity.getOntologicalType ? entity.getOntologicalType() : entity.type;

    if (!validOntologyTypes.includes(primaryLabel)) {
        console.warn(`[Label Validation] Received type "${primaryLabel}" is not a registered ontology type. Defaulting to 'Thing'. This may indicate a mismatch between the NLP model's output and the loaded ontologies.`);
        return { primary: 'Thing', candidates: ['Thing'] };
    }
    
    // The type is valid. Use it as the primary label.
    // Candidate labels for vector search are only those explicitly marked for indexing.
    const candidateLabels = [primaryLabel]
        .filter(l => LABELS_TO_INDEX.includes(l));

    return { primary: primaryLabel, candidates: [...new Set(candidateLabels)] };
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
  const bridge = container.resolve(FinancialToCrmBridge);
  const validEntityTypes = ontologyService.getAllEntityTypes();
  const propertyEntityTypes = ontologyService.getPropertyEntityTypes();
  const validRelationshipTypes = ontologyService.getAllRelationshipTypes();
  console.log('🏛️ Registered Ontology Types:', validEntityTypes);
  console.log('🏠 Registered Property Types:', propertyEntityTypes);
  console.log('🔗 Registered Relationship Types:', validRelationshipTypes);

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
    // Depending on the desired behavior, you might want to exit the process
    process.exit(1);
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
    for (const label of LABELS_TO_INDEX) {
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
    const parsedEmails: any[] = [];

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
            parsedEmails.push({ ...parsedEmail, sourceFile: emailFile });
        } catch (e: any) {
            console.error(`   ❌ Error reading or parsing email file ${emailFile}:`, e.message);
        }
    }

    console.log(`\n[1] All ${emailBodies.length} emails parsed. Starting batch ingestion...`);
    const batchResults = await contentProcessingService.processContentBatch(emailBodies);
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

        // 1. Find or Create Entity Nodes using Vector Search
        for (const entity of entities) {
          const { primary: primaryLabel, candidates: candidateLabels } = getLabelInfo(entity, validEntityTypes);
          let nodeId = entity.id || uuidv4();
          let foundExistingNode = false;

          if (primaryLabel === 'UnrecognizedEntity') {
            console.log(`      -> Skipping unrecognized entity '${entity.name}'.`);
            continue;
          }
          if (!entity.embedding && !LABELS_TO_INDEX.includes(primaryLabel)) {
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
            if (primaryLabel && bridge) {
              try {
                const crmLabels = bridge.getCrmLabelsForFinancialType(primaryLabel);
                if (crmLabels.length > 0) {
                  allLabels.push(...crmLabels);
                }
              } catch (error: any) {
                console.error(`   ❌ Error getting CRM labels for ${primaryLabel}:`, error.message);
              }
            }
            const labelsCypher = allLabels.map(l => `\`${l}\``).join(':');

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
                  createdAt: (entity.createdAt || new Date()).toISOString(),
                  embedding: entity.embedding,
                  ...(entity.properties || {}),
                }
              }
            );
            const newNode = mergeResult.records[0].get('e');
            const action = mergeResult.summary.counters.updates().nodesCreated > 0 ? 'Created' : 'Matched';
            console.log(`      -> ${action} '${primaryLabel}' node for '${entity.name}' with ID: ${newNode.properties.id}`);
            entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });
            nodeId = newNode.properties.id;
          }
          entity.resolvedId = nodeId;
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
            date: (parsedEmail.date || new Date()).toISOString(),
            sourceFile: emailFile,
          },
        );
        console.log(`      -> Merged Communication node.`);
        
        for (const entity of entities) {
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
          `      -> Linked ${entities.filter(e => e.resolvedId).length} entities to communication.`,
        );

        // 3. Create relationships between entities
        const entityIdMap = new Map<string, IngestionEntity>(entities.map((e: any) => [e.id, e]));
        for (const rel of relationships) {
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
          `      -> Merged ${relationships.length} relationships between entities.`,
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