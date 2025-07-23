export interface AttachmentProcessingResultMinimal {
  totalProcessed: number;
  extractedEntities?: any[];
  [key: string]: any;
}

export interface IAttachmentProcessingService {
  processAttachments(attachments: any[]): Promise<AttachmentProcessingResultMinimal>;
} 