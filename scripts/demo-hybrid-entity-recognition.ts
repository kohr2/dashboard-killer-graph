// Hybrid Entity and Relationship Extraction Demo
// Combines spaCy's speed with an LLM's deep contextual understanding

import { SpacyEntityExtractionService, SpacyExtractedEntity } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

// --- Configuration ---
const LLM_MODEL_NAME = "gpt-4-turbo"; 

interface LLMValidationResult {
  entity: string;
  type: string;
  isValid: boolean;
  reason: string;
  correctedValue?: string;
  normalizedValue?: string;
}

interface LLMEnhancedEntity {
  entity: string;
  type: string;
  context: string;
  explanation: string;
}

interface LLMRelationship {
  source: string;
  target: string;
  relationship: string;
  explanation: string;
  confidence: number;
}

interface LLMAnalysisResult {
  validatedEntities: LLMValidationResult[];
  newEntities: LLMEnhancedEntity[];
  relationships: LLMRelationship[];
  summary: string;
}


class HybridExtractionService {
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
    llmResults: LLMAnalysisResult;
    mergedEntities: any[];
  }> {
    // Step 1: Fast First Pass with spaCy
    console.log('\n--- Step 1: spaCy First Pass ---');
    const spacyResult = await this.spacyExtractor.extractEntities(text);
    console.log(`   ✅ spaCy extracted ${spacyResult.entityCount} initial entities.`);

    // Step 2: Deep Second Pass with LLM
    console.log('\n--- Step 2: LLM Deep Dive ---');
    const llmResults = await this.getLlmAnalysis(text, spacyResult.entities);
    console.log(`   ✅ LLM validated ${llmResults.validatedEntities.length} entities, found ${llmResults.newEntities.length} new entities, and ${llmResults.relationships.length} relationships.`);

    // Step 3: Merge Results
    console.log('\n--- Step 3: Merging spaCy and LLM Results ---');
    const mergedEntities = this.mergeResults(spacyResult.entities, llmResults);
    console.log(`   ✅ Merged results into ${mergedEntities.length} final entities.`);

    return {
      spacyResults: spacyResult.entities,
      llmResults,
      mergedEntities,
    };
  }
  
  private async getLlmAnalysis(text: string, spacyEntities: SpacyExtractedEntity[]): Promise<LLMAnalysisResult> {
    const prompt = this.createLlmPrompt(text, spacyEntities);
    
    console.log('   🗣️  Sending request to LLM...');
    const llmResponse = await this.llm.invoke([new HumanMessage(prompt)]);
    
    try {
      // The LLM is instructed to return a JSON string.
      const jsonResponse = llmResponse.content.toString().match(/```json\n([\s\S]*?)\n```/);
      if (jsonResponse && jsonResponse[1]) {
        return JSON.parse(jsonResponse[1]) as LLMAnalysisResult;
      }
      throw new Error("LLM did not return a valid JSON block.");
    } catch (error) {
      console.error("❌ Failed to parse LLM response:", error);
      console.error("Raw LLM Response:", llmResponse.content);
      // Return a default empty result on failure
      return {
        validatedEntities: [],
        newEntities: [],
        relationships: [],
        summary: "Error processing LLM response."
      };
    }
  }

  private createLlmPrompt(text: string, spacyEntities: SpacyExtractedEntity[]): string {
    return `
      You are an expert financial analyst AI with a specialization in Natural Language Processing. Your task is to perform an in-depth analysis of a given financial document.

      A preliminary analysis has been done by a statistical NLP model (spaCy), which has identified the following entities. This initial list may be incomplete or contain errors.

      **Original Document Text:**
      ---
      ${text}
      ---

      **spaCy Preliminary Entities:**
      ---
      ${spacyEntities.map(e => `- "${e.value}" (${e.type})`).join('\n')}
      ---

      **Your Tasks:**

      1.  **Validate and Refine:** Go through the preliminary entities. For each one, determine if it's a correct entity in this context. If it's incorrect, mark it as invalid. If it's correct, provide a normalized, canonical version of the entity (e.g., "MSFT" -> "Microsoft Corporation").
      2.  **Discover New Entities:** Read the document carefully and identify any important entities that the preliminary scan missed. Focus on complex, domain-specific concepts like "investment thesis," "risk factor," "market catalyst," or specific financial metrics.
      3.  **Extract Complex Relationships:** Identify the key relationships between all entities (both validated and new). The relationships should be specific and directional (e.g., [SOURCE, RELATIONSHIP, TARGET]). Examples: ["Sarah Johnson", "MANAGES_PORTFOLIO_FOR", "Robert Chen"], ["NVIDIA", "HAS_PRICE_TARGET", "$950"]. Pay close attention to employment relationships (e.g., "Dr. Jennifer Liu, our Head of Tech Research" implies ["Dr. Jennifer Liu", "WORKS_FOR", "J.P. Morgan Research Department"]).
      4.  **Summarize:** Provide a brief, one-sentence summary of the document's core subject.

      **Output Format:**
      Provide your response as a single, well-formed JSON object enclosed in a \`\`\`json block. Do not include any text outside of this JSON block. The JSON object should have the following structure:

      \`\`\`json
      {
        "validatedEntities": [
          {
            "entity": "The original entity string from spaCy",
            "type": "The original entity type",
            "isValid": true | false,
            "reason": "A brief explanation for your validation decision.",
            "correctedValue": "The corrected or more precise value, if any.",
            "normalizedValue": "The canonical/standardized name for the entity (e.g., a stock ticker to a full company name)."
          }
        ],
        "newEntities": [
          {
            "entity": "The newly discovered entity string.",
            "type": "A specific, descriptive entity type (e.g., 'INVESTMENT_THESIS', 'COMPLIANCE_RULE').",
            "context": "The sentence or phrase where the entity was found.",
            "explanation": "Why this is an important entity to extract."
          }
        ],
        "relationships": [
          {
            "source": "The normalized name of the source entity.",
            "target": "The normalized name of the target entity.",
            "relationship": "A specific, uppercase, snake-case relationship type (e.g., 'WORKS_FOR', 'HAS_PRICE_TARGET').",
            "explanation": "The textual evidence supporting this relationship.",
            "confidence": 0.0 - 1.0
          }
        ],
        "summary": "A single, concise sentence summarizing the document."
      }
      \`\`\`
    `;
  }

  private mergeResults(spacyEntities: SpacyExtractedEntity[], llmResults: LLMAnalysisResult): any[] {
    const merged: any = {};

    // Process LLM validations
    for (const validation of llmResults.validatedEntities) {
      if (validation.isValid) {
        const key = (validation.normalizedValue || validation.entity).toLowerCase();
        merged[key] = {
          value: validation.normalizedValue || validation.entity,
          type: validation.type,
          source: 'spaCy+LLM',
          details: { ...validation }
        };
      }
    }

    // Process new LLM entities
    for (const newEntity of llmResults.newEntities) {
      const key = newEntity.entity.toLowerCase();
      if (!merged[key]) {
        merged[key] = {
          value: newEntity.entity,
          type: newEntity.type,
          source: 'LLM_Only',
          details: { ...newEntity }
        };
      }
    }
    
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

  const sampleEmailText = `
    Subject: Q1 2024 Market Outlook & Top Picks

    Dear Valued Clients,

    Our research team at JPMorgan maintains a BULLISH outlook on technology stocks for Q1 2024, driven by AI adoption and cloud infrastructure growth. Our investment thesis centers on identifying market leaders with strong pricing power.

    Key Investment Themes & Top Picks:
    1. Artificial Intelligence: NVIDIA (NVDA) is our top pick with a price target of $950. Their dominance in the data center GPU market is a significant moat.
    2. Cloud: We recommend both Amazon (AMZN) and Microsoft (MSFT), with price targets of $185 and $420, respectively.
    3. Cybersecurity: A key risk factor for the tech industry is the increasing threat of cyberattacks. We see CrowdStrike (CRWD) as a leader in this space.

    The primary market catalyst remains the Federal Reserve's rate policy. We expect a dovish stance to be supportive of growth stocks.

    For a detailed report, please contact Dr. Jennifer Liu, our Head of Tech Research.

    Regards,
    J.P. Morgan Research Department
  `;

  const { spacyResults, llmResults, mergedEntities } = await hybridService.processText(sampleEmailText);

  // --- Display Results ---
  console.log('\n\n--- 📊 FINAL ANALYSIS & COMPARISON ---');
  console.log('====================================================\n');
  
  console.log(`LLM Summary: "${llmResults.summary}"\n`);
  
  // Display LLM-found relationships
  console.log('🔗 LLM-Extracted Relationships:');
  console.log('---------------------------------');
  llmResults.relationships.forEach(rel => {
    console.log(`   - [${rel.source}] --(${rel.relationship})--> [${rel.target}] (Confidence: ${rel.confidence * 100}%)`);
  });
  console.log('');
  
  // Display refined and new entities
  console.log('✨ LLM-Enhanced Entities:');
  console.log('---------------------------------');
  const newLlmEntities = llmResults.newEntities.map(e => `   - ${e.entity} (${e.type}) [LLM Only]`);
  const refinedEntities = llmResults.validatedEntities
    .filter(e => e.isValid && e.normalizedValue && e.entity !== e.normalizedValue)
    .map(e => `   - ${e.entity} -> ${e.normalizedValue} (${e.type}) [spaCy+LLM Refined]`);

  [...newLlmEntities, ...refinedEntities].forEach(line => console.log(line));
  console.log('');

  // Display comparison
  console.log('🔍 Validation of spaCy Entities:');
  console.log('---------------------------------');
  llmResults.validatedEntities.forEach(v => {
      const status = v.isValid ? '✅ Valid' : '❌ Invalid';
      console.log(`   - spaCy found "${v.entity}" (${v.type}): ${status} by LLM. Reason: ${v.reason}`);
  });


  // Save final results to a file
  const reportPath = join(__dirname, '../hybrid-extraction-report.json');
  writeFileSync(reportPath, JSON.stringify({ spacyResults, llmResults, mergedEntities }, null, 2));
  console.log(`\n\n📄 Full hybrid analysis report saved to: ${reportPath}`);
}

if (require.main === module) {
  demonstrateHybridExtraction().catch(console.error);
}
