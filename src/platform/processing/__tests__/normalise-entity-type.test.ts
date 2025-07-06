import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';

describe('ContentProcessingService.normaliseEntityType', () => {
  it('should return undefined (and not "Thing") when the label cannot be mapped', () => {
    // Ensure ontology service is initialised so valid type list exists
    container.resolve(OntologyService);

    const result = (ContentProcessingService as any).normaliseEntityType('CompletelyUnknownLabel');
    expect(result).toBeUndefined();
  });
}); 