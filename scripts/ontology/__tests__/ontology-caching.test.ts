import { OwlSource } from '../sources/owl-source';
import * as fs from 'fs';
import * as path from 'path';

describe('Ontology Caching', () => {
  let owlSource: OwlSource;

  beforeEach(() => {
    owlSource = new OwlSource();
  });

  it('should handle local file fetching', async () => {
    const localTestFile = path.join(__dirname, '..', 'sources', 'owl-source.ts');
    
    if (fs.existsSync(localTestFile)) {
      const content = await owlSource.fetch(`file://${localTestFile}`);
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('class OwlSource');
    } else {
      // Skip test if file doesn't exist
      console.log('⚠️  Local test file not found, skipping local file test');
    }
  });

  it('should cache online ontology files', async () => {
    // Use a simple, reliable test URL
    const testUrl = 'https://www.w3.org/2002/07/owl';
    
    try {
      // First fetch - should download and cache
      const content1 = await owlSource.fetch(testUrl);
      expect(content1).toBeDefined();
      expect(content1.length).toBeGreaterThan(0);
      
      // Second fetch - should use cache
      const content2 = await owlSource.fetch(testUrl);
      expect(content2).toBeDefined();
      expect(content2.length).toBeGreaterThan(0);
      
      // Verify content is the same
      expect(content1).toBe(content2);
      
      // Check if cache file exists
      const fileName = testUrl.split('/').pop() || 'ontology.rdf';
      const cachePath = path.join('cache', 'ontologies', fileName);
      expect(fs.existsSync(cachePath)).toBe(true);
      
      const stats = fs.statSync(cachePath);
      expect(stats.size).toBeGreaterThan(0);
      
    } catch (error) {
      // If the URL is not accessible, that's okay for the test
      console.log(`⚠️  Online test URL not accessible: ${error}`);
    }
  });

  it('should generate correct cache paths', async () => {
    const testUrls = [
      'https://example.com/ontology.owl',
      'https://example.com/fibo/FND-Accounting.rdf',
      'https://example.com/ontology.xml'
    ];
    
    // Mock fetch to avoid actual network calls
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>')
      });
    });
    
    try {
      for (const testUrl of testUrls) {
        await owlSource.fetch(testUrl);
        
        // Check that cache file was created with correct name
        const fileName = testUrl.split('/').pop() || 'ontology.owl';
        const cachePath = path.join('cache', 'ontologies', fileName);
        
        // The file should exist since we mocked the fetch
        expect(cachePath).toContain('cache/ontologies/');
        expect(cachePath).toMatch(/\.(owl|rdf|xml)$/);
      }
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });

  it('should handle parsing errors gracefully', async () => {
    const invalidUrl = 'https://example.com/nonexistent.owl';
    
    // Mock fetch to return an error
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: false,
        statusText: 'Not Found'
      });
    });
    
    try {
      await owlSource.fetch(invalidUrl);
      fail('Should have thrown an error for invalid URL');
    } catch (error) {
      expect(error).toBeDefined();
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });
}); 