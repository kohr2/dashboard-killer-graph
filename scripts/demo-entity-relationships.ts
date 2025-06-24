// Entity Relationship Extraction Demo
// Demonstrates relationship mapping between entities extracted by spaCy

import { SpacyEntityExtractionService, SpacyEntityExtractionResult, EntityType, SpacyExtractedEntity } from '../src/crm-core/application/services/spacy-entity-extraction.service';
import { OCreamV2Ontology, createInformationElement, KnowledgeType } from '../src/crm-core/domain/ontology/o-cream-v2';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface EntityRelationship {
  id: string;
  sourceEntity: SpacyExtractedEntity;
  targetEntity: SpacyExtractedEntity;
  relationshipType: RelationshipType;
  confidence: number;
  context: string;
  distance: number; // Character distance between entities
  evidence: string[];
}

enum RelationshipType {
  // Professional relationships
  WORKS_FOR = 'WORKS_FOR',
  EMPLOYED_BY = 'EMPLOYED_BY',
  MANAGES = 'MANAGES',
  REPORTS_TO = 'REPORTS_TO',
  
  // Financial relationships
  OWNS_ACCOUNT = 'OWNS_ACCOUNT',
  TRADES_STOCK = 'TRADES_STOCK',
  INVESTS_IN = 'INVESTS_IN',
  MANAGES_PORTFOLIO = 'MANAGES_PORTFOLIO',
  
  // Communication relationships
  SENDS_EMAIL_TO = 'SENDS_EMAIL_TO',
  RECEIVES_EMAIL_FROM = 'RECEIVES_EMAIL_FROM',
  CONTACTS = 'CONTACTS',
  
  // Location relationships
  LOCATED_IN = 'LOCATED_IN',
  BASED_IN = 'BASED_IN',
  OPERATES_IN = 'OPERATES_IN',
  
  // Transactional relationships
  TRANSFERS_TO = 'TRANSFERS_TO',
  RECEIVES_FROM = 'RECEIVES_FROM',
  PROCESSES_TRANSACTION = 'PROCESSES_TRANSACTION',
  
  // Temporal relationships
  SCHEDULED_FOR = 'SCHEDULED_FOR',
  OCCURRED_ON = 'OCCURRED_ON',
  EXPIRES_ON = 'EXPIRES_ON',
  
  // Compliance relationships
  REVIEWS = 'REVIEWS',
  APPROVES = 'APPROVES',
  MONITORS = 'MONITORS',
  
  // General associations
  ASSOCIATED_WITH = 'ASSOCIATED_WITH',
  MENTIONS = 'MENTIONS',
  REFERENCES = 'REFERENCES'
}

interface RelationshipGraph {
  entities: SpacyExtractedEntity[];
  relationships: EntityRelationship[];
  clusters: EntityCluster[];
  insights: RelationshipInsight[];
}

interface EntityCluster {
  id: string;
  name: string;
  entities: SpacyExtractedEntity[];
  centralEntity: SpacyExtractedEntity;
  clusterType: 'PERSON_NETWORK' | 'ORGANIZATION_NETWORK' | 'FINANCIAL_NETWORK' | 'LOCATION_NETWORK';
  strength: number;
}

interface RelationshipInsight {
  type: 'KEY_PERSON' | 'FINANCIAL_HUB' | 'COMMUNICATION_PATTERN' | 'COMPLIANCE_NETWORK';
  description: string;
  entities: string[];
  confidence: number;
}

class EntityRelationshipExtractor {
  private readonly proximityThreshold = 150; // Characters
  private readonly contextWindow = 100; // Characters for context
  
  constructor() {}
  
  public extractRelationships(
    text: string, 
    entities: SpacyExtractedEntity[]
  ): RelationshipGraph {
    console.log(`🔗 Extracting relationships from ${entities.length} entities...`);
    
    const relationships = this.findEntityRelationships(text, entities);
    const clusters = this.clusterEntities(entities, relationships);
    const insights = this.generateRelationshipInsights(entities, relationships, clusters);
    
    console.log(`   ✅ Found ${relationships.length} relationships`);
    console.log(`   ✅ Identified ${clusters.length} entity clusters`);
    console.log(`   ✅ Generated ${insights.length} insights`);
    
    return {
      entities,
      relationships,
      clusters,
      insights
    };
  }
  
