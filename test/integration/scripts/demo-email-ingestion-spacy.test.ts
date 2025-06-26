import { demonstrateSpacyEmailIngestionPipeline } from '../../../scripts/demo-email-ingestion-spacy';
import { Neo4jConnection } from '../../../src/platform/database/neo4j-connection';
import axios from 'axios';
import { mocked } from 'ts-jest/utils';
import * as fs from 'fs';
import { simpleParser } from 'mailparser';

jest.mock('axios');
jest.mock('mailparser');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
        readFile: jest.fn(),
        readdir: jest.fn(),
    },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSimpleParser = simpleParser as jest.Mock;
const mockedFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

describe('demonstrateSpacyEmailIngestionPipeline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should run the full pipeline with mocks and verify interactions', async () => {
        // Setup mocks
        mockedAxios.post.mockResolvedValue({ data: { graphs: [] } });
        mockedFsPromises.readdir.mockResolvedValue(['test.eml'] as any);
        mockedFsPromises.readFile.mockResolvedValue('email content');
        mockedSimpleParser.mockResolvedValue({
            text: 'email body text',
            subject: 'Test Subject',
            headers: new Map(),
        } as any);

        // Mock Neo4jConnection and its methods
        const mockSession = {
            run: jest.fn().mockResolvedValue({ records: [] }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const mockDriver = {
            session: jest.fn(() => mockSession),
            close: jest.fn().mockResolvedValue(undefined),
        };
        Neo4jConnection.prototype.getDriver = jest.fn(() => mockDriver as any);
        Neo4jConnection.prototype.connect = jest.fn();
        Neo4jConnection.prototype.close = jest.fn();

        // Run the function
        await demonstrateSpacyEmailIngestionPipeline();

        // Verifications
        expect(Neo4jConnection.prototype.connect).toHaveBeenCalled();
        expect(mockedFsPromises.readdir).toHaveBeenCalledWith(expect.any(String));
        expect(mockedFsPromises.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
        expect(mockedSimpleParser).toHaveBeenCalledWith('email content');
        expect(mockedAxios.post).toHaveBeenCalled();
        expect(mockSession.run).toHaveBeenCalled();
        expect(Neo4jConnection.prototype.close).toHaveBeenCalled();
    });
}); 