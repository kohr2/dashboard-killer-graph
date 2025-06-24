// O-CREAM-v2 Contact Entity Tests
import { 
  DOLCECategory,
  KnowledgeType,
  oCreamV2
} from '../../../../../src/crm-core/domain/ontology/o-cream-v2';
import { 
  OCreamContactEntity, 
  createOCreamContact 
} from '../../../../../src/crm-core/domain/entities/contact-ontology';

describe('O-CREAM-v2 Contact Entity', () => {
  beforeEach(() => {
    // Clear the global ontology before each test
    (oCreamV2 as any).entities.clear();
    (oCreamV2 as any).typeIndex.clear();
    Object.values(DOLCECategory).forEach(category => {
      (oCreamV2 as any).typeIndex.set(category, new Set());
    });
  });

  test('should create contact with DOLCE category', () => {
    const contact = createOCreamContact({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    });

    expect(contact.category).toBe(DOLCECategory.AGENTIVE_PHYSICAL_OBJECT);
    expect(contact.personalInfo.firstName).toBe('John');
    expect(contact.personalInfo.lastName).toBe('Doe');
    expect(contact.personalInfo.email).toBe('john.doe@example.com');
  });

  test('should register with global ontology', () => {
    const contact = createOCreamContact({
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com'
    });

    const retrieved = oCreamV2.getEntity(contact.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(contact.id);
  });

  test('should create knowledge elements', () => {
    const contact = createOCreamContact({
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice@example.com',
      preferences: { newsletter: true }
    });

    expect(contact.knowledgeElements.length).toBeGreaterThan(0);
    const knowledgeElements = contact.getKnowledgeElements();
    expect(knowledgeElements.length).toBeGreaterThan(0);
  });

  test('should validate against ontology', () => {
    const contact = createOCreamContact({
      firstName: 'Valid',
      lastName: 'Contact',
      email: 'valid@example.com'
    });

    expect(contact.validateOntology()).toBe(true);
    expect(contact.ontologyMetadata.validationStatus).toBe('valid');
  });

  test('should manage relationships', () => {
    const contact = createOCreamContact({
      firstName: 'Rel',
      lastName: 'Test',
      email: 'rel@example.com'
    });

    contact.addRelationship('rel-1');
    expect(contact.relationships).toContain('rel-1');
    
    contact.removeRelationship('rel-1');
    expect(contact.relationships).not.toContain('rel-1');
  });

  test('should manage preferences', () => {
    const contact = createOCreamContact({
      firstName: 'Pref',
      lastName: 'Test',
      email: 'pref@example.com'
    });

    contact.setPreference('theme', 'dark');
    expect(contact.getPreference('theme')).toBe('dark');
  });

  test('should export ontology data', () => {
    const contact = createOCreamContact({
      firstName: 'Export',
      lastName: 'Test',
      email: 'export@example.com'
    });

    const data = contact.exportOntologyData();
    expect(data.entity.id).toBe(contact.id);
    expect(data.validation.isValid).toBe(true);
  });
});
