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
