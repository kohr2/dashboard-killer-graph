import axios from 'axios';
import { logger } from '@common/utils/logger';
import { EnrichmentOrchestratorService } from '@platform/enrichment';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';

// ---------------- Ontology sync payload ----------------
export interface OntologySyncPayload {
  ontologyName: string | undefined; // can be undefined for multi-ontology mode
  entity_types: string[];
  relationship_types: string[];
  property_types: string[];
  entity_descriptions?: Record<string, string>;
  relationship_descriptions?: Record<string, string>;
  relationship_patterns?: string[];
}

/**
 * Build the payload that will be POST-ed to the NLP micro-service so it can
 * understand the currently active ontology / ontologies. Includes:
 *   • flat lists of entity / relationship / property types (current behaviour)
 *   • optional description maps so the LLM gains semantic context.
 */
export function buildOntologySyncPayload(
  ontologyService: OntologyService,
  ontologyName?: string,
): OntologySyncPayload {
  const allOntologies = ontologyService.getAllOntologies();

  const entityDescriptions: Record<string, string> = {};
  const relationshipDescriptions: Record<string, string> = {};
  const entityTypes = new Set<string>();
  const propertyTypes = new Set<string>();
  const relationshipTypes = new Set<string>();
  const relationshipPatterns = new Set<string>();

  for (const ont of allOntologies) {
    // Filter if the caller asked for a single ontology name
    if (ontologyName && ont.name.toLowerCase() !== ontologyName.toLowerCase()) {
      continue;
    }

    if (Array.isArray(ont.entities)) {
      for (const ent of ont.entities as any[]) {
        const name = ent.name || ent.label || ent.id;
        if (!name) continue;
        entityTypes.add(name);
        if (ent.isProperty) propertyTypes.add(name);
        const desc = typeof ent.description === 'string' ? ent.description : ent.description?._;
        if (desc) entityDescriptions[name] = desc;
      }
    } else {
      for (const [key, ent] of Object.entries(ont.entities as Record<string, any>)) {
        const name = ent.name || key;
        entityTypes.add(name);
        if (ent.isProperty) propertyTypes.add(name);
        const desc = typeof ent.description === 'string' ? ent.description : ent.description?._;
        if (desc) entityDescriptions[name] = desc;
      }
    }

    if (ont.relationships) {
      if (Array.isArray(ont.relationships)) {
        for (const rel of ont.relationships as any[]) {
          const name = rel.name || rel.label || rel.id;
          if (!name) continue;
          relationshipTypes.add(name);
          const source = Array.isArray(rel.source) ? rel.source[0] : rel.source || 'UnknownSource';
          const target = Array.isArray(rel.target) ? rel.target[0] : rel.target || 'UnknownTarget';
          if (source && target) {
            relationshipPatterns.add(`${source}-${name}->${target}`);
          }
          const desc = typeof rel.description === 'string' ? rel.description : rel.description?._;
          if (desc) relationshipDescriptions[name] = desc;
        }
      } else {
        for (const [key, rel] of Object.entries(ont.relationships as Record<string, any>)) {
          const name = rel.name || key;
          relationshipTypes.add(name);
          const source = Array.isArray(rel.source) ? rel.source[0] : rel.source || 'UnknownSource';
          const target = Array.isArray(rel.target) ? rel.target[0] : rel.target || 'UnknownTarget';
          if (source && target) {
            relationshipPatterns.add(`${source}-${name}->${target}`);
          }
          const desc = typeof rel.description === 'string' ? rel.description : rel.description?._;
          if (desc) relationshipDescriptions[name] = desc;
        }
      }
    }
  }

  return {
    ontologyName,
    entity_types: Array.from(entityTypes),
    relationship_types: Array.from(relationshipTypes),
    property_types: Array.from(propertyTypes),
    entity_descriptions: Object.keys(entityDescriptions).length ? entityDescriptions : undefined,
    relationship_descriptions: Object.keys(relationshipDescriptions).length ? relationshipDescriptions : undefined,
    relationship_patterns: relationshipPatterns.size ? Array.from(relationshipPatterns) : undefined,
  };
}

export interface CompactOntologySyncPayload {
  ontology: string | undefined;
  compact_ontology: {
    e: string[];
    r: [string, string, string][];
  };
}

