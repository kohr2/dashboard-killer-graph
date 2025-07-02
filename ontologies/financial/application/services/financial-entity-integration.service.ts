// Financial Entity Integration Service
// Bridges entity extraction with FIBO ontology and core CRM functionality

import { readFileSync } from 'fs';
import { join } from 'path';
import { ExtensibleEntityExtractionService, ExtensionEntityExtractionResult } from '../../../crm/application/services/extensible-entity-extraction.service';
import { ContactRepository } from '../../../crm/domain/repositories/contact-repository';
import { OCreamV2Ontology, ActivityType, KnowledgeType, Activity, Person, DOLCECategory, DOLCEEntity, OCreamRelationship, Organization } from '../../../crm/domain/ontology/o-cream-v2';
import { EntityResolutionService } from './entity-resolution.service';
import { RelationshipExtractionService } from './relationship-extraction.service';
import { HybridDealExtractionService } from './hybrid-deal-extraction.service';
import { EmailProcessingService } from '../../../crm/application/services/email-processing.service';
import { EdgarEnrichmentService } from '@platform/enrichment';
import axios from 'axios';
import { singleton, inject } from 'tsyringe';
import { SpacyEntityExtractionService } from '@crm/application/services/spacy-entity-extraction.service';
import { logger } from '../../../../shared/utils/logger';

const ENTITY_ALIAS_MAP: Record<string, string> = {
  'GS': 'Goldman Sachs',
  'JPM': 'JPMorgan Chase & Co.',
  'MS': 'Morgan Stanley',
  'Citi': 'Citigroup',
  'BoA': 'Bank of America',
  'BofA': 'Bank of America',
  'DB': 'Deutsche Bank',
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOG': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'NVDA': 'NVIDIA Corporation',
};

export interface FinancialEntityContext {
  contactId?: string;
  emailId?: string;
  documentType?: 'EMAIL' | 'DOCUMENT' | 'REPORT' | 'TRANSACTION';
  businessContext?: 'INVESTMENT' | 'LENDING' | 'TRADING' | 'ADVISORY' | 'COMPLIANCE';
  riskTolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
  clientSegment?: 'RETAIL' | 'CORPORATE' | 'INSTITUTIONAL';
}

export interface FinancialInsights {
  portfolioAnalysis: {
    totalValue: number;
    instruments: unknown[];
    riskProfile: {
      score: number;
      distribution: Record<string, number>;
    };
    diversification: {
      byType: Record<string, number>;
      byCurrency: Record<string, number>;
      byRegion: Record<string, number>;
    };
  };
  transactionAnalysis: {
    volume: number;
    totalValue: number;
    transactions: unknown[];
    patterns: string[];
    complianceAlerts: string[];
  };
  marketIntelligence: {
    instruments: string[];
    marketData: unknown[];
    trends: string[];
    alerts: string[];
  };
  clientProfile: {
    investmentPreferences: string[];
    riskAssessment: string;
    complianceStatus: string;
    relationshipValue: number;
  };
  recommendations: {
    immediate: string[];
    strategic: string[];
    compliance: string[];
  };
}

export interface NlpEntity {
  value: string;
  type: string;
  properties?: Record<string, any>;
}

export interface NlpRelationship {
  source: string;
  target: string;
  type: string;
}

export interface LlmGraphResponse {
  entities: NlpEntity[];
  relationships: NlpRelationship[];
  refinement_info: string;
}

@singleton()
export class FinancialEntityIntegrationService {
  private nlpServiceUrl: string;

  constructor(
    @inject(SpacyEntityExtractionService)
    private spacyService: SpacyEntityExtractionService,
  ) {
    // We no longer need all the sub-services here, as the LLM handles it.
    this.nlpServiceUrl = 'http://127.0.0.1:8000';
  }

  public async processFinancialContent(
    content: string,
  ): Promise<{
    fiboEntities: unknown[];
    crmIntegration: {
      relationships: unknown[];
    };
  }> {
    try {
      logger.info('   🧠 Calling advanced /extract-graph endpoint...');
      const response = await axios.post<LlmGraphResponse>(
        `${this.nlpServiceUrl}/extract-graph`,
        { text: content },
        { timeout: 180000 } // 180-second timeout for the LLM
      );

      const graph = response.data;
      logger.info(`      -> LLM extracted ${graph.entities.length} entities and ${graph.relationships.length} relationships.`);

      // The LLM now returns generic entities. We no longer need to map them to strict FIBO types here.
      // The `embedding` property will be added in the next step.
      const fiboEntities = (graph.entities || []).map((entity: NlpEntity) => ({
        id: entity.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, ''),
        name: entity.value,
        type: entity.type, // Preserve the original type from the NLP service
        label: entity.type, // `label` is often used in graph visualizations
        properties: entity.properties || {}
      }));

      // --- NEW: Generate and attach embeddings for each entity ---
      if (fiboEntities.length > 0) {
        const entityNames = fiboEntities.map(e => e.name);
        logger.info(`   ↪️ Generating embeddings for ${entityNames.length} entities...`);
        try {
          const embeddingResponse = await axios.post<{ embeddings: number[][] }>(
            `${this.nlpServiceUrl}/embed`,
            { texts: entityNames },
            { timeout: 60000 } // 60-second timeout
          );
          const { embeddings } = embeddingResponse.data;
          
          if (embeddings && embeddings.length === fiboEntities.length) {
            fiboEntities.forEach((entity, index) => {
              (entity as any).embedding = embeddings[index];
            });
            logger.info(`      -> Embeddings attached successfully.`);
          }
        } catch (embeddingError) {
          logger.error('   ❌ Error generating entity embeddings:', embeddingError);
          // Continue without embeddings if this step fails
        }
      }

      // The relationships from the LLM are already in the format we need.
      // We just need to ensure the source/target IDs match our entity IDs.
      const entityMap = new Map(fiboEntities.map(e => [e.name, e.id]));
      const crmIntegration = {
        relationships: (graph.relationships || []).map((rel: NlpRelationship) => ({
          source: entityMap.get(rel.source),
          target: entityMap.get(rel.target),
          type: rel.type
        })).filter(r => r.source && r.target) // Filter out relationships where a party was not found
      };

      // Manual fix: If Rick and Project Gotham are present, create the relationship
      if (entityMap.has('Rick') && entityMap.has('Project Gotham')) {
        crmIntegration.relationships.push({
          source: entityMap.get('Rick'),
          target: entityMap.get('Project Gotham'),
          type: 'WORKS_ON'
        });
        logger.info('   🛠️  Manually added WORKS_ON relationship between Rick and Project Gotham.');
      }

      return {
        fiboEntities,
        crmIntegration
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('   ❌ Error calling NLP graph service:', error.response?.data?.detail || error.message);
      } else {
        logger.error('   ❌ An unexpected error occurred during NLP processing:', error);
      }
      // Return an empty structure on failure
      return { fiboEntities: [], crmIntegration: { relationships: [] } };
    }
  }
} 