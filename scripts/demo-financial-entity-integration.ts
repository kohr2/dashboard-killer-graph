// Financial Entity Integration Demo
// Shows how entity recognition works with core CRM and FIBO financial extension

import { FinancialEntityIntegrationService, FinancialEntityContext } from '../src/extensions/financial/application/services/financial-entity-integration.service';
import { InMemoryContactRepository } from '../src/crm-core/infrastructure/repositories/in-memory-contact-repository';
import { Contact } from '../src/crm-core/domain/entities/contact';

// Sample financial content for different scenarios
const financialScenarios = [
  {
    name: "Investment Advisory Email",
    content: `
      Dear Mr. Johnson,
      
      Following our discussion about your portfolio diversification, I've prepared the following recommendations:
      
      1. Goldman Sachs Group Inc. (NYSE: GS) - Current price $350.25
      2. Apple Inc. (NASDAQ: AAPL) - Strong buy recommendation 
      3. Treasury Bond CUSIP: 912828XG0 - 10-year maturity, 4.2% yield
      4. EUR/USD currency pair - Consider hedging with €500,000 position
      
      Your current portfolio value stands at $2.5 million with a P/E ratio of 18.5.
      The recommended allocation would reduce your risk profile from 0.85 to 0.65.
      
      Please review the attached prospectus and let me know your thoughts.
      
      Best regards,
      Sarah Chen, CFA
      Morgan Stanley Investment Management
    `,
    context: {
      contactId: 'contact_johnson_001',
      emailId: 'email_investment_advice_001',
      documentType: 'EMAIL' as const,
      businessContext: 'ADVISORY' as const,
      riskTolerance: 'MEDIUM' as const,
      clientSegment: 'CORPORATE' as const
    }
  },
  {
    name: "Trading Confirmation",
    content: `
      TRADE CONFIRMATION
      
      Client: Acme Corporation
      Account: 123456789
      
      Transaction Details:
      - BUY 1,000 shares Microsoft Corporation (MSFT)
      - Price: $415.50 per share
      - Total Value: $415,500.00
      - Commission: $25.00
      - Settlement Date: 2024-03-15
      
      Counterparty: JP Morgan Securities LLC
      LEI: 7H6GLXDRUGQFU57RNE97
      
      This transaction has been executed in accordance with MiFID II regulations.
      
      Risk Disclosure: Derivative instruments carry substantial risk of loss.
    `,
    context: {
      contactId: 'contact_acme_corp_001',
      documentType: 'DOCUMENT' as const,
      businessContext: 'TRADING' as const,
      riskTolerance: 'HIGH' as const,
      clientSegment: 'INSTITUTIONAL' as const
    }
  },
  {
    name: "Compliance Report",
    content: `
      MONTHLY COMPLIANCE REPORT - MARCH 2024
      
      Large Transaction Alerts:
      1. Wire Transfer: $750,000 USD from Cayman Islands entity
      2. Derivative Trade: Interest Rate Swap, notional $10M USD
      3. Currency Exchange: £2.5M GBP to USD conversion
      
      Regulatory Filings Required:
      - Form 13F due April 15th
      - EMIR reporting for OTC derivatives
      - FATCA reporting for US persons
      
      Risk Metrics:
      - VaR (95%, 1-day): $125,000
      - Stress Test Loss: $2.1M
      - Leverage Ratio: 3.2:1
      
      AML Alerts: 2 transactions flagged for enhanced due diligence
      
      Prepared by: Risk Management Department
      Bank of International Settlements ID: BIS123456
    `,
    context: {
      documentType: 'REPORT' as const,
      businessContext: 'COMPLIANCE' as const,
      clientSegment: 'INSTITUTIONAL' as const
    }
  },
  {
    name: "Loan Application",
    content: `
      COMMERCIAL LOAN APPLICATION
      
      Borrower: TechStart Inc.
      CEO: David Kim
      Requested Amount: $5,000,000 USD
      Purpose: Equipment financing and working capital
      
      Financial Information:
      - Annual Revenue: $12.5M
      - EBITDA: $2.8M (22.4% margin)
      - Debt-to-Equity Ratio: 0.45
      - Current Ratio: 2.1
      
      Collateral:
      - Real Estate: 123 Innovation Drive, Austin, TX 78701
      - Equipment: Manufacturing equipment valued at $3.2M
      - Accounts Receivable: $1.8M
      
      Credit Rating: BB+ (S&P)
      Interest Rate: Prime + 2.5% (currently 8.75%)
      Term: 60 months
      
      Loan Officer: Jennifer Martinez
      Wells Fargo Commercial Banking
    `,
    context: {
      contactId: 'contact_techstart_001',
      documentType: 'DOCUMENT' as const,
      businessContext: 'LENDING' as const,
      riskTolerance: 'MEDIUM' as const,
      clientSegment: 'CORPORATE' as const
    }
  }
];

