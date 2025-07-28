import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { bootstrap } from '../../src/bootstrap';
import { logger } from '@shared/utils/logger';

describe('Procurement Entity Name Extraction', () => {
  const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';
  let nlpServiceAvailable = false;

  beforeAll(async () => {
    // Check if NLP service is running
    try {
      await axios.get(`${nlpServiceUrl}/health`);
      logger.info('NLP service is running');
      nlpServiceAvailable = true;
    } catch (error) {
      logger.warn('NLP service is not running. Skipping NLP-dependent tests.');
      nlpServiceAvailable = false;
    }
  }, 60000); // 1 minute timeout for beforeAll

  it('should extract actual entity names, not entity type labels', async () => {
    // Skip test if NLP service is not available
    if (!nlpServiceAvailable) {
      console.log('⏭️ Skipping test: NLP service not available');
      return;
    }

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

    try {
      const response = await axios.post(`${nlpServiceUrl}/batch-extract-graph`, {
        texts: [testText],
        ontology_name: 'default'
      }, {
        timeout: 60000 // Increase timeout to 60 seconds
      });

      const graph = response.data[0];
      const entities = graph.entities || [];

      // Find any entities that could be procurement-related
      const procurementRelatedEntities = entities.filter((e: any) => 
        e.value && (
          e.value.toLowerCase().includes('raw materials') ||
          e.value.toLowerCase().includes('steel') ||
          e.value.toLowerCase().includes('aluminum') ||
          e.value.toLowerCase().includes('copper') ||
          e.value.toLowerCase().includes('abc corp') ||
          e.value.toLowerCase().includes('procurement') ||
          e.value.toLowerCase().includes('contract')
        )
      );
      
      logger.info('Extracted entities:', entities.map((e: any) => ({ type: e.type, value: e.value })));
      logger.info('Procurement-related entities:', procurementRelatedEntities);

      // Check that entities have actual names, not just the type label
      for (const entity of entities) {
        expect(entity.value).not.toBe(entity.type);
        expect(entity.value).not.toBe(entity.type.toLowerCase());
        expect(entity.value).not.toBe(entity.type.toUpperCase());
      }

      // Check that we have at least some entities extracted
      expect(entities.length).toBeGreaterThan(0);
    } catch (error: any) {
      logger.error('Error calling NLP service:', error);
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        logger.error('Connection timeout or reset. This might be due to the NLP service being overloaded.');
      }
      throw error;
    }
  }, 90000); // Increase test timeout to 90 seconds

  it('should not create entities with generic type names as values', async () => {
    // Skip test if NLP service is not available
    if (!nlpServiceAvailable) {
      console.log('⏭️ Skipping test: NLP service not available');
      return;
    }

    const testText = `
      Purchase Order for Transport Services with Vertex Construction
      
      We are requesting transport services for our logistics operations.
      The procurement object includes freight transportation and delivery services.
      
      Amount: $50,000 USD
      Vendor: Vertex Construction
    `;

    try {
      const response = await axios.post(`${nlpServiceUrl}/batch-extract-graph`, {
        texts: [testText],
        ontology_name: 'default'
      }, {
        timeout: 60000 // Increase timeout to 60 seconds
      });

      const graph = response.data[0];
      const entities = graph.entities || [];

      logger.info('Extracted entities:', entities.map((e: any) => ({ type: e.type, value: e.value })));

      // Check that entities have actual names, not just the type label
      for (const entity of entities) {
        expect(entity.value).not.toBe(entity.type);
        expect(entity.value).not.toBe(entity.type.toLowerCase());
        expect(entity.value).not.toBe(entity.type.toUpperCase());
      }

      // Check that we have at least some entities extracted
      expect(entities.length).toBeGreaterThan(0);
    } catch (error: any) {
      logger.error('Error calling NLP service:', error);
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        logger.error('Connection timeout or reset. This might be due to the NLP service being overloaded.');
      }
      throw error;
    }
  }, 90000); // Increase test timeout to 90 seconds
}); 