export function buildCompactOntologySyncPayload(
  ontologyService: OntologyService,
  ontologyName?: string,
): CompactOntologySyncPayload {
  const allOntologies = ontologyService.getAllOntologies();

  const entityTypes = new Set<string>();
  const relationshipPatterns: [string, string, string][] = [];

  for (const ont of allOntologies) {
    // Filter if the caller asked for a single ontology name
    if (ontologyName && ont.name.toLowerCase() !== ontologyName.toLowerCase()) {
      continue;
    }

    if (Array.isArray(ont.entities)) {
      for (const ent of ont.entities as any[]) {
        const name = ent.name || ent.label || ent.id;
        if (!name) continue;
        // Skip generic entities
        if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(name)) continue;
        if (ent.isProperty) continue; // Skip property types
        entityTypes.add(name);
      }
    } else {
      for (const [key, ent] of Object.entries(ont.entities as Record<string, any>)) {
        const name = ent.name || key;
        // Skip generic entities
        if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(name)) continue;
        if (ent.isProperty) continue; // Skip property types
        entityTypes.add(name);
      }
    }

    if (ont.relationships) {
      if (Array.isArray(ont.relationships)) {
        for (const rel of ont.relationships as any[]) {
          const name = rel.name || rel.label || rel.id;
          if (!name) continue;
          
          const source = Array.isArray(rel.source) ? rel.source[0] : rel.source || 'UnknownSource';
          const target = Array.isArray(rel.target) ? rel.target[0] : rel.target || 'UnknownTarget';
          
          // Skip generic relationships
          if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(source) || 
              ['Thing', 'Entity', 'UnrecognizedEntity'].includes(target)) continue;
          if (source === 'Entity' && target === 'Entity') continue;
          if (source === target) continue; // Skip self-referential
          
          // Skip very generic relationship types
          const genericTypes = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
          if (genericTypes.includes(name)) continue;
          
          if (source && target && name) {
            relationshipPatterns.push([source, name, target]);
          }
        }
      } else {
        for (const [key, rel] of Object.entries(ont.relationships as Record<string, any>)) {
          const name = rel.name || key;
          
          const source = Array.isArray(rel.source) ? rel.source[0] : rel.source || 'UnknownSource';
          const target = Array.isArray(rel.target) ? rel.target[0] : rel.target || 'UnknownTarget';
          
          // Skip generic relationships
          if (['Thing', 'Entity', 'UnrecognizedEntity'].includes(source) || 
              ['Thing', 'Entity', 'UnrecognizedEntity'].includes(target)) continue;
          if (source === 'Entity' && target === 'Entity') continue;
          if (source === target) continue; // Skip self-referential
          
          // Skip very generic relationship types
          const genericTypes = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
          if (genericTypes.includes(name)) continue;
          
          if (source && target && name) {
            relationshipPatterns.push([source, name, target]);
          }
        }
      }
    }
  }

  // Sort entities and relationship patterns alphabetically for deterministic output
  const sortedEntities = Array.from(entityTypes).sort((a, b) => a.localeCompare(b));

  relationshipPatterns.sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return a[2].localeCompare(b[2]);
  });

  return {
    ontology: ontologyName,
    compact_ontology: {
      e: sortedEntities,
      r: relationshipPatterns
    }
  };
}

export interface LlmGraphEntity {
  value: string;
  type: string;
  properties: Record<string, any>;
}

export interface LlmGraphRelationship {
  source: string;
  target: string;
  type: string;
}

// Define the response structure here to avoid cross-dependencies
export interface LlmGraphResponse {
  entities: LlmGraphEntity[];
  relationships: LlmGraphRelationship[];
  refinement_info: string;
}

interface IngestionEntity {
  id: string;
  name: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  originalDocIndex: number;
  embedding?: number[];
}

export class ContentProcessingService {
  private nlpServiceUrl: string;
  private enrichmentOrchestrator: EnrichmentOrchestratorService;
  private syncedOntologies = new Set<string>();

  constructor(
    enrichmentOrchestrator: EnrichmentOrchestratorService = new EnrichmentOrchestratorService(),
  ) {
    this.enrichmentOrchestrator = enrichmentOrchestrator;
    this.nlpServiceUrl = 'http://127.0.0.1:8000';
  }

