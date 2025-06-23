import { CRMOntology } from '@/ontology/crm-ontology';
import { OntologyClass, OntologyProperty } from '@/ontology/types';

describe('CRM Ontology', () => {
  let ontology: CRMOntology;

  beforeEach(() => {
    ontology = new CRMOntology();
  });

  describe('Core Classes', () => {
    it('should define Task class with required properties', () => {
      const taskClass = ontology.getClass('Task');
      
      expect(taskClass).toBeDefined();
      expect(taskClass.name).toBe('Task');
      expect(taskClass.properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'dueDate', type: 'DateTime' }),
          expect.objectContaining({ name: 'assignee', type: 'Person' }),
          expect.objectContaining({ name: 'status', type: 'TaskStatus' }),
          expect.objectContaining({ name: 'priority', type: 'Priority' }),
        ])
      );
    });

    it('should define Email class with relationships', () => {
      const emailClass = ontology.getClass('Email');
      
      expect(emailClass).toBeDefined();
      expect(emailClass.relationships).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            name: 'RELATES_TO_DEAL', 
            targetClass: 'Deal',
            cardinality: 'many-to-one'
          }),
          expect.objectContaining({ 
            name: 'SENT_BY', 
            targetClass: 'Person',
            cardinality: 'many-to-one'
          }),
          expect.objectContaining({ 
            name: 'SENT_TO', 
            targetClass: 'Person',
            cardinality: 'many-to-many'
          }),
        ])
      );
    });

    it('should define Deal class with lifecycle properties', () => {
      const dealClass = ontology.getClass('Deal');
      
      expect(dealClass).toBeDefined();
      expect(dealClass.properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'name', type: 'String', required: true }),
          expect.objectContaining({ name: 'stage', type: 'DealStage' }),
          expect.objectContaining({ name: 'value', type: 'Currency' }),
          expect.objectContaining({ name: 'probability', type: 'Percentage' }),
          expect.objectContaining({ name: 'closeDate', type: 'Date' }),
        ])
      );
    });

    it('should define Person class for contact management', () => {
      const personClass = ontology.getClass('Person');
      
      expect(personClass).toBeDefined();
      expect(personClass.properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'email', type: 'Email', unique: true }),
          expect.objectContaining({ name: 'name', type: 'String' }),
          expect.objectContaining({ name: 'organization', type: 'Organization' }),
          expect.objectContaining({ name: 'role', type: 'String' }),
        ])
      );
    });
  });

  describe('Enumerations', () => {
    it('should define TaskStatus enumeration', () => {
      const taskStatus = ontology.getEnumeration('TaskStatus');
      
      expect(taskStatus).toBeDefined();
      expect(taskStatus.values).toEqual([
        'NotStarted',
        'InProgress',
        'Completed',
        'Blocked',
        'Cancelled'
      ]);
    });

    it('should define Priority enumeration', () => {
      const priority = ontology.getEnumeration('Priority');
      
      expect(priority).toBeDefined();
      expect(priority.values).toEqual([
        'Low',
        'Medium',
        'High',
        'Critical'
      ]);
    });
  });

  describe('Validation Rules', () => {
    it('should validate task due dates are in the future', () => {
      const task = {
        dueDate: new Date('2020-01-01'),
        assignee: 'john@example.com',
        status: 'NotStarted'
      };

      const validation = ontology.validateEntity('Task', task);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Due date must be in the future');
    });

    it('should validate email has required fields', () => {
      const email = {
        subject: '',
        from: '',
        to: []
      };

      const validation = ontology.validateEntity('Email', email);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toEqual(
        expect.arrayContaining([
          'Subject is required',
          'From address is required',
          'At least one recipient is required'
        ])
      );
    });
  });

  describe('RDF Triple Generation', () => {
    it('should generate RDF triples for a task entity', () => {
      const task = {
        id: 'task-123',
        dueDate: new Date('2024-12-31'),
        assignee: 'john@example.com',
        status: 'InProgress',
        priority: 'High'
      };

      const triples = ontology.toRDFTriples('Task', task);
      
      expect(triples).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: 'crm:Task/task-123',
            predicate: 'rdf:type',
            object: 'crm:Task'
          }),
          expect.objectContaining({
            subject: 'crm:Task/task-123',
            predicate: 'crm:hasStatus',
            object: 'crm:InProgress'
          }),
          expect.objectContaining({
            subject: 'crm:Task/task-123',
            predicate: 'crm:hasPriority',
            object: 'crm:High'
          }),
        ])
      );
    });

    it('should generate relationship triples', () => {
      const email = {
        id: 'email-456',
        subject: 'RE: Project Gotham',
        from: 'investor@audax.com',
        relatedDeal: 'deal-789'
      };

      const triples = ontology.toRDFTriples('Email', email);
      
      expect(triples).toContainEqual({
        subject: 'crm:Email/email-456',
        predicate: 'crm:relatesToDeal',
        object: 'crm:Deal/deal-789'
      });
    });
  });

  describe('SPARQL Query Generation', () => {
    it('should generate SPARQL for finding tasks by assignee', () => {
      const query = ontology.generateSPARQL({
        type: 'Task',
        filters: { assignee: 'john@example.com' }
      });

      expect(query).toContain('?task rdf:type crm:Task');
      expect(query).toContain('?task crm:hasAssignee "john@example.com"');
    });

    it('should generate SPARQL for finding emails related to a deal', () => {
      const query = ontology.generateSPARQL({
        type: 'Email',
        filters: { relatedDeal: 'deal-123' }
      });

      expect(query).toContain('?email rdf:type crm:Email');
      expect(query).toContain('?email crm:relatesToDeal crm:Deal/deal-123');
    });
  });
}); 