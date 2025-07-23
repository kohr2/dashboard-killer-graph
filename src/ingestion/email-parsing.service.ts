import { readFileSync } from 'fs';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { logger } from '../shared/utils/logger';

export interface ParsedEmailData {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  headers: Record<string, string>;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

export class EmailParsingService {
  /**
   * Parse .eml file using mailparser
   */
  async parseEmlFile(emlFilePath: string): Promise<ParsedEmailData> {
    logger.info(`📧 Parsing EML file: ${emlFilePath}`);
    
    const emlContent = readFileSync(emlFilePath, 'utf-8');
    const parsed = await simpleParser(emlContent);

    // Convert parsed attachments to our format
    const attachments: EmailAttachment[] = parsed.attachments?.map(att => ({
      filename: att.filename || 'attachment',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || 0,
      content: att.content,
    })) || [];

    // Extract email addresses
    const fromAddresses = this.convertAddressObject(parsed.from);
    const toAddresses = this.convertAddressObject(parsed.to);
    const ccAddresses = this.convertAddressObject(parsed.cc);
    const bccAddresses = this.convertAddressObject(parsed.bcc);

    // Convert headers to record
    const headersRecord: Record<string, string> = {};
    if (parsed.headers) {
      for (const [key, value] of parsed.headers) {
        headersRecord[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }

    const result: ParsedEmailData = {
      messageId: parsed.messageId || `generated_${Date.now()}`,
      from: fromAddresses[0] || 'unknown@unknown.com',
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      headers: headersRecord,
      attachments,
    };

    logger.info(`✅ Parsed email: ${result.subject} from ${result.from}`);
    return result;
  }

  /**
   * Parse email content from string (for testing or direct content)
   */
  async parseEmailContent(emlContent: string): Promise<ParsedEmailData> {
    const parsed = await simpleParser(emlContent);

    // Convert parsed attachments to our format
    const attachments: EmailAttachment[] = parsed.attachments?.map(att => ({
      filename: att.filename || 'attachment',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || 0,
      content: att.content,
    })) || [];

    // Extract email addresses
    const fromAddresses = this.convertAddressObject(parsed.from);
    const toAddresses = this.convertAddressObject(parsed.to);
    const ccAddresses = this.convertAddressObject(parsed.cc);
    const bccAddresses = this.convertAddressObject(parsed.bcc);

    // Convert headers to record
    const headersRecord: Record<string, string> = {};
    if (parsed.headers) {
      for (const [key, value] of parsed.headers) {
        headersRecord[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }

    return {
      messageId: parsed.messageId || `generated_${Date.now()}`,
      from: fromAddresses[0] || 'unknown@unknown.com',
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      headers: headersRecord,
      attachments,
    };
  }

  /**
   * Extract text content from email (prioritizing text over HTML)
   */
  extractTextContent(parsedEmail: ParsedEmailData): string {
    if (parsedEmail.body) {
      return parsedEmail.body;
    }
    
    if (parsedEmail.htmlBody) {
      // Simple HTML to text conversion (remove tags)
      return parsedEmail.htmlBody.replace(/<[^>]*>/g, '');
    }
    
    return '';
  }

  /**
   * Convert AddressObject to string array
   */
  private convertAddressObject(address: AddressObject | AddressObject[] | undefined): string[] {
    if (!address) return [];
    
    const addresses = Array.isArray(address) ? address : [address];
    return addresses.flatMap(addr => {
      if (addr.value) {
        return addr.value.map(v => v.address || '');
      }
      return [];
    }).filter(Boolean);
  }
} 