import 'reflect-metadata';
import { container } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import { registerAllPlatformServices } from '../../src/register-ontologies';
import { OrganizationService } from '@generated/crm';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

async function testCreateAndEnrichOrganization() {
  logger.info('--- Starting Organization Creation and Enrichment Test (Generated) ---');

  // 1. Register all services and dependencies
  registerAllPlatformServices();

  // 2. Get instances from the DI container
  const neo4jConnection = container.resolve(Neo4jConnection);
  const organizationService = container.resolve(OrganizationService);

  try {
    // 3. Connect to the database
    await neo4jConnection.connect();
    logger.info('Database connection established.');

    // 4. Define the organization to create
    const organizationRequest = {
      name: 'Microsoft',
      website: 'microsoft.com',
      industry: 'Technology',
    };
    logger.info(`Attempting to create organization: ${organizationRequest.name}`);

    // 5. Execute the service method
    const response = await organizationService.create(organizationRequest);

    // 6. Log the immediate response
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
  } catch (error) {
    logger.error('An unexpected error occurred during the test:', error);
  } finally {
    // 7. Ensure the database connection is closed
    if (neo4jConnection.getDriver()) {
      await neo4jConnection.close();
      logger.info('Database connection closed.');
    }
  }

  logger.info('--- Test Finished ---');
}

testCreateAndEnrichOrganization();
