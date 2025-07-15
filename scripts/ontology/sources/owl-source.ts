import { OntologySource, ParsedOntology, Entity, Relationship } from '../ontology-source';
import { ExtractionRule } from '../config';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as path from 'path';
import * as rdf from 'rdflib';

// Aliases for well-known RDF namespace IRIs
const RDF_TYPE = rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const OWL_CLASS = rdf.sym('http://www.w3.org/2002/07/owl#Class');
const OWL_OBJECT_PROPERTY = rdf.sym('http://www.w3.org/2002/07/owl#ObjectProperty');
const RDFS_LABEL = rdf.sym('http://www.w3.org/2000/01/rdf-schema#label');
const RDFS_DOMAIN = rdf.sym('http://www.w3.org/2000/01/rdf-schema#domain');
const RDFS_RANGE = rdf.sym('http://www.w3.org/2000/01/rdf-schema#range');

export class OwlSource implements OntologySource {
  name = 'OWL Source';
  private readonly cache: Map<string, string> = new Map();
  private readonly visited: Set<string> = new Set();
  private readonly ontologyKey?: string;
  private readonly includeExternalImports: boolean;
  private currentUrl?: string; // Track current URL being processed

  constructor(options?: { ontologyKey?: string; includeExternalImports?: boolean }) {
    this.ontologyKey = options?.ontologyKey?.toLowerCase();
    this.includeExternalImports = options?.includeExternalImports ?? false;
  }

  canHandle(url: string): boolean {
    return url.includes('owl') || url.includes('fibo') || url.includes('o-cream');
  }

  async fetch(url: string): Promise<string> {
    // Set current URL for debugging
    this.currentUrl = url;
    
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
    
    // ------------------------------------------------------------------
    // Quick fallback: many ePO imports expose Turtle at the bare URL and an
    // RDF-XML version at the same URL with a ".rdf" suffix.  If the fetched
    // content looks like Turtle (starts with "@prefix" or "PREFIX " etc.)
    // we make a second attempt by appending ".rdf" and re-fetching.  This
    // way we can parse the XML version without having to add a Turtle parser.
    // ------------------------------------------------------------------
    const isProbablyTurtle = content.trimStart().startsWith('@prefix') ||
                             content.trimStart().toLowerCase().startsWith('prefix');

    let finalContent = content;
    if (isProbablyTurtle && !url.toLowerCase().endsWith('.rdf')) {
      const rdfUrl = url.endsWith('/') ? `${url}ontology.rdf` : `${url}.rdf`;
      console.log(`⚠️  Detected Turtle; retrying as RDF-XML: ${rdfUrl}`);
      try {
        const rdfResp = await fetch(rdfUrl);
        if (rdfResp.ok) {
          finalContent = await rdfResp.text();
          console.log(`   ✅ Fetched RDF-XML alternative`);
        } else {
          console.warn(`   ⚠️  RDF-XML alternative not found (${rdfResp.status}) – keeping Turtle content`);
        }
      } catch (e) {
        console.warn(`   ⚠️  Failed to fetch RDF-XML alternative:`, (e as Error).message);
      }
    }

    // Ensure cache directory exists
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Save to cache
    fs.writeFileSync(cachePath, finalContent);
    console.log(`💾 Cached to: ${cachePath}`);
    
    return finalContent;
  }

