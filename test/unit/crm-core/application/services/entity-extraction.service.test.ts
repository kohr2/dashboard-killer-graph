import { EntityExtractionService, EntityType } from '../../../../../src/crm-core/application/services/entity-extraction.service';

describe('EntityExtractionService', () => {
  let service: EntityExtractionService;

  beforeEach(() => {
    service = new EntityExtractionService();
  });

  describe('extractEntities', () => {
    it('should extract a valid email address', () => {
      const text = 'Contact me at test@example.com for more details.';
      const result = service.extractEntities(text, { entityTypes: [EntityType.EMAIL_ADDRESS] });
      
      expect(result.entities).toHaveLength(1);
      const entity = result.entities[0];
      expect(entity.type).toBe(EntityType.EMAIL_ADDRESS);
      expect(entity.value).toBe('test@example.com');
      expect(entity.confidence).toBeGreaterThan(0.8);
    });

    it('should extract a U.S. phone number in parentheses format', () => {
      const text = 'My number is (123) 456-7890.';
      const result = service.extractEntities(text, { entityTypes: [EntityType.PHONE_NUMBER] });
      
      expect(result.entities).toHaveLength(1);
      const entity = result.entities[0];
      expect(entity.type).toBe(EntityType.PHONE_NUMBER);
      expect(entity.value).toBe('(123) 456-7890');
    });

    it('should extract multiple different entities from a complex text', () => {
      const text = 'Call me at 555-123-4567 or email me at another.email@domain.org about Project Phoenix.';
      const result = service.extractEntities(text);

      const emails = result.entities.filter(e => e.type === EntityType.EMAIL_ADDRESS);
      const phones = result.entities.filter(e => e.type === EntityType.PHONE_NUMBER);
      const projects = result.entities.filter(e => e.type === EntityType.PROJECT_NAME);

      expect(emails).toHaveLength(1);
      expect(emails[0].value).toBe('another.email@domain.org');

      expect(phones).toHaveLength(1);
      expect(phones[0].value).toBe('555-123-4567');
      
      // Note: The default regex for PROJECT_NAME is likely simple. This might fail and require refinement.
      // For now, we'll assume it finds 'Project Phoenix'.
      expect(projects.length).toBeGreaterThanOrEqual(1);
      if(projects.length > 0) {
        expect(projects[0].value).toContain('Project Phoenix');
      }
    });

    it('should return no specific entities for a text without them', () => {
      const text = 'Just a regular sentence without any contact info.';
      const result = service.extractEntities(text, {
        entityTypes: [EntityType.EMAIL_ADDRESS, EntityType.PHONE_NUMBER, EntityType.URL]
      });
      
      expect(result.entities).toHaveLength(0);
    });
  });
});

