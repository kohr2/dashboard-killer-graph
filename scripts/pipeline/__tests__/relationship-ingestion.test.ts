import 'reflect-metadata';

jest.mock('@platform/ontology/ontology.service', () =>
  jest.requireActual('@platform/ontology/ontology.service'),
);

import { demonstrateSpacyEmailIngestionPipeline } from '../email-ingestion';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import axios from 'axios';
import * as fs from 'fs';
import { simpleParser } from 'mailparser';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { registerAllOntologies } from '@src/register-ontologies';

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

describe('EmailIngestionPipeline – relationship creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    container.reset();
    registerAllOntologies();
  });

  it('should create edges for ontology-defined relationships like WORKS_FOR', async () => {
    // 1. Mocks for file system & mail parsing
    mockedFsPromises.readdir.mockResolvedValue(['test.eml'] as any);
    mockedFsPromises.readFile.mockResolvedValue('dummy email');
    mockedSimpleParser.mockResolvedValue({
      text: 'dummy body',
      subject: 'Subject',
      headers: new Map(),
    } as any);

    // 2. Mock HTTP ontology sync
    mockedAxios.post.mockResolvedValue({ data: {} });

    // 3. OntologyService configuration – Email is a property entity, Person and Organization are standard
    jest
      .spyOn(OntologyService.prototype, 'getPropertyEntityTypes')
      .mockReturnValue(['Email']);
    jest
      .spyOn(OntologyService.prototype, 'getAllEntityTypes')
      .mockReturnValue(['Person', 'Organization', 'Email']);
    jest
      .spyOn(OntologyService.prototype, 'getAllRelationshipTypes')
      .mockReturnValue(['WORKS_FOR']);
    jest
      .spyOn(OntologyService.prototype, 'getIndexableEntityTypes')
      .mockReturnValue(['Person']);

    // 4. Mock NLP content processing result containing a WORKS_FOR edge
    jest
      .spyOn(ContentProcessingService.prototype, 'processContentBatch')
      .mockResolvedValue([
        {
          entities: [
            {
              id: 'p1',
              name: 'John Doe',
              type: 'Person',
              label: 'Person',
              embedding: [0.1, 0.2, 0.3],
            },
            {
              id: 'o1',
              name: 'ACME Corp',
              type: 'Organization',
              label: 'Organization',
              embedding: [0.2, 0.1, 0.4],
            },
          ],
          relationships: [
            {
              source: 'p1',
              target: 'o1',
              type: 'WORKS_FOR',
            },
          ],
        } as any,
      ]);

    // 5. Mock Neo4j driver & session
    const runMock = jest.fn().mockImplementation((query: string) => {
      // Provide minimal realistic Record-like objects based on query
      if (query.includes('RETURN e')) {
        // MERGE entity RETURN e
        return Promise.resolve({
          records: [
            {
              get: () => ({
                properties: { id: 'generated-id' },
                labels: ['Person'],
              }),
            },
          ],
          summary: { counters: { updates: () => ({ nodesCreated: 1 }) } },
        });
      }
      if (query.includes('vector.queryNodes')) {
        // Vector search returns empty to force creation
        return Promise.resolve({ records: [] });
      }
      // For relationship MERGE queries and others, just resolve with empty records
      return Promise.resolve({ records: [] });
    });
    const mockSession = { run: runMock, close: jest.fn() } as any;
    const mockDriver = {
      session: jest.fn(() => mockSession),
      close: jest.fn(),
    } as any;
    jest
      .spyOn(Neo4jConnection.prototype, 'getDriver')
      .mockReturnValue(mockDriver);
    jest.spyOn(Neo4jConnection.prototype, 'connect').mockResolvedValue();
    jest.spyOn(Neo4jConnection.prototype, 'close').mockResolvedValue();

    // 6. Execute pipeline
    await demonstrateSpacyEmailIngestionPipeline();

    // 7. Expect a MERGE for WORKS_FOR relationship between nodes
    const hasRelationship = runMock.mock.calls.some(
      ([query]: [string]) => typeof query === 'string' && query.includes('WORKS_FOR'),
    );

    // DEBUG: log queries
    // eslint-disable-next-line no-console
    console.log(runMock.mock.calls.map(c => c[0]));

    expect(hasRelationship).toBe(true);
  });
}); 