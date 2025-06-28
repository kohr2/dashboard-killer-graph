# 🔧 Gestion de la Dette Technique

Ce guide vous aide à comprendre, analyser et réduire la dette technique du projet.

## 📊 **État Actuel**

- **543 éléments** de dette technique identifiés
- **281 heures** de travail estimées
- **~22 500€** de coût de réduction

### **Répartition par Catégorie**
- 🔴 **Type Safety** (49%) : 266 types `any` à remplacer
- 🟡 **Logging** (36%) : 197 console statements non structurés
- 🟢 **Implémentation** (15%) : 80 TODO/FIXME à compléter

## 🚀 **Actions Rapides**

### **Analyse de la Dette**
```bash
# Analyse complète
npm run debt:analyze

# Voir les priorités hautes uniquement
npm run debt:priority

# Générer un rapport détaillé
npm run debt:report
```

### **Corrections Automatiques**
```bash
# Corrections rapides automatisées
npm run debt:quick-fix

# Avant/après comparaison
npm run debt:before-after

# Correction des types + analyse
npm run debt:fix-types
```

## 🎯 **Plan de Réduction par Phases**

### **Phase 1 - Urgences (1-2 semaines)**
```bash
# Identifier les FIXME critiques
grep -r "FIXME" src/ --include="*.ts"

# Corriger les violations d'architecture
npm run lint:fix

# Ajouter tests critiques manquants
npm run test:coverage
```

### **Phase 2 - Type Safety (2-3 semaines)**
```bash
# Lister tous les types 'any'
grep -r ": any" src/ --include="*.ts" | wc -l

# Correction progressive par service
npm run debt:fix-types
```

### **Phase 3 - Infrastructure (1 semaine)**
```bash
# Migrer vers le logger structuré
npm run debt:quick-fix

# Vérifier les changements
npm run test
```

## 🛠️ **Outils Disponibles**

### **Scripts d'Analyse**
| Script | Description | Temps |
|--------|-------------|-------|
| `debt:analyze` | Analyse complète | 30s |
| `debt:priority` | Top priorités | 10s |
| `debt:report` | Rapport détaillé | 45s |

### **Scripts de Correction**
| Script | Description | Impact |
|--------|-------------|--------|
| `debt:quick-fix` | Corrections auto | ~50 fichiers |
| `debt:fix-types` | Types + lint | ~100 fichiers |
| `debt:before-after` | Comparaison | Rapport |

## 📈 **Métriques de Suivi**

### **Dashboards**
```bash
# Métriques actuelles
npm run debt:analyze | grep "Total d'éléments"

# Évolution dans le temps
git log --oneline --grep="debt" --since="1 month ago"

# Couverture de tests
npm run test:coverage | grep "All files"
```

### **Objectifs par Milestone**
- **Milestone 1** : Réduire à 400 éléments (-26%)
- **Milestone 2** : Réduire à 250 éléments (-54%)
- **Milestone 3** : Réduire à 100 éléments (-82%)

## 🔥 **Corrections Prioritaires**

### **1. Types `any` Critiques**
```typescript
// ❌ Avant
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// ✅ Après
interface DataItem {
  value: string;
  id: number;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}
```

### **2. Logging Structuré**
```typescript
// ❌ Avant
console.log('Processing email:', email.subject);
console.error('Failed to process:', error);

// ✅ Après
import { logger } from '@shared/utils/logger';

logger.info('Processing email', { subject: email.subject });
logger.error('Failed to process email', { error: error.message });
```

### **3. Gestion d'Erreurs**
```typescript
// ❌ Avant
try {
  // code
} catch (error) {
  console.error(error);
  throw error;
}

// ✅ Après
try {
  // code
} catch (error) {
  logger.error('Operation failed', { 
    operation: 'processEmail',
    error: error.message,
    stack: error.stack 
  });
  throw new ApplicationError('Email processing failed', 'EMAIL_PROCESS_ERROR');
}
```

## 🧪 **Tests & Validation**

### **Avant Chaque Correction**
```bash
# Sauvegarder l'état actuel
npm run debt:analyze > debt-before.txt

# Exécuter les tests
npm test

# Vérifier le build
npm run build
```

### **Après Chaque Correction**
```bash
# Comparer les résultats
npm run debt:analyze > debt-after.txt
diff debt-before.txt debt-after.txt

# Valider les changements
npm run health:check

# Commit si OK
git add .
git commit -m "fix: reduce technical debt - phase X"
```

## 📚 **Ressources & Bonnes Pratiques**

### **Guidelines TypeScript**
- Utiliser `unknown` au lieu de `any` quand possible
- Créer des interfaces explicites pour les données
- Utiliser les types union pour les énumérations
- Préférer les types génériques aux types `any`

### **Guidelines Logging**
- Utiliser le logger structuré avec contexte
- Inclure des identifiants pour le tracing
- Séparer les logs business des logs techniques
- Utiliser les niveaux appropriés (error, warn, info, debug)

### **Guidelines Architecture**
- Respecter la séparation des couches
- Éviter les dépendances circulaires
- Utiliser l'injection de dépendances
- Maintenir les interfaces stables

## 🎯 **Contribution**

### **Avant de Commiter**
```bash
# Vérifier l'impact sur la dette
npm run debt:before-after

# Exécuter les tests
npm test

# Vérifier le lint
npm run lint
```

### **Règles de Commit**
- `fix: reduce technical debt - [description]` pour les corrections
- `refactor: improve type safety in [service]` pour les refactorings
- `test: add missing tests for [component]` pour les tests

### **Review Checklist**
- [ ] Aucun nouveau type `any` introduit
- [ ] Logging structuré utilisé
- [ ] Tests ajoutés/mis à jour
- [ ] Documentation mise à jour
- [ ] Métriques de dette améliorées

---

> 💡 **Tip** : Utilisez `npm run debt:analyze` régulièrement pour suivre vos progrès et identifier les nouvelles opportunités d'amélioration. 