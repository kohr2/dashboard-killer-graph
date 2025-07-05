import { partitionPrompt, savePartitionedPrompt } from '../partition-prompt';
import { readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('partition-prompt', () => {
  const testOutputDir = join(tmpdir(), 'test-prompt-partitions');

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should partition prompt into manageable chunks', () => {
    // Mock email content
    const mockEmailContent = 'Test email content for procurement contract award.';
    const mockEmailPath = join(tmpdir(), 'test-email.eml');
    
    // Write mock email file
    require('fs').writeFileSync(mockEmailPath, mockEmailContent);

    try {
      const partitioned = partitionPrompt('procurement', mockEmailPath, 1000);

      // Verify metadata
      expect(partitioned.metadata.ontologyName).toBe('procurement');
      expect(partitioned.metadata.emailFile).toBe(mockEmailPath);
      expect(partitioned.metadata.partitionCount).toBeGreaterThan(0);
      expect(partitioned.metadata.totalSize).toBeGreaterThan(0);

      // Verify partitions structure
      expect(partitioned.partitions).toBeDefined();
      expect(partitioned.partitions.length).toBeGreaterThan(0);

      // Verify partition naming convention (updated to handle numbered partitions)
      partitioned.partitions.forEach(partition => {
        expect(partition.name).toMatch(/^\d{2}-[a-z-]+(\d+)?$/);
        expect(partition.content).toBeDefined();
        expect(partition.size).toBeGreaterThan(0);
        expect(partition.description).toBeDefined();
      });

      // Verify instructions partition exists
      const instructionsPartition = partitioned.partitions.find(p => p.name === '01-instructions');
      expect(instructionsPartition).toBeDefined();
      expect(instructionsPartition?.content).toContain('expert financial analyst');
      expect(instructionsPartition?.content).toContain('JSON object');

      // Verify entities partition exists
      const entitiesPartition = partitioned.partitions.find(p => p.name === '02-entities');
      expect(entitiesPartition).toBeDefined();
      expect(entitiesPartition?.content).toContain('Ontology Entities');

    } finally {
      // Clean up mock file
      if (existsSync(mockEmailPath)) {
        require('fs').unlinkSync(mockEmailPath);
      }
    }
  });

  it('should filter out generic Entity->Entity relationships', () => {
    const mockEmailContent = 'Test content';
    const mockEmailPath = join(tmpdir(), 'test-email.eml');
    
    require('fs').writeFileSync(mockEmailPath, mockEmailContent);

    try {
      const partitioned = partitionPrompt('procurement', mockEmailPath, 1000);

      // Find relationship partitions
      const relationshipPartitions = partitioned.partitions.filter(p => p.name.startsWith('03-relationships'));
      
      // Verify that generic Entity->Entity patterns are filtered out
      relationshipPartitions.forEach(partition => {
        expect(partition.content).not.toContain('Entity->Entity');
        expect(partition.content).not.toContain('Entity-hasProperty->Entity');
        expect(partition.content).not.toContain('Entity-hasAttribute->Entity');
      });

      // Find entities partition
      const entitiesPartition = partitioned.partitions.find(p => p.name === '02-entities');
      expect(entitiesPartition).toBeDefined();
      
      // Verify that generic entity types are filtered out
      if (entitiesPartition) {
        expect(entitiesPartition.content).not.toContain('Thing');
        expect(entitiesPartition.content).not.toContain('UnrecognizedEntity');
      }

    } finally {
      if (existsSync(mockEmailPath)) {
        require('fs').unlinkSync(mockEmailPath);
      }
    }
  });

  it('should save partitions to filesystem', () => {
    const mockEmailContent = 'Test content for file saving';
    const mockEmailPath = join(tmpdir(), 'test-email.eml');
    
    require('fs').writeFileSync(mockEmailPath, mockEmailContent);

    try {
      const partitioned = partitionPrompt('procurement', mockEmailPath, 1000);
      savePartitionedPrompt(partitioned, testOutputDir);

      // Verify output directory exists
      expect(existsSync(testOutputDir)).toBe(true);

      // Verify metadata file exists
      const metadataPath = join(testOutputDir, 'metadata.json');
      expect(existsSync(metadataPath)).toBe(true);

      // Verify instructions file exists
      const instructionsPath = join(testOutputDir, '00-instructions.txt');
      expect(existsSync(instructionsPath)).toBe(true);

      // Verify partition files exist
      partitioned.partitions.forEach(partition => {
        const partitionPath = join(testOutputDir, `${partition.name}.txt`);
        expect(existsSync(partitionPath)).toBe(true);
        
        // Verify content matches
        const savedContent = readFileSync(partitionPath, 'utf8');
        expect(savedContent).toBe(partition.content);
      });

      // Verify combined prompt file exists
      const combinedPath = join(testOutputDir, 'combined-prompt.txt');
      expect(existsSync(combinedPath)).toBe(true);

      // Verify README exists
      const readmePath = join(testOutputDir, 'README.md');
      expect(existsSync(readmePath)).toBe(true);

    } finally {
      if (existsSync(mockEmailPath)) {
        require('fs').unlinkSync(mockEmailPath);
      }
    }
  });

  it('should handle large text content by splitting into chunks', () => {
    // Create large email content
    const largeContent = 'Test line\n'.repeat(1000); // ~10KB of content
    const mockEmailPath = join(tmpdir(), 'large-email.eml');
    
    require('fs').writeFileSync(mockEmailPath, largeContent);

    try {
      const partitioned = partitionPrompt('procurement', mockEmailPath, 1000);

      // Should have multiple text partitions
      const textPartitions = partitioned.partitions.filter(p => p.name.startsWith('04-text'));
      expect(textPartitions.length).toBeGreaterThan(1);

      // Each partition should be within size limit
      textPartitions.forEach(partition => {
        expect(partition.size).toBeLessThanOrEqual(1500); // Allow some buffer for headers
      });

    } finally {
      if (existsSync(mockEmailPath)) {
        require('fs').unlinkSync(mockEmailPath);
      }
    }
  });

  it('should handle missing ontology gracefully', () => {
    const mockEmailContent = 'Test content';
    const mockEmailPath = join(tmpdir(), 'test-email.eml');
    
    require('fs').writeFileSync(mockEmailPath, mockEmailContent);

    try {
      // The function should still work with a non-existent ontology name
      // as it will just load the core ontology
      const partitioned = partitionPrompt('nonexistent-ontology', mockEmailPath, 1000);
      
      // Should still create partitions, just with core ontology only
      expect(partitioned.metadata.ontologyName).toBe('nonexistent-ontology');
      expect(partitioned.partitions.length).toBeGreaterThan(0);

    } finally {
      if (existsSync(mockEmailPath)) {
        require('fs').unlinkSync(mockEmailPath);
      }
    }
  });

  it('should handle missing email file gracefully', () => {
    expect(() => {
      partitionPrompt('procurement', '/nonexistent/email.eml', 1000);
    }).toThrow();
  });
}); 