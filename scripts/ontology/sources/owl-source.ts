import { OntologySource, ParsedOntology, Entity, Relationship } from '../ontology-source';
import { ExtractionRule } from '../config';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as path from 'path';

export class OwlSource implements OntologySource {
  name = 'OWL Source';

  /**
   * Keep track of already-parsed import URLs across the lifetime of this OwlSource instance.
   * Prevents duplicate parsing when the same file is referenced many times (e.g. Commons vocabularies).
   */
  private readonly visited: Set<string> = new Set();

  /** Ontology keyword (e.g. "fibo") used to decide which imports are relevant. */
  private readonly ontologyKey?: string;

  /** When true we also follow imports that do not match the ontologyKey. */
  private readonly includeExternalImports: boolean;

  constructor(options?: { ontologyKey?: string; includeExternalImports?: boolean }) {
    this.ontologyKey = options?.ontologyKey?.toLowerCase();
    this.includeExternalImports = options?.includeExternalImports ?? false;
  }

  canHandle(url: string): boolean {
    return url.includes('owl') || url.includes('fibo') || url.includes('o-cream');
  }

  async fetch(url: string): Promise<string> {
    // Check if URL is local file
    if (url.startsWith('file://') || url.startsWith('./') || url.startsWith('/')) {
      return fs.readFileSync(url.replace('file://', ''), 'utf-8');
    }

    // For online URLs, check cache first
    const cachePath = this.getCachePath(url);
    
    // Check if file exists in cache
    if (fs.existsSync(cachePath)) {
      console.log(`📁 Using cached file: ${cachePath}`);
      return fs.readFileSync(cachePath, 'utf-8');
    }

    // Download and cache the file
    console.log(`🌐 Downloading: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Ensure cache directory exists
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Save to cache
    fs.writeFileSync(cachePath, content);
    console.log(`💾 Cached to: ${cachePath}`);
    
    return content;
  }

  async parse(content: string): Promise<ParsedOntology> {
    try {
      // Sanitize invalid XML entities before parsing
      content = this.sanitizeXmlEntities(content);
      
      // Pre-process XML to resolve entity references
      content = this.resolveXmlEntities(content);
      
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: false,
        explicitRoot: true
      });
      const xml = await parser.parseStringPromise(content);
      
      const entities: Entity[] = [];
      const relationships: Relationship[] = [];

      // Find the root: usually rdf:RDF, but fallback to owl:Ontology or the first key
      let rdfRoot = xml['rdf:RDF'] || xml['owl:Ontology'];
      if (!rdfRoot) {
        // Fallback: use the first key if present
        const keys = Object.keys(xml);
        if (keys.length === 1) {
          rdfRoot = xml[keys[0]];
        } else {
          rdfRoot = xml;
        }
      }

      // Namespace-agnostic extraction for classes, properties, and descriptions
      const datatypeProperties = new Map<string, any>();
      const allKeys = Object.keys(rdfRoot);
      // Helper to collect all elements matching a suffix (e.g., ':Class')
      const collectElements = (suffix: string) =>
        allKeys.filter(k => k.endsWith(suffix)).flatMap(k => this.getArrayElements(rdfRoot, k));

      // Collect all descriptions (for ePO-style and datatype properties)
      const descriptions = collectElements(':Description');
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

      // Extract OWL Classes (namespace-agnostic)
      const classes = collectElements(':Class');
      console.log(`[OWLSource] Found ${classes.length} class elements`);
      for (const cls of classes) {
        console.log(`[OWLSource] Class element structure:`, JSON.stringify(cls, null, 2).substring(0, 500));
        if (cls.$ && cls.$['rdf:about']) {
          const className = this.extractNameFromUri(cls.$['rdf:about']);
          console.log(`[OWLSource] Processing class: ${cls.$['rdf:about']} -> ${className}`);
          if (className && !this.isSystemClass(className)) {
            const entity = this.buildEntity(cls, className, cls.$['rdf:about'], datatypeProperties);
            entities.push(entity);
            console.log(`[OWLSource] Added entity: ${className}`);
          } else {
            console.log(`[OWLSource] Skipped class ${className}: isSystemClass=${className ? this.isSystemClass(className) : 'null'}`);
          }
        } else {
          console.log(`[OWLSource] Class without rdf:about:`, cls);
        }
      }

      // Extract OWL Object Properties (namespace-agnostic)
      const properties = collectElements(':ObjectProperty');
      console.log(`[OWLSource] Found ${properties.length} object property elements`);
      for (const prop of properties) {
        console.log(`[OWLSource] Property element structure:`, JSON.stringify(prop, null, 2).substring(0, 500));
        if (prop.$ && prop.$['rdf:about']) {
          const propName = this.extractNameFromUri(prop.$['rdf:about']);
          console.log(`[OWLSource] Processing property: ${prop.$['rdf:about']} -> ${propName}`);
          if (propName && !this.isSystemProperty(propName)) {
            const relationship = this.buildRelationship(prop, propName, prop.$['rdf:about']);
            relationships.push(relationship);
            console.log(`[OWLSource] Added relationship: ${propName}`);
          } else {
            console.log(`[OWLSource] Skipped property ${propName}: isSystemProperty=${propName ? this.isSystemProperty(propName) : 'null'}`);
          }
        } else {
          console.log(`[OWLSource] Property without rdf:about:`, prop);
        }
      }

      // Handle rdf:Description elements with rdf:type (ePO structure)
      console.log(`[OWLSource] Processing ${descriptions.length} rdf:Description elements`);
      for (const desc of descriptions) {
        if (desc.$ && desc.$['rdf:about']) {
          const uri = desc.$['rdf:about'];
          // Check if it's a class
          if (desc['rdf:type'] && this.isClassType(desc['rdf:type'])) {
            const className = this.extractNameFromUri(uri);
            console.log(`[OWLSource] Processing description class: ${uri} -> ${className}`);
            if (className && !this.isSystemClass(className)) {
              const entity = this.buildEntity(desc, className, uri, datatypeProperties);
              entities.push(entity);
              console.log(`[OWLSource] Added entity from description: ${className}`);
            } else {
              console.log(`[OWLSource] Skipped description class ${className}: isSystemClass=${className ? this.isSystemClass(className) : 'null'}`);
            }
          }
          // Check if it's an object property
          if (desc['rdf:type'] && this.isObjectPropertyType(desc['rdf:type'])) {
            const propName = this.extractNameFromUri(uri);
            console.log(`[OWLSource] Processing description property: ${uri} -> ${propName}`);
            if (propName && !this.isSystemProperty(propName)) {
              const relationship = this.buildRelationship(desc, propName, uri);
              relationships.push(relationship);
              console.log(`[OWLSource] Added relationship from description: ${propName}`);
            } else {
              console.log(`[OWLSource] Skipped description property ${propName}: isSystemProperty=${propName ? this.isSystemProperty(propName) : 'null'}`);
            }
          }
        }
      }

      // If nothing found, log root keys and a sample for debugging
      if (entities.length === 0 && relationships.length === 0) {
        console.warn('[OWLSource] No entities or relationships found. Root keys:', allKeys);
        const sampleKey = allKeys[0];
        if (sampleKey && rdfRoot[sampleKey]) {
          console.warn('[OWLSource] Sample data for', sampleKey, ':', JSON.stringify(rdfRoot[sampleKey], null, 2).substring(0, 1000));
        }
      }

      // Recursively process owl:imports to include referenced ontologies
      const rawImportUrls: string[] = this.extractImportUrls(rdfRoot);

      // Filter imports: skip those that do not match ontologyKey unless includeExternalImports = true
      const filteredImports = rawImportUrls.filter(url => {
        if (!url) return false;
        if (this.includeExternalImports) return true;
        if (!this.ontologyKey) return true; // no filter available
        return url.toLowerCase().includes(this.ontologyKey);
      });

      // Remove already visited URLs and mark the rest as visited immediately to avoid race conditions
      const newImports = filteredImports.filter(url => {
        if (this.visited.has(url)) return false;
        this.visited.add(url);
        return true;
      });

      // Parse all imports concurrently for better performance
      const parsedImports = await Promise.all(
        newImports.map(async importUrl => {
          try {
            const importContent = await this.fetch(importUrl);
            return await this.parse(importContent);
          } catch (err) {
            console.warn(`⚠️  Failed to process import ${importUrl}: ${(err as Error).message}`);
            return { entities: [], relationships: [] } as ParsedOntology;
          }
        })
      );

      for (const pi of parsedImports) {
        entities.push(...pi.entities);
        relationships.push(...pi.relationships);
      }

      // Deduplicate entities and relationships by name
      const uniqueEntitiesMap = new Map<string, Entity>();
      for (const entity of entities) {
        uniqueEntitiesMap.set(entity.name, entity);
      }
      const uniqueEntities = Array.from(uniqueEntitiesMap.values());

      const uniqueRelationshipsMap = new Map<string, Relationship>();
      for (const rel of relationships) {
        uniqueRelationshipsMap.set(rel.name, rel);
      }
      const uniqueRelationships = Array.from(uniqueRelationshipsMap.values());

      return { entities: uniqueEntities, relationships: uniqueRelationships };
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
    // If it's just a name (no # or /), return it directly
    if (!uri.includes('#') && !uri.includes('/')) {
      return uri;
    }
    
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
    // Compose full URI for documentation if needed
    let documentation = uri;
    if (documentation && !documentation.includes('://')) {
      // Try to get base URI from xml:base or rdfs:isDefinedBy
      const base = (element['rdfs:isDefinedBy'] && element['rdfs:isDefinedBy'].$ && element['rdfs:isDefinedBy'].$['rdf:resource'])
        || (element.$ && element.$['xml:base']);
      if (base) {
        documentation = base.endsWith('/') ? base + uri : base + '/' + uri;
      }
    }
    return {
      name,
      description,
      properties,
      keyProperties: ['name'],
      vectorIndex: true,
      documentation
    };
  }

  private buildRelationship(element: any, name: string, uri: string): Relationship {
    const description = this.extractDefinition(element) || this.extractLabel(element) || `${name} relationship`;
    const domain = this.extractDomain(element);
    const range = this.extractRange(element);
    // Compose full URI for documentation if needed
    let documentation = uri;
    if (documentation && !documentation.includes('://')) {
      const base = (element['rdfs:isDefinedBy'] && element['rdfs:isDefinedBy'].$ && element['rdfs:isDefinedBy'].$['rdf:resource'])
        || (element.$ && element.$['xml:base']);
      if (base) {
        documentation = base.endsWith('/') ? base + uri : base + '/' + uri;
      }
    }
    return {
      name,
      description,
      source: domain || 'Entity',
      target: range || 'Entity',
      documentation
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
    // Allow only &amp;, &lt;, &gt;, &apos;, &quot;  – remove/replace every other entity reference (including ones with hyphens)
    return xml.replace(/&([a-zA-Z0-9._-]+);/g, (match, entity) => {
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
        case 'lsquo': return '\'';
        case 'rsquo': return '\'';
        case 'ldquo': return '"';
        case 'rdquo': return '"';
        // FIBO frequently defines namespace shortcut entities such as &fibo-be-corp-corp; etc.
        // We drop those references completely in the content body because xml2js/sax cannot resolve them.
        // They only appear in "rdf:about" URIs, so removing them preserves the readable part of the URI.
        default:
          return '';
      }
    });
  }

  /**
   * Resolve XML entity references by replacing them with their actual values.
   * This handles FIBO's use of entities like &fibo-fnd-acc-cur; in rdf:about attributes.
   */
  private resolveXmlEntities(xml: string): string {
    // Common FIBO entity mappings
    const entityMappings: Record<string, string> = {
      'fibo-fnd-acc-cur': 'https://spec.edmcouncil.org/fibo/ontology/FND/Accounting/CurrencyAmount/',
      'fibo-fnd-rel-rel': 'https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/',
      'fibo-fnd-utl-av': 'https://spec.edmcouncil.org/fibo/ontology/FND/Utilities/AnnotationVocabulary/',
      'fibo-be-corp-corp': 'https://spec.edmcouncil.org/fibo/ontology/BE/Corporations/Corporations/',
      'fibo-be-legal-legal': 'https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/',
      'fibo-be-legal-corp': 'https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/CorporateBodies/',
      'fibo-be-legal-formal': 'https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/FormalBusinessOrganizations/',
      'cmns-av': 'https://www.omg.org/spec/Commons/AnnotationVocabulary/',
      'cmns-cds': 'https://www.omg.org/spec/Commons/CodesAndCodeSets/',
      'cmns-col': 'https://www.omg.org/spec/Commons/Collections/',
      'cmns-cxtdsg': 'https://www.omg.org/spec/Commons/ContextualDesignators/',
      'cmns-doc': 'https://www.omg.org/spec/Commons/Documents/',
      'cmns-dsg': 'https://www.omg.org/spec/Commons/Designators/',
      'cmns-id': 'https://www.omg.org/spec/Commons/Identifiers/',
      'cmns-loc': 'https://www.omg.org/spec/Commons/Locations/',
      'cmns-qtu': 'https://www.omg.org/spec/Commons/QuantitiesAndUnits/',
      'cmns-txt': 'https://www.omg.org/spec/Commons/TextDatatype/'
    };

    // Replace entity references with their actual URLs
    let resolved = xml;
    for (const [entity, url] of Object.entries(entityMappings)) {
      const entityRef = `&${entity};`;
      resolved = resolved.replace(new RegExp(entityRef, 'g'), url);
    }

    return resolved;
  }

  /**
   * Returns the cache path for a given ontology URL.
   * The cache path is cache/ontologies/<ontology-filename> (e.g., cache/ontologies/FND-Accounting.owl)
   */
  private getCachePath(url: string): string {
    // Decide ontology key for sub-folder (e.g., "fibo", "o-cream", default "generic")
    let ontologyKey = 'generic';
    if (url.toLowerCase().includes('fibo')) {
      ontologyKey = 'fibo';
    } else if (url.toLowerCase().includes('o-cream')) {
      ontologyKey = 'o-cream';
    }

    // Remove protocol and split into path parts to mirror original directory structure
    const urlWithoutProtocol = url.replace(/^https?:\/\//i, '');
    const parts = urlWithoutProtocol
      .split(/[\\/]/)
      .map(p => p.replace(/[^a-zA-Z0-9._-]/g, '_')) // sanitise each segment
      .filter(Boolean);

    return path.join('cache', 'ontologies', ontologyKey, ...parts);
  }

  /**
   * Extract all owl:imports URLs from the parsed RDF root element
   */
  private extractImportUrls(rdfRoot: any): string[] {
    const importUrls: string[] = [];
    const scan = (obj: any) => {
      if (!obj) return;
      if (obj['owl:imports']) {
        const imports = this.getArrayElements(obj, 'owl:imports');
        for (const im of imports) {
          if (im.$ && im.$['rdf:resource']) {
            importUrls.push(im.$['rdf:resource']);
          }
        }
      }
      // Recurse into child objects to catch nested imports
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          scan(obj[key]);
        }
      }
    };
    scan(rdfRoot);
    return importUrls;
  }
} 