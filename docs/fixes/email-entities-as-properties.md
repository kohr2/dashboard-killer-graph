# Fix: Property Entities as Properties

## Problem

Le script `demo-email-ingestion-spacy.ts` créait des entités séparées dans Neo4j pour les types définis comme propriétés dans l'ontologie (`"isProperty": true`). Cela ne respectait pas l'architecture ontologique où certaines entités comme Email, Percent, Date, MonetaryAmount et Time devraient être traitées comme des propriétés des entités principales.

## Types d'entités concernés

Les entités suivantes sont définies avec `"isProperty": true` dans les ontologies :

- **Email** (CRM) : Adresses email
- **Percent** (Financial) : Valeurs de pourcentage  
- **Date** (Financial) : Dates spécifiques
- **MonetaryAmount** (Financial) : Montants monétaires
- **Time** (Financial) : Heures spécifiques

## Solution

### Modifications apportées au script `demo-email-ingestion-spacy.ts`

1. **Séparation des entités propriétés** : 
   ```typescript
   // Séparer les entités propriétés des autres entités
   const propertyEntityTypes = ['Email', 'Percent', 'Date', 'MonetaryAmount', 'Time'];
   const propertyEntities = entities.filter(entity => propertyEntityTypes.includes(entity.type));
   const nonPropertyEntities = entities.filter(entity => !propertyEntityTypes.includes(entity.type));
   ```

2. **Création d'une map des relations propriétés** :
   ```typescript
   // Créer une map des relations propriétés pour l'assignation ultérieure
   const propertyRelationships = new Map<string, Map<string, string[]>>();
   relationships.forEach(rel => {
     if (['HAS_EMAIL', 'HAS_PERCENT', 'HAS_DATE', 'HAS_MONETARY_AMOUNT', 'HAS_TIME'].includes(rel.type)) {
       const sourceId = rel.source;
       const targetEntity = entities.find(e => e.id === rel.target);
       if (targetEntity && propertyEntityTypes.includes(targetEntity.type)) {
         // Organiser par type de propriété
         const propertyType = targetEntity.type.toLowerCase();
         // Stocker dans la map organisée
       }
     }
   });
   ```

3. **Ajout des propriétés aux entités principales** :
   ```typescript
   // Ajouter les différents types de propriétés
   if (entityProperties.has('email')) {
     additionalProperties.email = emails[0];
     if (emails.length > 1) additionalProperties.additionalEmails = emails.slice(1);
   }
   
   if (entityProperties.has('percent')) {
     additionalProperties.percentage = percents[0];
     if (percents.length > 1) additionalProperties.additionalPercentages = percents.slice(1);
   }
   
   if (entityProperties.has('date')) {
     additionalProperties.date = dates[0];
     if (dates.length > 1) additionalProperties.additionalDates = dates.slice(1);
   }
   
   if (entityProperties.has('monetaryamount')) {
     additionalProperties.amount = amounts[0];
     if (amounts.length > 1) additionalProperties.additionalAmounts = amounts.slice(1);
   }
   
   if (entityProperties.has('time')) {
     additionalProperties.time = times[0];
     if (times.length > 1) additionalProperties.additionalTimes = times.slice(1);
   }
   ```

4. **Filtrage des entités et relations** :
   - Seules les entités non-propriétés sont traitées pour la création de nœuds
   - Les relations `HAS_*` sont exclues de la création de relations Neo4j
   - Les entités propriétés ne sont plus liées aux communications

## Résultats

### Avant la correction
```cypher
// Entités propriétés séparées créées
MATCH (e:Email) RETURN count(e)          // > 0
MATCH (e:Percent) RETURN count(e)        // > 0
MATCH (e:Date) RETURN count(e)           // > 0
MATCH (e:MonetaryAmount) RETURN count(e) // > 0
MATCH (e:Time) RETURN count(e)           // > 0

// Relations HAS_* créées
MATCH ()-[r:HAS_EMAIL]->() RETURN count(r)  // > 0
```

### Après la correction
```cypher
// Aucune entité propriété séparée
MATCH (e:Email) RETURN count(e)          // = 0
MATCH (e:Percent) RETURN count(e)        // = 0
MATCH (e:Date) RETURN count(e)           // = 0
MATCH (e:MonetaryAmount) RETURN count(e) // = 0
MATCH (e:Time) RETURN count(e)           // = 0

// Valeurs comme propriétés des entités principales
MATCH (e) 
WHERE (e:Person OR e:Organization OR e:Deal) 
AND (e.email IS NOT NULL OR e.percentage IS NOT NULL OR e.date IS NOT NULL 
     OR e.amount IS NOT NULL OR e.time IS NOT NULL)
RETURN e.name, e.email, e.percentage, e.date, e.amount, e.time
```

## Test de validation

Le test a été mis à jour pour couvrir tous les types de propriétés :

```typescript
it('should filter out property entities and convert them to properties', () => {
  const propertyEntityTypes = ['Email', 'Percent', 'Date', 'MonetaryAmount', 'Time'];
  const propertyEntities = mockEntities.filter(e => propertyEntityTypes.includes(e.type));
  const nonPropertyEntities = mockEntities.filter(e => !propertyEntityTypes.includes(e.type));
  
  expect(propertyEntities).toHaveLength(5); // Email, Percent, Date, MonetaryAmount, Time
  expect(nonPropertyEntities).toHaveLength(2); // Person, Organization
  
  // Vérification que les relations sont converties en propriétés
  expect(propertyRelationships.get('person-1').get('email')).toEqual(['john.doe@example.com']);
  expect(propertyRelationships.get('person-1').get('percent')).toEqual(['25%']);
  expect(propertyRelationships.get('org-1').get('date')).toEqual(['2025-01-15']);
});
```

## Impact

- ✅ Respect complet de l'ontologie : toutes les entités `"isProperty": true` sont maintenant des propriétés
- ✅ Réduction significative du nombre de nœuds dans Neo4j
- ✅ Simplification des requêtes : accès direct aux valeurs via les propriétés
- ✅ Conformité avec les meilleures pratiques de modélisation de graphe
- ✅ Extensibilité : facile d'ajouter de nouveaux types de propriétés

## Commandes pour tester

```bash
# Réinitialiser et ingérer les emails
npx ts-node -r tsconfig-paths/register scripts/demo-email-ingestion-spacy.ts --reset-db

# Vérifier qu'aucune entité propriété n'existe
npx ts-node -r tsconfig-paths/register -e "
// Script de vérification des entités propriétés
const propertyTypes = ['Email', 'Percent', 'Date', 'MonetaryAmount', 'Time'];
for (const type of propertyTypes) {
  const result = await session.run(\`MATCH (e:\${type}) RETURN count(e) as count\`);
  console.log(\`\${type}: \${result.records[0].get('count').toNumber()}\`);
}
"
``` 