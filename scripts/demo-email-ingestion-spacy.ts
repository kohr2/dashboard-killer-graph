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

const LABELS_TO_INDEX = ['Person', 'Organization', 'Location', 'Product', 'WorkOfArt', 'Event', 'Project', 'Deal'];

// A map to define primary and potential fallback labels for an entity type
const LABEL_STRATEGY: { [key: string]: { primary: string; fallbacks: string[] } } = {
    DEFAULT: { primary: 'Thing', fallbacks: [] },
    PERSON: { primary: 'Person', fallbacks: [] },
    ORG: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    GPE: { primary: 'Location', fallbacks: [] },
    LOC: { primary: 'Location', fallbacks: [] },
    PRODUCT: { primary: 'Product', fallbacks: ['Organization'] },
    WORK_OF_ART: { primary: 'WorkOfArt', fallbacks: ['Project', 'Deal', 'Organization'] },
    EVENT: { primary: 'Event', fallbacks: [] },
    PROJECT: { primary: 'Project', fallbacks: ['Deal', 'WorkOfArt', 'Organization'] },
    DEAL: { primary: 'Deal', fallbacks: ['Project', 'WorkOfArt', 'Organization'] },
    // Custom types from LLM / FIBO
    FIBOPerson: { primary: 'Person', fallbacks: [] },
    FIBOFinancialInstitution: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    COMPANY_NAME: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    FINANCIAL_INSTITUTION: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    PERSON_NAME: { primary: 'Person', fallbacks: [] },
    STOCK_SYMBOL: { primary: 'Organization', fallbacks: [] },
    DEAL_NAME: { primary: 'Deal', fallbacks: ['Project', 'WorkOfArt'] },
    // Data types
    DATE: { primary: 'Date', fallbacks: [] },
    MONEY: { primary: 'MonetaryAmount', fallbacks: [] },
    SECTOR: { primary: 'Sector', fallbacks: [] },
    PERCENT: { primary: 'Percent', fallbacks: [] },
    TIME: { primary: 'Time', fallbacks: [] },
};

function getLabelInfo(entity: any): { primary: string; candidates: string[] } {
    const type = entity.getOntologicalType ? entity.getOntologicalType() : entity.type;
    const strategy = LABEL_STRATEGY[type] || { primary: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(), fallbacks: [] };

    const primaryLabel = strategy.primary.replace(/[^a-zA-Z0-9_]/g, '');
    const candidateLabels = [primaryLabel, ...strategy.fallbacks]
        .map(l => l.replace(/[^a-zA-Z0-9_]/g, ''))
        .filter(l => LABELS_TO_INDEX.includes(l)); // Only search indexed labels

    return { primary: primaryLabel, candidates: [...new Set(candidateLabels)] }; // Return unique list
}

async function demonstrateSpacyEmailIngestionPipeline() {
  console.log('📧 Email Ingestion Pipeline Demo - Direct to Neo4j');
  console.log('='.repeat(100));

  const connection = Neo4jConnection.getInstance();
  const financialService = new FinancialEntityIntegrationService();
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
    const filesToProcess = emailFiles;

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
          const { primary: primaryLabel, candidates: candidateLabels } = getLabelInfo(entity);
          let nodeId = entity.id || uuidv4(); // Default new ID
          let foundExistingNode = false;

          // Skip creating nodes for entities that have no embedding and are not supposed to be indexed.
          if (!entity.embedding && !LABELS_TO_INDEX.includes(primaryLabel)) {
            console.log(`      -> Skipping entity '${entity.name}' (type: ${primaryLabel}) because it has no embedding and is not an indexed type.`);
            continue;
          }

          // Only perform vector search for entities with embeddings and candidate labels.
          if (entity.embedding && candidateLabels.length > 0) {
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
            // If no close match, create a new node.
            if (entity.embedding) {
                 const createResult = await session.run(
                   `CREATE (e:\`${primaryLabel}\` {id: $id, name: $name, category: $category, createdAt: datetime($createdAt), embedding: $embedding}) RETURN e`,
                   {
                     id: nodeId,
                     name: entity.name,
                     category: entity.category || 'Generic',
                     createdAt: (entity.createdAt || new Date()).toISOString(),
                     embedding: entity.embedding,
                   }
                 );
                 const newNode = createResult.records[0].get('e');
                 console.log(`      -> No similar entity found for '${entity.name}'. Created new '${primaryLabel}' node with ID: ${nodeId}`);
                 entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });

            } else {
                 // For non-indexed labels, or indexed labels that somehow missed getting an embedding.
                 const createResult = await session.run(
                   `CREATE (e:\`${primaryLabel}\` {id: $id, name: $name, category: $category, createdAt: datetime($createdAt)}) RETURN e`,
                   {
                     id: nodeId,
                     name: entity.name,
                     category: entity.category || 'Generic',
                     createdAt: (entity.createdAt || new Date()).toISOString(),
                   }
                 );
                 const newNode = createResult.records[0].get('e');
                 console.log(`      -> Creating non-indexed or embedding-less '${primaryLabel}' node for '${entity.name}' with ID: ${nodeId}`);
                 entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });
            }
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
            const sourceEntity = fiboEntities.find(e => e.name === rel.source);
            const targetEntity = fiboEntities.find(e => e.name === rel.target);

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