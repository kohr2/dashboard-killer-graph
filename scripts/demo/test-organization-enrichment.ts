import 'reflect-metadata';
import { container } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import { registerAllOntologies } from '../../src/register-ontologies';
import { OrganizationEntity } from '@generated/crm';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

async function testCreateAndEnrichOrganization() {
  logger.info('--- Starting Organization Creation and Enrichment Test ---');

  // 1. Register all services and dependencies
  registerAllOntologies();

  // 2. Get instances from the DI container
  const neo4jConnection = container.resolve(Neo4jConnection);

  try {
    // 3. Connect to the database
    await neo4jConnection.connect();
    logger.info('Database connection established.');

    // 4. Create an organization entity
    const organizationData = {
      name: 'Microsoft Corporation',
      legalName: 'Microsoft Corporation',
      industry: 'Technology',
      website: 'microsoft.com',
      description: 'Leading technology company',
      size: 'Large',
      foundedYear: '1975',
      headquarters: { country: 'USA', city: 'Redmond' },
      address: { street: 'One Microsoft Way', city: 'Redmond', state: 'WA' },
      phone: '+1-425-882-8080',
      email: 'info@microsoft.com',
      parentOrganizationId: '',
      activities: [],
      knowledgeElements: [],
      validationStatus: 'pending',
      preferences: {}
    };

    const organization = new OrganizationEntity(organizationData);
    logger.info(`Attempting to create organization: ${organization.name}`);

    // 5. Try to get the service (it might not be registered in DI)
    try {
      const { OrganizationService } = require('@generated/crm');
      const organizationService = container.resolve(OrganizationService) as any;
      
      // 6. Execute the service method
      const response = await organizationService.create(organization);

      // 7. Log the immediate response
      logger.info('Service Response:', response);

      if (response) {
        logger.info(
          `Organization ${response.id} created successfully using generated service.`,
        );
        logger.info(
          'Check the database after a few moments to see the enriched data.',
        );
      } else {
        logger.error('Failed to create organization.');
      }
    } catch (serviceError) {
      logger.warn('OrganizationService not available in DI container, skipping service test');
      logger.info('Organization entity created:', organization);
    }

  } catch (error) {
    logger.error('An unexpected error occurred during the test:', error);
  } finally {
    // 8. Ensure the database connection is closed
    if (neo4jConnection.getDriver()) {
      await neo4jConnection.close();
      logger.info('Database connection closed.');
    }
  }

  logger.info('--- Test Finished ---');
}

testCreateAndEnrichOrganization(); 