#!/bin/bash

# Script de création de la structure d'ingestion unifiée
# Transforme le "bordel" actuel en architecture propre

set -e

echo "🏗️ Creating Unified Data Ingestion Architecture..."
echo "=================================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Créer la structure principale
echo -e "${BLUE}📁 Creating main ingestion structure...${NC}"
mkdir -p src/ingestion/{core,sources,intelligence,api,config}

# Créer la structure core
echo -e "${BLUE}🎯 Creating core components...${NC}"
mkdir -p src/ingestion/core/{pipeline,adapters,processors,storage,types}

# Créer la structure sources
echo -e "${BLUE}📥 Creating data sources structure...${NC}"
mkdir -p src/ingestion/sources/{email,documents,apis,databases}
mkdir -p src/ingestion/sources/email/{providers,parsers,processors}
mkdir -p src/ingestion/sources/documents/{parsers,processors}
mkdir -p src/ingestion/sources/apis/{crm,financial,social}

# Créer la structure intelligence
echo -e "${BLUE}🧠 Creating intelligence components...${NC}"
mkdir -p src/ingestion/intelligence/{nlp,ml,business}

# Créer la structure API
echo -e "${BLUE}🌐 Creating API structure...${NC}"
mkdir -p src/ingestion/api/{controllers,middleware,validators}

# Créer la structure config
echo -e "${BLUE}⚙️ Creating configuration structure...${NC}"
mkdir -p src/ingestion/config/{sources,pipelines,intelligence}

# Créer la structure de tests
echo -e "${BLUE}🧪 Creating test structure...${NC}"
mkdir -p test/ingestion/{unit,integration,e2e}
mkdir -p test/ingestion/unit/{core,sources,intelligence}
mkdir -p test/ingestion/integration/{pipelines,sources}

# Créer les fichiers de base avec des interfaces
echo -e "${BLUE}📄 Creating base interface files...${NC}"

# Interface DataSource
cat > src/ingestion/core/types/data-source.interface.ts << 'EOF'
/**
 * Interface commune pour toutes les sources de données
 * Permet l'unification des différents types de sources
 */
export interface DataSource<T = any> {
  readonly id: string;
  readonly type: SourceType;
  readonly config: SourceConfig;
  
  connect(): Promise<void>;
  fetch(params?: FetchParams): AsyncIterable<T>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
}

export enum SourceType {
  EMAIL = 'email',
  DOCUMENT = 'document',
  API = 'api',
  DATABASE = 'database'
}

export interface SourceConfig {
  name: string;
  enabled: boolean;
  batchSize?: number;
  retryAttempts?: number;
  timeout?: number;
  [key: string]: any;
}

export interface FetchParams {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  message?: string;
  metrics?: Record<string, number>;
}
EOF

# Interface Pipeline
cat > src/ingestion/core/types/pipeline.interface.ts << 'EOF'
/**
 * Interface pour les pipelines d'ingestion
 * Définit le contrat pour le traitement unifié des données
 */
export interface IngestionPipeline {
  readonly id: string;
  readonly type: string;
  
  process(source: DataSource): Promise<ProcessingResult>;
  monitor(): PipelineMetrics;
  stop(): Promise<void>;
}

export interface ProcessingResult {
  success: boolean;
  sourceId: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  entitiesCreated: number;
  relationshipsCreated: number;
  duration: number;
  errors: ProcessingError[];
  metadata: Record<string, any>;
}

export interface PipelineMetrics {
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  lastRun: Date;
  status: 'running' | 'idle' | 'error';
}

export interface ProcessingError {
  item: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}
EOF

# Interface pour les données normalisées
cat > src/ingestion/core/types/normalized-data.interface.ts << 'EOF'
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
EOF

# Créer le fichier index principal
cat > src/ingestion/index.ts << 'EOF'
/**
 * Point d'entrée principal pour la plateforme d'ingestion unifiée
 */

// Core types
export * from './core/types/data-source.interface';
export * from './core/types/pipeline.interface';
export * from './core/types/normalized-data.interface';

// Core components (à implémenter)
// export * from './core/pipeline/ingestion-pipeline';
// export * from './core/adapters/base-adapter';

// Sources (à implémenter)
// export * from './sources/email/email-source';
// export * from './sources/documents/document-source';

// Intelligence (à implémenter)
// export * from './intelligence/nlp/entity-extractor';

// API (à implémenter)
// export * from './api/controllers/ingestion.controller';
EOF

# Créer un README pour la nouvelle architecture
cat > src/ingestion/README.md << 'EOF'
# 📊 Unified Data Ingestion Platform

Cette plateforme d'ingestion unifiée remplace l'ancienne architecture dispersée et fournit un point d'entrée unique pour toutes les sources de données.

## 🏗️ Architecture

```
src/ingestion/
├── core/           # Composants centraux
│   ├── pipeline/  # Traitement unifié
│   ├── adapters/  # Adaptateurs sources
│   └── types/     # Interfaces communes
├── sources/        # Sources spécialisées
│   ├── email/     # Emails (IMAP, .eml, etc.)
│   ├── documents/ # PDFs, Word, etc.
│   └── apis/      # APIs externes
├── intelligence/   # IA centralisée
│   ├── nlp/       # NLP unifié
│   ├── ml/        # Machine Learning
│   └── business/  # Intelligence métier
└── api/            # APIs REST
    └── controllers/ # Points d'entrée
```

## 🚀 Utilisation

```typescript
// Exemple d'ingestion d'emails
const emailSource = new EmailSource(new EmlProvider('./emails'));
const pipeline = new IngestionPipeline(config);

const result = await pipeline.process(emailSource);
console.log(`Processed ${result.itemsProcessed} items`);
```

## 🎯 Avantages

- ✅ **Unification** : Un seul pipeline pour toutes les sources
- ✅ **Extensibilité** : Ajout facile de nouvelles sources
- ✅ **Maintenabilité** : Architecture modulaire et testable
- ✅ **Performance** : Traitement optimisé par lots
- ✅ **Monitoring** : Métriques et observabilité intégrées

## 📋 Migration

Cette architecture remplace :
- `src/ontologies/crm/application/services/email-*.ts`
- `src/platform/processing/content-processing.service.ts`
- `scripts/demo-email-ingestion-spacy.ts`

Voir `docs/architecture/refactoring-plan.md` pour le plan de migration complet.
EOF

# Créer les fichiers .gitkeep pour préserver la structure
find src/ingestion -type d -empty -exec touch {}/.gitkeep \;
find test/ingestion -type d -empty -exec touch {}/.gitkeep \;

echo ""
echo -e "${GREEN}✅ Unified ingestion structure created successfully!${NC}"
echo ""
echo -e "${YELLOW}📁 Structure created:${NC}"
echo "   📊 src/ingestion/ - Main ingestion platform"
echo "   🎯 src/ingestion/core/ - Core components"
echo "   📥 src/ingestion/sources/ - Data sources"
echo "   🧠 src/ingestion/intelligence/ - AI components"
echo "   🌐 src/ingestion/api/ - REST APIs"
echo "   ⚙️ src/ingestion/config/ - Configuration"
echo "   🧪 test/ingestion/ - Unified tests"
echo ""
echo -e "${YELLOW}📄 Files created:${NC}"
echo "   📋 Base interfaces and types"
echo "   📖 Documentation and README"
echo "   🔧 Index file for exports"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "   1. Review the created structure"
echo "   2. Run: ./scripts/refactoring/migrate-email-services.sh"
echo "   3. Implement the core pipeline components"
echo "   4. Migrate existing email services"
echo ""
echo "🎯 This structure will replace the current scattered email processing!" 