  async parse(content: string): Promise<ParsedOntology> {
    // Get caller context to identify which file is being processed
    const stack = new Error().stack;
    const callerLine = stack?.split('\n')[2] || 'unknown';
    console.log(`[DEBUG] === Processing file (caller: ${callerLine}) ===`);
    console.log(`[DEBUG] File URL: ${this.currentUrl || 'unknown'}`);
    
    // ------------------------------------------------------------------
    // 0) Content validation: skip HTML, error pages, and obviously malformed content
    // ------------------------------------------------------------------
    const trimmed = content.trim();
    
    // Debug: show first few lines of content being processed
    const firstLines = trimmed.split('\n').slice(0, 3).join('\n');
    console.log(`[DEBUG] Processing content (first 3 lines):\n${firstLines}\n---`);
    
    const loweredStart = trimmed.slice(0, 1000).toLowerCase();
    const isLikelyHtml = /<!doctype\s+html/i.test(loweredStart) || loweredStart.includes('<html');
    if (isLikelyHtml) {
      console.warn('⚠️  Skipping HTML content (likely error page)');
      return { entities: [], relationships: [] };
    }
    
    // Skip empty or very short content
    if (trimmed.length < 50) {
      console.warn('⚠️  Skipping very short content (likely error or redirect)');
      return { entities: [], relationships: [] };
    }

    // ------------------------------------------------------------------
    // 1) Improved Turtle/N3 detection: check first 5 non-empty lines for @prefix, PREFIX, or # comment
    // ------------------------------------------------------------------
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // Check if it's clearly XML first (XML declaration or root element)
    const looksLikeXml = trimmed.startsWith('<?xml') || 
                         trimmed.startsWith('<rdf:RDF') || 
                         trimmed.startsWith('<owl:Ontology') ||
                         lines.slice(0, 3).some(l => l.startsWith('<') && l.includes('xmlns'));
    
    // Only try Turtle if it's NOT XML and has Turtle indicators
    const hasTurtleIndicators = lines.slice(0, 5).some(l => 
      l.startsWith('@prefix') || 
      l.toLowerCase().startsWith('prefix') || 
      (l.startsWith('#') && !l.includes('xml'))
    );
    
    const looksLikeTurtle = !looksLikeXml && hasTurtleIndicators;

    console.log(`[DEBUG] Detection results: looksLikeXml=${looksLikeXml}, hasTurtleIndicators=${hasTurtleIndicators}, looksLikeTurtle=${looksLikeTurtle}`);

    // Try Turtle parsing first if detected
    if (looksLikeTurtle) {
      try {
        const store = rdf.graph();
        rdf.parse(trimmed, store, 'http://example.com/', 'text/turtle');

        const entities: Entity[] = [];
        const relationships: Relationship[] = [];

        // Extract classes
        const classSubjects = store.each(null, RDF_TYPE, OWL_CLASS);
        classSubjects.forEach((subject: any) => {
          if (!subject.value) return;
          let entityName = this.extractNameFromUri(subject.value);
          entityName = this.normalizeEntityName(entityName);
          if (!entityName || this.isSystemClass(entityName) || !this.isValidEntityName(entityName)) return;
          const labelLit = store.any(subject, RDFS_LABEL, null) as any;
          const description = labelLit ? (labelLit.value as string) : '';
          entities.push({
            name: entityName,
            description,
            properties: {},
            keyProperties: [],
            vectorIndex: false,
            documentation: subject.value
          });
        });

        // Extract object properties
        const propSubjects = store.each(null, RDF_TYPE, OWL_OBJECT_PROPERTY);
        propSubjects.forEach((subject: any) => {
          if (!subject.value) return;
          const propName = this.extractNameFromUri(subject.value);
          if (!propName || this.isSystemProperty(propName)) return;

          const labelLit = store.any(subject, RDFS_LABEL, null) as any;
          const description = labelLit ? (labelLit.value as string) : '';

          const domainNode = store.any(subject, RDFS_DOMAIN, null) as any;
          const rangeNode = store.any(subject, RDFS_RANGE, null) as any;
          let domainName = domainNode ? this.extractNameFromUri(domainNode.value) : 'Entity';
          let rangeName = rangeNode ? this.extractNameFromUri(rangeNode.value) : 'Entity';
          domainName = this.normalizeEntityName(domainName) || 'Entity';
          rangeName = this.normalizeEntityName(rangeName) || 'Entity';

          relationships.push({
            name: propName,
            description,
            source: domainName,
            target: rangeName,
            documentation: subject.value
          });
        });

        return { entities, relationships };
      } catch (error) {
        console.warn('⚠️  Turtle parsing failed, falling back to XML parsing');
      }
    }

    // ------------------------------------------------------------------
    // 2) XML/RDF parsing (primary path)
    // ------------------------------------------------------------------
    try {
      // Sanitize XML entities before parsing
      const sanitizedContent = this.sanitizeXmlEntities(trimmed);
      const resolvedContent = this.resolveXmlEntities(sanitizedContent);
      
      console.log(`[DEBUG] After sanitization (first 3 lines):\n${resolvedContent.split('\n').slice(0, 3).join('\n')}\n---`);
      
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        normalize: true,
        normalizeTags: false,
        trim: true
      });

