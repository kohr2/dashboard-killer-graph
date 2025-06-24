// CRM Core Organization Repository Tests
// These tests drive the development of the Organization repository pattern

import { Organization } from '@crm-core/domain/entities/organization';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;

  beforeEach(() => {
    repository = new InMemoryOrganizationRepository();
  });

  describe('Organization Creation', () => {
    it('should save a new organization', async () => {
      // Arrange
      const organization = new Organization({
        name: 'Acme Corp',
        website: 'https://acme.com',
        size: 'Large'
      });

      // Act
      const savedOrganization = await repository.save(organization);

      // Assert
      expect(savedOrganization).toBeDefined();
      expect(savedOrganization.getId()).toBe(organization.getId());
      expect(savedOrganization.getName()).toBe('Acme Corp');
      expect(savedOrganization.getWebsite()).toBe('https://acme.com');
      expect(savedOrganization.getSize()).toBe('Large');
    });

    it('should update an existing organization', async () => {
      // Arrange
      const organization = new Organization({
        id: 'existing-org-id',
        name: 'Original Corp',
        website: 'https://original.com'
      });
      await repository.save(organization);

      // Act
      organization.updateName('Updated Corp');
      organization.updateWebsite('https://updated.com');
      const updatedOrganization = await repository.save(organization);

      // Assert
      expect(updatedOrganization.getName()).toBe('Updated Corp');
      expect(updatedOrganization.getWebsite()).toBe('https://updated.com');
      expect(updatedOrganization.getId()).toBe('existing-org-id');
    });
  });

  describe('Organization Retrieval', () => {
    it('should find organization by ID', async () => {
      // Arrange
      const organization = new Organization({
        id: 'find-test-id',
        name: 'Find Test Corp',
        website: 'https://findtest.com'
      });
      await repository.save(organization);

      // Act
      const foundOrganization = await repository.findById('find-test-id');

      // Assert
      expect(foundOrganization).toBeDefined();
      expect(foundOrganization!.getId()).toBe('find-test-id');
      expect(foundOrganization!.getName()).toBe('Find Test Corp');
    });

    it('should return undefined for non-existent organization', async () => {
      // Act
      const foundOrganization = await repository.findById('non-existent-id');

      // Assert
      expect(foundOrganization).toBeUndefined();
    });

    it('should find organization by name', async () => {
      // Arrange
      const organization = new Organization({
        name: 'Unique Company Name',
        website: 'https://unique.com'
      });
      await repository.save(organization);

      // Act
      const foundOrganization = await repository.findByName('Unique Company Name');

      // Assert
      expect(foundOrganization).toBeDefined();
      expect(foundOrganization!.getName()).toBe('Unique Company Name');
      expect(foundOrganization!.getWebsite()).toBe('https://unique.com');
    });

    it('should return undefined for non-existent name', async () => {
      // Act
      const foundOrganization = await repository.findByName('Non-existent Company');

      // Assert
      expect(foundOrganization).toBeUndefined();
    });

    it('should find organization by website', async () => {
      // Arrange
      const organization = new Organization({
        name: 'Website Test Corp',
        website: 'https://websitetest.com'
      });
      await repository.save(organization);

      // Act
      const foundOrganization = await repository.findByWebsite('https://websitetest.com');

      // Assert
      expect(foundOrganization).toBeDefined();
      expect(foundOrganization!.getWebsite()).toBe('https://websitetest.com');
      expect(foundOrganization!.getName()).toBe('Website Test Corp');
    });
  });

  describe('Organization Listing', () => {
    it('should find all organizations', async () => {
      // Arrange
      const org1 = new Organization({
        name: 'Organization One',
        website: 'https://one.com'
      });
      const org2 = new Organization({
        name: 'Organization Two',
        website: 'https://two.com'
      });
      await repository.save(org1);
      await repository.save(org2);

      // Act
      const allOrganizations = await repository.findAll();

      // Assert
      expect(allOrganizations).toHaveLength(2);
      expect(allOrganizations.map(o => o.getName())).toContain('Organization One');
      expect(allOrganizations.map(o => o.getName())).toContain('Organization Two');
    });

    it('should find organizations by size', async () => {
      // Arrange
      const smallOrg = new Organization({
        name: 'Small Corp',
        website: 'https://small.com',
        size: 'Small'
      });
      const largeOrg1 = new Organization({
        name: 'Large Corp 1',
        website: 'https://large1.com',
        size: 'Large'
      });
      const largeOrg2 = new Organization({
        name: 'Large Corp 2',
        website: 'https://large2.com',
        size: 'Large'
      });
      
      await repository.save(smallOrg);
      await repository.save(largeOrg1);
      await repository.save(largeOrg2);

      // Act
      const largeOrganizations = await repository.findBySize('Large');

      // Assert
      expect(largeOrganizations).toHaveLength(2);
      expect(largeOrganizations.map(o => o.getName())).toContain('Large Corp 1');
      expect(largeOrganizations.map(o => o.getName())).toContain('Large Corp 2');
      expect(largeOrganizations.map(o => o.getName())).not.toContain('Small Corp');
    });

    it('should support pagination', async () => {
      // Arrange
      for (let i = 1; i <= 8; i++) {
        const organization = new Organization({
          name: `Organization ${i}`,
          website: `https://org${i}.com`
        });
        await repository.save(organization);
      }

      // Act
      const page1 = await repository.findAll({ page: 1, limit: 3 });
      const page2 = await repository.findAll({ page: 2, limit: 3 });

      // Assert
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      // Ensure different organizations on different pages
      const page1Ids = page1.map(o => o.getId());
      const page2Ids = page2.map(o => o.getId());
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe('Organization Search', () => {
    it('should search organizations by name', async () => {
      // Arrange
      const org1 = new Organization({
        name: 'Tech Solutions Inc',
        website: 'https://techsolutions.com'
      });
      const org2 = new Organization({
        name: 'Marketing Corp',
        website: 'https://marketing.com'
      });
      const org3 = new Organization({
        name: 'Tech Innovations LLC',
        website: 'https://techinnovations.com'
      });
      
      await repository.save(org1);
      await repository.save(org2);
      await repository.save(org3);

      // Act
      const results = await repository.search('Tech');

      // Assert
      expect(results).toHaveLength(2);
      expect(results.map(o => o.getName())).toContain('Tech Solutions Inc');
      expect(results.map(o => o.getName())).toContain('Tech Innovations LLC');
      expect(results.map(o => o.getName())).not.toContain('Marketing Corp');
    });

    it('should search organizations by website', async () => {
      // Arrange
      const organization = new Organization({
        name: 'Web Search Test',
        website: 'https://uniquesearch.example.com'
      });
      await repository.save(organization);

      // Act
      const results = await repository.search('uniquesearch');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].getWebsite()).toBe('https://uniquesearch.example.com');
    });

    it('should return empty array for no matches', async () => {
      // Act
      const results = await repository.search('nonexistentterm');

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('Organization Deletion', () => {
    it('should delete organization by ID', async () => {
      // Arrange
      const organization = new Organization({
        id: 'delete-test-id',
        name: 'Delete Test Corp',
        website: 'https://deletetest.com'
      });
      await repository.save(organization);

      // Act
      const deleted = await repository.delete('delete-test-id');

      // Assert
      expect(deleted).toBe(true);
      const foundOrganization = await repository.findById('delete-test-id');
      expect(foundOrganization).toBeUndefined();
    });

    it('should return false for non-existent organization deletion', async () => {
      // Act
      const deleted = await repository.delete('non-existent-id');

      // Assert
      expect(deleted).toBe(false);
    });
  });

  describe('Repository State', () => {
    it('should count total organizations', async () => {
      // Arrange
      for (let i = 1; i <= 6; i++) {
        const organization = new Organization({
          name: `Count Test Corp ${i}`,
          website: `https://count${i}.com`
        });
        await repository.save(organization);
      }

      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(6);
    });

    it('should check if organization exists', async () => {
      // Arrange
      const organization = new Organization({
        id: 'exists-test-id',
        name: 'Exists Test Corp',
        website: 'https://exists.com'
      });
      await repository.save(organization);

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
import { OrganizationRepository } from '@crm-core/domain/repositories/organization-repository';
import { InMemoryOrganizationRepository } from '@crm-core/infrastructure/repositories/in-memory-organization-repository'; 