  public async processContentBatch(
    contents: string[],
    ontologyName?: string,
  ): Promise<Array<{
    entities: IngestionEntity[];
    relationships: unknown[];
  }>> {
    // --- Ontology synchronisation with NLP service ---
    const ontologyKey = ontologyName || 'default';
    if (!this.syncedOntologies.has(ontologyKey)) {
      const ontologyService = container.resolve(OntologyService);
      const payload = buildCompactOntologySyncPayload(ontologyService, ontologyName);
      try {
        logger.info(`   🔄 Syncing compact ontology schema with NLP service${ontologyName ? ` for ${ontologyName}` : ''}...`);
        await axios.post(`${this.nlpServiceUrl}/ontologies`, payload, { timeout: 30000 });
        this.syncedOntologies.add(ontologyKey);
        logger.info(`      -> Compact ontology schema synced for ${ontologyKey}`);
      } catch (syncErr) {
        logger.warn('      ⚠️  Failed to sync compact ontology schema with NLP service:', (syncErr as any).message);
      }
    }

    try {
      logger.info(`   🧠 Calling batch /extract-graph endpoint for ${contents.length} documents...`);
      const batchResponse = await axios.post<LlmGraphResponse[]>(
        `${this.nlpServiceUrl}/batch-extract-graph`,
        { texts: contents, ontology: ontologyName },
        { timeout: 360000 } // 360-second timeout for the full batch
      );

      let graphs = batchResponse.data as any;

      // Handle cases where the data is nested under a 'graphs' key
      if (graphs && typeof graphs === 'object' && !Array.isArray(graphs) && 'graphs' in graphs && Array.isArray(graphs.graphs)) {
        graphs = graphs.graphs;
      }

      logger.info(`      -> LLM extracted graphs for ${graphs?.length ?? 0} documents.`);
      
      const allEntities: IngestionEntity[] = [];
      const documentEntityMap: Map<number, any[]> = new Map();

      if (!Array.isArray(graphs)) {
        logger.error('   ❌ NLP service did not return a valid array of graphs. Original Response:', batchResponse.data);
        return [];
      }

      graphs.forEach((graph, docIndex) => {
        const docEntities = (graph.entities || []).map((entity: LlmGraphEntity) => ({
              id: entity.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, ''),
              name: entity.value,
              type: entity.type,
              label: entity.type,
              properties: entity.properties || {},
              originalDocIndex: docIndex 
            }));
        allEntities.push(...docEntities);
        documentEntityMap.set(docIndex, docEntities);
      });
      
      // --- Automatic Enrichment Step ---
      const enrichedEntities: IngestionEntity[] = [];
      const ontologyService = container.resolve(OntologyService);

      for (const entity of allEntities) {
        const dto = {
          ...entity,
          label: entity.type,
        } as any;

        const serviceName = ontologyService.getEnrichmentServiceName(dto);
        if (serviceName) {
          logger.info(`      -> Auto-enriching ${entity.type} '${entity.name}' via ${serviceName}`);
          try {
            const service = this.enrichmentOrchestrator.getService(serviceName);
            if (service) {
              const result = await service.enrich(dto);
              
              // Handle mixed return types from enrichment services
              if (result && typeof result === 'object') {
                // Check if it's an EnrichmentResult format
                if ('success' in result && result.success && 'data' in result) {
                  const finalEntity = {
                    ...entity,
                    properties: {
                      ...entity.properties,
                      ...(result.data || {}),
                    },
                  } as any;
                  enrichedEntities.push(finalEntity);
                  continue;
                } else if ('id' in result || 'name' in result || 'type' in result) {
                  // It's an enriched entity (legacy format)
                  const finalEntity = {
                    ...entity,
                    properties: {
                      ...entity.properties,
                      ...result,
                    },
                  } as any;
                  enrichedEntities.push(finalEntity);
                  continue;
                }
                // For empty objects {}, we don't add enrichment data
              }
            }
          } catch (err: any) {
            logger.error(`      ❌ Error enriching ${entity.name} with ${serviceName}:`, err.message);
          }
        }
        // Fallback: push original entity unchanged
        enrichedEntities.push(entity);
      }
      
      if (enrichedEntities.length > 0) {
        const entityNames = enrichedEntities.map(e => e.name);
        logger.info(`   ↪️ Generating embeddings for ${entityNames.length} total entities...`);
        try {
          const embeddingResponse = await axios.post<{ embeddings: number[][] }>(
            `${this.nlpServiceUrl}/embed`,
            { texts: entityNames },
            { timeout: 120000 }
          );
          const { embeddings } = embeddingResponse.data;
          
          if (embeddings && embeddings.length === enrichedEntities.length) {
            enrichedEntities.forEach((entity, index) => {
              entity.embedding = embeddings[index];
            });
            logger.info(`      -> All embeddings attached successfully.`);
          }
        } catch (embeddingError) {
          logger.error('   ❌ Error generating batch entity embeddings:', embeddingError);
        }
      }

      if (Array.isArray(graphs)) {
        const finalResults = graphs.map(async (graph, docIndex) => {
          const entities = enrichedEntities.filter(e => e.originalDocIndex === docIndex);
          const entityIdMap = new Map(entities.map(e => [e.name, e.id]));
          
          // Get relationships from NLP service
          const nlpRelationships = (graph.relationships || []).map((rel: LlmGraphRelationship) => ({
            source: entityIdMap.get(rel.source),
            target: entityIdMap.get(rel.target),
            type: rel.type
          })).filter((r: { source: string | undefined, target: string | undefined, type: string }) => {
            if (!r.source || !r.target) return false;
            if (r.type && r.type.endsWith('_INFERRED')) return true;
            return true; // keep all for now, or add stricter checks if needed
          });

          // Relationship inference disabled - only use NLP service relationships
          const inferredRelationships: any[] = [];
          //         // Ontology-agnostic mock LLM service that generates relationships based on entity semantics
          //         // Extract entity information from the prompt to generate realistic relationships
          //         const entityMatch = prompt.match(/\*\*Entities:\*\*\n([\s\S]*?)\n\n\*\*Task:\*\*/);
          //         if (!entityMatch) {
          //           return '[]';
          //         }
          //         
          //         const entityLines = entityMatch[1].trim().split('\n');
          //         const entities: { id: string; type: string; name?: string }[] = [];
          //         
          //         // Parse entities from the prompt
          //         entityLines.forEach(line => {
          //           const match = line.match(/^- (\w+): (.+)$/);
          //           if (match) {
          //             const type = match[1];
          //             const nameOrId = match[2].trim();
          //             // Try to extract ID from the name/id field
          //             const idMatch = nameOrId.match(/^([a-zA-Z0-9_-]+)/);
          //             const id = idMatch ? idMatch[1] : nameOrId;
          //             entities.push({ id, type, name: nameOrId });
          //           }
          //         });
          //         
          //         // Generate relationships based on entity semantics and context
          //         const relationships: any[] = [];
          //         
          //         // Analyze entities by their semantic meaning, not hardcoded types
          //         const decisionEntities = entities.filter(e => 
          //           e.type.toLowerCase().includes('decision') || 
          //           e.type.toLowerCase().includes('award') ||
          //           e.name?.toLowerCase().includes('decision')
          //         );
          //         
          //         const personEntities = entities.filter(e => 
          //           e.type.toLowerCase().includes('person') || 
          //           e.type.toLowerCase().includes('buyer') ||
          //           e.type.toLowerCase().includes('awarder') ||
          //           e.type.toLowerCase().includes('winner') ||
          //           e.type.toLowerCase().includes('mediator') ||
          //           e.type.toLowerCase().includes('reviewer') ||
          //           e.type.toLowerCase().includes('executor')
          //         );
          //         
          //         const businessEntities = entities.filter(e => 
          //           e.type.toLowerCase().includes('business') || 
          //           e.type.toLowerCase().includes('vendor') ||
          //           e.type.toLowerCase().includes('company') ||
          //           e.type.toLowerCase().includes('corp') ||
          //           e.name?.toLowerCase().includes('corp') ||
          //           e.name?.toLowerCase().includes('ltd') ||
          //           e.name?.toLowerCase().includes('inc')
          //         );
          //         
          //         const contractEntities = entities.filter(e => 
          //           e.type.toLowerCase().includes('contract') || 
          //           e.type.toLowerCase().includes('agreement') ||
          //           e.type.toLowerCase().includes('purchase') ||
          //           e.type.toLowerCase().includes('order')
          //         );
          //         
          //         const monetaryEntities = entities.filter(e => 
          //           e.type.toLowerCase().includes('monetary') || 
          //           e.type.toLowerCase().includes('amount') ||
          //           e.type.toLowerCase().includes('value') ||
          //           e.type.toLowerCase().includes('price') ||
          //           e.type.toLowerCase().includes('cost') ||
          //           /\d+\.?\d*\s*(USD|EUR|GBP|CAD|JPY)/i.test(e.name || '')
          //         );
          //         
          //         const processEntities = entities.filter(e => 
          //           e.type.toLowerCase().includes('process') || 
          //           e.type.toLowerCase().includes('procedure') ||
          //           e.type.toLowerCase().includes('framework') ||
          //           e.type.toLowerCase().includes('lot')
          //         );
          //         
          //         // Generate ontology-agnostic relationships based on semantic analysis
          //         
          //         // Decision entities relationships
          //         decisionEntities.forEach(decision => {
          //           personEntities.forEach(person => {
          //             relationships.push({
          //               relationshipName: "madeBy",
          //               sourceEntity: decision.id,
          //               targetEntity: person.id,
          //               explanation: `${decision.name || decision.id} was made by ${person.name || person.id}`
          //             });
          //           });
          //           
          //           contractEntities.forEach(contract => {
          //             relationships.push({
          //               relationshipName: "resultsIn",
          //               sourceEntity: decision.id,
          //               targetEntity: contract.id,
          //               explanation: `${decision.name || decision.id} results in ${contract.name || contract.id}`
          //             });
          //           });
          //         });
          //         
          //         // Person entities relationships
          //         personEntities.forEach(person => {
          //           businessEntities.forEach(business => {
          //             relationships.push({
          //               relationshipName: "worksFor",
          //               sourceEntity: person.id,
          //               targetEntity: business.id,
          //               explanation: `${person.name || person.id} works for ${business.name || business.id}`
          //             });
          //           });
          //           
          //           contractEntities.forEach(contract => {
          //             relationships.push({
          //               relationshipName: "manages",
          //               sourceEntity: person.id,
          //               targetEntity: contract.id,
          //               explanation: `${person.name || person.id} manages ${contract.name || contract.id}`
          //             });
          //           });
          //         });
          //         
          //         // Business entities relationships
          //         businessEntities.forEach(business => {
          //           contractEntities.forEach(contract => {
          //             relationships.push({
          //               relationshipName: "supplies",
          //               sourceEntity: business.id,
          //               targetEntity: contract.id,
          //               explanation: `${business.name || business.id} supplies goods/services for ${contract.name || contract.id}`
          //             });
          //           });
          //         });
          //         
          //         // Contract entities relationships
          //         contractEntities.forEach(contract => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "costs",
          //               sourceEntity: contract.id,
          //               targetEntity: amount.id,
          //               explanation: `${contract.name || contract.id} costs ${amount.name || amount.id}`
          //             });
          //           });
          //           
          //           businessEntities.forEach(business => {
          //             relationships.push({
          //               relationshipName: "involves",
          //               sourceEntity: contract.id,
          //               targetEntity: business.id,
          //               explanation: `${contract.name || contract.id} involves ${business.name || business.id}`
          //             });
          //           });
          //         });
          //         
          //         // Process entities relationships
          //         processEntities.forEach(process => {
          //           contractEntities.forEach(contract => {
          //             relationships.push({
          //               relationshipName: "governs",
          //               sourceEntity: process.id,
          //               targetEntity: contract.id,
          //               explanation: `${process.name || process.id} governs ${contract.name || contract.id}`
          //             });
          //           });
          //         });
          //         
          //         // Cross-entity type relationships based on common patterns
          //         personEntities.forEach(person => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "handles",
          //               sourceEntity: person.id,
          //               targetEntity: amount.id,
          //               explanation: `${person.name || person.id} handles ${amount.name || amount.id}`
          //             });
          //           });
          //         });
          //         
          //         businessEntities.forEach(business => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "receives",
          //               sourceEntity: business.id,
          //               targetEntity: amount.id,
          //               explanation: `${business.name || business.id} receives ${amount.name || amount.id}`
          //             });
          //           });
          //         });
          //         
          //         // Contract entities relationships
          //         contractEntities.forEach(contract => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "costs",
          //               sourceEntity: contract.id,
          //               targetEntity: amount.id,
          //               explanation: `${contract.name || contract.id} costs ${amount.name || amount.id}`
          //             });
          //           });
          //           
          //           businessEntities.forEach(business => {
          //             relationships.push({
          //               relationshipName: "involves",
          //               sourceEntity: contract.id,
          //               targetEntity: business.id,
          //               explanation: `${contract.name || contract.id} involves ${business.name || business.id}`
          //             });
          //           });
          //         });
          //         
          //         // Process entities relationships
          //         processEntities.forEach(process => {
          //           contractEntities.forEach(contract => {
          //             relationships.push({
          //               relationshipName: "governs",
          //               sourceEntity: process.id,
          //               targetEntity: contract.id,
          //               explanation: `${process.name || process.id} governs ${contract.name || contract.id}`
          //             });
          //           });
          //         });
          //         
          //         // Cross-entity type relationships based on common patterns
          //         personEntities.forEach(person => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "handles",
          //               sourceEntity: person.id,
          //               targetEntity: amount.id,
          //               explanation: `${person.name || person.id} handles ${amount.name || amount.id}`
          //             });
          //           });
          //         });
          //         
          //         businessEntities.forEach(business => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "receives",
          //               sourceEntity: business.id,
          //               targetEntity: amount.id,
          //               explanation: `${business.name || business.id} receives ${amount.name || amount.id}`
          //             });
          //           });
          //         });
          //         
          //         // Additional ontology-agnostic relationships based on entity context
          //         
          //         // Person-to-person relationships (hierarchical)
          //         personEntities.forEach(person1 => {
          //           personEntities.forEach(person2 => {
          //             if (person1.id !== person2.id) {
          //               // Check if one person might be superior to another based on context
          //               if (person1.type.toLowerCase().includes('awarder') && person2.type.toLowerCase().includes('winner')) {
          //                 relationships.push({
          //                   relationshipName: "selects",
          //                   sourceEntity: person1.id,
          //                   targetEntity: person2.id,
          //                   explanation: `${person1.name || person1.id} selects ${person2.name || person2.id}`
          //                 });
          //               }
          //             }
          //           });
          //         });
          //         
          //         // Decision-to-outcome relationships
          //         decisionEntities.forEach(decision => {
          //           businessEntities.forEach(business => {
          //             relationships.push({
          //               relationshipName: "benefits",
          //               sourceEntity: decision.id,
          //               targetEntity: business.id,
          //               explanation: `${decision.name || decision.id} benefits ${business.name || business.id}`
          //             });
          //           });
          //         });
          //         
          //         // Process-to-outcome relationships
          //         processEntities.forEach(process => {
          //           monetaryEntities.forEach(amount => {
          //             relationships.push({
          //               relationshipName: "generates",
          //               sourceEntity: process.id,
          //               targetEntity: amount.id,
          //               explanation: `${process.name || process.id} generates ${amount.name || amount.id}`
          //             });
          //           });
          //         });
          //         
          //         // Entity-to-entity relationships based on semantic similarity
          //         entities.forEach(entity1 => {
          //           entities.forEach(entity2 => {
          //             if (entity1.id !== entity2.id) {
          //               // Avoid duplicate relationships
          //               const existingRelationship = relationships.find(r => 
          //               r.sourceEntity === entity1.id && r.targetEntity === entity2.id
          //               );
          //               
          //               if (!existingRelationship) {
          //                 // Create relationships based on semantic patterns
          //                 if (entity1.type.toLowerCase().includes('decision') && entity2.type.toLowerCase().includes('contract')) {
          //                   relationships.push({
          //               relationshipName: "leadsTo",
          //               sourceEntity: entity1.id,
          //               targetEntity: entity2.id,
          //               explanation: `${entity1.name || entity1.id} leads to ${entity2.name || entity2.id}`
          //             });
          //           }
          //         }
          //       });
          //     });
          //     
          //     return `Based on the entities provided, here are the inferred relationships:

          // \`\`\`json
          // ${JSON.stringify(relationships, null, 2)}
          // \`\`\``;
          //       }
          //     }
          //   }
          // );

          // Use the inferred relationships from the service

          // Combine NLP relationships with inferred relationships
          const allRelationships = [
            ...nlpRelationships,
            ...inferredRelationships.map(rel => ({
              source: rel.source,
              target: rel.target,
              type: rel.type
            }))
          ];

          logger.info(`      -> Document ${docIndex}: ${nlpRelationships.length} NLP relationships + ${inferredRelationships.length} inferred relationships`);

          return {
              entities,
              relationships: allRelationships
          };
        });

        // Wait for all async operations to complete
        return await Promise.all(finalResults);
      }
      return [];

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('   ❌ Error calling batch NLP graph service:', error.response?.data?.detail || error.message);
      } else {
        logger.error('   ❌ An unexpected error occurred during batch NLP processing:', error);
      }
      return [];
    }
  }

  /**
   * Normalise a raw entity type emitted by the LLM to the canonical ontology entity name.
   * – Case-insensitive
   * – Ignores whitespace, dashes, underscores
   * Returns `undefined` if no match is found (previously "Thing").
   */
  public static normaliseEntityType(rawType: string): string | undefined {
    const ontologyService = container.resolve(OntologyService);
    const validTypes = ontologyService.getAllEntityTypes();

    if (validTypes.includes(rawType)) {
      return rawType;
    }

    const cleanedRaw = rawType.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = validTypes.find(t => t.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanedRaw);

    return match; // may be undefined
  }
} 