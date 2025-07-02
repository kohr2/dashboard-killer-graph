import { container, inject, injectable } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import type { IOrganizationRepository } from '@crm/domain/repositories/i-organization-repository';
import { Organization } from '@crm/domain/entities/organization';
import { EnrichmentOrchestratorService } from '@platform/enrichment';

export interface CreateOrganizationRequest {
  name: string;
  website?: string;
  industry?: string;
}

export interface CreateOrganizationResponse {
  id: string;
  success: boolean;
  message: string;
}

@injectable()
export class CreateOrganizationUseCase {
  constructor(
    @inject('IOrganizationRepository')
    private organizationRepository: IOrganizationRepository,
    @inject(EnrichmentOrchestratorService)
    private enrichmentOrchestrator: EnrichmentOrchestratorService,
  ) {}

  async execute(
    request: CreateOrganizationRequest,
  ): Promise<CreateOrganizationResponse> {
    try {
      if (!request.name?.trim()) {
        return {
          id: '',
          success: false,
          message: 'Organization name is required',
        };
      }

      const organization = new Organization(
        '', // ID will be set by the repository
        request.name,
        request.website,
        request.industry,
      );

      const savedOrganization =
        await this.organizationRepository.save(organization);

      // Asynchronously trigger enrichment
      this.enrichmentOrchestrator.enrich(savedOrganization).catch(err => {
        logger.error(
          `Failed to enrich organization ${savedOrganization.id}:`,
          err,
        );
      });

      return {
        id: savedOrganization.id,
        success: true,
        message: 'Organization created and enrichment started.',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to create organization: ${message}`);
      return {
        id: '',
        success: false,
        message: `Failed to create organization: ${message}`,
      };
    }
  }
} 