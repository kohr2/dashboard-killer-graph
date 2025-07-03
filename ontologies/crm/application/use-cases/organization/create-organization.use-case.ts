import { container, inject, injectable } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import type { IOrganizationRepository } from '@crm/domain/repositories/i-organization-repository';
import { EnrichmentOrchestratorService } from '@platform/enrichment';
import { OrganizationDTO, mapDTOToOrganization } from '@platform/enrichment/dto-aliases';

export interface CreateOrganizationRequest {
  name: string;
  legalName?: string;
  website?: string;
  industry?: string;
  description?: string;
  size?: string;
  foundedYear?: string;
  headquarters?: string;
  address?: string;
  phone?: string;
  email?: string;
  parentOrganizationId?: string;
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

      const organizationDTO: OrganizationDTO = {
        id: '', // ID will be set by the repository
        name: request.name,
        type: 'Organization',
        label: 'Organization',
        enrichedData: '',
        legalName: request.legalName || '',
        industry: request.industry || '',
        website: request.website || '',
        description: request.description || '',
        size: request.size || '',
        foundedYear: request.foundedYear || '',
        headquarters: request.headquarters || '',
        address: request.address || '',
        phone: request.phone || '',
        email: request.email || '',
        parentOrganizationId: request.parentOrganizationId || '',
        activities: '',
        knowledgeElements: '',
        validationStatus: 'VALID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: '',
      };
      
      // Save the DTO directly (assuming the repository can handle DTOs)
      const savedOrganization = await this.organizationRepository.save(organizationDTO);
      
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