export interface EmailAttachmentMinimal {
  filename: string;
  contentType: string;
  size?: number;
  content?: Buffer | unknown;
}

export interface ParsedEmailDataMinimal {
  subject: string;
  body: string;
  attachments: EmailAttachmentMinimal[];
  [key: string]: any;
}

export interface IEmailParsingService {
  parseEmlFile(filePath: string): Promise<ParsedEmailDataMinimal>;
} 