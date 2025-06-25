import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { Neo4jConnection } from '../src/crm-core/infrastructure/database/neo4j-connection';
import { EdgarEnrichmentService } from '../src/crm-core/application/services/edgar-enrichment.service';

config(); // Load environment variables from .env file

const BATCH_SIZE = 100;

interface ReportNode {
  id: string;
  labels: string[];
  properties: { [key: string]: any };
}

interface ReportRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  properties: { [key: string]: any };
}

interface ExtractionReport {
  nodes: ReportNode[];
  relationships: ReportRelationship[];
}

// Renames 'value' to 'name' and removes 'type' property
function transformNode(node: ReportNode): ReportNode {
  if (node.properties && node.properties.value) {
    node.properties.name = node.properties.value;
    delete node.properties.value;
  }
  if (node.properties && node.properties.type) {
    delete node.properties.type;
  }
  return node;
}

async function main() {
  const connection = Neo4jConnection.getInstance();
  await connection.connect(); // Establish connection to Neo4j

  const userAgent = process.env.SEC_API_USER_AGENT;
  let enrichmentService: EdgarEnrichmentService | null = null;

  if (userAgent) {
    console.log(`SEC EDGAR API User-Agent found. Data enrichment is enabled.`);
    enrichmentService = new EdgarEnrichmentService(userAgent);
  } else {
    console.log('SEC EDGAR API User-Agent not found. Skipping data enrichment.');
  }

  const session = connection.getDriver().session();
  try {
    console.log('Clearing existing graph data...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Graph data cleared.');

    const reportPath = join(__dirname, '..', 'hybrid-extraction-report.json');
    const report: ExtractionReport = JSON.parse(readFileSync(reportPath, 'utf-8'));

    const transformedNodes = report.nodes.map(transformNode);

    // Batch process nodes
    console.log(`Processing ${transformedNodes.length} nodes in batches of ${BATCH_SIZE}...`);
    for (let i = 0; i < transformedNodes.length; i += BATCH_SIZE) {
        const batch = transformedNodes.slice(i, i + BATCH_SIZE);
        console.log(` -> Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      
        const transaction = session.beginTransaction();
        try {
            for (const node of batch) {
                const properties = node.properties || {};
                const labels = (node.labels && node.labels.length > 0) ? node.labels : ['Unknown'];

                if ((labels.includes('COMPANY_NAME') || labels.includes('FINANCIAL_ORG')) && enrichmentService) {
                    try {
                        console.log(`   - Enriching organization: ${properties.name}`);
                        const enrichedData = await enrichmentService.enrichOrganization(properties.name as string);
                        if (enrichedData) {
                            console.log(`     -> Enriched data found for ${enrichedData.name}`);
                            // Merge enriched data into node properties
                            properties.cik = enrichedData.cik;
                            properties.sic = enrichedData.sic;
                            properties.sicDescription = enrichedData.sicDescription;
                            // Replace address if found
                            if (enrichedData.address) {
                                properties.address = `${enrichedData.address.street1}, ${enrichedData.address.city}, ${enrichedData.address.stateOrCountry} ${enrichedData.address.zipCode}`;
                            }
                        } else {
                            console.log(`     -> No enrichment data found for ${properties.name}`);
                        }
                    } catch (enrichmentError) {
                        console.error(`     -> Error enriching organization ${properties.name}:`, enrichmentError);
                    }
                }

                if (!properties.name) {
                    properties.name = `Unnamed Node`;
                }
                
                if (!node.id) {
                    console.warn(`    ⚠️  WARNING: Node is missing an ID. Skipping...`, node);
                    continue;
                }
                properties.id = node.id;

                const query = `
                  MERGE (n:\`${labels.join(':`')}\` { id: $id })
                  ON CREATE SET n = $props, n.created = timestamp()
                  ON MATCH SET n += $props, n.updated = timestamp()
                `;
        
                await transaction.run(query, {
                  id: properties.id,
                  props: properties,
                });
            }
            await transaction.commit();
        } catch(error) {
            console.error('Error in transaction, rolling back', error)
            await transaction.rollback();
        }
    }
    console.log('All nodes have been processed.');

    // Batch process relationships
    console.log(`Processing ${report.relationships.length} relationships...`);
    for (const rel of report.relationships) {
       const tx = session.beginTransaction();
       try {
        const query = `
            MATCH (source {id: $sourceId}), (target {id: $targetId})
            MERGE (source)-[r:\`${rel.type}\`]->(target)
            SET r = $props
        `;
        
        await tx.run(query, {
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            props: rel.properties || {},
        });

        await tx.commit();
       } catch (error) {
           console.error(`Error processing relationship ${rel.sourceId} -> ${rel.targetId}`, error);
           await tx.rollback();
       }
    }
    console.log('All relationships have been processed.');
    console.log(`✅ Graph build complete. ${transformedNodes.length} nodes and ${report.relationships.length} relationships created.`);

  } catch (error) {
    console.error('Error building Neo4j graph:', error);
  } finally {
    await session.close();
    await connection.close();
  }
}

if (require.main === module) {
  main();
}