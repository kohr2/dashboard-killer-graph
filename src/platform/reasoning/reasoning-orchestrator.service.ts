import { singleton } from 'tsyringe';
import { OntologyDrivenReasoningService } from './ontology-driven-reasoning.service';
import { OntologyService } from '@platform/ontology/ontology.service';

/**
 * Orchestrates execution of ontology-driven reasoning algorithms.
 * Exposed internally via DI; routes are defined in api.ts.
 */
@singleton() // Temporarily commented out for testing
export class ReasoningOrchestratorService {
  constructor(
    private reasoningService: OntologyDrivenReasoningService,
    private ontologyService: OntologyService
  ) {}

  async executeAllReasoning(): Promise<{ success: boolean; message: string }> {
    try {
      await this.reasoningService.executeAllReasoning();
      return { success: true, message: 'All reasoning algorithms executed successfully' };
    } catch (error) {
      return {
        success: false,
        message: `Error executing reasoning: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getReasoningAlgorithms(): Promise<{ algorithms: any[] }> {
    const ontologies = this.ontologyService.getAllOntologies() as any[];
    const algorithms: any[] = [];

    for (const ontology of ontologies) {
      const ontologyAlgorithms = ontology.reasoning?.algorithms || {};
      for (const [name, algo] of Object.entries(ontologyAlgorithms)) {
        algorithms.push({ name, ontology: ontology.name, ...(algo as any) });
      }
    }

    return { algorithms };
  }

  async executeOntologyReasoning(ontologyName: string): Promise<{ success: boolean; message: string }> {
    try {
      const ontologies = this.ontologyService.getAllOntologies() as any[];
      const ontology = ontologies.find(o => o.name === ontologyName);
      if (!ontology) {
        return { success: false, message: `Ontology '${ontologyName}' not found` };
      }
      await this.reasoningService.executeOntologyReasoning(ontology);
      return { success: true, message: `Reasoning executed for ontology '${ontologyName}'` };
    } catch (error) {
      return {
        success: false,
        message: `Error executing reasoning for ontology '${ontologyName}': ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 