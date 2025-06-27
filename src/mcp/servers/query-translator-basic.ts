/**
 * Basic query translation module for MCP fallback server
 * Provides pattern matching based query translation without external dependencies
 */

export interface TranslatedQuery {
  command: 'show' | 'show_related' | 'unknown';
  resourceTypes: string[];
  filters?: Record<string, any>;
  relatedTo?: string[];
}

/**
 * Translates natural language queries into structured format using pattern matching
 * @param query - Natural language query string
 * @returns Structured query object
 */
export function translateQueryBasic(query: string): TranslatedQuery {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const lowercaseQuery = query.toLowerCase();
  
  // Détection des types d'entités
  const entityTypes: string[] = [];
  
  if (lowercaseQuery.includes('deal') || lowercaseQuery.includes('transaction')) {
    entityTypes.push('Deal');
  }
  if (lowercaseQuery.includes('contact') || lowercaseQuery.includes('person') || lowercaseQuery.includes('people')) {
    entityTypes.push('Contact', 'Person');
  }
  if (lowercaseQuery.includes('organization') || lowercaseQuery.includes('company') || lowercaseQuery.includes('companies') || lowercaseQuery.includes('firm')) {
    entityTypes.push('Organization');
  }
  if (lowercaseQuery.includes('communication') || lowercaseQuery.includes('email') || lowercaseQuery.includes('message')) {
    entityTypes.push('Communication');
  }
  if (lowercaseQuery.includes('investor') || lowercaseQuery.includes('fund')) {
    entityTypes.push('Investor', 'Fund');
  }
  
  // Si aucun type détecté, utiliser Deal par défaut
  if (entityTypes.length === 0) {
    entityTypes.push('Deal');
  }
  
  // Détection des filtres
  const filters: Record<string, any> = {};
  
  // Extraire les noms propres (mots avec majuscule) - mais exclure les mots communs
  const words = query.split(/\s+/);
  const commonWords = ['Show', 'Find', 'Get', 'List', 'Display', 'Search'];
  const properNouns = words.filter(word => 
    /^[A-Z][a-z]+/.test(word) && !commonWords.includes(word)
  );
  if (properNouns.length > 0) {
    filters.name = properNouns.join(' ');
  }
  
  // Détection de commandes
  let command: 'show' | 'show_related' | 'unknown' = 'show';
  if (lowercaseQuery.includes('related') || lowercaseQuery.includes('with') || lowercaseQuery.includes('lié')) {
    command = 'show_related';
  }
  
  return {
    command,
    resourceTypes: entityTypes,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    relatedTo: command === 'show_related' ? ['Organization'] : undefined
  };
} 