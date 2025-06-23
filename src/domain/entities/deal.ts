import { DealStage } from '../value-objects/deal-stage';
import { Money } from '../value-objects/money';
import { Probability } from '../value-objects/probability';
import { DealStageChangedEvent } from '../events/deal-stage-changed';

export class Deal {
  private _domainEvents: any[] = [];

  private constructor(
    private readonly _id: string,
    private _name: string,
    private _stage: DealStage,
    private _value: Money,
    private _probability: Probability,
    private _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(params: {
    id: string;
    name: string;
    value: Money;
    stage?: DealStage;
  }): Deal {
    const now = new Date();
    const deal = new Deal(
      params.id,
      params.name,
      params.stage ?? DealStage.SOURCING,
      params.value,
      Probability.from(0),
      now,
      now
    );

    return deal;
  }

  static reconstitute(params: {
    id: string;
    name: string;
    stage: DealStage;
    value: Money;
    probability: Probability;
    createdAt: Date;
    updatedAt: Date;
  }): Deal {
    return new Deal(
      params.id,
      params.name,
      params.stage,
      params.value,
      params.probability,
      params.createdAt,
      params.updatedAt
    );
  }

  // Getters
  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get stage(): DealStage { return this._stage; }
  get value(): Money { return this._value; }
  get probability(): Probability { return this._probability; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get domainEvents(): any[] { return [...this._domainEvents]; }

  // Business methods
  updateStage(newStage: DealStage): void {
    if (this._stage.equals(newStage)) {
      return; // No change
    }

    const previousStage = this._stage;
    this._stage = newStage;
    this._updatedAt = new Date();

    // Emit domain event
    this._domainEvents.push(
      new DealStageChangedEvent(this._id, previousStage, newStage)
    );

    // Automatically update probability based on stage
    this.updateProbabilityBasedOnStage();
  }

  updateProbability(probability: Probability): void {
    this._probability = probability;
    this._updatedAt = new Date();
  }

  updateValue(value: Money): void {
    if (!value.currency.equals(this._value.currency)) {
      throw new Error('Cannot change deal currency');
    }
    
    this._value = value;
    this._updatedAt = new Date();
  }

  markEventsAsHandled(): void {
    this._domainEvents.length = 0;
  }

  // Private methods
  private updateProbabilityBasedOnStage(): void {
    const stageBasedProbability = this.getDefaultProbabilityForStage(this._stage);
    if (stageBasedProbability > this._probability.value) {
      this._probability = Probability.from(stageBasedProbability);
    }
  }

  private getDefaultProbabilityForStage(stage: DealStage): number {
    switch (stage.value) {
      case 'SOURCING': return 0.1;
      case 'LOI': return 0.4;
      case 'DILIGENCE': return 0.6;
      case 'CLOSING': return 0.8;
      case 'COMPLETED': return 1.0;
      case 'LOST': return 0.0;
      default: return 0.1;
    }
  }

  // Validation
  isValid(): boolean {
    return (
      this._id.length > 0 &&
      this._name.length > 0 &&
      this._value.amount > 0 &&
      this._probability.value >= 0 &&
      this._probability.value <= 1
    );
  }

  // Business rules
  canMoveTo(targetStage: DealStage): boolean {
    return this._stage.canTransitionTo(targetStage);
  }

  isActive(): boolean {
    return !this._stage.equals(DealStage.COMPLETED) && 
           !this._stage.equals(DealStage.LOST);
  }

  isHighValue(): boolean {
    return this._value.amount >= 10_000_000; // $10M threshold
  }

  daysInCurrentStage(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this._updatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 