async function demonstrateFinancialEntityIntegration() {
  console.log('🏦 Financial Entity Integration with Core CRM Demo');
  console.log('=' .repeat(80));
  
  // Initialize services
  const contactRepository = new InMemoryContactRepository();
  const financialService = new FinancialEntityIntegrationService(contactRepository);
  
  // Create sample contacts
  await setupSampleContacts(contactRepository);
  
  console.log('\n📋 Demo Scenarios:');
  financialScenarios.forEach((scenario, index) => {
    console.log(`   ${index + 1}. ${scenario.name}`);
  });
  
  // Process each scenario
  for (const [index, scenario] of financialScenarios.entries()) {
    await processFinancialScenario(financialService, scenario, index + 1);
  }
  
  // Show overall integration summary
  await showIntegrationSummary(contactRepository);
  
  console.log('\n🎉 Financial Entity Integration Demo Complete!');
  console.log('=' .repeat(80));
}

async function setupSampleContacts(repository: InMemoryContactRepository) {
  console.log('\n👥 Setting up sample contacts...');
  
  const contacts = [
    new Contact(
      'contact_johnson_001',
      'Robert Johnson',
      'robert.johnson@email.com',
      '+1-555-0101',
      'Senior Portfolio Manager',
      'Johnson Investment Group'
    ),
    new Contact(
      'contact_acme_corp_001',
      'Acme Corporation',
      'trading@acme-corp.com',
      '+1-555-0102',
      'Corporate Account',
      'Acme Corporation'
    ),
    new Contact(
      'contact_techstart_001',
      'David Kim',
      'david.kim@techstart.com',
      '+1-555-0103',
      'CEO',
      'TechStart Inc.'
    )
  ];
  
  for (const contact of contacts) {
    await repository.save(contact);
    console.log(`   ✅ Created contact: ${contact.getName()}`);
  }
}

