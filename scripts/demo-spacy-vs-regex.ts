// spaCy vs Regex Entity Extraction Comparison Demo
// Demonstrates why spaCy is superior to regex for entity extraction

import { SpacyEntityExtractionService } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { EntityExtractionService, EntityType } from '../src/crm-core/application/services/entity-extraction.service';

// Test cases that highlight spaCy's advantages
const testCases = [
  {
    name: "Ambiguous Context",
    text: `Apple Inc. announced that Tim Cook will visit Apple Valley, California next week. 
           The apple harvest this year was exceptional, and Apple's stock price reached $150.`,
    challenges: [
      "Distinguishing Apple (company) from apple (fruit) from Apple Valley (location)",
      "Context-dependent entity recognition",
      "Multiple meanings of the same word"
    ]
  },
  {
    name: "Complex Names and Titles",
    text: `Dr. Sarah Johnson-Smith, Chief Technology Officer at Microsoft Corporation, 
           met with John F. Kennedy Jr. Memorial Foundation representatives. 
           The meeting was scheduled for March 15th, 2024 at 2:30 PM EST.`,
    challenges: [
      "Hyphenated names with titles",
      "Complex organizational names",
      "Memorial foundations vs. people",
      "Time zone abbreviations"
    ]
  },
  {
    name: "Financial and Legal Context",
    text: `The merger between Goldman Sachs Group Inc. and Morgan Stanley (NYSE: MS) 
           involves $2.5 billion in cash and 1.2 million shares. 
           Contract #MS-GS-2024-001 expires on December 31st, 2024.`,
    challenges: [
      "Stock symbols vs. abbreviations",
      "Complex financial amounts",
      "Legal document references",
      "Corporate entity recognition"
    ]
  },
  {
    name: "International and Multi-language",
    text: `François Mitterrand from Château-Thierry, France, and José María Aznar 
           from Madrid, Spain, discussed the €500 million EU budget allocation. 
           The meeting was held at 14:00 CET on 15/03/2024.`,
    challenges: [
      "Non-English names with accents",
      "European date/time formats",
      "Currency symbols",
      "International location recognition"
    ]
  },
  {
    name: "Technical and Scientific Context",
    text: `The COVID-19 vaccine developed by Pfizer-BioNTech shows 95% efficacy. 
           Dr. Katalin Karikó's mRNA research at the University of Pennsylvania 
           led to this breakthrough. The Phase III trial included 43,548 participants.`,
    challenges: [
      "Medical terminology",
      "Scientific percentages",
      "Research institutions",
      "Clinical trial data"
    ]
  }
];

