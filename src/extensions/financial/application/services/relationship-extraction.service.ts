export interface RelationshipEntity {
    id: string;
    type: string;
    value: string;
}

export interface Relationship {
    source: RelationshipEntity;
    target: RelationshipEntity;
    type: 'WORKS_AT' | 'HAS_TITLE' | 'MANAGING_DIRECTOR_OF';
    confidence: number;
    context: string;
}

export class RelationshipExtractionService {
    public extract(text: string, entities: RelationshipEntity[]): Relationship[] {
        const relationships: Relationship[] = [];
        const personEntities = entities.filter(e => e.type === 'PERSON' || e.type === 'PERSON_NAME');
        const orgEntities = entities.filter(e => e.type === 'ORG' || e.type === 'COMPANY_NAME' || e.type === 'FINANCIAL_INSTITUTION');
        const titleEntities = entities.filter(e => e.type === 'JOB_TITLE');

        for (const person of personEntities) {
            for (const org of orgEntities) {
                // Regex to find "Person at|from|of Org" or "Org's Person"
                const worksAtRegex = new RegExp(`(${person.value}\\s*(at|from|of|,)\\s*${org.value})|(${org.value}'s\\s*${person.value})`, 'i');
                const match = text.match(worksAtRegex);
                if (match) {
                    relationships.push({
                        source: person,
                        target: org,
                        type: 'WORKS_AT',
                        confidence: 0.9,
                        context: match[0]
                    });
                }
            }

            for (const title of titleEntities) {
                // Regex to find "Person, Title" or "Title at/of"
                const hasTitleRegex = new RegExp(`${person.value},\\s*${title.value}`, 'i');
                const match = text.match(hasTitleRegex);
                if (match) {
                     relationships.push({
                        source: person,
                        target: title,
                        type: 'HAS_TITLE',
                        confidence: 0.9,
                        context: match[0]
                    });
                }
            }
        }

        return relationships;
    }
} 