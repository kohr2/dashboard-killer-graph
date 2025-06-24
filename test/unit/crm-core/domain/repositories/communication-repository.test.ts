// CRM Core Communication Repository Tests
// These tests drive the development of the Communication repository pattern

import { Communication } from '@crm-core/domain/entities/communication';

describe('CommunicationRepository', () => {
  let repository: CommunicationRepository;

  beforeEach(() => {
    repository = new InMemoryCommunicationRepository();
  });

  describe('Communication Creation', () => {
    it('should save a new communication', async () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        direction: 'outbound',
        contactId: 'contact-123',
        subject: 'Test Email',
        content: 'This is a test email communication'
      });

      // Act
      const savedCommunication = await repository.save(communication);

      // Assert
      expect(savedCommunication).toBeDefined();
      expect(savedCommunication.getId()).toBe(communication.getId());
      expect(savedCommunication.getType()).toBe('email');
      expect(savedCommunication.getDirection()).toBe('outbound');
      expect(savedCommunication.getSubject()).toBe('Test Email');
    });

    it('should update an existing communication', async () => {
      // Arrange
      const communication = new Communication({
        id: 'existing-comm-id',
        type: 'call',
        direction: 'inbound',
        contactId: 'contact-456',
        subject: 'Original Call',
        content: 'Original content'
      });
      await repository.save(communication);

      // Act
      communication.updateSubject('Updated Call');
      communication.updateContent('Updated content');
      const updatedCommunication = await repository.save(communication);

      // Assert
      expect(updatedCommunication.getSubject()).toBe('Updated Call');
      expect(updatedCommunication.getContent()).toBe('Updated content');
      expect(updatedCommunication.getId()).toBe('existing-comm-id');
    });
  });

  describe('Communication Retrieval', () => {
    it('should find communication by ID', async () => {
      // Arrange
      const communication = new Communication({
        id: 'find-test-id',
        type: 'meeting',
        direction: 'outbound',
        contactId: 'contact-789',
        subject: 'Test Meeting'
      });
      await repository.save(communication);

      // Act
      const foundCommunication = await repository.findById('find-test-id');

      // Assert
      expect(foundCommunication).toBeDefined();
      expect(foundCommunication!.getId()).toBe('find-test-id');
      expect(foundCommunication!.getType()).toBe('meeting');
      expect(foundCommunication!.getSubject()).toBe('Test Meeting');
    });

    it('should return undefined for non-existent communication', async () => {
      // Act
      const foundCommunication = await repository.findById('non-existent-id');

      // Assert
      expect(foundCommunication).toBeUndefined();
    });
  });

  describe('Communication Listing', () => {
    it('should find all communications', async () => {
      // Arrange
      const comm1 = new Communication({
        type: 'email',
        direction: 'inbound',
        contactId: 'contact-1',
        subject: 'First Email'
      });
      const comm2 = new Communication({
        type: 'call',
        direction: 'outbound',
        contactId: 'contact-2',
        subject: 'First Call'
      });
      await repository.save(comm1);
      await repository.save(comm2);

      // Act
      const allCommunications = await repository.findAll();

      // Assert
      expect(allCommunications).toHaveLength(2);
      expect(allCommunications.map(c => c.getSubject())).toContain('First Email');
      expect(allCommunications.map(c => c.getSubject())).toContain('First Call');
    });

    it('should find communications by contact ID', async () => {
      // Arrange
      const comm1 = new Communication({
        type: 'email',
        direction: 'inbound',
        contactId: 'target-contact',
        subject: 'Email 1'
      });
      const comm2 = new Communication({
        type: 'call',
        direction: 'outbound',
        contactId: 'target-contact',
        subject: 'Call 1'
      });
      const comm3 = new Communication({
        type: 'sms',
        direction: 'inbound',
        contactId: 'other-contact',
        subject: 'SMS 1'
      });
      
      await repository.save(comm1);
      await repository.save(comm2);
      await repository.save(comm3);

      // Act
      const contactCommunications = await repository.findByContactId('target-contact');

      // Assert
      expect(contactCommunications).toHaveLength(2);
      expect(contactCommunications.map(c => c.getSubject())).toContain('Email 1');
      expect(contactCommunications.map(c => c.getSubject())).toContain('Call 1');
      expect(contactCommunications.map(c => c.getSubject())).not.toContain('SMS 1');
    });

    it('should find communications by type', async () => {
      // Arrange
      const email1 = new Communication({
        type: 'email',
        direction: 'inbound',
        contactId: 'contact-1',
        subject: 'Email 1'
      });
      const email2 = new Communication({
        type: 'email',
        direction: 'outbound',
        contactId: 'contact-2',
        subject: 'Email 2'
      });
      const call1 = new Communication({
        type: 'call',
        direction: 'inbound',
        contactId: 'contact-3',
        subject: 'Call 1'
      });
      
      await repository.save(email1);
      await repository.save(email2);
      await repository.save(call1);

      // Act
      const emailCommunications = await repository.findByType('email');

      // Assert
      expect(emailCommunications).toHaveLength(2);
      expect(emailCommunications.map(c => c.getSubject())).toContain('Email 1');
      expect(emailCommunications.map(c => c.getSubject())).toContain('Email 2');
      expect(emailCommunications.map(c => c.getSubject())).not.toContain('Call 1');
    });

    it('should find communications by status', async () => {
      // Arrange
      const pending1 = new Communication({
        type: 'email',
        direction: 'outbound',
        contactId: 'contact-1',
        subject: 'Pending Email'
      });
      const completed1 = new Communication({
        type: 'call',
        direction: 'inbound',
        contactId: 'contact-2',
        subject: 'Completed Call'
      });
      await repository.save(pending1);
      await repository.save(completed1);
      
      // Mark one as completed
      completed1.markAsCompleted();
      await repository.save(completed1);

      // Act
      const pendingCommunications = await repository.findByStatus('pending');
      const completedCommunications = await repository.findByStatus('completed');

      // Assert
      expect(pendingCommunications).toHaveLength(1);
      expect(pendingCommunications[0].getSubject()).toBe('Pending Email');
      expect(completedCommunications).toHaveLength(1);
      expect(completedCommunications[0].getSubject()).toBe('Completed Call');
    });

    it('should support pagination', async () => {
      // Arrange
      for (let i = 1; i <= 12; i++) {
        const communication = new Communication({
          type: 'email',
          direction: 'outbound',
          contactId: `contact-${i}`,
          subject: `Communication ${i}`
        });
        await repository.save(communication);
      }

      // Act
      const page1 = await repository.findAll({ page: 1, limit: 4 });
      const page2 = await repository.findAll({ page: 2, limit: 4 });

      // Assert
      expect(page1).toHaveLength(4);
      expect(page2).toHaveLength(4);
      // Ensure different communications on different pages
      const page1Ids = page1.map(c => c.getId());
      const page2Ids = page2.map(c => c.getId());
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe('Communication Search', () => {
    it('should search communications by subject', async () => {
      // Arrange
      const comm1 = new Communication({
        type: 'email',
        direction: 'outbound',
        contactId: 'contact-1',
        subject: 'Important Meeting Discussion'
      });
      const comm2 = new Communication({
        type: 'call',
        direction: 'inbound',
        contactId: 'contact-2',
        subject: 'Follow-up Call'
      });
      const comm3 = new Communication({
        type: 'meeting',
        direction: 'outbound',
        contactId: 'contact-3',
        subject: 'Important Project Review'
      });
      
      await repository.save(comm1);
      await repository.save(comm2);
      await repository.save(comm3);

      // Act
      const results = await repository.search('Important');

      // Assert
      expect(results).toHaveLength(2);
      expect(results.map(c => c.getSubject())).toContain('Important Meeting Discussion');
      expect(results.map(c => c.getSubject())).toContain('Important Project Review');
      expect(results.map(c => c.getSubject())).not.toContain('Follow-up Call');
    });

    it('should search communications by content', async () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        direction: 'outbound',
        contactId: 'contact-1',
        subject: 'Test Email',
        content: 'This contains unique search term xyz123'
      });
      await repository.save(communication);

      // Act
      const results = await repository.search('xyz123');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].getContent()).toContain('xyz123');
    });

    it('should return empty array for no matches', async () => {
      // Act
      const results = await repository.search('nonexistentterm');

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('Communication Deletion', () => {
    it('should delete communication by ID', async () => {
      // Arrange
      const communication = new Communication({
        id: 'delete-test-id',
        type: 'note',
        direction: 'outbound',
        contactId: 'contact-delete',
        subject: 'Delete Test'
      });
      await repository.save(communication);

      // Act
      const deleted = await repository.delete('delete-test-id');

      // Assert
      expect(deleted).toBe(true);
      const foundCommunication = await repository.findById('delete-test-id');
      expect(foundCommunication).toBeUndefined();
    });

    it('should return false for non-existent communication deletion', async () => {
      // Act
      const deleted = await repository.delete('non-existent-id');

      // Assert
      expect(deleted).toBe(false);
    });
  });

  describe('Repository State', () => {
    it('should count total communications', async () => {
      // Arrange
      for (let i = 1; i <= 7; i++) {
        const communication = new Communication({
          type: 'email',
          direction: 'outbound',
          contactId: `contact-${i}`,
          subject: `Count Test ${i}`
        });
        await repository.save(communication);
      }

      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(7);
    });

    it('should check if communication exists', async () => {
      // Arrange
      const communication = new Communication({
        id: 'exists-test-id',
        type: 'call',
        direction: 'inbound',
        contactId: 'contact-exists',
        subject: 'Exists Test'
      });
      await repository.save(communication);

      // Act
      const exists = await repository.exists('exists-test-id');
      const notExists = await repository.exists('does-not-exist');

      // Assert
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });
});

// Import statements (these will fail initially)
import { CommunicationRepository } from '@crm-core/domain/repositories/communication-repository';
import { InMemoryCommunicationRepository } from '@crm-core/infrastructure/repositories/in-memory-communication-repository'; 