      const result = await parser.parseStringPromise(resolvedContent);
      const rdfRoot = result['rdf:RDF'] || result;

      // Extract all elements first
      const allKeys = Object.keys(rdfRoot);
      console.log(`[DEBUG] All keys in rdfRoot:`, allKeys.slice(0, 10)); // Show first 10 keys
      
      // Always collect all rdf:Description elements
      const descriptionElements = this.getArrayElements(rdfRoot, 'rdf:Description');
      console.log('[DEBUG] Sample rdf:Description elements:', JSON.stringify(descriptionElements.slice(0, 3), null, 2));
      
      // Filter description elements that are classes
      const classDescriptions = descriptionElements.filter((desc: any) => {
        const typeElement = desc['rdf:type'] && desc['rdf:type']['rdf:resource'];
        return typeElement && this.isClassType(typeElement);
      });
      // Filter description elements that are object properties
      const objectPropertyDescriptions = descriptionElements.filter((desc: any) => {
        const typeElement = desc['rdf:type'] && desc['rdf:type']['rdf:resource'];
        return typeElement && this.isObjectPropertyType(typeElement);
      });
      // Filter description elements that are datatype properties
      const datatypePropertyDescriptions = descriptionElements.filter((desc: any) => {
        const typeElement = desc['rdf:type'] && desc['rdf:type']['rdf:resource'];
        return typeElement && this.isDatatypePropertyType(typeElement);
      });
      
      // For legacy support, also collect any direct owl:Class, owl:ObjectProperty, owl:DatatypeProperty
      const classElements = this.getArrayElements(rdfRoot, 'owl:Class');
      const objectPropertyElements = this.getArrayElements(rdfRoot, 'owl:ObjectProperty');
      const datatypePropertyElements = this.getArrayElements(rdfRoot, 'owl:DatatypeProperty');
      
      const allClassElements = [...classElements, ...classDescriptions];
      console.log(`[OWLSource] Found ${allClassElements.length} class elements`);
      const allObjectPropertyElements = [...objectPropertyElements, ...objectPropertyDescriptions];
      console.log(`[OWLSource] Found ${allObjectPropertyElements.length} object property elements`);
      const allDatatypePropertyElements = [...datatypePropertyElements, ...datatypePropertyDescriptions];
      console.log(`[OWLSource] Found ${allDatatypePropertyElements.length} datatype property elements`);

      // Build datatype property map for entity property extraction
      const datatypeProperties = new Map<string, any>();
      allDatatypePropertyElements.forEach((prop: any) => {
        if (prop.$ && prop.$['rdf:about']) {
          const propName = this.extractNameFromUri(prop.$['rdf:about']);
          if (propName) {
            datatypeProperties.set(propName, prop);
        }
      }
      });

      // Build entities first
      const entities: Entity[] = [];
      const entityNames = new Set<string>();

      allClassElements.forEach((classElement: any) => {
        // Support both xml2js styles: attributes at top-level or under $
        const uri = classElement['rdf:about'] || (classElement.$ && classElement.$['rdf:about']);
        let name = uri ? this.extractNameFromUri(uri) : undefined;
        
        if (!name || this.isSystemClass(name) || !this.isValidEntityName(name)) {
          return;
            }

        name = this.normalizeEntityName(name) || name;
        
        // Skip if we already have this entity
        if (entityNames.has(name)) {
          return;
        }
        
        entityNames.add(name);
        const entity = this.buildEntity(classElement, name, uri, datatypeProperties);
        entities.push(entity);
      });

      // Build relationships with access to entity names for definition parsing
      const relationships: Relationship[] = [];
      const availableEntityNames = entities.map(e => e.name);

