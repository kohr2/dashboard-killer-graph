#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface ISCOGroup {
  code: string;
  name: string;
  description?: string;
  parentCode?: string;
  level: 'major' | 'sub-major' | 'minor' | 'unit';
}

interface ISCOData {
  majorGroups: ISCOGroup[];
  subMajorGroups: ISCOGroup[];
  minorGroups: ISCOGroup[];
  unitGroups: ISCOGroup[];
}

interface OntologyOutput {
  entities: {
    ISCOMajorGroup: Record<string, any>;
    ISCOSubMajorGroup: Record<string, any>;
    ISCOMinorGroup: Record<string, any>;
    ISCOUnitGroup: Record<string, any>;
    ISCOGroup: Record<string, any>;
  };
  relationships: {
    ISCO_GROUP_PARENT: Array<{ source: string; target: string }>;
    ISCO_GROUP_TYPE: Array<{ source: string; target: string; type: string }>;
  };
}

class ISCODataTransformer {
  private iscoData: ISCOData = {
    majorGroups: [],
    subMajorGroups: [],
    minorGroups: [],
    unitGroups: []
  };

  /**
   * Download and parse ISCO data from the GitHub repository
   */
  async downloadISCOData(): Promise<void> {
    console.log('Downloading ISCO data...');
    
    try {
      // Download the seeds file which contains the ISCO structure
      const response = await axios.get('https://raw.githubusercontent.com/patriciomacadden/isco/master/db/seeds.rb');
      const content = response.data;
      
      // Parse the Ruby seeds file to extract ISCO data
      this.parseRubySeedsFile(content);
      
      console.log(`Parsed ${this.iscoData.majorGroups.length} major groups`);
      console.log(`Parsed ${this.iscoData.subMajorGroups.length} sub-major groups`);
      console.log(`Parsed ${this.iscoData.minorGroups.length} minor groups`);
      console.log(`Parsed ${this.iscoData.unitGroups.length} unit groups`);
      
    } catch (error) {
      console.error('Error downloading ISCO data:', error);
      throw error;
    }
  }

  /**
   * Parse the Ruby seeds file to extract ISCO groups
   */
  private parseRubySeedsFile(content: string): void {
    // Extract major groups (first level)
    const majorGroupsMatch = content.match(/isco_first_level_groups\s*=\s*\[([\s\S]*?)\]/);
    if (majorGroupsMatch) {
      const majorGroupsContent = majorGroupsMatch[1];
      this.iscoData.majorGroups = this.parseRubyArray(majorGroupsContent, 'major');
    }

    // Extract sub-major groups (second level)
    const subMajorGroupsMatch = content.match(/isco_second_level_groups\s*=\s*\[([\s\S]*?)\]/);
    if (subMajorGroupsMatch) {
      const subMajorGroupsContent = subMajorGroupsMatch[1];
      this.iscoData.subMajorGroups = this.parseRubyArray(subMajorGroupsContent, 'sub-major');
    }

    // Extract minor groups (third level)
    const minorGroupsMatch = content.match(/isco_third_level_groups\s*=\s*\[([\s\S]*?)\]/);
    if (minorGroupsMatch) {
      const minorGroupsContent = minorGroupsMatch[1];
      this.iscoData.minorGroups = this.parseRubyArray(minorGroupsContent, 'minor');
    }

    // Extract unit groups (fourth level)
    const unitGroupsMatch = content.match(/isco_fourth_level_groups\s*=\s*\[([\s\S]*?)\]/);
    if (unitGroupsMatch) {
      const unitGroupsContent = unitGroupsMatch[1];
      this.iscoData.unitGroups = this.parseRubyArray(unitGroupsContent, 'unit');
    }
  }

