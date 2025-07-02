import { SpacyExtractedEntity, EntityType } from '@crm/application/services/spacy-entity-extraction.service';

export interface Deal {
  dealName?: string;
  dealType?: string;
  processType?: string;
}

export interface TargetCompany {
  companyName?: string;
  gicsCode?: string;
  sector?: string;
  revenue?: number;
  ebitda?: number;
}

export interface InvolvedParty {
  investorName?: string;
  investorType?: 'Sponsor' | 'Bank' | 'Other';
}

export interface Communication {
  type: 'Email' | 'Call' | 'Meeting';
  from: string;
  to: string[];
  date: string;
  subject: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
}

export interface HybridDealReport {
  deal: Deal;
  targetCompany: TargetCompany;
  involvedParties: InvolvedParty[];
  mentionedFunds: unknown[];
  communicationHistory: Communication[];
  crmTasks: unknown[];
  competitors: unknown[];
  summary: string;
  relationships: Relationship[];
}

export class HybridDealExtractionService {
  public async extract(text: string, entities: SpacyExtractedEntity[]): Promise<HybridDealReport> {
    const report: HybridDealReport = {
      deal: {
        dealName: this.extractDealName(text, entities),
        dealType: this.extractDealType(text),
        processType: this.extractKeywordLine(text, 'Process'),
      },
      targetCompany: {
        companyName: this.extractKeywordLine(text, 'Target'),
        sector: this.extractKeywordLine(text, 'Sector'),
        revenue: this.extractFinancialMetric(text, 'Revenue'),
        ebitda: this.extractFinancialMetric(text, 'EBITDA'),
      },
      involvedParties: this.extractInvolvedParties(text, entities),
      mentionedFunds: [],
      communicationHistory: [this.extractCommunication(text)],
      crmTasks: [],
      competitors: [],
      summary: '',
      relationships: [],
    };

    // Post-processing and cleanup
    if (report.deal.processType) {
      report.deal.processType = report.deal.processType.replace(/Process:/i, '').replace('Intermediated,', '').trim();
    }

    this.generateSummary(report);
    this.generateRelationships(report);

    return report;
  }

  private extractDealName(text: string, entities: SpacyExtractedEntity[]): string | undefined {
    const projectNameEntity = entities.find(e => e.type === 'PROJECT_NAME');
    if (projectNameEntity) {
      return projectNameEntity.value;
    }

    const match = text.match(/(?:Project|opportunity,)\s"([^"]+)"/i);
    return match ? match[1].replace(/,$/, '') : undefined;
  }

  private extractDealType(text: string): string | undefined {
    const match = text.match(/a (carve-out)/i);
    if (match) return 'Carve-out';
    return undefined;
  }

  private extractKeywordLine(text: string, keyword: string): string | undefined {
    const regex = new RegExp(`${keyword}:?\\s*(.*)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
        const endOfLineMatch = match[1].match(/([^\n\r]*)/);
        return endOfLineMatch ? endOfLineMatch[1].trim() : undefined;
    }

    return undefined;
  }

  private extractFinancialMetric(text: string, metricName: string): number | undefined {
    const regex = new RegExp(`${metricName}:\\s*\\$?([\\d,.]+)M?`, 'i');
    const match = text.match(regex);
    if (!match || !match[1]) return undefined;

    let value = parseFloat(match[1].replace(/,/g, ''));
    
    // Handle 'M' for millions
    if (match[0].toLowerCase().includes('m')) {
      value *= 1_000_000;
    }

    return value;
  }

  private extractInvolvedParties(text: string, entities: SpacyExtractedEntity[]): InvolvedParty[] {
    const parties: InvolvedParty[] = [];
    const emailEntities = entities.filter(e => e.type === EntityType.EMAIL_ADDRESS);

    for (const entity of emailEntities) {
        const domain = entity.value.split('@')[1];
        let investorType: InvolvedParty['investorType'] = 'Other';

        if (domain.includes('investment-bank')) {
            investorType = 'Bank';
        } else if (domain.includes('pe-firm')) {
            investorType = 'Sponsor';
        }
        
        parties.push({
            investorName: domain,
            investorType: investorType,
        });
    }

    return parties;
  }

  private extractCommunication(text: string): Communication {
      const from = this.extractHeader(text, 'From');
      const to = this.extractHeader(text, 'To');
      const date = this.extractHeader(text, 'Date');
      const subject = this.extractHeader(text, 'Subject');

      return {
          type: 'Email',
          from: from || 'Unknown',
          to: to ? [to] : [],
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          subject: subject || 'No Subject',
      };
  }

  private extractHeader(text: string, headerName: string): string | undefined {
      const regex = new RegExp(`^${headerName}:\\s*(.*)`, 'im');
      const match = text.match(regex);
      return match ? match[1].trim() : undefined;
  }

  private generateSummary(report: HybridDealReport): void {
    const { deal, targetCompany } = report;
    if (targetCompany.companyName && deal.dealName) {
      let summary = `A new investment opportunity, "${deal.dealName}", has been identified. `;
      summary += `The target is ${targetCompany.companyName}`;
      if (targetCompany.sector) {
        summary += `, operating in the ${targetCompany.sector} sector. `;
      } else {
        summary += '. ';
      }
      if (targetCompany.revenue) {
        summary += `The company has reported revenues of $${(targetCompany.revenue / 1_000_000).toFixed(0)}M`;
      }
      if (targetCompany.ebitda) {
        summary += ` and an EBITDA of $${(targetCompany.ebitda / 1_000_000).toFixed(0)}M.`;
      }
      report.summary = summary;
    }
  }

  private generateRelationships(report: HybridDealReport): void {
      const { deal, targetCompany } = report;
      if (targetCompany.companyName && deal.dealName) {
          report.relationships.push({
              source: targetCompany.companyName,
              target: deal.dealName,
              type: 'IS_TARGET_OF'
          });
      }
  }
} 