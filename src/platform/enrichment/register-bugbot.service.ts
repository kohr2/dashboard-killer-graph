import { EnrichmentOrchestratorService } from './enrichment-orchestrator.service';
import { BugBotEnrichmentService } from './bugbot-enrichment.service';
import { MockBugBotClient } from './bugbot-client.mock';
import { logger } from '@shared/utils/logger';

/**
 * Register BugBot enrichment service with the orchestrator
 * 
 * This function registers the BugBot service for error analysis and debugging.
 * It uses the mock client by default, but can be configured to use a real
 * BugBot service when available.
 */
export function registerBugBotService(orchestrator: EnrichmentOrchestratorService): void {
  try {
    // Create BugBot client (mock for now, can be replaced with real implementation)
    const bugBotClient = new MockBugBotClient();
    
    // Create BugBot enrichment service
    const bugBotService = new BugBotEnrichmentService(bugBotClient);
    
    // Register with orchestrator
    orchestrator.register(bugBotService);
    
    logger.info('✅ BugBot enrichment service registered successfully');
    
  } catch (error) {
    logger.error('❌ Failed to register BugBot enrichment service:', error);
  }
}

/**
 * Register BugBot service with custom client
 * 
 * Use this function when you have a real BugBot client implementation
 */
export function registerBugBotServiceWithClient(
  orchestrator: EnrichmentOrchestratorService,
  bugBotClient: any
): void {
  try {
    // Create BugBot enrichment service with custom client
    const bugBotService = new BugBotEnrichmentService(bugBotClient);
    
    // Register with orchestrator
    orchestrator.register(bugBotService);
    
    logger.info('✅ BugBot enrichment service registered with custom client');
    
  } catch (error) {
    logger.error('❌ Failed to register BugBot enrichment service with custom client:', error);
  }
} 