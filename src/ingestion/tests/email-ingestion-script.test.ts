import 'reflect-metadata';
jest.mock('@platform/ontology/ontology.service', () => jest.requireActual('@platform/ontology/ontology.service'));
import { demonstrateSpacyEmailIngestionPipeline } from '../../../scripts/pipeline/email-ingestion';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import axios from 'axios';
import * as fs from 'fs';
import { simpleParser } from 'mailparser';
import { translateQueryBasic } from '@mcp/servers/query-translator-basic';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { SalesforceEnrichmentService } from '@platform/enrichment/salesforce-enrichment.service';
import * as fsExtra from 'fs-extra';
import { bootstrap } from '@src/bootstrap';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';

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

describe('EmailIngestionPipeline (script)', () => {
  let connection: Neo4jConnection;

  beforeAll(async () => {
    bootstrap();
    connection = container.resolve(Neo4jConnection);
    await connection.connect();
    // Clean up the database before tests
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    container.reset();
    bootstrap();
  });

  it('should run the full pipeline with mocks and verify interactions', async () => {
    mockedAxios.post.mockResolvedValue({ data: { graphs: [] } });
    mockedFsPromises.readdir.mockResolvedValue(['test.eml'] as any);
    mockedFsPromises.readFile.mockResolvedValue('email content');
    mockedSimpleParser.mockResolvedValue({
      text: 'email body text',
      subject: 'Test Subject',
      headers: new Map(),
    } as any);

    // Ensure OntologyService returns at least one indexable label
    jest.spyOn(OntologyService.prototype, 'getIndexableEntityTypes').mockReturnValue(['Email']);

    // Mock ContentProcessingService to return a minimal result that triggers cypher ingestion
    jest.spyOn(ContentProcessingService.prototype, 'processContentBatch').mockResolvedValue([
      {
        entities: [
          {
            id: 'e1',
            name: 'Test Entity',
            type: 'Email',
            label: 'Email',
          },
        ],
        relationships: [],
      } as any,
    ]);

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

    await demonstrateSpacyEmailIngestionPipeline();

    expect(Neo4jConnection.prototype.connect).toHaveBeenCalled();
    expect(mockedFsPromises.readdir).toHaveBeenCalledWith(expect.any(String));
    expect(mockedFsPromises.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    expect(mockedSimpleParser).toHaveBeenCalledWith('email content');
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockSession.run).toHaveBeenCalled();
    expect(Neo4jConnection.prototype.close).toHaveBeenCalled();
  });
}); 