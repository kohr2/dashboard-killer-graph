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
        const personEntities = entities.filter(e => e.type === 'PERSON_NAME');

        for (const person of personEntities) {
            relationships.push(...this.extractRelationshipsForPerson(text, person, entities));
        }

        return relationships;
    }

    private extractRelationshipsForPerson(text: string, person: RelationshipEntity, allEntities: RelationshipEntity[]): Relationship[] {
        const relationships: Relationship[] = [];
        const lines = text.split('\n');
        const personLineIndex = lines.findIndex(line => line.includes(person.value));

        if (personLineIndex === -1 || personLineIndex + 1 >= lines.length) {
            return relationships;
        }

        // Look for job title on the next line
        const jobTitleLine = lines[personLineIndex + 1].trim();
        const jobTitleEntity = allEntities.find(e => e.type === 'JOB_TITLE' && e.value === jobTitleLine);

        if (jobTitleEntity) {
            relationships.push({
                source: person,
                target: jobTitleEntity,
                type: 'HAS_TITLE',
                confidence: 0.9,
                context: lines.slice(personLineIndex, personLineIndex + 2).join('\n')
            });

            // Look for organization on the line after job title
            if (personLineIndex + 2 < lines.length) {
                const orgLine = lines[personLineIndex + 2].trim();
                const orgEntity = allEntities.find(e => e.type === 'ORGANIZATION' && e.value === orgLine);

                if (orgEntity) {
                    relationships.push({
                        source: person,
                        target: orgEntity,
                        type: 'WORKS_AT',
                        confidence: 0.85,
                        context: lines.slice(personLineIndex, personLineIndex + 3).join('\n')
                    });
                }
            }
        }

        return relationships;
    }
} 