  private findEntityRelationships(
    text: string, 
    entities: SpacyExtractedEntity[]
  ): EntityRelationship[] {
    const relationships: EntityRelationship[] = [];
    
    // Sort entities by position for efficient processing
    const sortedEntities = [...entities].sort((a, b) => a.startIndex - b.startIndex);
    
    for (let i = 0; i < sortedEntities.length; i++) {
      const sourceEntity = sortedEntities[i];
      
      // Look for nearby entities within proximity threshold
      for (let j = i + 1; j < sortedEntities.length; j++) {
        const targetEntity = sortedEntities[j];
        const distance = targetEntity.startIndex - sourceEntity.endIndex;
        
        if (distance > this.proximityThreshold) {
          break; // Entities are too far apart
        }
        
        const relationship = this.analyzeEntityPair(
          text, 
          sourceEntity, 
          targetEntity, 
          distance
        );
        
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }
    
    // Also check for specific patterns regardless of distance
    const patternRelationships = this.findPatternBasedRelationships(text, entities);
    relationships.push(...patternRelationships);
    
    return relationships;
  }
  
  private analyzeEntityPair(
    text: string,
    sourceEntity: SpacyExtractedEntity,
    targetEntity: SpacyExtractedEntity,
    distance: number
  ): EntityRelationship | null {
    
    const contextStart = Math.max(0, sourceEntity.startIndex - this.contextWindow);
    const contextEnd = Math.min(text.length, targetEntity.endIndex + this.contextWindow);
    const context = text.substring(contextStart, contextEnd);
    
    const relationshipType = this.determineRelationshipType(
      sourceEntity, 
      targetEntity, 
      context
    );
    
    if (!relationshipType) {
      return null;
    }
    
    const confidence = this.calculateRelationshipConfidence(
      sourceEntity,
      targetEntity,
      relationshipType,
      distance,
      context
    );
    
    const evidence = this.extractEvidence(context, sourceEntity, targetEntity);
    
    return {
      id: `${sourceEntity.value}_${relationshipType}_${targetEntity.value}`,
      sourceEntity,
      targetEntity,
      relationshipType,
      confidence,
      context: context.trim(),
      distance,
      evidence
    };
  }
  
  private determineRelationshipType(
    sourceEntity: SpacyExtractedEntity,
    targetEntity: SpacyExtractedEntity,
    context: string
  ): RelationshipType | null {
    
    const lowerContext = context.toLowerCase();
    
    // Person-Organization relationships
    if (sourceEntity.type === EntityType.PERSON_NAME && 
        targetEntity.type === EntityType.COMPANY_NAME) {
      
      if (lowerContext.includes('works for') || lowerContext.includes('employed by')) {
        return RelationshipType.WORKS_FOR;
      }
      if (lowerContext.includes('manages') || lowerContext.includes('portfolio manager')) {
        return RelationshipType.MANAGES;
      }
      if (lowerContext.includes('advisor') || lowerContext.includes('dedicated')) {
        return RelationshipType.EMPLOYED_BY;
      }
    }
    
    // Person-Financial relationships
    if (sourceEntity.type === EntityType.PERSON_NAME && 
        (targetEntity.type === EntityType.MONETARY_AMOUNT || 
         targetEntity.type === EntityType.STOCK_SYMBOL)) {
      
      if (lowerContext.includes('portfolio') || lowerContext.includes('investment')) {
        return RelationshipType.MANAGES_PORTFOLIO;
      }
      if (lowerContext.includes('owns') || lowerContext.includes('holds')) {
        return RelationshipType.OWNS_ACCOUNT;
      }
    }
    
    // Organization-Location relationships
    if (targetEntity.type === EntityType.LOCATION &&
        (sourceEntity.type === EntityType.COMPANY_NAME || 
         sourceEntity.type === EntityType.FINANCIAL_INSTITUTION)) {
      
      if (lowerContext.includes('located') || lowerContext.includes('based')) {
        return RelationshipType.BASED_IN;
      }
      if (lowerContext.includes('operates') || lowerContext.includes('office')) {
        return RelationshipType.OPERATES_IN;
      }
    }
    
    // Communication relationships
    if (sourceEntity.type === EntityType.EMAIL_ADDRESS && 
        targetEntity.type === EntityType.EMAIL_ADDRESS) {
      
      if (lowerContext.includes('from:') && lowerContext.includes('to:')) {
        return RelationshipType.SENDS_EMAIL_TO;
      }
    }
    
    // Financial transaction relationships
    if (sourceEntity.type === EntityType.MONETARY_AMOUNT &&
        targetEntity.type === EntityType.FINANCIAL_INSTITUTION) {
      
      if (lowerContext.includes('transfer') || lowerContext.includes('wire')) {
        return RelationshipType.TRANSFERS_TO;
      }
      if (lowerContext.includes('transaction') || lowerContext.includes('amount')) {
        return RelationshipType.PROCESSES_TRANSACTION;
      }
    }
    
    // Compliance relationships
    if (sourceEntity.type === EntityType.PERSON_NAME &&
        (lowerContext.includes('compliance') || lowerContext.includes('review'))) {
      
      if (lowerContext.includes('officer') || lowerContext.includes('reviewer')) {
        return RelationshipType.REVIEWS;
      }
      if (lowerContext.includes('approves') || lowerContext.includes('authorization')) {
        return RelationshipType.APPROVES;
      }
    }
    
    // Temporal relationships
    if (targetEntity.type === EntityType.DATE || targetEntity.type === EntityType.TIME) {
      
      if (lowerContext.includes('scheduled') || lowerContext.includes('meeting')) {
        return RelationshipType.SCHEDULED_FOR;
      }
      if (lowerContext.includes('deadline') || lowerContext.includes('expires')) {
        return RelationshipType.EXPIRES_ON;
      }
    }
    
    // Default association for nearby entities
    return RelationshipType.ASSOCIATED_WITH;
  }
  
  private findPatternBasedRelationships(
    text: string, 
    entities: SpacyExtractedEntity[]
  ): EntityRelationship[] {
    const relationships: EntityRelationship[] = [];
    
    // Email signature patterns
    const emailPattern = /from:\s*([^\n]+)\s*to:\s*([^\n]+)/gi;
    let emailMatch: RegExpExecArray | null;
    while ((emailMatch = emailPattern.exec(text)) !== null) {
      const fromEmail = entities.find(e => e.type === EntityType.EMAIL_ADDRESS && 
                                          emailMatch![1].includes(e.value));
      const toEmails = entities.filter(e => e.type === EntityType.EMAIL_ADDRESS && 
                                           emailMatch![2].includes(e.value));
      
      if (fromEmail && toEmails.length > 0) {
        toEmails.forEach(toEmail => {
          relationships.push({
            id: `${fromEmail.value}_SENDS_EMAIL_TO_${toEmail.value}`,
            sourceEntity: fromEmail,
            targetEntity: toEmail,
            relationshipType: RelationshipType.SENDS_EMAIL_TO,
            confidence: 0.95,
            context: emailMatch![0],
            distance: 0,
            evidence: ['Email header pattern']
          });
        });
      }
    }
    
    // Phone contact patterns
    const phoneContactPattern = /contact\s+([^,\n]+)\s+at\s+\((\d{3})\)\s*(\d{3})-(\d{4})/gi;
    let phoneMatch: RegExpExecArray | null;
    while ((phoneMatch = phoneContactPattern.exec(text)) !== null) {
      const personName = entities.find(e => e.type === EntityType.PERSON_NAME && 
                                           phoneMatch![1].toLowerCase().includes(e.value.toLowerCase()));
      const phoneNumber = entities.find(e => e.type === EntityType.PHONE_NUMBER && 
                                             e.value.includes(phoneMatch![2]));
      
      if (personName && phoneNumber) {
        relationships.push({
          id: `${personName.value}_CONTACTS_${phoneNumber.value}`,
          sourceEntity: personName,
          targetEntity: phoneNumber,
          relationshipType: RelationshipType.CONTACTS,
          confidence: 0.9,
          context: phoneMatch![0],
          distance: 0,
          evidence: ['Phone contact pattern']
        });
      }
    }
    
    return relationships;
  }
  
  private calculateRelationshipConfidence(
    sourceEntity: SpacyExtractedEntity,
    targetEntity: SpacyExtractedEntity,
    relationshipType: RelationshipType,
    distance: number,
    context: string
  ): number {
    
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for closer entities
    if (distance < 50) confidence += 0.3;
    else if (distance < 100) confidence += 0.2;
    else if (distance < 150) confidence += 0.1;
    
    // Higher confidence for high-confidence entities
    const avgEntityConfidence = (sourceEntity.confidence + targetEntity.confidence) / 2;
    confidence += avgEntityConfidence * 0.3;
    
    // Higher confidence for specific relationship types
    const highConfidenceTypes = [
      RelationshipType.SENDS_EMAIL_TO,
      RelationshipType.WORKS_FOR,
      RelationshipType.BASED_IN,
      RelationshipType.MANAGES_PORTFOLIO
    ];
    
    if (highConfidenceTypes.includes(relationshipType)) {
      confidence += 0.2;
    }
    
    // Context quality bonus
    const contextKeywords = [
      'portfolio manager', 'compliance officer', 'dedicated advisor',
      'wire transfer', 'transaction amount', 'based in', 'located at'
    ];
    
    const matchingKeywords = contextKeywords.filter(keyword => 
      context.toLowerCase().includes(keyword)
    );
    
    confidence += matchingKeywords.length * 0.1;
    
    return Math.min(0.99, confidence);
  }
  
  private extractEvidence(
    context: string, 
    sourceEntity: SpacyExtractedEntity, 
    targetEntity: SpacyExtractedEntity
  ): string[] {
    const evidence: string[] = [];
    const lowerContext = context.toLowerCase();
    
    // Professional evidence
    if (lowerContext.includes('portfolio manager')) evidence.push('Professional title');
    if (lowerContext.includes('compliance officer')) evidence.push('Compliance role');
    if (lowerContext.includes('dedicated advisor')) evidence.push('Advisory relationship');
    
    // Financial evidence
    if (lowerContext.includes('portfolio value')) evidence.push('Portfolio management');
    if (lowerContext.includes('transaction amount')) evidence.push('Financial transaction');
    if (lowerContext.includes('wire transfer')) evidence.push('Money transfer');
    
    // Location evidence
    if (lowerContext.includes('located') || lowerContext.includes('based')) {
      evidence.push('Location reference');
    }
    
    // Communication evidence
    if (lowerContext.includes('contact') || lowerContext.includes('call')) {
      evidence.push('Communication method');
    }
    
    // Proximity evidence
    evidence.push(`Entities within ${Math.abs(targetEntity.startIndex - sourceEntity.endIndex)} characters`);
    
    return evidence;
  }
  
  private clusterEntities(
    entities: SpacyExtractedEntity[], 
    relationships: EntityRelationship[]
  ): EntityCluster[] {
    const clusters: EntityCluster[] = [];
    
    // Person-centered clusters
    const personEntities = entities.filter(e => e.type === EntityType.PERSON_NAME);
    personEntities.forEach(person => {
      const relatedEntities = this.findRelatedEntities(person, relationships);
      if (relatedEntities.length > 0) {
        clusters.push({
          id: `person_cluster_${person.value.replace(/\s+/g, '_')}`,
          name: `${person.value} Network`,
          entities: [person, ...relatedEntities],
          centralEntity: person,
          clusterType: 'PERSON_NETWORK',
          strength: relatedEntities.length / entities.length
        });
      }
    });
    
    // Organization-centered clusters
    const orgEntities = entities.filter(e => 
      e.type === EntityType.COMPANY_NAME || e.type === EntityType.FINANCIAL_INSTITUTION
    );
    orgEntities.forEach(org => {
      const relatedEntities = this.findRelatedEntities(org, relationships);
      if (relatedEntities.length > 1) {
        clusters.push({
          id: `org_cluster_${org.value.replace(/\s+/g, '_')}`,
          name: `${org.value} Network`,
          entities: [org, ...relatedEntities],
          centralEntity: org,
          clusterType: 'ORGANIZATION_NETWORK',
          strength: relatedEntities.length / entities.length
        });
      }
    });
    
    // Financial clusters
    const financialEntities = entities.filter(e => 
      e.type === EntityType.MONETARY_AMOUNT || 
      e.type === EntityType.STOCK_SYMBOL ||
      e.type === EntityType.FINANCIAL_INSTRUMENT
    );
    
    if (financialEntities.length > 2) {
      const relatedEntities = financialEntities.flatMap(fe => 
        this.findRelatedEntities(fe, relationships)
      );
      
      clusters.push({
        id: 'financial_cluster',
        name: 'Financial Network',
        entities: [...financialEntities, ...relatedEntities],
        centralEntity: financialEntities[0],
        clusterType: 'FINANCIAL_NETWORK',
        strength: financialEntities.length / entities.length
      });
    }
    
    return clusters;
  }
  
  private findRelatedEntities(
    centralEntity: SpacyExtractedEntity, 
    relationships: EntityRelationship[]
  ): SpacyExtractedEntity[] {
    const related = new Set<SpacyExtractedEntity>();
    
    relationships.forEach(rel => {
      if (rel.sourceEntity.value === centralEntity.value) {
        related.add(rel.targetEntity);
      } else if (rel.targetEntity.value === centralEntity.value) {
        related.add(rel.sourceEntity);
      }
    });
    
    return Array.from(related);
  }
  
  private generateRelationshipInsights(
    entities: SpacyExtractedEntity[],
    relationships: EntityRelationship[],
    clusters: EntityCluster[]
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];
    
    // Key person insight
    const personClusters = clusters.filter(c => c.clusterType === 'PERSON_NETWORK');
    if (personClusters.length > 0) {
      const keyPerson = personClusters.reduce((prev, current) => 
        prev.strength > current.strength ? prev : current
      );
      
      insights.push({
        type: 'KEY_PERSON',
        description: `${keyPerson.centralEntity.value} is a key person with ${keyPerson.entities.length - 1} connected entities`,
        entities: keyPerson.entities.map(e => e.value),
        confidence: keyPerson.strength
      });
    }
    
    // Financial hub insight
    const financialRels = relationships.filter(r => 
      r.relationshipType === RelationshipType.MANAGES_PORTFOLIO ||
      r.relationshipType === RelationshipType.PROCESSES_TRANSACTION ||
      r.relationshipType === RelationshipType.TRANSFERS_TO
    );
    
    if (financialRels.length > 0) {
      insights.push({
        type: 'FINANCIAL_HUB',
        description: `Detected ${financialRels.length} financial relationships involving portfolio management and transactions`,
        entities: [...new Set(financialRels.flatMap(r => [r.sourceEntity.value, r.targetEntity.value]))],
        confidence: financialRels.reduce((sum, r) => sum + r.confidence, 0) / financialRels.length
      });
    }
    
    // Communication pattern insight
    const commRels = relationships.filter(r => 
      r.relationshipType === RelationshipType.SENDS_EMAIL_TO ||
      r.relationshipType === RelationshipType.CONTACTS
    );
    
    if (commRels.length > 0) {
      insights.push({
        type: 'COMMUNICATION_PATTERN',
        description: `Identified ${commRels.length} communication relationships between entities`,
        entities: [...new Set(commRels.flatMap(r => [r.sourceEntity.value, r.targetEntity.value]))],
        confidence: commRels.reduce((sum, r) => sum + r.confidence, 0) / commRels.length
      });
    }
    
    // Compliance network insight
    const complianceRels = relationships.filter(r => 
      r.relationshipType === RelationshipType.REVIEWS ||
      r.relationshipType === RelationshipType.APPROVES ||
      r.relationshipType === RelationshipType.MONITORS
    );
    
    if (complianceRels.length > 0) {
      insights.push({
        type: 'COMPLIANCE_NETWORK',
        description: `Found ${complianceRels.length} compliance-related relationships`,
        entities: [...new Set(complianceRels.flatMap(r => [r.sourceEntity.value, r.targetEntity.value]))],
        confidence: complianceRels.reduce((sum, r) => sum + r.confidence, 0) / complianceRels.length
      });
    }
    
    return insights;
  }
}

