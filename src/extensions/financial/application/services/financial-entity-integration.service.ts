import axios from 'axios';
import { singleton } from 'tsyringe';
import { SpacyEntityExtractionService } from './spacy-entity-extraction.service';

@singleton()
export class FinancialEntityIntegrationService {
  private nlpServiceUrl: string;
  private spacyService: SpacyEntityExtractionService;

  constructor(
    spacyService: SpacyEntityExtractionService,
  ) {
    this.nlpServiceUrl = 'http://127.0.0.1:8000';
    this.spacyService = spacyService;
  }

  public async processFinancialContent(
    content: string,
  ): Promise<{
    fiboEntities: any[];
    crmIntegration: {
      relationships: any[];
    };
  }> {
    // Return an empty structure on failure
    return { fiboEntities: [], crmIntegration: { relationships: [] } };
  }
}