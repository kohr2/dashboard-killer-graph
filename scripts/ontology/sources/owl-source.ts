import { OntologySource, ParsedOntology, Entity, Relationship } from '../ontology-source';
import { ExtractionRule } from '../config';
import * as xml2js from 'xml2js';

export class OwlSource implements OntologySource {
  name = 'OWL Source';

  canHandle(url: string): boolean {
    return url.includes('owl') || url.includes('fibo') || url.includes('o-cream');
  }

  async fetch(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  async parse(content: string): Promise<ParsedOntology> {
    try {
      // Sanitize invalid XML entities before parsing
      content = this.sanitizeXmlEntities(content);
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: false
      });
      const xml = await parser.parseStringPromise(content);
      
      const entities: Entity[] = [];
      const relationships: Relationship[] = [];

      // Get the RDF root element
      const rdfRoot = xml['rdf:RDF'];
      if (!rdfRoot) {
        console.warn('No rdf:RDF root element found');
        return { entities, relationships };
      }

      // First pass: collect all datatype properties that might be used as entity properties
      const datatypeProperties = new Map<string, any>();
      const descriptions = this.getArrayElements(rdfRoot, 'rdf:Description');
      
      for (const desc of descriptions) {
        if (desc.$ && desc.$['rdf:about']) {
          const uri = desc.$['rdf:about'];
          
          // Collect datatype properties
          if (desc['rdf:type'] && this.isDatatypePropertyType(desc['rdf:type'])) {
            const propName = this.extractNameFromUri(uri);
            if (propName) {
              datatypeProperties.set(propName, {
                name: propName,
                definition: this.extractDefinition(desc),
                label: this.extractLabel(desc),
                documentation: uri
              });
            }
          }
        }
      }

      // Extract OWL Classes - handle both direct owl:Class and rdf:Description with rdf:type
      const classes = this.getArrayElements(rdfRoot, 'owl:Class');
      for (const cls of classes) {
        if (cls.$ && cls.$['rdf:about']) {
          const className = this.extractNameFromUri(cls.$['rdf:about']);
          if (className && !this.isSystemClass(className)) {
            const entity = this.buildEntity(cls, className, cls.$['rdf:about'], datatypeProperties);
            entities.push(entity);
          }
        }
      }

      // Extract OWL Object Properties - handle both direct owl:ObjectProperty and rdf:Description with rdf:type
      const properties = this.getArrayElements(rdfRoot, 'owl:ObjectProperty');
      for (const prop of properties) {
        if (prop.$ && prop.$['rdf:about']) {
          const propName = this.extractNameFromUri(prop.$['rdf:about']);
          if (propName && !this.isSystemProperty(propName)) {
            const relationship = this.buildRelationship(prop, propName, prop.$['rdf:about']);
            relationships.push(relationship);
          }
        }
      }

      // Handle rdf:Description elements with rdf:type (ePO structure)
      for (const desc of descriptions) {
        if (desc.$ && desc.$['rdf:about']) {
          const uri = desc.$['rdf:about'];
          
          // Check if it's a class
          if (desc['rdf:type'] && this.isClassType(desc['rdf:type'])) {
            const className = this.extractNameFromUri(uri);
            if (className && !this.isSystemClass(className)) {
              const entity = this.buildEntity(desc, className, uri, datatypeProperties);
              entities.push(entity);
            }
          }
          
          // Check if it's an object property
          if (desc['rdf:type'] && this.isObjectPropertyType(desc['rdf:type'])) {
            const propName = this.extractNameFromUri(uri);
            if (propName && !this.isSystemProperty(propName)) {
              const relationship = this.buildRelationship(desc, propName, uri);
              relationships.push(relationship);
            }
          }
        }
      }

      return { entities, relationships };
    } catch (error) {
      console.error('Error parsing OWL content:', error);
      return { entities: [], relationships: [] };
    }
  }

  async extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]> {
    // If the config.path contains a specific ontology keyword, filter strictly
    if (config.path.includes('fibo')) {
      return parsed.entities.filter(entity => entity.documentation?.includes('fibo'));
    }
    if (config.path.includes('o-cream')) {
      return parsed.entities.filter(entity => entity.documentation?.includes('o-cream'));
    }
    // Default: include all entities
    return parsed.entities;
  }

  async extractRelationships(config: ExtractionRule, parsed: ParsedOntology): Promise<Relationship[]> {
    // If the config.path contains a specific ontology keyword, filter strictly
    if (config.path.includes('fibo')) {
      return parsed.relationships.filter(rel => rel.documentation?.includes('fibo'));
    }
    if (config.path.includes('o-cream')) {
      return parsed.relationships.filter(rel => rel.documentation?.includes('o-cream'));
    }
    // Default: include all relationships
    return parsed.relationships;
  }

  private extractNameFromUri(uri: string): string | null {
    const parts = uri.split('#');
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    const lastSlash = uri.lastIndexOf('/');
    if (lastSlash !== -1) {
      return uri.substring(lastSlash + 1);
    }
    return null;
  }

  private extractDescription(element: any): string | null {
    if (element['rdfs:comment']) {
      return Array.isArray(element['rdfs:comment']) ? element['rdfs:comment'][0] : element['rdfs:comment'];
    }
    if (element['rdfs:label']) {
      return Array.isArray(element['rdfs:label']) ? element['rdfs:label'][0] : element['rdfs:label'];
    }
    return null;
  }

  private extractDomain(element: any): string | null {
    if (element['rdfs:domain'] && element['rdfs:domain'].$ && element['rdfs:domain'].$['rdf:resource']) {
      return this.extractNameFromUri(element['rdfs:domain'].$['rdf:resource']);
    }
    return null;
  }

  private extractRange(element: any): string | null {
    if (element['rdfs:range'] && element['rdfs:range'].$ && element['rdfs:range'].$['rdf:resource']) {
      return this.extractNameFromUri(element['rdfs:range'].$['rdf:resource']);
    }
    return null;
  }

  private isSystemClass(name: string): boolean {
    const systemClasses = ['Thing', 'Nothing', 'Class', 'ObjectProperty', 'DatatypeProperty'];
    return systemClasses.includes(name);
  }

  private isSystemProperty(name: string): boolean {
    const systemProperties = ['type', 'subClassOf', 'subPropertyOf', 'domain', 'range'];
    return systemProperties.includes(name);
  }

  private isClassType(typeElement: any): boolean {
    if (Array.isArray(typeElement)) {
      return typeElement.some(type => 
        type.$ && type.$['rdf:resource'] && 
        type.$['rdf:resource'].includes('owl#Class')
      );
    }
    return typeElement.$ && typeElement.$['rdf:resource'] && 
           typeElement.$['rdf:resource'].includes('owl#Class');
  }

  private isObjectPropertyType(typeElement: any): boolean {
    if (Array.isArray(typeElement)) {
      return typeElement.some(type => 
        type.$ && type.$['rdf:resource'] && 
        type.$['rdf:resource'].includes('owl#ObjectProperty')
      );
    }
    return typeElement.$ && typeElement.$['rdf:resource'] && 
           typeElement.$['rdf:resource'].includes('owl#ObjectProperty');
  }

  private isDatatypePropertyType(typeElement: any): boolean {
    if (Array.isArray(typeElement)) {
      return typeElement.some(type => 
        type.$ && type.$['rdf:resource'] && 
        type.$['rdf:resource'].includes('owl#DatatypeProperty')
      );
    }
    return typeElement.$ && typeElement.$['rdf:resource'] && 
           typeElement.$['rdf:resource'].includes('owl#DatatypeProperty');
  }

  private extractDefinition(element: any): string | null {
    if (element['skos:definition']) {
      return Array.isArray(element['skos:definition']) ? element['skos:definition'][0] : element['skos:definition'];
    }
    if (element['rdfs:comment']) {
      return Array.isArray(element['rdfs:comment']) ? element['rdfs:comment'][0] : element['rdfs:comment'];
    }
    return null;
  }

  private extractLabel(element: any): string | null {
    if (element['skos:prefLabel']) {
      return Array.isArray(element['skos:prefLabel']) ? element['skos:prefLabel'][0] : element['skos:prefLabel'];
    }
    if (element['rdfs:label']) {
      return Array.isArray(element['rdfs:label']) ? element['rdfs:label'][0] : element['rdfs:label'];
    }
    return null;
  }

  private extractParentClass(element: any): string | null {
    if (element['rdfs:subClassOf'] && element['rdfs:subClassOf'].$ && element['rdfs:subClassOf'].$['rdf:resource']) {
      return this.extractNameFromUri(element['rdfs:subClassOf'].$['rdf:resource']);
    }
    return null;
  }

  private extractHistoryNote(element: any): string | null {
    if (element['skos:historyNote']) {
      return Array.isArray(element['skos:historyNote']) ? element['skos:historyNote'][0] : element['skos:historyNote'];
    }
    return null;
  }

  private getArrayElements(obj: any, elementName: string): any[] {
    const element = obj[elementName];
    if (!element) {
      return [];
    }
    
    // xml2js with explicitArray: false returns single objects for single elements
    // and arrays for multiple elements
    return Array.isArray(element) ? element : [element];
  }

  private buildEntity(element: any, name: string, uri: string, datatypeProperties: Map<string, any>): Entity {
    const description = this.extractDefinition(element) || this.extractLabel(element) || `${name} as defined in OWL ontology`;
    const properties = this.extractEntityProperties(element, datatypeProperties);
    
    return {
      name,
      description,
      properties,
      keyProperties: ['name'],
      vectorIndex: true,
      documentation: uri
    };
  }

  private buildRelationship(element: any, name: string, uri: string): Relationship {
    const description = this.extractDefinition(element) || this.extractLabel(element) || `${name} relationship`;
    const domain = this.extractDomain(element);
    const range = this.extractRange(element);
    
    return {
      name,
      description,
      source: domain || 'Entity',
      target: range || 'Entity',
      documentation: uri
    };
  }

  private extractEntityProperties(element: any, datatypeProperties: Map<string, any>): Record<string, any> {
    const properties: Record<string, any> = {};
    
    // Add basic metadata properties
    if (this.extractLabel(element)) {
      properties.label = {
        type: 'string',
        description: 'Preferred label for this entity'
      };
    }
    
    if (this.extractDefinition(element)) {
      properties.definition = {
        type: 'string',
        description: 'Detailed definition of this entity'
      };
    }
    
    // Add inheritance information
    const parentClass = this.extractParentClass(element);
    if (parentClass) {
      properties.parentClass = {
        type: 'string',
        description: 'Parent class in the inheritance hierarchy'
      };
    }
    
    // Add version information
    if (this.extractHistoryNote(element)) {
      properties.historyNote = {
        type: 'string',
        description: 'Version history and approval information'
      };
    }
    
    return properties;
  }

  /**
   * Replace or remove invalid XML entities that break xml2js parsing.
   * Only allow a whitelist of standard XML entities (&amp;, &lt;, &gt;, &apos;, &quot;).
   * Remove or replace all others.
   */
  private sanitizeXmlEntities(xml: string): string {
    // Replace known problematic entities with their Unicode equivalents or remove them
    // Allow only &amp;, &lt;, &gt;, &apos;, &quot;
    return xml.replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
      switch (entity) {
        case 'amp':
        case 'lt':
        case 'gt':
        case 'apos':
        case 'quot':
          return match;
        // Add common HTML entities if needed
        case 'nbsp': return ' ';
        case 'mdash': return '-';
        case 'ndash': return '-';
        case 'hellip': return '...';
        case 'lsquo': return '‘';
        case 'rsquo': return '’';
        case 'ldquo': return '“';
        case 'rdquo': return '”';
        default:
          // Remove unknown/invalid entities
          return '';
      }
    });
  }
} 