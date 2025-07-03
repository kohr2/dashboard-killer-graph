import * as xml2js from 'xml2js';

describe('XML Parser Debug', () => {
  it('should debug xml2js output structure', async () => {
    const sampleOwl = `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
               xmlns:owl="http://www.w3.org/2002/07/owl#"
               xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
        <owl:Class rdf:about="http://example.com/fibo#LegalEntity">
          <rdfs:comment>A legal entity as defined in FIBO</rdfs:comment>
          <rdfs:label>Legal Entity</rdfs:label>
        </owl:Class>
        <owl:Class rdf:about="http://example.com/fibo#Organization">
          <rdfs:comment>An organization</rdfs:comment>
          <rdfs:label>Organization</rdfs:label>
        </owl:Class>
        <owl:ObjectProperty rdf:about="http://example.com/fibo#hasAddress">
          <rdfs:comment>Has an address</rdfs:comment>
          <rdfs:domain rdf:resource="http://example.com/fibo#LegalEntity"/>
          <rdfs:range rdf:resource="http://example.com/fibo#Address"/>
        </owl:ObjectProperty>
      </rdf:RDF>
    `;

    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: false
    });
    
    const xml = await parser.parseStringPromise(sampleOwl);
    
    console.log('XML structure:', JSON.stringify(xml, null, 2));
    
    // Check what keys are available at the root level
    console.log('Root keys:', Object.keys(xml));
    
    // Check if rdf:RDF exists
    if (xml['rdf:RDF']) {
      console.log('rdf:RDF keys:', Object.keys(xml['rdf:RDF']));
    }
    
    // Check if owl:Class exists
    if (xml['rdf:RDF']?.['owl:Class']) {
      console.log('owl:Class found:', xml['rdf:RDF']['owl:Class']);
    }
    
    // Check if owl:ObjectProperty exists
    if (xml['rdf:RDF']?.['owl:ObjectProperty']) {
      console.log('owl:ObjectProperty found:', xml['rdf:RDF']['owl:ObjectProperty']);
    }
    
    expect(true).toBe(true); // Just for debugging
  });
}); 