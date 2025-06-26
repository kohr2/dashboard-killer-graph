import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ParsedMail } from 'mailparser';

// Mock dependencies BEFORE they are imported by the script
jest.mock('axios');
jest.mock('fs/promises');
jest.mock('mailparser');
jest.mock('../../../src/platform/database/neo4j-connection');
jest.mock('../../../src/extensions/financial/application/services/financial-entity-integration.service');

import axios from 'axios';
import { promises as fs } from 'fs';
import { simpleParser } from 'mailparser';
import { Neo4jConnection } from '../../../src/platform/database/neo4j-connection';
import { FinancialEntityIntegrationService } from '../../../src/extensions/financial/application/services/financial-entity-integration.service';
import { demonstrateSpacyEmailIngestionPipeline } from '../../../scripts/demo-email-ingestion-spacy';
import { Session } from 'neo4j-driver';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedSimpleParser = simpleParser as jest.Mock<any, any>;
const mockedNeo4jConnection = Neo4jConnection as jest.MockedClass<typeof Neo4jConnection>;
const mockedFinancialEntityIntegrationService = FinancialEntityIntegrationService as jest.MockedClass<typeof FinancialEntityIntegrationService>;

describe('demonstrateSpacyEmailIngestionPipeline', () => {
    let mockSession: jest.Mocked<Session>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        mockedAxios.post.mockResolvedValue({ data: 'success' });
        mockedFs.readdir.mockResolvedValue(['test.eml'] as any);
        mockedFs.readFile.mockResolvedValue('email content');
        mockedSimpleParser.mockResolvedValue({
            text: 'email body text',
            subject: 'Test Subject',
            from: { text: 'sender@example.com' },
            date: new Date(),
            messageId: 'test-message-id'
        });

        // Mock Neo4j
        mockSession = {
            run: jest.fn().mockImplementation((query: any) => {
                if (query.includes('CREATE VECTOR INDEX')) {
                    return Promise.resolve({ records: [], summary: {} });
                }
                if (query.includes('MERGE (e {id: $id})')) {
                    return Promise.resolve({
                        records: [{
                            get: () => ({ properties: { id: 'new-node-id' }, labels: ['Person'] })
                        }],
                        summary: { counters: { updates: () => ({ nodesCreated: 1 }) } }
                    });
                }
                 if (query.includes('CALL db.index.vector.queryNodes')) {
                    return Promise.resolve({
                        records: [], // Simulate no existing node found
                    });
                }
                return Promise.resolve({ records: [], summary: {} });
            }),
            close: jest.fn().mockResolvedValue(undefined as any),
        } as unknown as jest.Mocked<Session>;

        const mockDriver = {
            session: () => mockSession,
            close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        };
        
        mockedNeo4jConnection.prototype.getDriver.mockReturnValue(mockDriver as any);
        mockedNeo4jConnection.prototype.connect.mockResolvedValue(undefined);
        mockedNeo4jConnection.prototype.close.mockResolvedValue(undefined as any);


        // Mock FinancialEntityIntegrationService
        mockedFinancialEntityIntegrationService.prototype.processFinancialContent.mockResolvedValue({
            fiboEntities: [
                { id: 'ent1', name: 'Entity One', type: 'Person', getOntologicalType: () => 'Person', embedding: [0.1, 0.2] },
                { id: 'ent2', name: 'Entity Two', type: 'Organization', getOntologicalType: () => 'Organization', embedding: [0.3, 0.4] }
            ],
            crmIntegration: {
                relationships: [{ source: 'ent1', target: 'ent2', type: 'WORKS_FOR' }]
            }
        });
    });

    it('should run the full pipeline with mocks and verify interactions', async () => {
        // We disable console.log and console.error for cleaner test output
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await demonstrateSpacyEmailIngestionPipeline();
        
        // Assertions
        expect(mockedAxios.post).toHaveBeenCalledWith('http://127.0.0.1:8000/ontologies', expect.any(Object));
        expect(mockedNeo4jConnection.prototype.connect).toHaveBeenCalled();
        expect(mockedFs.readdir).toHaveBeenCalledWith(expect.stringContaining('test-emails'));
        expect(mockedSimpleParser).toHaveBeenCalledWith('email content');
        expect(mockedFinancialEntityIntegrationService.prototype.processFinancialContent).toHaveBeenCalledWith('email body text');
        
        // Check index creation for all labels
        expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining("DROP INDEX person_embeddings IF EXISTS"), undefined);
        expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining("CREATE VECTOR INDEX person_embeddings"), expect.any(Object));

        // Check node creation/merging for entities
        expect(mockSession.run).toHaveBeenCalledWith(expect.stringMatching(/MERGE \(e \{id: \$id\}\)/), expect.any(Object));

        // Check relationship creation
        expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MERGE (a)-[:`WORKS_FOR`]->(b)'), expect.any(Object));
        
        // Check cleanup
        expect(mockSession.close).toHaveBeenCalled();
        expect(mockedNeo4jConnection.prototype.close).toHaveBeenCalled();

        // Restore console
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
}); 