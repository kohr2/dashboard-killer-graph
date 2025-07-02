# Ontology-Driven Reasoning System

## Vue d'ensemble

Le système de reasoning ontology-driven permet d'exécuter des algorithmes de raisonnement définis dans les ontologies, sans logique métier codée en dur dans le code. Cette approche rend le système **ontology-agnostic** et **extensible**.

## Architecture

### Composants

1. **OntologyDrivenReasoningService** : Service principal qui exécute les algorithmes
2. **ReasoningController** : API REST pour exposer les fonctionnalités
3. **Ontologies avec section `reasoning`** : Définition des algorithmes métier

### Principe

```typescript
// Le service lit dynamiquement les algorithmes depuis l'ontologie
const algorithms = ontology.reasoning?.algorithms || {};
for (const algoName in algorithms) {
  const algo = algorithms[algoName];
  const query = this.buildQueryFromAlgorithm(algo, ontology);
  if (query) {
    await session.run(query);
  }
}
```

## Algorithmes Supportés

### 1. Similarity Scoring

Calcule la similarité entre entités basée sur des facteurs pondérés.

**Configuration dans l'ontologie :**
```json
{
  "name": "similarity_scoring",
  "description": "Calculate similarity between deals",
  "entityType": "Deal",
  "factors": ["sector", "dealType", "purpose"],
  "weights": [0.5, 0.3, 0.2],
  "threshold": 0.5,
  "relationshipType": "SIMILAR_TO"
}
```

**Requête Cypher générée :**
```cypher
MATCH (e1:Deal), (e2:Deal)
WHERE e1 <> e2 AND NOT (e1)-[:SIMILAR_TO]->(e2)
WITH e1, e2, (
  CASE WHEN e1.sector = e2.sector THEN 0.5 ELSE 0 END +
  CASE WHEN e1.dealType = e2.dealType THEN 0.3 ELSE 0 END +
  CASE WHEN e1.purpose = e2.purpose THEN 0.2 ELSE 0 END
) as similarity_score
WHERE similarity_score > 0.5
CREATE (e1)-[:SIMILAR_TO {score: similarity_score, calculated_at: datetime()}]->(e2)
```

### 2. Risk Assessment

Évalue le risque d'une entité basé sur des facteurs pondérés.

**Configuration :**
```json
{
  "name": "risk_assessment",
  "description": "Assess risk based on factors",
  "entityType": "Deal",
  "factors": ["investor_failure_rate", "sector_volatility"],
  "weights": [0.6, 0.4],
  "threshold": 0.7
}
```

### 3. Pattern Detection

Détecte des patterns spécifiques dans les entités.

**Configuration :**
```json
{
  "name": "pattern_detection",
  "description": "Detect successful deal patterns",
  "entityType": "Deal",
  "pattern": "e.status = 'CLOSED' AND e.dealSize > 1000000",
  "patternName": "large_successful_deal",
  "relationshipType": "FOLLOWS_PATTERN"
}
```

## Utilisation

### Via Service Direct

```typescript
import { OntologyDrivenReasoningService } from '@platform/reasoning/ontology-driven-reasoning.service';

// Exécuter tous les algorithmes de toutes les ontologies
await reasoningService.executeAllReasoning();

// Exécuter pour une ontologie spécifique
await reasoningService.executeOntologyReasoning(ontology);
```

### Via API REST

```typescript
import { ReasoningController } from '@platform/reasoning/reasoning.controller';

// Exécuter tous les algorithmes
const result = await controller.executeAllReasoning();

// Lister tous les algorithmes disponibles
const algorithms = await controller.getReasoningAlgorithms();

// Exécuter pour une ontologie spécifique
const result = await controller.executeOntologyReasoning('FinancialExtensionOntology');
```

## Exemples d'Ontologies

### Financial Ontology

```json
{
  "name": "FinancialExtensionOntology",
  "reasoning": {
    "algorithms": {
      "similarity_scoring": {
        "name": "similarity_scoring",
        "description": "Calculate similarity between deals",
        "entityType": "Deal",
        "factors": ["sector", "dealType", "purpose"],
        "weights": [0.5, 0.3, 0.2],
        "threshold": 0.5,
        "relationshipType": "SIMILAR_TO"
      },
      "risk_assessment": {
        "name": "risk_assessment",
        "description": "Assess deal risk",
        "entityType": "Deal",
        "factors": ["investor_failure_rate", "sector_volatility"],
        "weights": [0.6, 0.4],
        "threshold": 0.7
      }
    }
  }
}
```

### Procurement Ontology

```json
{
  "name": "ProcurementOntology",
  "reasoning": {
    "algorithms": {
      "lot_similarity": {
        "name": "lot_similarity",
        "description": "Calculate similarity between lots",
        "entityType": "Lot",
        "factors": ["category", "value"],
        "weights": [0.6, 0.4],
        "threshold": 0.6,
        "relationshipType": "LOT_SIMILARITY"
      }
    }
  }
}
```

## Tests

### Test Unitaire

```typescript
// Vérifie la génération de requêtes Cypher
it('should execute reasoning queries defined in ontology', async () => {
  await service.executeAllReasoning();
  expect(sessionRun).toHaveBeenCalled();
  const query = sessionRun.mock.calls[0][0];
  expect(query).toContain('MATCH (e1:Deal), (e2:Deal)');
  expect(query).toContain('similarity_score');
});
```

### Test d'Intégration

```typescript
// Vérifie l'exécution sur plusieurs ontologies
it('should execute reasoning for all ontologies', async () => {
  await reasoningService.executeAllReasoning();
  expect(sessionRun).toHaveBeenCalledTimes(2);
  const queries = sessionRun.mock.calls.map(call => call[0]);
  expect(queries[0]).toContain('MATCH (e1:Deal), (e2:Deal)');
  expect(queries[1]).toContain('MATCH (e1:Lot), (e2:Lot)');
});
```

## Avantages

1. **Ontology-Agnostic** : Aucune logique métier codée en dur
2. **Extensible** : Ajouter un algorithme = l'ajouter dans l'ontologie
3. **Maintenable** : Logique métier centralisée dans les ontologies
4. **Réutilisable** : Même service pour toutes les ontologies
5. **Testable** : Tests isolés et complets

## Extension

Pour ajouter un nouvel algorithme :

1. **Définir dans l'ontologie** :
```json
{
  "name": "new_algorithm",
  "description": "Description",
  "entityType": "EntityName",
  "parameters": "..."
}
```

2. **Implémenter dans le service** :
```typescript
if (algo.name === 'new_algorithm' && algo.entityType) {
  // Logique générique
  return `MATCH (e:${algo.entityType}) ...`;
}
```

3. **Tester** :
```typescript
it('should handle new_algorithm', async () => {
  // Test spécifique
});
``` 