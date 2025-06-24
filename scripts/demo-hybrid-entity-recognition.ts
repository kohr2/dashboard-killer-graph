// Hybrid Entity and Relationship Extraction Demo
// Combines spaCy's speed with an LLM's deep contextual understanding

import { SpacyEntityExtractionService, SpacyExtractedEntity } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

// --- Configuration ---
const LLM_MODEL_NAME = "gpt-4-turbo"; 

interface Deal {
  dealName: string; // e.g., "Project Titan"
  dealType: string; // e.g., "Carve-out", "Buyout"
  processType: string; // e.g., "Auction", "Bilateral"
}

interface Company {
  companyName: string;
  gicsCode?: string;
  sector?: string;
  revenue?: number;
  ebitda?: number;
}

interface Investor {
  investorName: string;
  investorType: 'Sponsor' | 'Bank' | 'Internal';
}

interface Fund {
  fundName: string;
}

interface CommunicationEvent {
  type: 'Email' | 'Call' | 'Meeting';
  from: string;
  to: string[];
  date: string;
  subject: string;
}

interface CrmActivity {
  activityType: string; // e.g., "Submit IOI"
  dueDate?: string;
  assignedTo?: string;
}

interface DealAnalysis {
  deal: Deal;
  targetCompany: Company;
  involvedParties: Investor[];
  mentionedFunds: Fund[];
  communicationHistory: CommunicationEvent[];
  crmTasks: CrmActivity[];
  competitors: Investor[];
  summary: string;
  relationships: {
    source: string;
    target: string;
    type: string;
  }[];
}

export class HybridExtractionService {
  private spacyExtractor: SpacyEntityExtractionService;
  private llm: ChatOpenAI;

  constructor(apiKey: string) {
    this.spacyExtractor = new SpacyEntityExtractionService();
    this.llm = new ChatOpenAI({
      apiKey: apiKey,
      temperature: 0,
      modelName: LLM_MODEL_NAME,
      maxTokens: 4096,
    });
    console.log(`🧠 Initialized Hybrid Extraction Service with LLM: ${LLM_MODEL_NAME}`);
  }

  public async processText(text: string): Promise<{
    spacyResults: SpacyExtractedEntity[];
    llmResults: DealAnalysis;
    mergedEntities: any[];
  }> {
    // Step 1: Fast First Pass with spaCy
    console.log('\n--- Step 1: spaCy First Pass (Not used by LLM but good for context) ---');
    const spacyResult = await this.spacyExtractor.extractEntities(text);
    console.log(`   ✅ spaCy extracted ${spacyResult.entityCount} initial entities.`);

    // Step 2: Deep Second Pass with LLM for Deal Analysis
    console.log('\n--- Step 2: LLM Deep Dive for Deal Analysis ---');
    const llmResults = await this.getLlmAnalysis(text);
    console.log(`   ✅ LLM analysis complete for deal: ${llmResults.deal.dealName}`);

    // Step 3: Merge Results for Graphing
    console.log('\n--- Step 3: Merging LLM Results for Graphing ---');
    const mergedEntities = this.mergeResults(llmResults);
    console.log(`   ✅ Merged results into ${mergedEntities.length} final entities for the graph.`);

    return {
      spacyResults: spacyResult.entities,
      llmResults,
      mergedEntities,
    };
  }
  
  private async getLlmAnalysis(text: string): Promise<DealAnalysis> {
    const prompt = this.createLlmPrompt(text);
    
    console.log('   🗣️  Sending request to LLM for full deal analysis...');
    const llmResponse = await this.llm.invoke([new HumanMessage(prompt)]);
    
    try {
      const jsonResponse = llmResponse.content.toString().match(/```json\n([\s\S]*?)\n```/);
      if (jsonResponse && jsonResponse[1]) {
        return JSON.parse(jsonResponse[1]) as DealAnalysis;
      }
      throw new Error("LLM did not return a valid JSON block.");
    } catch (error) {
      console.error("❌ Failed to parse LLM response:", error);
      console.error("Raw LLM Response:", llmResponse.content);
      return { // Return a default empty result on failure
        deal: { dealName: 'Unknown Deal', dealType: '', processType: '' },
        targetCompany: { companyName: 'Unknown Company' },
        involvedParties: [],
        mentionedFunds: [],
        communicationHistory: [],
        crmTasks: [],
        competitors: [],
        relationships: [],
        summary: "Error processing LLM response."
      };
    }
  }