async function demonstrateEntityRelationships() {
  console.log('🔗 Entity Relationship Extraction Demo');
  console.log('=' .repeat(100));
  console.log('🧠 Using spaCy entities to map business relationships');
  
  const spacyExtractor = new SpacyEntityExtractionService();
  const relationshipExtractor = new EntityRelationshipExtractor();
  
  // Sample business email with rich entity relationships
  const businessEmail = {
    subject: 'Portfolio Review Meeting - Goldman Sachs Private Wealth',
    content: `Dear Mr. Robert Chen,

Your senior portfolio manager Sarah Johnson, CFA will contact you at (212) 555-0199 to schedule your quarterly review meeting for Tuesday, March 15th, 2024 at 2:00 PM EST.

Current portfolio performance summary:
• Total Portfolio Value: $2,850,000 (managed by Goldman Sachs Private Wealth Management)
• Top Holdings:
  - Apple Inc. (NASDAQ: AAPL): 1,200 shares valued at $180,000
  - Microsoft Corporation (NASDAQ: MSFT): 800 shares valued at $240,000  
  - NVIDIA Corporation (NASDAQ: NVDA): 300 shares valued at $210,000

Your dedicated investment advisor Michael Rodriguez, CFA is based in our New York office at 200 Wall Street, New York, NY 10005. For compliance matters, please contact our compliance officer Jennifer Liu, CAMS at jennifer.liu@goldmansachs.com or (212) 555-0288.

Wire transfer authorization for $500,000 to JPMorgan Chase (SWIFT: CHASUS33) has been approved by our risk management team. Transaction will be processed by our operations department within 24 hours.

Best regards,
Goldman Sachs Private Wealth Management Team
200 Wall Street, New York, NY 10005
Phone: (212) 555-0100
Email: wealth.management@goldmansachs.com`
  };
  
  console.log('\n📧 Processing business email for entity relationships...');
  console.log(`   Subject: ${businessEmail.subject}`);
  console.log(`   Content length: ${businessEmail.content.length} characters`);
  
  // Extract entities using spaCy
  console.log('\n🧠 Step 1: Extracting entities with spaCy...');
  const entityResult = await spacyExtractor.extractEntities(businessEmail.content, {
    minConfidence: 0.6,
    includeContext: true
  });
  
  console.log(`   ✅ Extracted ${entityResult.entityCount} entities`);
  console.log(`   🎯 Average confidence: ${(entityResult.confidence * 100).toFixed(1)}%`);
  console.log(`   📋 Entity types: ${entityResult.entityTypes.join(', ')}`);
  
  // Extract relationships
  console.log('\n🔗 Step 2: Extracting entity relationships...');
  const relationshipGraph = relationshipExtractor.extractRelationships(
    businessEmail.content,
    entityResult.entities
  );
  
  // Display results
  console.log('\n📊 RELATIONSHIP EXTRACTION RESULTS');
  console.log('=' .repeat(80));
  console.log(`🔗 Total relationships found: ${relationshipGraph.relationships.length}`);
  console.log(`🏘️  Entity clusters identified: ${relationshipGraph.clusters.length}`);
  console.log(`💡 Relationship insights: ${relationshipGraph.insights.length}`);
  
  // Show detailed relationships
  displayRelationships(relationshipGraph.relationships);
  
  // Show entity clusters
  displayEntityClusters(relationshipGraph.clusters);
  
  // Show insights
  displayRelationshipInsights(relationshipGraph.insights);
  
  // Generate relationship graph visualization data
  await generateRelationshipVisualization(relationshipGraph);
  
  // Test with multiple emails
  await demonstrateMultiEmailRelationships(spacyExtractor, relationshipExtractor);
  
  console.log('\n🎉 Entity Relationship Extraction Demo Complete!');
  console.log('=' .repeat(100));
  console.log('✅ Successfully demonstrated:');
  console.log('   • 🔗 Entity relationship extraction from spaCy results');
  console.log('   • 👥 Person-organization relationship mapping');
  console.log('   • 💰 Financial relationship identification');
  console.log('   • 📧 Communication pattern analysis');
  console.log('   • 🏢 Business network clustering');
  console.log('   • 📊 Relationship confidence scoring');
  console.log('   • 💡 Automated business insights');
}