  /**
   * Parse Ruby array format into ISCO groups
   */
  private parseRubyArray(content: string, level: 'major' | 'sub-major' | 'minor' | 'unit'): ISCOGroup[] {
    const groups: ISCOGroup[] = [];
    
    // Match Ruby hash entries: { code: '1', name: 'Directores y gerentes' }
    const regex = /\{\s*code:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"](?:,\s*first_level_code:\s*['"]([^'"]+)['"])?\s*\}/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      const code = match[1];
      const name = match[2];
      const parentCode = match[3];
      
      groups.push({
        code,
        name,
        parentCode,
        level
      });
    }
    
    return groups;
  }

  /**
   * Transform ISCO data to ontology format
   */
  transformToOntology(): OntologyOutput {
    console.log('Transforming ISCO data to ontology format...');
    
    const output: OntologyOutput = {
      entities: {
        ISCOMajorGroup: {},
        ISCOSubMajorGroup: {},
        ISCOMinorGroup: {},
        ISCOUnitGroup: {},
        ISCOGroup: {}
      },
      relationships: {
        ISCO_GROUP_PARENT: [],
        ISCO_GROUP_TYPE: []
      }
    };

    // Process major groups
    this.iscoData.majorGroups.forEach(group => {
      const entityId = `ISCOMajorGroup_${group.code}`;
      
      output.entities.ISCOMajorGroup[entityId] = {
        code: group.code,
        name: group.name,
        description: `ISCO Major Group ${group.code}: ${group.name}`,
        level: 'major'
      };
      
      // Add to general ISCOGroup
      output.entities.ISCOGroup[entityId] = {
        code: group.code,
        name: group.name,
        level: 'major',
        description: `ISCO Major Group ${group.code}: ${group.name}`
      };
      
      // Add type relationship
      output.relationships.ISCO_GROUP_TYPE.push({
        source: entityId,
        target: entityId,
        type: 'ISCOMajorGroup'
      });
    });

    // Process sub-major groups
    this.iscoData.subMajorGroups.forEach(group => {
      const entityId = `ISCOSubMajorGroup_${group.code}`;
      const parentId = `ISCOMajorGroup_${group.parentCode}`;
      
      output.entities.ISCOSubMajorGroup[entityId] = {
        code: group.code,
        name: group.name,
        description: `ISCO Sub-Major Group ${group.code}: ${group.name}`,
        parentCode: group.parentCode,
        level: 'sub-major'
      };
      
      // Add to general ISCOGroup
      output.entities.ISCOGroup[entityId] = {
        code: group.code,
        name: group.name,
        level: 'sub-major',
        description: `ISCO Sub-Major Group ${group.code}: ${group.name}`,
        parentCode: group.parentCode
      };
      
      // Add parent relationship
      if (group.parentCode) {
        output.relationships.ISCO_GROUP_PARENT.push({
          source: entityId,
          target: parentId
        });
      }
      
      // Add type relationship
      output.relationships.ISCO_GROUP_TYPE.push({
        source: entityId,
        target: entityId,
        type: 'ISCOSubMajorGroup'
      });
    });

    // Process minor groups
    this.iscoData.minorGroups.forEach(group => {
      const entityId = `ISCOMinorGroup_${group.code}`;
      const parentId = `ISCOSubMajorGroup_${group.parentCode}`;
      
      output.entities.ISCOMinorGroup[entityId] = {
        code: group.code,
        name: group.name,
        description: `ISCO Minor Group ${group.code}: ${group.name}`,
        parentCode: group.parentCode,
        level: 'minor'
      };
      
      // Add to general ISCOGroup
      output.entities.ISCOGroup[entityId] = {
        code: group.code,
        name: group.name,
        level: 'minor',
        description: `ISCO Minor Group ${group.code}: ${group.name}`,
        parentCode: group.parentCode
      };
      
      // Add parent relationship
      if (group.parentCode) {
        output.relationships.ISCO_GROUP_PARENT.push({
          source: entityId,
          target: parentId
        });
      }
      
      // Add type relationship
      output.relationships.ISCO_GROUP_TYPE.push({
        source: entityId,
        target: entityId,
        type: 'ISCOMinorGroup'
      });
    });

    // Process unit groups
    this.iscoData.unitGroups.forEach(group => {
      const entityId = `ISCOUnitGroup_${group.code}`;
      const parentId = `ISCOMinorGroup_${group.parentCode}`;
      
      output.entities.ISCOUnitGroup[entityId] = {
        code: group.code,
        name: group.name,
        description: `ISCO Unit Group ${group.code}: ${group.name}`,
        parentCode: group.parentCode,
        level: 'unit'
      };
      
      // Add to general ISCOGroup
      output.entities.ISCOGroup[entityId] = {
        code: group.code,
        name: group.name,
        level: 'unit',
        description: `ISCO Unit Group ${group.code}: ${group.name}`,
        parentCode: group.parentCode
      };
      
      // Add parent relationship
      if (group.parentCode) {
        output.relationships.ISCO_GROUP_PARENT.push({
          source: entityId,
          target: parentId
        });
      }
      
      // Add type relationship
      output.relationships.ISCO_GROUP_TYPE.push({
        source: entityId,
        target: entityId,
        type: 'ISCOUnitGroup'
      });
    });

    return output;
  }

  /**
   * Save the transformed data to files
   */
  async saveTransformedData(output: OntologyOutput): Promise<void> {
    const outputDir = path.join(__dirname, '..', 'data');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save entities
    const entitiesPath = path.join(outputDir, 'isco-entities.json');
    fs.writeFileSync(entitiesPath, JSON.stringify(output.entities, null, 2));
    console.log(`Saved entities to: ${entitiesPath}`);

    // Save relationships
    const relationshipsPath = path.join(outputDir, 'isco-relationships.json');
    fs.writeFileSync(relationshipsPath, JSON.stringify(output.relationships, null, 2));
    console.log(`Saved relationships to: ${relationshipsPath}`);

    // Save combined data
    const combinedPath = path.join(outputDir, 'isco-ontology-data.json');
    fs.writeFileSync(combinedPath, JSON.stringify(output, null, 2));
    console.log(`Saved combined data to: ${combinedPath}`);

    // Generate statistics
    const stats = {
      totalEntities: Object.keys(output.entities.ISCOGroup).length,
      majorGroups: Object.keys(output.entities.ISCOMajorGroup).length,
      subMajorGroups: Object.keys(output.entities.ISCOSubMajorGroup).length,
      minorGroups: Object.keys(output.entities.ISCOMinorGroup).length,
      unitGroups: Object.keys(output.entities.ISCOUnitGroup).length,
      parentRelationships: output.relationships.ISCO_GROUP_PARENT.length,
      typeRelationships: output.relationships.ISCO_GROUP_TYPE.length
    };

    const statsPath = path.join(outputDir, 'isco-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`Saved statistics to: ${statsPath}`);
    console.log('Statistics:', stats);
  }

  /**
   * Generate a mapping file for job titles to ISCO codes
   */
  async generateJobTitleMapping(): Promise<void> {
    console.log('Generating job title to ISCO mapping...');
    
    try {
      // Download job titles dataset
      const response = await axios.get('https://raw.githubusercontent.com/jneidel/job-titles/master/job-titles.json');
      const jobTitlesData = response.data;
      
      // Create a simple mapping structure
      const mapping: Record<string, string[]> = {};
      
      // For demonstration, create some sample mappings
      // In a real scenario, you'd want to use ML or manual mapping
      const sampleMappings = {
        'software engineer': ['2511', '2512', '2513'], // Software developers
        'data scientist': ['2511', '2512'], // Software developers
        'marketing manager': ['1121', '1122'], // Marketing and sales managers
        'sales representative': ['5241', '5242'], // Sales workers
        'human resources manager': ['1121'], // Marketing and sales managers
        'financial analyst': ['2411', '2412'], // Financial and investment advisers
        'project manager': ['1211', '1212'], // Business services and administration managers
        'designer': ['2161', '2162', '2163'], // Design professionals
        'teacher': ['2330'], // Teaching professionals
        'nurse': ['2221', '2222'], // Health professionals
        'doctor': ['2211', '2212'], // Medical doctors
        'lawyer': ['2611'], // Legal professionals
        'accountant': ['2411'], // Financial and investment advisers
        'consultant': ['2421', '2422'], // Business and administration professionals
        'administrator': ['3341', '3342'], // Administrative and specialized secretaries
        'assistant': ['3341', '3342'], // Administrative and specialized secretaries
        'director': ['1121', '1122', '1123'], // Marketing and sales managers
        'manager': ['1121', '1122', '1123'], // Marketing and sales managers
        'executive': ['1111', '1112'], // Chief executives, senior officials and legislators
        'ceo': ['1111'], // Chief executives, senior officials and legislators
        'cto': ['1111'], // Chief executives, senior officials and legislators
        'cfo': ['1111'], // Chief executives, senior officials and legislators
        'vp': ['1111', '1112'], // Chief executives, senior officials and legislators
        'analyst': ['2511', '2512', '2411'], // Software developers, Financial advisers
        'developer': ['2511', '2512', '2513'], // Software developers
        'specialist': ['2511', '2512', '2411'], // Software developers, Financial advisers
        'coordinator': ['3341', '3342'], // Administrative and specialized secretaries
        'lead': ['2511', '2512', '1121'], // Software developers, Marketing managers
        'senior': ['2511', '2512', '1121'], // Software developers, Marketing managers
        'junior': ['2511', '2512', '3341'], // Software developers, Administrative secretaries
        'principal': ['2511', '2512', '1121'], // Software developers, Marketing managers
        'associate': ['2511', '2512', '3341'], // Software developers, Administrative secretaries
        'intern': ['3341', '3342'], // Administrative and specialized secretaries
        'trainee': ['3341', '3342'], // Administrative and specialized secretaries
        'apprentice': ['3341', '3342'], // Administrative and specialized secretaries
        'expert': ['2511', '2512', '1121'], // Software developers, Marketing managers
        'guru': ['2511', '2512', '1121'], // Software developers, Marketing managers
        'ninja': ['2511', '2512'], // Software developers
        'rockstar': ['2511', '2512'] // Software developers
      };

      // Process job titles and create mappings
      jobTitlesData['job-titles'].forEach((jobTitle: string) => {
        const lowerTitle = jobTitle.toLowerCase();
        const mappedCodes: string[] = [];

        // Check for exact matches in sample mappings
        for (const [pattern, codes] of Object.entries(sampleMappings)) {
          if (lowerTitle.includes(pattern)) {
            mappedCodes.push(...codes);
          }
        }

        // If no mapping found, assign to a general category
        if (mappedCodes.length === 0) {
          if (lowerTitle.includes('manager') || lowerTitle.includes('director') || lowerTitle.includes('executive')) {
            mappedCodes.push('1121', '1122', '1123'); // Marketing and sales managers
          } else if (lowerTitle.includes('engineer') || lowerTitle.includes('developer') || lowerTitle.includes('programmer')) {
            mappedCodes.push('2511', '2512', '2513'); // Software developers
          } else if (lowerTitle.includes('analyst') || lowerTitle.includes('specialist')) {
            mappedCodes.push('2511', '2512', '2411'); // Software developers, Financial advisers
          } else if (lowerTitle.includes('assistant') || lowerTitle.includes('coordinator') || lowerTitle.includes('administrator')) {
            mappedCodes.push('3341', '3342'); // Administrative and specialized secretaries
          } else {
            mappedCodes.push('9999'); // Unclassified
          }
        }

        // Remove duplicates
        const uniqueCodes = [...new Set(mappedCodes)];
        mapping[jobTitle] = uniqueCodes;
      });

      // Save mapping
      const outputDir = path.join(__dirname, '..', 'data');
      const mappingPath = path.join(outputDir, 'job-title-to-isco-mapping.json');
      fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
      console.log(`Saved job title mapping to: ${mappingPath}`);
      console.log(`Mapped ${Object.keys(mapping).length} job titles to ISCO codes`);

    } catch (error) {
      console.error('Error generating job title mapping:', error);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const transformer = new ISCODataTransformer();
    
    // Download and parse ISCO data
    await transformer.downloadISCOData();
    
    // Transform to ontology format
    const output = transformer.transformToOntology();
    
    // Save transformed data
    await transformer.saveTransformedData(output);
    
    // Generate job title mapping
    await transformer.generateJobTitleMapping();
    
    console.log('ISCO data transformation completed successfully!');
    
  } catch (error) {
    console.error('Error in ISCO data transformation:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { ISCODataTransformer }; 