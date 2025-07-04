import * as fs from 'fs';
import * as xml2js from 'xml2js';

function sanitizeXmlEntities(xml: string): string {
  // Replace known problematic entities with their Unicode equivalents or remove them
  // Allow only &amp;, &lt;, &gt;, &apos;, &quot;  – remove/replace every other entity reference (including ones with hyphens)
  return xml.replace(/&([a-zA-Z0-9._-]+);/g, (match, entity) => {
    switch (entity) {
      case 'amp':
      case 'lt':
      case 'gt':
      case 'apos':
      case 'quot':
        return match;
      // Add common HTML entities if needed
      case 'nbsp': return ' ';
      case 'mdash': return '-';
      case 'ndash': return '-';
      case 'hellip': return '...';
      case 'lsquo': return '\'';
      case 'rsquo': return '\'';
      case 'ldquo': return '"';
      case 'rdquo': return '"';
      // FIBO frequently defines namespace shortcut entities such as &fibo-be-corp-corp; etc.
      // We drop those references completely in the content body because xml2js/sax cannot resolve them.
      // They only appear in "rdf:about" URIs, so removing them preserves the readable part of the URI.
      default:
        return '';
    }
  });
}

async function testXmlParsing() {
  console.log('🧪 Testing XML parsing of FIBO file...\n');
  
  let content = fs.readFileSync('cache/ontologies/fibo/raw.githubusercontent.com/edmcouncil/fibo/master/AboutFIBOProd.rdf', 'utf8');
  
  console.log('📄 Original content preview (first 200 chars):');
  console.log(content.substring(0, 200));
  console.log('\n');
  
  // Apply our sanitization
  content = sanitizeXmlEntities(content);
  
  console.log('🧹 Sanitized content preview (first 200 chars):');
  console.log(content.substring(0, 200));
  console.log('\n');
  
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: false,
    explicitRoot: false
  });
  
  try {
    const result = await parser.parseStringPromise(content);
    console.log('✅ XML parsing successful!');
    console.log('📋 Root keys:', Object.keys(result || {}));
    console.log('🔍 Has rdf:RDF:', !!(result && result['rdf:RDF']));
    
    if (result && result['rdf:RDF']) {
      const rdfRoot = result['rdf:RDF'];
      console.log('📊 rdf:RDF keys:', Object.keys(rdfRoot));
      console.log('🦉 Has owl:Ontology:', !!(rdfRoot['owl:Ontology']));
      console.log('📦 Has owl:imports:', !!(rdfRoot['owl:imports']));
    }
  } catch (error) {
    console.error('❌ XML parsing failed:', error);
  }
}

testXmlParsing().catch(console.error); 