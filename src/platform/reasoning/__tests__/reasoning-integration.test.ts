import 'reflect-metadata';
import { OntologyDrivenReasoningService } from '../ontology-driven-reasoning.service';
import { ReasoningOrchestratorService } from '../reasoning-orchestrator.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

jest.mock('@platform/database/neo4j-connection');

const mockFinancialOntology = {
  name: 'financial',
  entities: {
    Deal: { description: 'A financial transaction' }
  },
  relationships: {},
  reasoning: {
    algorithms: {
      similarity_scoring: {
        name: 'similarity_scoring',
        description: 'Calculate similarity between deals',
        entityType: 'Deal',
        factors: ['sector', 'dealType'],
        weights: [0.7, 0.3],
        threshold: 0.5,
        relationshipType: 'DEAL_SIMILARITY'
      }
    }
  }
};

const mockProcurementOntology = {
  name: 'ProcurementOntology',
  entities: {
    Lot: { description: 'A subdivision of a tender' }
  },
  relationships: {},
  reasoning: {
    algorithms: {
      lot_similarity: {
        name: 'lot_similarity',
        description: 'Calculate similarity between lots',
        entityType: 'Lot',
        factors: ['category', 'value'],
        weights: [0.6, 0.4],
        threshold: 0.6,
        relationshipType: 'LOT_SIMILARITY'
      }
    }
  }
};

describe('Reasoning Integration', () => {
  let reasoningService: OntologyDrivenReasoningService;
  let reasoningOrchestrator: ReasoningOrchestratorService;
  let ontologyService: OntologyService;
  let connection: Neo4jConnection;
  let sessionRun: jest.Mock;

  beforeEach(() => {
    ontologyService = new OntologyService();
    ontologyService.getAllOntologies = jest.fn(() => [mockFinancialOntology, mockProcurementOntology]);
    connection = new Neo4jConnection();
    sessionRun = jest.fn().mockResolvedValue({});
    (connection.getDriver as jest.Mock).mockReturnValue({ session: () => ({ run: sessionRun, close: jest.fn() }) });
    
    reasoningService = new OntologyDrivenReasoningService(ontologyService, connection);
    reasoningOrchestrator = new ReasoningOrchestratorService(reasoningService, ontologyService);
  });

  it('should execute reasoning for all ontologies', async () => {
    await reasoningService.executeAllReasoning();
    
    expect(sessionRun).toHaveBeenCalledTimes(2);
    
    const queries = sessionRun.mock.calls.map(call => call[0]);
    expect(queries[0]).toContain('MATCH (e1:Deal), (e2:Deal)');
    expect(queries[1]).toContain('MATCH (e1:Lot), (e2:Lot)');
  });

  it('should return all reasoning algorithms via controller', async () => {
    const result = await reasoningOrchestrator.getReasoningAlgorithms();
    
    expect(result.algorithms).toHaveLength(2);
    expect(result.algorithms[0].name).toBe('similarity_scoring');
    expect(result.algorithms[0].ontology).toBe('financial');
    expect(result.algorithms[1].name).toBe('lot_similarity');
    expect(result.algorithms[1].ontology).toBe('ProcurementOntology');
  });

  it('should execute reasoning for specific ontology', async () => {
    const result = await reasoningOrchestrator.executeOntologyReasoning('financial');
    
    expect(result.success).toBe(true);
    expect(sessionRun).toHaveBeenCalledTimes(1);
    expect(sessionRun.mock.calls[0][0]).toContain('MATCH (e1:Deal), (e2:Deal)');
  });
}); 