function displayRelationships(relationships: EntityRelationship[]) {
  console.log('\n🔗 ENTITY RELATIONSHIPS');
  console.log('-' .repeat(60));
  
  // Group by relationship type
  const relationshipsByType = relationships.reduce((acc, rel) => {
    if (!acc[rel.relationshipType]) acc[rel.relationshipType] = [];
    acc[rel.relationshipType].push(rel);
    return acc;
  }, {} as Record<string, EntityRelationship[]>);
  
  Object.entries(relationshipsByType).forEach(([type, rels]) => {
    console.log(`\n📌 ${type.replace(/_/g, ' ')} (${rels.length}):`);
    
    rels.slice(0, 5).forEach((rel, idx) => {
      const confidenceIcon = rel.confidence > 0.8 ? '🟢' : rel.confidence > 0.7 ? '🟡' : '🔴';
      console.log(`   ${idx + 1}. ${confidenceIcon} "${rel.sourceEntity.value}" → "${rel.targetEntity.value}"`);
      console.log(`      Confidence: ${(rel.confidence * 100).toFixed(1)}%`);
      console.log(`      Distance: ${rel.distance} chars`);
      console.log(`      Evidence: ${rel.evidence.join(', ')}`);
      if (rel.context.length > 0) {
        console.log(`      Context: "${rel.context.substring(0, 80)}..."`);
      }
    });
    
    if (rels.length > 5) {
      console.log(`   ... and ${rels.length - 5} more`);
    }
  });
}

