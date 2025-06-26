import { Neo4jConnection } from '../../src/platform/database/neo4j-connection';
import { Session, Path } from 'neo4j-driver';
import { FinancialEntityIntegrationService } from '../../src/extensions/financial/application/services/financial-entity-integration.service';
import { EdgarEnrichmentService } from '../../src/extensions/crm/application/services/edgar-enrichment.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Mock axios pour les appels externes à EDGAR
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const LABELS_TO_INDEX = ['Person', 'Organization', 'Location', 'Product', 'WorkOfArt', 'Event', 'Project', 'Deal'];

// Helper pour simuler la logique de labellisation du script de démo
const LABEL_STRATEGY: { [key: string]: { primary: string; fallbacks: string[] } } = {
    DEFAULT: { primary: 'Thing', fallbacks: [] },
    PERSON: { primary: 'Person', fallbacks: [] },
    ORG: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    COMPANY_NAME: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    FINANCIAL_INSTITUTION: { primary: 'Organization', fallbacks: ['Deal', 'Project', 'WorkOfArt'] },
    GPE: { primary: 'Location', fallbacks: [] },
    LOC: { primary: 'Location', fallbacks: [] },
    PRODUCT: { primary: 'Product', fallbacks: ['Organization'] },
    WORK_OF_ART: { primary: 'WorkOfArt', fallbacks: ['Project', 'Deal', 'Organization'] },
    PROJECT: { primary: 'Project', fallbacks: ['Deal', 'WorkOfArt', 'Organization'] },
    DEAL: { primary: 'Deal', fallbacks: ['Project', 'WorkOfArt', 'Organization'] },
    PERSON_NAME: { primary: 'Person', fallbacks: [] },
};

function getLabelInfo(entity: any): { primary: string; candidates: string[] } {
    const type = entity.type;
    const strategy = LABEL_STRATEGY[type] || { primary: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(), fallbacks: [] };
    const primaryLabel = strategy.primary.replace(/[^a-zA-Z0-9_]/g, '');
    const candidateLabels = [primaryLabel, ...strategy.fallbacks]
        .map(l => l.replace(/[^a-zA-Z0-9_]/g, ''))
        .filter(l => LABELS_TO_INDEX.includes(l));
    return { primary: primaryLabel, candidates: [...new Set(candidateLabels)] };
}


