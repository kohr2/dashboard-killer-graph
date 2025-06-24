// CRM Core - Main orchestrator for the CRM system
import { ExtensionRegistry } from '../platform/extension-framework/extension-registry';
import { EventBus } from '../platform/extension-framework/event-bus';

export class CRMCore {
  private extensionRegistry: ExtensionRegistry;
  private eventBus: EventBus;

  constructor() {
    this.eventBus = new EventBus();
    this.extensionRegistry = new ExtensionRegistry();
  }

  getExtensionRegistry(): ExtensionRegistry {
    return this.extensionRegistry;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  async initialize(): Promise<void> {
    // Initialize the CRM core system
    // This would typically set up database connections, 
    // load extensions, and prepare the system for use
    
    console.log('CRM Core initialized');
  }

  async shutdown(): Promise<void> {
    // Gracefully shutdown the system
    console.log('CRM Core shutting down');
  }
} 