function displayEntityClusters(clusters: EntityCluster[]) {
  console.log('\n🏘️  ENTITY CLUSTERS');
  console.log('-' .repeat(60));
  
  clusters.forEach((cluster, idx) => {
    console.log(`\n${idx + 1}. 🏷️  ${cluster.name} (${cluster.clusterType})`);
    console.log(`   Central Entity: "${cluster.centralEntity.value}" (${cluster.centralEntity.type})`);
    console.log(`   Cluster Strength: ${(cluster.strength * 100).toFixed(1)}%`);
    console.log(`   Connected Entities (${cluster.entities.length}):`);
    
    cluster.entities.slice(0, 8).forEach((entity, entityIdx) => {
      if (entity.value !== cluster.centralEntity.value) {
        console.log(`      • ${entity.value} (${entity.type})`);
      }
    });
    
    if (cluster.entities.length > 8) {
      console.log(`      ... and ${cluster.entities.length - 8} more`);
    }
  });
}

function displayRelationshipInsights(insights: RelationshipInsight[]) {
  console.log('\n💡 RELATIONSHIP INSIGHTS');
  console.log('-' .repeat(60));
  
  insights.forEach((insight, idx) => {
    const confidenceIcon = insight.confidence > 0.8 ? '🟢' : insight.confidence > 0.7 ? '🟡' : '🔴';
    console.log(`\n${idx + 1}. ${confidenceIcon} ${insight.type.replace(/_/g, ' ')}`);
    console.log(`   ${insight.description}`);
    console.log(`   Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
    console.log(`   Key Entities: ${insight.entities.slice(0, 5).join(', ')}${insight.entities.length > 5 ? '...' : ''}`);
  });
}

async function generateRelationshipVisualization(graph: RelationshipGraph) {
  console.log('\n📊 Generating relationship visualization data...');
  
  // Create network graph data for visualization tools
  const networkData = {
    nodes: graph.entities.map(entity => ({
      id: entity.value,
      label: entity.value,
      type: entity.type,
      confidence: entity.confidence,
      group: entity.type,
      size: Math.max(10, entity.confidence * 20)
    })),
    edges: graph.relationships.map(rel => ({
      from: rel.sourceEntity.value,
      to: rel.targetEntity.value,
      label: rel.relationshipType.replace(/_/g, ' '),
      weight: rel.confidence,
      confidence: rel.confidence,
      distance: rel.distance,
      color: rel.confidence > 0.8 ? '#4CAF50' : rel.confidence > 0.7 ? '#FF9800' : '#F44336'
    })),
    clusters: graph.clusters.map(cluster => ({
      id: cluster.id,
      name: cluster.name,
      type: cluster.clusterType,
      nodes: cluster.entities.map(e => e.value),
      strength: cluster.strength
    })),
    metadata: {
      totalEntities: graph.entities.length,
      totalRelationships: graph.relationships.length,
      totalClusters: graph.clusters.length,
      averageConfidence: graph.relationships.reduce((sum, r) => sum + r.confidence, 0) / graph.relationships.length
    }
  };
  
  const outputPath = join(__dirname, '../entity-relationship-graph.json');
  writeFileSync(outputPath, JSON.stringify(networkData, null, 2));
  
  console.log(`   ✅ Network data saved: ${outputPath}`);
  console.log(`   📊 Nodes: ${networkData.nodes.length}, Edges: ${networkData.edges.length}`);
  console.log(`   🎯 Average relationship confidence: ${(networkData.metadata.averageConfidence * 100).toFixed(1)}%`);
}

async function demonstrateMultiEmailRelationships(
  spacyExtractor: SpacyEntityExtractionService,
  relationshipExtractor: EntityRelationshipExtractor
) {
  console.log('\n\n🔗 MULTI-EMAIL RELATIONSHIP ANALYSIS');
  console.log('=' .repeat(80));
  
  const emails = [
    {
      subject: 'Compliance Review - Michael Rodriguez',
      content: 'Michael Rodriguez, CAMS will review the Goldman Sachs transaction for $2.5M. Contact Jennifer Liu at (212) 555-0288 for approval.'
    },
    {
      subject: 'Investment Meeting - Sarah Johnson',
      content: 'Sarah Johnson, CFA from Goldman Sachs will meet with Robert Chen to discuss AAPL and MSFT positions valued at $420,000.'
    }
  ];
  
  const allRelationships: EntityRelationship[] = [];
  const allEntities: SpacyExtractedEntity[] = [];
  
  for (const [idx, email] of emails.entries()) {
    console.log(`\n📧 Processing email ${idx + 1}: ${email.subject}`);
    
    const entityResult = await spacyExtractor.extractEntities(email.content);
    const relationshipGraph = relationshipExtractor.extractRelationships(email.content, entityResult.entities);
    
    allEntities.push(...entityResult.entities);
    allRelationships.push(...relationshipGraph.relationships);
    
    console.log(`   ✅ ${entityResult.entityCount} entities, ${relationshipGraph.relationships.length} relationships`);
  }
  
  // Find cross-email relationships
  console.log('\n🔍 Analyzing cross-email relationships...');
  const crossEmailRelationships = findCrossEmailRelationships(allEntities, allRelationships);
  
  console.log(`   ✅ Found ${crossEmailRelationships.length} cross-email relationships`);
  
  if (crossEmailRelationships.length > 0) {
    console.log('\n🌐 CROSS-EMAIL RELATIONSHIPS:');
    crossEmailRelationships.forEach((rel, idx) => {
      console.log(`   ${idx + 1}. "${rel.sourceEntity.value}" ${rel.relationshipType.replace(/_/g, ' ')} "${rel.targetEntity.value}"`);
      console.log(`      Confidence: ${(rel.confidence * 100).toFixed(1)}%`);
    });
  }
}

function findCrossEmailRelationships(
  allEntities: SpacyExtractedEntity[],
  allRelationships: EntityRelationship[]
): EntityRelationship[] {
  const crossRelationships: EntityRelationship[] = [];
  
  // Find entities that appear in multiple contexts
  const entityCounts = allEntities.reduce((acc, entity) => {
    const key = `${entity.value}_${entity.type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Entities appearing multiple times likely have cross-document relationships
  const recurringEntities = Object.entries(entityCounts)
    .filter(([_, count]) => count > 1)
    .map(([key, _]) => key);
  
  if (recurringEntities.length > 0) {
    // Create cross-reference relationships
    recurringEntities.forEach(entityKey => {
      const [value, type] = entityKey.split('_');
      const instances = allEntities.filter(e => e.value === value && e.type === type);
      
      if (instances.length > 1) {
        crossRelationships.push({
          id: `cross_${entityKey}`,
          sourceEntity: instances[0],
          targetEntity: instances[1],
          relationshipType: RelationshipType.REFERENCES,
          confidence: 0.8,
          context: 'Cross-email reference',
          distance: 0,
          evidence: ['Appears in multiple emails']
        });
      }
    });
  }
  
  return crossRelationships;
}

// Run the demo
if (require.main === module) {
  demonstrateEntityRelationships().catch(console.error);
}

export { demonstrateEntityRelationships, EntityRelationshipExtractor }; 