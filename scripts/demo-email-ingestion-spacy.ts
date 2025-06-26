// Email Ingestion Pipeline Demo - spaCy Microservice Version
// Advanced entity extraction using a dedicated microservice from real .eml files

import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { Neo4jConnection } from '../src/platform/database/neo4j-connection';
import { Session } from 'neo4j-driver';
import { FinancialEntityIntegrationService } from '../src/extensions/financial/application/services/financial-entity-integration.service';
import axios from 'axios';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { initializeExtensions } from '../src/register-extensions';
import { OntologyService } from '../src/platform/ontology/ontology.service';

const LABELS_TO_INDEX = ['Person', 'Organization', 'Location', 'Product', 'Event', 'Project', 'Deal'];

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

async function demonstrateSpacyEmailIngestionPipeline() {
  // --- INITIALIZATION ---
  initializeExtensions();
  const ontologyService = container.resolve(OntologyService);
  const validEntityTypes = ontologyService.getAllEntityTypes();
  const validRelationshipTypes = ontologyService.getAllRelationshipTypes();
  console.log('🏛️ Registered Ontology Types:', validEntityTypes);
  console.log('🔗 Registered Relationship Types:', validRelationshipTypes);

  // --- NEW: Sync ontology with Python NLP Service ---
  try {
    console.log('   ⚡ Syncing ontology with NLP service...');
    await axios.post('http://127.0.0.1:8000/ontologies', {
        entity_types: validEntityTypes,
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
  const financialService = container.resolve(FinancialEntityIntegrationService);
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

    console.log(
      `\n📂 Found ${emailFiles.length} email files, processing ${filesToProcess.length} for this run in '${testEmailsDir}'`,
    );

    for (const emailFile of filesToProcess) {
      console.log('\n' + '='.repeat(100));
      console.log(`Processing: ${emailFile}`);
      console.log('='.repeat(100));

      const filePath = join(testEmailsDir, emailFile);
      let emailBody;
      let parsedEmail;

      try {
        console.log('   [1] Reading and parsing email...');
        const fileContent = await fs.readFile(filePath);
        parsedEmail = await simpleParser(fileContent);
        emailBody =
          typeof parsedEmail.text === 'string'
            ? parsedEmail.text
            : (parsedEmail.html || '').replace(/<[^>]*>/g, '');
        console.log('   [2] Email parsed successfully.');
      } catch (e: any) {
        console.error('   ❌ Error reading or parsing email file:', e.message);
        continue;
      }

      try {
        console.log('   [3] Processing with FinancialEntityIntegrationService (LLM Graph)...');
        const result = await financialService.processFinancialContent(emailBody);

        const { fiboEntities, crmIntegration } = result;

        const relationships = crmIntegration.relationships;
        const filteredEntities = fiboEntities; // The LLM already filters entities

        // --- Neo4j Ingestion Start ---
        console.log('   [4] Starting Neo4j ingestion with vector search...');
        const entityMap = new Map<string, any>(); // Map original entity name to Neo4j node data

        // 1. Find or Create Entity Nodes using Vector Search
        for (const entity of fiboEntities) {
          const { primary: primaryLabel, candidates: candidateLabels } = getLabelInfo(entity, validEntityTypes);
          let nodeId = entity.id || uuidv4(); // Default new ID
          let foundExistingNode = false;

          // Do not attempt to find/create nodes for unrecognized entities. Just log them.
          if (primaryLabel === 'UnrecognizedEntity') {
            console.log(`      -> Skipping unrecognized entity '${entity.name}'.`);
            continue;
          }

          // Skip creating nodes for entities that have no embedding and are not supposed to be indexed.
          if (!entity.embedding && !LABELS_TO_INDEX.includes(primaryLabel)) {
            console.log(`      -> Skipping entity '${entity.name}' (type: ${primaryLabel}) because it has no embedding and is not an indexed type.`);
            continue;
          }

          // Only perform vector search for entities with embeddings and candidate labels.
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
                break; // Found a match, stop searching other labels
              }
            }
          }

          if (!foundExistingNode) {
            // If no close match, merge the node. This is safer than CREATE.
            const mergeQuery = entity.embedding
              ? `
                MERGE (e:\`${primaryLabel}\` {name: $name})
                ON CREATE SET e.id = $id, e.category = $category, e.createdAt = datetime($createdAt), e.embedding = $embedding
                ON MATCH SET e.embedding = $embedding
                RETURN e
              `
              : `
                MERGE (e:\`${primaryLabel}\` {name: $name})
                ON CREATE SET e.id = $id, e.category = $category, e.createdAt = datetime($createdAt)
                RETURN e
              `;
            
            const mergeResult = await session.run(
              mergeQuery,
              {
                id: nodeId,
                name: entity.name,
                category: entity.category || 'Generic',
                createdAt: (entity.createdAt || new Date()).toISOString(),
                embedding: entity.embedding, // This is safe; Neo4j driver handles undefined
              }
            );
            const newNode = mergeResult.records[0].get('e');
            const action = mergeResult.summary.counters.updates().nodesCreated > 0 ? 'Created' : 'Matched';
            console.log(`      -> ${action} '${primaryLabel}' node for '${entity.name}' with ID: ${newNode.properties.id}`);
            entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });
            nodeId = newNode.properties.id; // Ensure we use the ID from the database
          }
          entity.resolvedId = nodeId; // Attach resolved ID for relationship creation
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
        
        for (const entity of fiboEntities) {
          if (entity.resolvedId) {
            const entityInfo = entityMap.get(entity.name);
            const label = entityInfo.labels[0]; // Assuming one primary label
            await session.run(
              `
              MATCH (c:Communication {id: $communicationId})
              MATCH (e:\`${label}\` {id: $entityId})
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
          `      -> Linked ${fiboEntities.filter(e => e.resolvedId).length} entities to communication.`,
        );

        // 3. Create relationships between entities
        for (const rel of relationships) {
            // Corrected: Find entities by their ID-like name, which the LLM now returns.
            const sourceEntity = fiboEntities.find(e => e.name.toLowerCase().replace(/[\s\W]/g, '_') === rel.source || e.name === rel.source);
            const targetEntity = fiboEntities.find(e => e.name.toLowerCase().replace(/[\s\W]/g, '_') === rel.target || e.name === rel.target);

            if (sourceEntity && sourceEntity.resolvedId && targetEntity && targetEntity.resolvedId) {
                const sourceInfo = entityMap.get(sourceEntity.name);
                const targetInfo = entityMap.get(targetEntity.name);
                const sourceLabel = sourceInfo.labels[0];
                const targetLabel = targetInfo.labels[0];
                const relType = rel.type.replace(/ /g, '_').toUpperCase();

                await session.run(
                  `
                  MATCH (a:\`${sourceLabel}\` {id: $sourceId})
                  MATCH (b:\`${targetLabel}\` {id: $targetId})
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
        console.log('   [5] Neo4j ingestion complete for this email.');
        // --- Neo4j Ingestion End ---
      } catch (error: any) {
        if (axios.isCancel(error)) {
          console.error(`   ❌ Request timed out after 60 seconds.`);
        } else {
          console.error(
            `   ❌ Error during financial service or Neo4j processing:`,
            error.response?.data?.detail || error.message,
          );
        }
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

demonstrateSpacyEmailIngestionPipeline().catch(e => {
  console.error('An unexpected error occurred:', e);
}); 