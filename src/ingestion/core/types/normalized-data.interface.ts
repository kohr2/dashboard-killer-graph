/**
 * Structure de données normalisée commune
 * Toutes les sources sont converties vers ce format
 */
export interface NormalizedData {
  id: string;
  sourceType: SourceType;
  sourceId: string;
  content: {
    title?: string;
    body: string;
    summary?: string;
    language?: string;
  };
  metadata: {
    timestamp: Date;
    author?: string;
    recipients?: string[];
    tags?: string[];
    classification?: string;
    confidence?: number;
    [key: string]: any;
  };
  raw: any; // Données originales pour référence
}