async function processFinancialScenario(
  service: FinancialEntityIntegrationService,
  scenario: any,
  scenarioNumber: number
) {
  console.log(`\n\n📧 Scenario ${scenarioNumber}: ${scenario.name}`);
  console.log('=' .repeat(80));
  
  console.log('\n📝 Content Preview:');
  console.log(scenario.content.substring(0, 200) + '...');
  
  console.log('\n🎯 Context:');
  Object.entries(scenario.context).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  
  try {
    console.log('\n🔄 Processing financial content...');
    const startTime = Date.now();
    
    const result = await service.processFinancialContent(
      scenario.content,
      scenario.context as FinancialEntityContext
    );
    
    const processingTime = Date.now() - startTime;
    
    // Show extraction results
    console.log('\n📊 Entity Extraction Results:');
    console.log(`   ⏱️  Processing Time: ${processingTime}ms`);
    console.log(`   📈 Total Entities: ${result.extractionResult.entityCount}`);
    console.log(`   🎯 Overall Confidence: ${(result.extractionResult.confidence * 100).toFixed(1)}%`);
    
    // Show core entities
    const coreEntities = result.extractionResult.entities.filter(e => 
      !e.metadata?.entityCategory || e.metadata.entityCategory === 'GENERAL'
    );
    
    if (coreEntities.length > 0) {
      console.log('\n🧠 Core CRM Entities (spaCy + O-CREAM-v2):');
      coreEntities.slice(0, 5).forEach((entity, idx) => {
        const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.5 ? '🟡' : '🔴';
        console.log(`   ${idx + 1}. ${confidenceIcon} "${entity.value}" → ${entity.type} (${(entity.confidence * 100).toFixed(1)}%)`);
        
        if (entity.metadata?.spacyLabel) {
          console.log(`      spaCy: ${entity.metadata.spacyLabel} - ${entity.metadata.spacyDescription}`);
        }
      });
    }
    
    // Show financial entities
    const financialEntities = result.extractionResult.extensionResults.financial || [];
    if (financialEntities.length > 0) {
      console.log('\n🏦 Financial Extension Entities (FIBO):');
      financialEntities.slice(0, 8).forEach((entity, idx) => {
        const confidenceIcon = entity.confidence > 0.8 ? '🟢' : entity.confidence > 0.5 ? '🟡' : '🔴';
        console.log(`   ${idx + 1}. ${confidenceIcon} "${entity.value}" → ${entity.type} (${(entity.confidence * 100).toFixed(1)}%)`);
        
        if (entity.metadata?.description) {
          console.log(`      FIBO: ${entity.metadata.description}`);
        }
      });
    }
    
    // Show FIBO entities created
    console.log(`\n🏗️  FIBO Ontology Entities Created: ${result.fiboEntities.length}`);
    result.fiboEntities.forEach((entity, idx) => {
      console.log(`   ${idx + 1}. ${entity.getOntologicalType()} - ${entity.id}`);
      
      // Show specific FIBO properties
      if (entity.calculateRisk) {
        const risk = entity.calculateRisk();
        console.log(`      Risk: ${risk.category} (${(risk.score * 100).toFixed(1)}%)`);
      }
      
      if (entity.getComplianceRequirements) {
        const compliance = entity.getComplianceRequirements();
        if (compliance.length > 0) {
          console.log(`      Compliance: ${compliance.slice(0, 2).join(', ')}`);
        }
      }
    });
    
    // Show financial insights
    console.log('\n💡 Financial Insights:');
    
    // Portfolio Analysis
    if (result.insights.portfolioAnalysis.totalValue > 0) {
      console.log(`   💰 Portfolio Value: $${result.insights.portfolioAnalysis.totalValue.toLocaleString()}`);
      console.log(`   ⚠️  Risk Score: ${(result.insights.portfolioAnalysis.riskProfile.score * 100).toFixed(1)}%`);
      console.log(`   📊 Instruments: ${result.insights.portfolioAnalysis.instruments.length}`);
      
      // Risk distribution
      const riskDist = result.insights.portfolioAnalysis.riskProfile.distribution;
      if (Object.keys(riskDist).length > 0) {
        console.log('   📈 Risk Distribution:');
        Object.entries(riskDist).forEach(([risk, count]) => {
          console.log(`      ${risk}: ${count} instruments`);
        });
      }
    }
    
    // Transaction Analysis
    if (result.insights.transactionAnalysis.volume > 0) {
      console.log(`   💳 Transactions: ${result.insights.transactionAnalysis.volume}`);
      console.log(`   💵 Transaction Value: $${result.insights.transactionAnalysis.totalValue.toLocaleString()}`);
      
      if (result.insights.transactionAnalysis.complianceAlerts.length > 0) {
        console.log(`   ⚠️  Compliance Alerts: ${result.insights.transactionAnalysis.complianceAlerts.length}`);
        result.insights.transactionAnalysis.complianceAlerts.slice(0, 2).forEach(alert => {
          console.log(`      • ${alert}`);
        });
      }
    }
    
    // Client Profile
    console.log(`   👤 Risk Assessment: ${result.insights.clientProfile.riskAssessment}`);
    console.log(`   ✅ Compliance Status: ${result.insights.clientProfile.complianceStatus}`);
    console.log(`   💎 Relationship Value: $${result.insights.clientProfile.relationshipValue.toLocaleString()}`);
    
    if (result.insights.clientProfile.investmentPreferences.length > 0) {
      console.log(`   🎯 Investment Preferences: ${result.insights.clientProfile.investmentPreferences.join(', ')}`);
    }
    
    // Show CRM integration
    console.log('\n🔗 CRM Integration Results:');
    console.log(`   👥 Contact Updates: ${result.crmIntegration.contactUpdates.length}`);
    console.log(`   📚 Knowledge Elements: ${result.crmIntegration.knowledgeElements.length}`);
    console.log(`   📋 Activities Created: ${result.crmIntegration.activities.length}`);
    console.log(`   🔗 Relationships: ${result.crmIntegration.relationships.length}`);
    
    // Show recommendations
    if (result.insights.recommendations.immediate.length > 0) {
      console.log('\n🚨 Immediate Recommendations:');
      result.insights.recommendations.immediate.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    if (result.insights.recommendations.strategic.length > 0) {
      console.log('\n📈 Strategic Recommendations:');
      result.insights.recommendations.strategic.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    if (result.insights.recommendations.compliance.length > 0) {
      console.log('\n⚖️  Compliance Recommendations:');
      result.insights.recommendations.compliance.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Show knowledge elements created
    if (result.crmIntegration.knowledgeElements.length > 0) {
      console.log('\n📊 O-CREAM-v2 Knowledge Elements:');
      result.crmIntegration.knowledgeElements.forEach((element, idx) => {
        console.log(`   ${idx + 1}. ${element.type} - ${element.category}`);
        console.log(`      Confidence: ${(element.confidence * 100).toFixed(1)}%`);
        console.log(`      Source: ${element.source}`);
      });
    }
    
  } catch (error) {
    console.log(`\n❌ Error processing scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   This might be due to missing dependencies or configuration.');
  }
}

async function showIntegrationSummary(repository: InMemoryContactRepository) {
  console.log('\n\n📈 Integration Summary');
  console.log('=' .repeat(80));
  
  console.log('\n🔄 How Entity Recognition Integrates:');
  
  console.log('\n1. 🧠 Core CRM Entity Extraction:');
  console.log('   • spaCy NLP models identify standard entities (PERSON, ORG, MONEY, DATE)');
  console.log('   • O-CREAM-v2 ontology categorizes entities using DOLCE framework');
  console.log('   • Entities become knowledge elements in the ontology graph');
  console.log('   • Activities are created to track entity extraction events');
  
  console.log('\n2. 🏦 Financial Extension (FIBO):');
  console.log('   • Specialized patterns detect financial instruments, ratios, institutions');
  console.log('   • FIBO ontology creates compliant financial entities');
  console.log('   • Risk assessment and compliance checking integrated');
  console.log('   • Portfolio analysis and market intelligence generated');
  
  console.log('\n3. 🔗 Cross-Domain Integration:');
  console.log('   • Core entities (contacts, organizations) linked to financial entities');
  console.log('   • Relationship mapping between different entity types');
  console.log('   • Unified knowledge graph spanning CRM and financial domains');
  console.log('   • Context-aware entity resolution and validation');
  
  console.log('\n4. 📊 Intelligence Generation:');
  console.log('   • Client risk profiling based on extracted financial data');
  console.log('   • Investment preference inference from entity patterns');
  console.log('   • Compliance monitoring and alert generation');
  console.log('   • Relationship value calculation and opportunity identification');
  
  console.log('\n🏗️  Architecture Benefits:');
  console.log('   ✅ Extensible - New domains (healthcare, legal) can be added');
  console.log('   ✅ Ontology-driven - Semantic understanding and reasoning');
  console.log('   ✅ Context-aware - Entities understood in business context');
  console.log('   ✅ Compliant - FIBO and regulatory standards supported');
  console.log('   ✅ Integrated - Single knowledge graph across all domains');
  
  console.log('\n📋 Extension Framework:');
  console.log('   • Core: O-CREAM-v2 + spaCy for universal entity recognition');
  console.log('   • Financial: FIBO entities + risk analysis + compliance');
  console.log('   • Healthcare: Medical entities + patient data + HIPAA compliance');
  console.log('   • Legal: Contract entities + clause analysis + legal research');
  console.log('   • Real Estate: Property entities + market analysis + valuations');
  
  // Show updated contacts
  console.log('\n👥 Contact Updates:');
  try {
    const allContacts = await repository.findAll();
    for (const contact of allContacts) {
      console.log(`   📧 ${contact.getName()}:`);
      
      const preferences = contact.getPreferences();
      if (preferences.financial_profile) {
        const profile = preferences.financial_profile;
        console.log(`      💰 Portfolio Value: $${profile.portfolioValue?.toLocaleString() || '0'}`);
        console.log(`      ⚠️  Risk Profile: ${(profile.riskProfile * 100).toFixed(1)}%`);
        console.log(`      🏷️  Client Segment: ${profile.clientSegment || 'Unknown'}`);
        console.log(`      ✅ Compliance: ${profile.complianceStatus || 'Unknown'}`);
      } else {
        console.log('      No financial profile data');
      }
    }
  } catch (error) {
    console.log('   Error retrieving contact updates');
  }
}

// Run the demo
if (require.main === module) {
  demonstrateFinancialEntityIntegration().catch(console.error);
}

export { demonstrateFinancialEntityIntegration }; 