import {
  OCreamV2Ontology,
  DOLCECategory,
  RelationshipType,
  KnowledgeType,
  ActivityType,
  SoftwareType,
  DOLCEEntity,
  OCreamRelationship,
  Person,
  Organization,
  Activity, // Corrected from CRMActivity
  SoftwareSystem,
} from '../../../../../src/ontologies/crm/domain/ontology/o-cream-v2';

describe('O-CREAM-v2 Ontology', () => {
  describe('Basic Entity Creation', () => {
    test('should create person entity', () => {
      const person: Person = {
        id: 'p-1',
        category: DOLCECategory.PhysicalObject,
        name: 'John Doe',
        email: 'john.doe@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(person.name).toBe('John Doe');
      expect(person.category).toBe(DOLCECategory.PhysicalObject);
    });

    test('should create organization entity', () => {
      const org: Organization = {
        id: 'o-1',
        category: DOLCECategory.SocialObject,
        name: 'ACME Corp',
        legalName: 'ACME Corporation',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(org.name).toBe('ACME Corp');
      expect(org.category).toBe(DOLCECategory.SocialObject);
    });

    test('should create software system entity', () => {
      const software: SoftwareSystem = {
        id: 'ss-1',
        category: DOLCECategory.PhysicalObject,
        type: SoftwareType.KNOWLEDGEGRAPH,
        name: 'GraphDB',
        version: '1.0',
        vendor: 'OntoText',
        capabilities: ['RDF', 'SPARQL'],
        status: 'active',
        deployment: 'cloud'
      };
      expect(software.name).toBe('GraphDB');
      expect(software.type).toBe(SoftwareType.KNOWLEDGEGRAPH);
    });
  });

  describe('OCreamV2Ontology Manager', () => {
    let ontology: OCreamV2Ontology;

    beforeEach(() => {
      ontology = new OCreamV2Ontology();
      (OCreamV2Ontology as any).instance = ontology;
    });

    test('should add and get an entity', () => {
      const entity: DOLCEEntity = { id: 'test-1', category: DOLCECategory.Abstract, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity);
      const retrieved = ontology.getEntity('test-1');
      expect(retrieved).toEqual(entity);
    });

    test('should update an entity', () => {
      const entity: DOLCEEntity = { id: 'test-1', category: DOLCECategory.Abstract, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity);
      const updates = { category: DOLCECategory.SocialObject };
      ontology.updateEntity('test-1', updates);
      const updated = ontology.getEntity('test-1');
      expect(updated?.category).toBe(DOLCECategory.SocialObject);
    });

    test('should index entities by type', () => {
      const entity1: DOLCEEntity = { id: 'abs-1', category: DOLCECategory.Abstract, createdAt: new Date(), updatedAt: new Date() };
      const entity2: DOLCEEntity = { id: 'phy-1', category: DOLCECategory.PhysicalObject, createdAt: new Date(), updatedAt: new Date() };
      const entity3: DOLCEEntity = { id: 'abs-2', category: DOLCECategory.Abstract, createdAt: new Date(), updatedAt: new Date() };

      ontology.addEntity(entity1);
      ontology.addEntity(entity2);
      ontology.addEntity(entity3);

      const abstractEntities = ontology.getEntitiesByType(DOLCECategory.Abstract);
      const physicalEntities = ontology.getEntitiesByType(DOLCECategory.PhysicalObject);

      expect(abstractEntities).toHaveLength(2);
      expect(physicalEntities).toHaveLength(1);
    });

    test('should not find entities of wrong type', () => {
      const entity: DOLCEEntity = { id: 'test-1', category: DOLCECategory.Abstract, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity);
      expect(ontology.getEntitiesByType(DOLCECategory.PhysicalObject)).toHaveLength(0);
    });

    test('should manage relationships', () => {
      const entity1: DOLCEEntity = { id: 'e1', category: DOLCECategory.SocialObject, createdAt: new Date(), updatedAt: new Date() };
      const entity2: DOLCEEntity = { id: 'e2', category: DOLCECategory.SocialObject, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity1);
      ontology.addEntity(entity2);

      const rel: OCreamRelationship = {
        id: 'r1',
        relationshipType: RelationshipType.COLLABORATION,
        sourceEntityId: 'e1',
        targetEntityId: 'e2',
        properties: {},
        temporal: {}
      };

      ontology.addRelationship(rel);
      const entity1Rels = ontology.getRelationshipsForEntity('e1');
      expect(entity1Rels).toHaveLength(1);
      expect(entity1Rels[0]).toEqual(rel);
    });

    test('should validate valid entities', () => {
      const abstract: DOLCEEntity = {
        id: 'abs-1',
        category: DOLCECategory.Abstract,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(ontology.validateEntity(abstract)).toBe(true);
    });
  });
});