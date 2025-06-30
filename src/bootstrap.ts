import 'reflect-metadata';
import { registerAllOntologies } from './register-ontologies';
import { container } from 'tsyringe';
import { AccessControlService } from './platform/security/application/services/access-control.service';

/**
 * Centralized bootstrap for scripts, tests and the API.  
 * Call this once at application start to ensure all ontologies and DI
 * bindings are registered consistently.
 */
export function registerDependencies(): void {
  // Register singletons or tokens here
  container.registerSingleton(AccessControlService);
}

export function bootstrap(): void {
  registerDependencies();
  registerAllOntologies();
} 