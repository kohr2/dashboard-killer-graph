import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ExtensionRegistry } from '@platform/extension-framework/extension-registry';
import { EventBus } from '@platform/extension-framework/event-bus';

// Global test setup for Jest
// Simple setup for TDD development 

// Register core services that are needed by the bootstrap process.
// This ensures that when api.ts (and thus bootstrap.ts) is imported by a test,
// the container has the necessary instances, preventing `ontologyService.registerEntityType` errors.
container.registerSingleton(EventBus);
container.registerSingleton(ExtensionRegistry);
container.registerSingleton(OntologyService);

// Vous pouvez ajouter ici d'autres configurations globales pour les tests 