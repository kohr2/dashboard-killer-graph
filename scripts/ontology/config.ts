export interface Source {
  url: string;
  type: 'owl' | 'rdf' | 'json' | 'other';
  version: string;
  description: string;
}

export interface ExtractionRule {
  path: string;
  name: string;
  description: string;
  source?: string; // For relationships
  target?: string; // For relationships
  properties?: {
    path: string;
    name: string;
    type: string;
  };
}

export interface ExtractionConfig {
  entities: ExtractionRule;
  relationships: ExtractionRule;
}

export interface OverrideConfig {
  entities: Record<string, any>;
  relationships: Record<string, any>;
}

export interface Metadata {
  lastExtraction: string;
  sourceVersion: string;
  localVersion: string;
}

export interface Config {
  name: string;
  source: Source;
  extraction: ExtractionConfig;
  overrides: OverrideConfig;
  metadata: Metadata;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateConfig(config: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!config.name) {
    errors.push('name is required');
  }

  if (!config.source) {
    errors.push('source is required');
  } else {
    if (!config.source.url) {
      errors.push('source.url is required');
    } else if (!isValidUrl(config.source.url)) {
      errors.push('source.url must be a valid URL');
    }

    if (!config.source.type) {
      errors.push('source.type is required');
    } else if (!['owl', 'rdf', 'json', 'other'].includes(config.source.type)) {
      errors.push('source.type must be one of: owl, rdf, json, other');
    }

    if (!config.source.version) {
      errors.push('source.version is required');
    }

    if (!config.source.description) {
      errors.push('source.description is required');
    }
  }

  if (!config.extraction) {
    errors.push('extraction is required');
  } else {
    if (!config.extraction.entities) {
      errors.push('extraction.entities is required');
    } else {
      if (!config.extraction.entities.path) {
        errors.push('extraction.entities.path is required');
      }
      if (!config.extraction.entities.name) {
        errors.push('extraction.entities.name is required');
      }
      if (!config.extraction.entities.description) {
        errors.push('extraction.entities.description is required');
      }
    }

    if (!config.extraction.relationships) {
      errors.push('extraction.relationships is required');
    } else {
      if (!config.extraction.relationships.path) {
        errors.push('extraction.relationships.path is required');
      }
      if (!config.extraction.relationships.name) {
        errors.push('extraction.relationships.name is required');
      }
      if (!config.extraction.relationships.description) {
        errors.push('extraction.relationships.description is required');
      }
    }
  }

  if (!config.overrides) {
    errors.push('overrides is required');
  } else {
    if (!config.overrides.entities) {
      errors.push('overrides.entities is required');
    }
    if (!config.overrides.relationships) {
      errors.push('overrides.relationships is required');
    }
  }

  if (!config.metadata) {
    errors.push('metadata is required');
  } else {
    if (!config.metadata.lastExtraction) {
      errors.push('metadata.lastExtraction is required');
    }
    if (!config.metadata.sourceVersion) {
      errors.push('metadata.sourceVersion is required');
    }
    if (!config.metadata.localVersion) {
      errors.push('metadata.localVersion is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 