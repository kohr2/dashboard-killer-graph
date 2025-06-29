// Financial Extension Exports
// Deal tracking and financial CRM functionality

// Exports for the Financial Ontology Extension

// Application Layer
export * from './application/services/financial-entity-integration.service';
// export * from './application/services/hybrid-deal-extraction.service'; // Exports 'Deal', creating a conflict
export * from './application/ontology-bridges/financial-to-crm.bridge';

// Domain Layer
export * from './domain/entities/deal';
export * from './domain/entities/fund';
export * from './domain/entities/investor';
export * from './domain/entities/regulatory-information';
// export * from './domain/entities/investment'; // File does not exist

// Infrastructure Layer
export * from './infrastructure';

// Interface Layer
export * from './interface';

// Extension Definition
export { FinancialExtension } from './financial.extension';

// Registration
export { registerFinancial } from './register'; 