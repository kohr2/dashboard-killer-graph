// Financial Extension Exports
// Deal tracking and financial CRM functionality

// Exports for the Financial Ontology Extension

// Application Layer
export * from './application/services/financial-entity-integration.service';
// export * from './application/services/hybrid-deal-extraction.service'; // Exports 'Deal', creating a conflict
export * from './application/ontology-bridges/financial-to-crm.bridge';

// Infrastructure Layer
export * from './infrastructure';

// Interface Layer
export * from './interface';

// Registration
export { registerFinancial } from './register'; 