describe('Email Ingestion Pipeline - Integration Test', () => {
    let connection: Neo4jConnection;
    let session: Session;

    beforeAll(async () => {
        connection = Neo4jConnection.getInstance();
        // Assurez-vous que les variables d'environnement pointent vers une DB de test
        await connection.connect();
        session = connection.getDriver().session();

        // Créer les index vectoriels nécessaires pour le test
        for (const label of LABELS_TO_INDEX) {
            const indexName = `${label.toLowerCase()}_embeddings_test`;
            // Use a try-catch for dropping to be safe, though IF EXISTS should handle it.
            try {
                await session.run(`DROP INDEX ${indexName} IF EXISTS`);
            } catch (e) {
                // Ignore errors if index doesn't exist
            }
            await session.run(`CREATE VECTOR INDEX ${indexName} IF NOT EXISTS FOR (n:${label}) ON (n.embedding) OPTIONS {indexConfig: { \`vector.dimensions\`: 384, \`vector.similarity_function\`: 'cosine' }}`);
        }
    });

    afterAll(async () => {
        // Nettoyer les index
         for (const label of LABELS_TO_INDEX) {
            const indexName = `${label.toLowerCase()}_embeddings_test`;
            // Use a try-catch for dropping to be safe, though IF EXISTS should handle it.
            try {
                await session.run(`DROP INDEX ${indexName} IF EXISTS`);
            } catch (e) {
                // Ignore errors if index doesn't exist
            }
        }
        await session.close();
        await connection.close();
    });

    beforeEach(async () => {
        // Nettoyer la base de données avant chaque test
        await session.run('MATCH (n) DETACH DELETE n');
        // Réinitialiser les mocks
        mockedAxios.get.mockClear();
        mockedAxios.post.mockClear();
    });

    it('should ingest a first email, extract entities, enrich them, and create relationships', async () => {
        const emailPath = join(process.cwd(), 'test-emails', '01-helix-sourcing.eml');
        const fileContent = await fs.readFile(emailPath, 'utf-8');
        const parsedEmail = await simpleParser(fileContent);
        const emailBody = parsedEmail.text || '';

        const financialService = new FinancialEntityIntegrationService();
        const edgarService = new EdgarEnrichmentService('Test User-Agent for financial-kill-the-crm');

        mockedAxios.post.mockImplementation(async (url) => {
            if (url.endsWith('/extract-graph')) {
                return {
                    data: {
                        entities: [
                            { value: 'Vista Equity Partners', type: 'ORG' },
                            { value: 'HelixFlow Solutions', type: 'ORG' },
                            { value: 'David Chen', type: 'PERSON' },
                            { value: 'Morgan Stanley Technology Group', type: 'ORG' },
                            { value: 'Project Helix', type: 'WORK_OF_ART' },
                        ],
                        relationships: [
                            { source: 'David Chen', type: 'WORKS_FOR', target: 'Morgan Stanley Technology Group' },
                            { source: 'Vista Equity Partners', type: 'INTERESTED_IN', target: 'HelixFlow Solutions' },
                        ]
                    }
                };
            }
            if (url.endsWith('/embed')) {
                return {
                    data: {
                        embeddings: [
                            Array(384).fill(0.1),
                            Array(384).fill(0.2),
                            Array(384).fill(0.3),
                            Array(384).fill(0.4),
                            Array(384).fill(0.5),
                        ]
                    }
                };
            }
            return Promise.reject(new Error(`No mock for POST ${url} - this test should only call /extract-graph and /embed`));
        });

        mockedAxios.get.mockImplementation(async (url) => {
            if (url.includes('https://www.sec.gov/files/company_tickers.json')) {
                return Promise.resolve({ data: [{cik_str: 1234567, ticker: 'HFS', title: 'HelixFlow Solutions' }] });
            }
            if (url.startsWith('https://data.sec.gov/submissions/')) {
                 return Promise.resolve({
                    data: {
                        cik: '0001234567',
                        entityType: 'operating',
                        name: 'HelixFlow Solutions',
                        sicDescription: 'SERVICES-PREPACKAGED SOFTWARE',
                        exchanges: ['NASDAQ'],
                        tickers: ['HFS'],
                    },
                });
            }
            return Promise.reject(new Error('Not mocked'));
        });

        const ingestionResult = await financialService.processFinancialContent(emailBody);
        const { fiboEntities, crmIntegration } = ingestionResult;

        const entityMap = new Map<string, any>();

        for (const entity of fiboEntities) {
            const { primary: primaryLabel, candidates: candidateLabels } = getLabelInfo(entity);
            let nodeId = entity.id || uuidv4();
            const createResult = await session.run(
                `CREATE (e:\`${primaryLabel}\` {id: $id, name: $name, embedding: $embedding}) RETURN e`,
                { id: nodeId, name: entity.name, embedding: entity.embedding || [] }
            );
            const newNode = createResult.records[0].get('e');
            entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });

            if (primaryLabel === 'Organization') {
                await edgarService.enrichOrganization(nodeId);
            }
            entity.resolvedId = nodeId;
        }

        const communicationId = parsedEmail.messageId || uuidv4();
        await session.run(
            `MERGE (c:Communication {id: $id}) ON CREATE SET c.subject = $subject, c.sourceFile = '01-helix-sourcing.eml'`,
            { id: communicationId, subject: parsedEmail.subject }
        );

        for (const entity of fiboEntities) {
            if (entity.resolvedId) {
                const label = entityMap.get(entity.name).labels[0];
                await session.run(
                    `MATCH (c:Communication {id: $communicationId}), (e:\`${label}\` {id: $entityId}) MERGE (c)-[:CONTAINS_ENTITY]->(e)`,
                    { communicationId, entityId: entity.resolvedId }
                );
            }
        }
        
        for (const rel of crmIntegration.relationships) {
            const sourceEntity = fiboEntities.find(e => e.name === rel.source);
            const targetEntity = fiboEntities.find(e => e.name === rel.target);
            if (sourceEntity?.resolvedId && targetEntity?.resolvedId) {
                const sourceLabel = entityMap.get(sourceEntity.name).labels[0];
                const targetLabel = entityMap.get(targetEntity.name).labels[0];
                const relType = rel.type.replace(/ /g, '_').toUpperCase();
                await session.run(
                    `MATCH (a:\`${sourceLabel}\` {id: $sourceId}), (b:\`${targetLabel}\` {id: $targetId}) MERGE (a)-[:\`${relType}\`]->(b)`,
                    { sourceId: sourceEntity.resolvedId, targetId: targetEntity.resolvedId }
                );
            }
        }

        // THEN: Vérifier que les données sont correctes dans Neo4j
        // 1. L'email a été intégré
        const commResult = await session.run(`MATCH (c:Communication {sourceFile: '01-helix-sourcing.eml'}) RETURN c`);
        expect(commResult.records.length).toBe(1);

        // 2. Les entités clés ont été créées
        const orgResult = await session.run(`MATCH (o:Organization {name: 'HelixFlow Solutions'}) RETURN o`);
        expect(orgResult.records.length).toBe(1);
        const personResult = await session.run(`MATCH (p:Person {name: 'David Chen'}) RETURN p`);
        expect(personResult.records.length).toBe(1);
        
        // 3. L'organisation a été enrichie par EDGAR
        const enrichedOrg = orgResult.records[0].get('o').properties;
        expect(enrichedOrg.cik).toBe('0001234567');
        expect(enrichedOrg.sicDescription).toBe('SERVICES-PREPACKAGED SOFTWARE');

        // 4. Les relations du LLM ont été créées
        const relationResult = await session.run(`
            MATCH path = (:Person {name: 'David Chen'})-[:WORKS_FOR]->(:Organization {name: 'Morgan Stanley Technology Group'})
            RETURN path
        `);
        expect(relationResult.records.length).toBeGreaterThan(0);
    }, 30000);

    it('should reuse existing entities via vector search when ingesting a second, similar email', async () => {
        // GIVEN: A database with existing entities from the first test
        // Manually create an initial entity to ensure the index is populated.
        await session.run(`CREATE (o:Organization {id: 'helixflow_solutions_manual', name: 'HelixFlow Solutions', embedding: $embedding})`, { embedding: Array(384).fill(0.2) });

        // Setup services and mocks
        const financialService = new FinancialEntityIntegrationService();
        mockedAxios.post.mockImplementation(async (url) => {
             if (url.endsWith('/extract-graph')) {
                return { data: { entities: [{ value: 'HelixFlow Solutions', type: 'ORG' }], relationships: [] } };
            }
            if (url.endsWith('/embed')) {
                return { data: { embeddings: [Array(384).fill(0.2)] } };
            }
            return Promise.reject(new Error(`No mock for POST ${url}`));
        });

        // WHEN: Ingesting a second email mentioning an existing entity
        const emailPath2 = join(process.cwd(), 'test-emails', '02-helix-follow-up.eml');
        const fileContent2 = await fs.readFile(emailPath2, 'utf-8');
        const parsedEmail2 = await simpleParser(fileContent2);
        const emailBody2 = parsedEmail2.text || '';
        const ingestionResult2 = await financialService.processFinancialContent(emailBody2);
        
        let foundNode = false;
        for (const entity of ingestionResult2.fiboEntities) {
             if (entity.name === 'HelixFlow Solutions') {
                const { candidates } = getLabelInfo(entity);
                if (entity.embedding && candidates.length > 0) {
                    for (const label of candidates) {
                        const indexName = `${label.toLowerCase()}_embeddings_test`;
                        const searchResult = await session.run(
                            `CALL db.index.vector.queryNodes($indexName, 1, $embedding) YIELD node, score WITH node, score WHERE score > 0.92 RETURN node, score`,
                            { indexName, embedding: entity.embedding }
                        );
                        if (searchResult.records.length > 0) {
                           foundNode = true;
                           break;
                        }
                    }
                }
             }
        }
        
        // THEN: The existing node should be found and no new node created
        expect(foundNode).toBe(true);
        const orgCountResult = await session.run(`MATCH (o:Organization {name: 'HelixFlow Solutions'}) RETURN count(o) as count`);
        expect(orgCountResult.records[0].get('count').low).toBe(1);
    }, 30000);
});
