import 'reflect-metadata';
jest.mock('@platform/ontology/ontology.service', () => jest.requireActual('@platform/ontology/ontology.service'));
import request from 'supertest';
import { createApp } from '../../../../api';
import { User } from '@platform/security/domain/user';
import { ANALYST_ROLE } from '@platform/security/domain/role';
import { OntologyService } from '@platform/ontology/ontology.service';

// Provide minimal schema representation to avoid LLM errors in integration environment
// If not already defined, define a stub implementation
(OntologyService.prototype as any).getSchemaRepresentation = () => 'Entities:\nDeal\n';

const app = createApp();

describe('Chat API', () => {
  describe('POST /api/chat', () => {
    it('should return a 200 OK for a valid query', async () => {
      // This is a high-level test to ensure the endpoint is responsive.
      // It doesn't validate the content of the response, which can be variable.
      const user: User = {
        id: 'test-user',
        username: 'test-user',
        roles: [ANALYST_ROLE],
      };

      const response = await request(app)
        .post('/api/chat')
        .send({ query: 'What is the status of the Helix deal?', user })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(typeof response.body.response).toBe('string');
    });
  });
}); 