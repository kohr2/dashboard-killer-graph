import { DealRepository } from '../../domain/repositories/deal-repository';
import { DealStage } from '../../domain/value-objects/deal-stage';
import { EventBus } from '../../shared/messaging/event-bus';
import { Logger } from '../../shared/utils/logger';

export interface UpdateDealStageRequest {
  dealId: string;
  newStage: string;
  reason?: string;
}

export interface UpdateDealStageResponse {
  success: boolean;
  dealId: string;
  previousStage: string;
  newStage: string;
  message: string;
}

export class UpdateDealStageUseCase {
  constructor(
    private readonly dealRepository: DealRepository,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(request: UpdateDealStageRequest): Promise<UpdateDealStageResponse> {
    this.logger.info('Updating deal stage', { 
      dealId: request.dealId, 
      newStage: request.newStage 
    });

    try {
      // 1. Find the deal
      const deal = await this.dealRepository.findById(request.dealId);
      if (!deal) {
        throw new Error(`Deal with ID ${request.dealId} not found`);
      }

      // 2. Create new stage value object
      const newStage = DealStage.from(request.newStage);
      const previousStage = deal.stage;

      // 3. Validate business rules
      if (!deal.canMoveTo(newStage)) {
        throw new Error(
          `Cannot move deal from ${previousStage.value} to ${newStage.value}`
        );
      }

      // 4. Update the deal (this will emit domain events)
      deal.updateStage(newStage);

      // 5. Persist the changes
      await this.dealRepository.save(deal);

      // 6. Publish domain events
      await this.publishDomainEvents(deal);

      // 7. Mark events as handled
      deal.markEventsAsHandled();

      this.logger.info('Deal stage updated successfully', {
        dealId: request.dealId,
        previousStage: previousStage.value,
        newStage: newStage.value
      });

      return {
        success: true,
        dealId: request.dealId,
        previousStage: previousStage.value,
        newStage: newStage.value,
        message: `Deal stage updated from ${previousStage.value} to ${newStage.value}`
      };

    } catch (error) {
      this.logger.error('Failed to update deal stage', {
        dealId: request.dealId,
        error: error.message
      });

      return {
        success: false,
        dealId: request.dealId,
        previousStage: '',
        newStage: request.newStage,
        message: error.message
      };
    }
  }

  private async publishDomainEvents(deal: any): Promise<void> {
    const events = deal.domainEvents;
    
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
} 