async function demonstrateSpacyVsRegex() {
  console.log('🧠 spaCy vs Regex Entity Extraction Comparison');
  console.log('=' .repeat(80));
  
  const spacyService = new SpacyEntityExtractionService();
  const regexService = new EntityExtractionService();

  // Show model recommendations first
  console.log('\n📚 spaCy Model Recommendations:');
  const recommendations = spacyService.getModelRecommendations();
  
  recommendations.models.forEach(model => {
    console.log(`\n   🔧 ${model.name}:`);
    console.log(`      📝 ${model.description}`);
    console.log(`      🎯 Accuracy: ${model.accuracy} | ⚡ Speed: ${model.speed} | 💾 Size: ${model.size}`);
    console.log(`      💡 Use Case: ${model.useCase}`);
  });

  console.log('\n🎯 Recommendations:');
  Object.entries(recommendations.recommendations).forEach(([scenario, rec]) => {
    console.log(`   ${scenario}: ${rec}`);
  });

  // Process each test case
  for (const [index, testCase] of testCases.entries()) {
    console.log(`\n\n📧 Test Case ${index + 1}: ${testCase.name}`);
    console.log('=' .repeat(80));
    
    console.log('\n📝 Text:');
    console.log(`"${testCase.text}"`);
    
    console.log('\n🎯 Challenges:');
    testCase.challenges.forEach(challenge => {
      console.log(`   • ${challenge}`);
    });

    try {
      // Run comparison
      console.log('\n🔄 Running Extraction Comparison...');
      const comparison = await spacyService.compareExtractionMethods(testCase.text);
      
      console.log('\n📊 Results Comparison:');
      
      // spaCy Results
      console.log('\n🧠 spaCy Results:');
      console.log(`   📈 Entities Found: ${comparison.spacyResults.entityCount}`);
      console.log(`   🎯 Confidence: ${(comparison.spacyResults.confidence * 100).toFixed(1)}%`);
      console.log(`   ⏱️  Processing Time: ${comparison.spacyResults.processingTime}ms`);
      console.log(`   🔧 Method: ${comparison.spacyResults.metadata.extractionMethod}`);
      
      if (comparison.spacyResults.entities.length > 0) {
        console.log('\n   🏷️  Detected Entities:');
        comparison.spacyResults.entities.forEach((entity, idx) => {
          const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.5 ? '🟡' : '🔴';
          console.log(`      ${idx + 1}. ${confidenceIcon} "${entity.value}" → ${entity.type} (${(entity.confidence * 100).toFixed(1)}%)`);
          
          if (entity.metadata?.spacyLabel) {
            console.log(`         spaCy Label: ${entity.metadata.spacyLabel} - ${entity.metadata.spacyDescription}`);
          }
        });
      }

      // Regex Results
      console.log('\n🔍 Regex Results:');
      console.log(`   📈 Entities Found: ${comparison.regexResults.entityCount}`);
      console.log(`   🎯 Confidence: ${(comparison.regexResults.confidence * 100).toFixed(1)}%`);
      console.log(`   ⏱️  Processing Time: ${comparison.regexResults.processingTime}ms`);
      console.log(`   🔧 Method: ${comparison.regexResults.metadata.extractionMethod}`);
      
      if (comparison.regexResults.entities.length > 0) {
        console.log('\n   🏷️  Detected Entities:');
        comparison.regexResults.entities.forEach((entity, idx) => {
          const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.5 ? '🟡' : '🔴';
          console.log(`      ${idx + 1}. ${confidenceIcon} "${entity.value}" → ${entity.type} (${(entity.confidence * 100).toFixed(1)}%)`);
        });
      }

      // Performance Analysis
      console.log('\n📈 Performance Analysis:');
      const { performanceMetrics } = comparison.comparison;
      
      console.log(`   Entity Detection:`);
      console.log(`      spaCy: ${performanceMetrics.spacy.entities} entities`);
      console.log(`      Regex: ${performanceMetrics.regex.entities} entities`);
      console.log(`      Improvement: ${performanceMetrics.spacy.entities - performanceMetrics.regex.entities > 0 ? '+' : ''}${performanceMetrics.spacy.entities - performanceMetrics.regex.entities} entities`);
      
      console.log(`   Confidence Score:`);
      console.log(`      spaCy: ${(performanceMetrics.spacy.confidence * 100).toFixed(1)}%`);
      console.log(`      Regex: ${(performanceMetrics.regex.confidence * 100).toFixed(1)}%`);
      console.log(`      Improvement: ${comparison.comparison.accuracyImprovement > 0 ? '+' : ''}${(comparison.comparison.accuracyImprovement * 100).toFixed(1)}%`);
      
      console.log(`   Processing Speed:`);
      console.log(`      spaCy: ${performanceMetrics.spacy.time}ms`);
      console.log(`      Regex: ${performanceMetrics.regex.time}ms`);

      // Key Differences
      console.log('\n🔍 Key Differences Observed:');
      
      // Find entities that spaCy found but regex missed
      const spacyOnlyEntities = comparison.spacyResults.entities.filter(spacyEntity => 
        !comparison.regexResults.entities.some(regexEntity => 
          regexEntity.value.toLowerCase() === spacyEntity.value.toLowerCase()
        )
      );
      
      if (spacyOnlyEntities.length > 0) {
        console.log('\n   ✅ spaCy Advantages (entities found by spaCy but missed by regex):');
        spacyOnlyEntities.forEach(entity => {
          console.log(`      • "${entity.value}" (${entity.type}) - ${entity.metadata?.spacyDescription || 'Context-aware detection'}`);
        });
      }

      // Find entities that regex found but spaCy missed (usually false positives)
      const regexOnlyEntities = comparison.regexResults.entities.filter(regexEntity => 
        !comparison.spacyResults.entities.some(spacyEntity => 
          spacyEntity.value.toLowerCase() === regexEntity.value.toLowerCase()
        )
      );
      
      if (regexOnlyEntities.length > 0) {
        console.log('\n   ❌ Regex Limitations (potential false positives or missed context):');
        regexOnlyEntities.forEach(entity => {
          console.log(`      • "${entity.value}" (${entity.type}) - Pattern match without context`);
        });
      }

    } catch (error) {
      console.log(`\n❌ Error processing test case: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('   This might be due to missing spaCy installation.');
      console.log('   Install with: pip install spacy && python -m spacy download en_core_web_trf');
    }
  }

  // Overall Summary
  console.log('\n\n🎯 Overall Comparison Summary');
  console.log('=' .repeat(80));
  
  console.log('\n🧠 Why spaCy is Superior:');
  
  const spacyAdvantages = [
    '🎯 Context-Aware Recognition - Understands linguistic context and word relationships',
    '📚 Pre-trained Models - Trained on large, diverse corpora (OntoNotes 5.0)',
    '🔍 Ambiguity Resolution - Distinguishes between different meanings of the same word',
    '🌐 Multi-word Entity Handling - Properly identifies complex entity spans',
    '🧬 Transformer Architecture - State-of-the-art neural network models available',
    '📊 Dependency Parsing - Understands grammatical structure and relationships',
    '🏷️ Rich Entity Types - 20+ built-in entity types with detailed descriptions',
    '🌍 Language Optimization - Specialized models for different languages',
    '🔧 Customizable - Can be fine-tuned for domain-specific applications',
    '📈 Continuous Learning - Models improve with new training data'
  ];

  spacyAdvantages.forEach(advantage => {
    console.log(`   ${advantage}`);
  });

  console.log('\n🔍 Regex Limitations:');
  
  const regexLimitations = [
    '❌ Pattern-Only Matching - No understanding of context or meaning',
    '🔄 Manual Maintenance - Requires constant pattern updates and refinements',
    '🎭 Ambiguity Issues - Cannot distinguish between different meanings',
    '📝 Variation Handling - Struggles with spelling variations and formats',
    '🧠 No Linguistic Knowledge - Lacks understanding of grammar and syntax',
    '⚠️ False Positives - High rate of incorrect matches',
    '🔢 Limited Scope - Only finds patterns explicitly programmed',
    '🌐 Language Barriers - Requires separate patterns for each language',
    '📊 No Confidence Scoring - Cannot assess match quality',
    '🔧 Brittle Implementation - Breaks easily with text variations'
  ];

  regexLimitations.forEach(limitation => {
    console.log(`   ${limitation}`);
  });

  console.log('\n💡 Recommendations:');
  console.log('   🚀 Use spaCy for Production - Superior accuracy and robustness');
  console.log('   🔧 Use Regex for Fallback - Simple patterns when spaCy is unavailable');
  console.log('   🎯 Combine Both Approaches - spaCy primary, regex as backup');
  console.log('   📚 Train Custom Models - Fine-tune spaCy for domain-specific needs');
  console.log('   🔄 Regular Updates - Keep spaCy models updated for best performance');

  console.log('\n📦 Installation Instructions:');
  console.log('   pip install spacy');
  console.log('   python -m spacy download en_core_web_sm    # Small model (50MB)');
  console.log('   python -m spacy download en_core_web_lg    # Large model (750MB)');
  console.log('   python -m spacy download en_core_web_trf   # Transformer model (560MB)');

  console.log('\n🎉 spaCy vs Regex Comparison Complete!');
  console.log('=' .repeat(80));
}

// Run the demo
if (require.main === module) {
  demonstrateSpacyVsRegex().catch(console.error);
}

export { demonstrateSpacyVsRegex }; 