      allObjectPropertyElements.forEach((propElement: any) => {
        // Support both xml2js styles: attributes at top-level or under $
        const uri = propElement['rdf:about'] || (propElement.$ && propElement.$['rdf:about']);
        const name = uri ? this.extractNameFromUri(uri) : undefined;
        
        if (!name || this.isSystemProperty(name)) {
          return;
        }

        const relationship = this.buildRelationshipWithEntities(propElement, name, uri, availableEntityNames);
        relationships.push(relationship);
      });

      // Aggregate parent labels for better entity recognition
      this.aggregateParentLabels(entities);

        return { entities, relationships };
    } catch (error) {
      console.error('Error parsing OWL content (Turtle fallback also failed):', error);
      throw error;
    }
  }

  async extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]> {
    // Filter out entities with invalid names first
    const validEntities = parsed.entities.filter(entity => {
      const isValid = this.isValidEntityName(entity.name);
      if (!isValid) {
        console.log(`[OWLSource] Filtering out invalid entity name: ${entity.name}`);
      }
      return isValid;
    });

    // If the config.path contains a specific ontology keyword, filter strictly
    if (config.path.includes('fibo')) {
      return validEntities.filter(entity => entity.documentation?.includes('fibo'));
    }
    if (config.path.includes('o-cream')) {
      return validEntities.filter(entity => entity.documentation?.includes('o-cream'));
    }
    // Default: include all valid entities
    return validEntities;
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

  private isValidEntityName(name: string): boolean {
    // Check if the name is a valid TypeScript identifier
    // Must start with a letter, underscore, or dollar sign
    // Can contain letters, digits, underscores, or dollar signs
    if (!name || name.length === 0) return false;
    
    // Check if it's purely numeric (which would be invalid)
    if (/^\d+$/.test(name)) return false;
    
    // Check if it starts with a valid character
    if (!/^[a-zA-Z_$]/.test(name)) return false;
    
    // Check if it contains only valid characters
    if (!/^[a-zA-Z0-9_$]+$/.test(name)) return false;
    
    // Check if it's a reserved keyword
    const reservedKeywords = [
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
    ];
    if (reservedKeywords.includes(name)) return false;
    
    return true;
  }

  private isClassType(typeElement: string): boolean {
    return typeElement.includes('owl#Class');
  }

  private isObjectPropertyType(typeElement: string): boolean {
    return typeElement.includes('owl#ObjectProperty');
  }

  private isDatatypePropertyType(typeElement: string): boolean {
    return typeElement.includes('owl#DatatypeProperty');
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

  private extractAlternativeLabels(element: any): string[] {
    const labels: string[] = [];
    
    // Extract skos:altLabel
    if (element['skos:altLabel']) {
      const altLabels = Array.isArray(element['skos:altLabel']) ? element['skos:altLabel'] : [element['skos:altLabel']];
      labels.push(...altLabels);
    }
    
    // Extract rdfs:label if it's an array (multiple labels)
    if (element['rdfs:label'] && Array.isArray(element['rdfs:label'])) {
      labels.push(...element['rdfs:label'].slice(1)); // Skip the first one as it's the primary label
    }
    
    return labels;
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
    const cleanName = this.normalizeEntityName(name) || name;
    const description = this.extractDefinition(element) || this.extractLabel(element) || `${cleanName} as defined in OWL ontology`;
    const properties = this.extractEntityProperties(element, datatypeProperties);
    
    // Extract alternative labels and add them to properties
    const alternativeLabels = this.extractAlternativeLabels(element);
    if (alternativeLabels.length > 0) {
      properties.alternativeLabels = alternativeLabels;
    }
    
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
    const parentClassRaw = this.extractParentClass(element);
    const parent = parentClassRaw ? (this.normalizeEntityName(parentClassRaw) || parentClassRaw) : undefined;

    return {
      name: cleanName,
      description,
      properties,
      keyProperties: ['name'],
      vectorIndex: true,
      documentation,
      ...(parent ? { parent } : {}),
    };
  }

  /**
   * Build a relationship with access to available entity names for definition parsing.
   * This method is ontology agnostic and uses the actual entity list for pattern matching.
   */
  private buildRelationshipWithEntities(element: any, name: string, uri: string, availableEntityNames: string[]): Relationship {
    // Source and target may refer to class names; normalise them as well
    const description = this.extractDefinition(element) || this.extractLabel(element) || `${name} relationship`;
    let domain = this.normalizeEntityName(this.extractDomain(element));
    let range = this.normalizeEntityName(this.extractRange(element));
    
    // If domain or range is missing, try to extract from definition text
    if (!domain || !range) {
      const definition = this.extractDefinition(element);
      if (definition) {
        const extractedEntities = this.extractEntitiesFromDefinition(definition, availableEntityNames);
        if (extractedEntities.length >= 2) {
          if (!domain) domain = extractedEntities[0];
          if (!range) range = extractedEntities[1];
        }
      }
    }
    
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

  /**
   * Extract entity names from definition text by matching against available entity names.
   * This method is ontology agnostic and derives patterns from the actual entity list.
   * 
   * @param definition The definition text to parse
   * @param availableEntityNames Array of available entity names from the ontology
   * @returns Array of entity names found in the definition, in order of appearance
   */
  private extractEntitiesFromDefinition(definition: any, availableEntityNames: string[]): string[] {
    // Handle definition as object (with _ property) or string
    let defText = definition;
    if (typeof defText === 'object' && defText !== null && typeof defText._ === 'string') {
      defText = defText._;
    }
    if (typeof defText !== 'string') {
      return [];
    }
    if (availableEntityNames.length === 0) {
      return [];
    }

    const foundEntities: { name: string; index: number }[] = [];
    const definitionLower = defText.toLowerCase();
    
    for (const entityName of availableEntityNames) {
      const entityNameLower = entityName.toLowerCase();
      // Use word boundary regex to avoid partial matches
      const regex = new RegExp(`\\b${entityNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = regex.exec(defText);
      if (match) {
        foundEntities.push({ name: entityName, index: match.index });
      }
    }
    // Sort by first appearance in the definition
    foundEntities.sort((a, b) => a.index - b.index);
    // Return unique entities in order of appearance
    const uniqueEntities: string[] = [];
    for (const entity of foundEntities) {
      if (!uniqueEntities.includes(entity.name)) {
        uniqueEntities.push(entity.name);
      }
    }
    return uniqueEntities;
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

  /**
   * Normalize entity class names by removing leading numeric prefixes like
   * "E55_" found in CIDOC CRM. Example: "E55_Type" -> "Type".
   * If the pattern is not present the name is returned unchanged.
   */
  public normalizeEntityName(name: string | null | undefined): string | null {
    if (!name) return null;
    // Remove E###_ prefix first
    let cleaned = name.replace(/^E\d+_/, '');
    // Convert underscores or dashes to CamelCase
    if (cleaned.includes('_') || cleaned.includes('-')) {
      cleaned = cleaned
        .split(/[_-]+/)
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('');
    }
    return cleaned;
  }

  /**
   * Aggregate parent labels as synonyms for child entities
   * This improves entity recognition by allowing parent class names to be used as alternative labels
   */
  private aggregateParentLabels(entities: Entity[]): void {
    // Build a map of entity names to their labels
    const entityLabels = new Map<string, string[]>();
    
    // First pass: collect all entity labels
    for (const entity of entities) {
      const labels: string[] = [];
      
      // Add the entity name itself
      labels.push(entity.name);
      
      // Add alternative labels from properties if they exist
      if (entity.properties.alternativeLabels) {
        labels.push(...entity.properties.alternativeLabels);
      }
      
      entityLabels.set(entity.name, labels);
    }
    
    // Second pass: aggregate parent labels
    for (const entity of entities) {
      if (entity.parent) {
        const parentLabels = entityLabels.get(entity.parent);
        if (parentLabels) {
          // Add parent labels as alternative labels
          if (!entity.properties.alternativeLabels) {
            entity.properties.alternativeLabels = [];
          }
          
          // Add parent labels that aren't already included
          for (const parentLabel of parentLabels) {
            if (!entity.properties.alternativeLabels.includes(parentLabel) && 
                parentLabel !== entity.name) {
              entity.properties.alternativeLabels.push(parentLabel);
            }
          }
        }
      }
    }
  }
} 