  private createLlmPrompt(text: string): string {
    return `
      You are an expert Private Equity (PE) analyst AI. Your task is to analyze an email thread and structure the information into a detailed JSON object based on a FIBO-aligned ontology.

      **Original Email Text:**
      ---
      ${text}
      ---

      **Your Tasks:**

      1.  **Identify Core Entities:** Extract all relevant entities like Deals, Companies, Investors, and Funds.
      2.  **Classify Investors:** Differentiate between the PE firm (Sponsor), the investment bank (Bank), and internal people.
      3.  **Extract Deal & Company Data:** Capture financial metrics (Revenue, EBITDA), GICS codes, and process details (e.g., Auction).
      4.  **Model Deal Flow:** Document all communication events (emails) and any explicit CRM tasks mentioned (e.g., follow-ups, deadlines).
      5.  **Identify Relationships:** Extract key relationships like which company is the target of a deal, which fund is mentioned, who the competitors are, and which parties are involved in communications.

      **Output Format:**
      Provide your response as a single, well-formed JSON object enclosed in a \`\`\`json block. Do not include any text outside of this JSON block. The structure should be:

      \`\`\`json
      {
        "deal": {
          "dealName": "The codename or name of the transaction",
          "dealType": "e.g., 'Carve-out', 'Buyout'",
          "processType": "e.g., 'Limited Auction', 'Bilateral'"
        },
        "targetCompany": {
          "companyName": "The name of the company being acquired",
          "gicsCode": "The GICS code, if mentioned",
          "sector": "The GICS sector name",
          "revenue": "Annual revenue as a number (e.g., 85000000)",
          "ebitda": "EBITDA as a number (e.g., 22000000)"
        },
        "involvedParties": [
          { "investorName": "Name of the PE Firm or internal person", "investorType": "Sponsor" },
          { "investorName": "Name of the Investment Bank", "investorType": "Bank" }
        ],
        "mentionedFunds": [
          { "fundName": "Name of the fund mentioned" }
        ],
        "communicationHistory": [
          {
            "type": "Email",
            "from": "Sender's name or email",
            "to": ["Recipient's name or email"],
            "date": "The date of the email in ISO 8601 format",
            "subject": "The subject line of the email"
          }
        ],
        "crmTasks": [
          {
            "activityType": "A description of the task (e.g., 'Submit Indication of Interest (IOI)')",
            "dueDate": "The due date in ISO 8601 format",
            "assignedTo": "The person or team assigned the task"
          }
        ],
        "competitors": [
          { "investorName": "Name of the competing firm", "investorType": "Sponsor" }
        ],
        "summary": "A one-sentence summary of the key information in the email thread.",
        "relationships": [
          {"source": "TargetCompanyName", "target": "DealName", "type": "IS_TARGET_OF"},
          {"source": "FundName", "target": "DealName", "type": "IS_POTENTIAL_INVESTOR_IN"},
          {"source": "CompetitorName", "target": "DealName", "type": "IS_COMPETING_FOR"}
        ]
      }
      \`\`\`
    `;
  }

