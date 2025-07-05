import 'reflect-metadata';
import { OwlSource } from '../sources/owl-source';

// A **very** small Turtle fragment covering one class and one property.
const TURTLE_SAMPLE = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ex:   <http://example.com/ns#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:Widget a owl:Class ;
        rdfs:label "Widget" .

ex:hasPart a owl:ObjectProperty ;
        rdfs:label "has part" ;
        rdfs:domain ex:Widget ;
        rdfs:range  ex:Widget .`;

describe('OwlSource Turtle parsing', () => {
  it('should extract entities and relationships from a Turtle document', async () => {
    const src = new OwlSource({ includeExternalImports: true });
    const result = await src.parse(TURTLE_SAMPLE);
    expect(result.entities.some(e => e.name === 'Widget')).toBe(true);
    expect(result.relationships.some(r => r.name === 'hasPart')).toBe(true);
  });
}); 