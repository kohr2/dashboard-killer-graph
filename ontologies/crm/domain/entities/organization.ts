export class Organization {
    constructor(
      public id: string,
      public name: string,
      public website?: string,
      public industry?: string,
      public enrichedData?: Record<string, any>,
      public metadata?: Record<string, any>,
      public properties?: Record<string, any>,
      public createdAt: Date = new Date(),
      public updatedAt: Date = new Date(),
    ) {}
  
    get label() {
      return 'Organization';
    }
  } 