  private mergeResults(llmResults: DealAnalysis): any[] {
    const merged: { [key: string]: any } = {};
  
    const addEntity = (entity: any, defaultType: string, nameKey: string) => {
      if (!entity || !entity[nameKey]) return;
      const key = entity[nameKey].toLowerCase();
      if (!merged[key]) {
        merged[key] = {
          value: entity[nameKey],
          type: entity.investorType || defaultType,
          source: 'LLM_Only',
          details: { ...entity }
        };
      }
    };
  
    addEntity(llmResults.deal, 'Deal', 'dealName');
    addEntity(llmResults.targetCompany, 'Company', 'companyName');
    (llmResults.involvedParties || []).forEach(p => addEntity(p, 'Investor', 'investorName'));
    (llmResults.competitors || []).forEach(c => addEntity(c, 'Investor', 'investorName'));
    (llmResults.mentionedFunds || []).forEach(f => addEntity(f, 'Fund', 'fundName'));
  
    return Object.values(merged);
  }
}

async function demonstrateHybridExtraction() {
  console.log('🚀 Hybrid Entity Recognition Demo 🚀');
  console.log('Combining spaCy for speed and an LLM for depth...');
  console.log('====================================================\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: OpenAI API key not found in .env file.");
    console.error("Please ensure a .env file exists in the project root with OPENAI_API_KEY='your_key'");
    return;
  }

  const hybridService = new HybridExtractionService(apiKey);

  const sampleEmailPath = join(__dirname, '../test-emails/deal-sourcing-tech-buyout.eml');
  const sampleEmailText = readFileSync(sampleEmailPath, 'utf8');

  console.log(`--- Analyzing email: ${sampleEmailPath} ---`);

  const { llmResults } = await hybridService.processText(sampleEmailText);

  // --- Display Results ---
  console.log('\n\n--- 📊 FINAL DEAL ANALYSIS ---');
  console.log('====================================================\n');
  
  console.log(`Deal Summary: ${llmResults.summary}`);

  console.log('\n📋 Deal Information:');
  console.log(`   - Name: ${llmResults.deal.dealName}`);
  console.log(`   - Type: ${llmResults.deal.dealType}`);
  console.log(`   - Process: ${llmResults.deal.processType}`);

  console.log('\n🏢 Target Company:');
  console.log(`   - Name: ${llmResults.targetCompany.companyName}`);
  console.log(`   - Sector: ${llmResults.targetCompany.sector} (GICS: ${llmResults.targetCompany.gicsCode})`);
  console.log(`   - Revenue: $${(llmResults.targetCompany.revenue || 0).toLocaleString()}`);
  console.log(`   - EBITDA: $${(llmResults.targetCompany.ebitda || 0).toLocaleString()}`);

  console.log('\n👥 Involved Parties:');
  for (const party of llmResults.involvedParties) {
    console.log(`   - ${party.investorName} (${party.investorType})`);
  }
  
  if (llmResults.mentionedFunds && llmResults.mentionedFunds.length > 0) {
    console.log('\n💰 Mentioned Funds:');
    for (const fund of llmResults.mentionedFunds) {
      console.log(`   - ${fund.fundName}`);
    }
  }

  if (llmResults.competitors && llmResults.competitors.length > 0) {
    console.log('\n⚔️  Competitors:');
    for (const competitor of llmResults.competitors) {
      console.log(`   - ${competitor.investorName} (${competitor.investorType})`);
    }
  }

  if (llmResults.crmTasks && llmResults.crmTasks.length > 0) {
    console.log('\n✅ CRM Tasks:');
    for (const task of llmResults.crmTasks) {
      console.log(`   - Activity: ${task.activityType}`);
      if(task.dueDate) console.log(`     - Due: ${task.dueDate}`);
      if(task.assignedTo) console.log(`     - Assigned To: ${task.assignedTo}`);
    }
  }

  console.log('\n🔗 Extracted Relationships:');
  for (const rel of llmResults.relationships) {
    console.log(`   - [${rel.source}] --(${rel.type})--> [${rel.target}]`);
  }

  // Save the structured LLM results directly
  const reportPath = join(__dirname, '../hybrid-extraction-report.json');
  writeFileSync(reportPath, JSON.stringify(llmResults, null, 2));
  console.log(`\n\n📄 Full deal analysis report saved to: ${reportPath}`);
}

if (require.main === module) {
  demonstrateHybridExtraction().catch(console.error);
}
