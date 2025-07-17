import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { logger } from '../../src/common/utils/logger';

describe('Procurement Entity Name Extraction', () => {
  const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';

  beforeAll(async () => {
    // Ensure NLP service is running
    try {
      await axios.get(`${nlpServiceUrl}/health`);
      logger.info('NLP service is running');
    } catch (error) {
      logger.error('NLP service is not running. Please start it first.');
      throw error;
    }
  });

  it('should extract actual entity names, not entity type labels', async () => {
    const testText = `
      Contract Award Notification for Raw Materials - Reference PROCUREMENT-816467
      
      Dear Vendor,
      
      We are pleased to inform you that the contract for raw materials procurement has been awarded to ABC Corp.
      The procurement object includes steel, aluminum, and copper materials.
      
      Contract Value: $170,000 CAD
      Award Decision: Approved
      
      Best regards,
      Procurement Department
    `;

    const response = await axios.post(`${nlpServiceUrl}/batch-extract-graph`, {
      texts: [testText],
      ontology: 'procurement'
    });

    const graph = response.data[0];
    const entities = graph.entities || [];

    // Find ProcurementObject entities
    const procurementObjects = entities.filter((e: any) => e.type === 'ProcurementObject');
    
    logger.info('Extracted entities:', entities.map((e: any) => ({ type: e.type, value: e.value })));
    logger.info('ProcurementObject entities:', procurementObjects);

    // Check that ProcurementObject entities have actual names, not just the type label
    for (const entity of procurementObjects) {
      expect(entity.value).not.toBe('ProcurementObject');
      expect(entity.value).not.toBe('procurement object');
      expect(entity.value).toMatch(/raw materials|steel|aluminum|copper/i);
    }

    // Check that we have at least one ProcurementObject with a proper name
    expect(procurementObjects.length).toBeGreaterThan(0);
  }, 30000);

  it('should not create entities with generic type names as values', async () => {
    const testText = `
      Purchase Order for Transport Services with Vertex Construction
      
      We are requesting transport services for our logistics operations.
      The procurement object includes freight transportation and delivery services.
      
      Amount: $50,000 USD
      Vendor: Vertex Construction
    `;

    const response = await axios.post(`${nlpServiceUrl}/batch-extract-graph`, {
      texts: [testText],
      ontology: 'procurement'
    });

    const graph = response.data[0];
    const entities = graph.entities || [];

    logger.info('All extracted entities:', entities.map((e: any) => ({ type: e.type, value: e.value })));

    // Check that no entity has a value that's just the type name
    for (const entity of entities) {
      // Entity value should not be the same as the type (case-insensitive)
      expect(entity.value.toLowerCase()).not.toBe(entity.type.toLowerCase());
      
      // Entity value should not be a generic version of the type
      const genericTypeNames = [
        'procurementobject',
        'procurement object',
        'buyer',
        'awarder',
        'tenderer',
        'contract',
        'procedure'
      ];
      
      expect(genericTypeNames).not.toContain(entity.value.toLowerCase());
    }
  }, 30000);
}); 