import 'reflect-metadata';
import { registerAllOntologies } from './register-ontologies';

/**
 * Centralized bootstrap for scripts, tests and the API.  
 * Call this once at application start to ensure all ontologies and DI
 * bindings are registered consistently.
 */
export function bootstrap(): void {
  registerAllOntologies();
} 