// O-CREAM-v2 Ontology for CRM Domain
// Export all ontology components

export * from './o-cream-v2';

// Ontology metadata
export const ONTOLOGY_INFO = {
  name: 'O-CREAM-v2',
  version: '2.0.0',
  description: 'Ontology for Customer Relationship Management based on DOLCE foundational ontology',
  foundation: 'DOLCE (Descriptive Ontology for Linguistic and Cognitive Engineering)',
  modules: [
    'Relationships',
    'Knowledge', 
    'Activities',
    'Software',
    'Miscellaneous'
  ],
  authors: ['CRM Development Team'],
  license: 'MIT',
  created: new Date().toISOString(),
  standards: ['DOLCE', 'ISO 21838']
}; 