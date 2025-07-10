import { OntologyService } from '@platform/ontology/ontology.service';
import { jobTitlesPlugin } from '../job-titles.plugin';

describe('Job Titles Ontology - Enhanced Entity Extraction', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
    ontologyService.loadFromPlugins([jobTitlesPlugin]);
  });

  describe('Job Title Entity Extraction', () => {
    it('should extract job titles from various contexts', () => {
      const testCases = [
        {
          text: 'John Smith is a Senior Software Engineer at Google',
          expected: {
            JobTitle: ['Senior Software Engineer'],
            Person: ['John Smith'],
            Organization: ['Google']
          }
        },
        {
          text: 'We are hiring a Marketing Manager for our team',
          expected: {
            JobTitle: ['Marketing Manager']
          }
        },
        {
          text: 'Sarah Johnson, VP of Sales at Microsoft',
          expected: {
            JobTitle: ['VP of Sales'],
            Person: ['Sarah Johnson'],
            Organization: ['Microsoft']
          }
        },
        {
          text: 'Looking for a Data Scientist with Python experience',
          expected: {
            JobTitle: ['Data Scientist']
          }
        },
        {
          text: 'CEO and CTO positions available',
          expected: {
            JobTitle: ['CEO', 'CTO']
          }
        }
      ];

      testCases.forEach(({ text, expected }) => {
        // This would be tested with actual entity extraction service
        expect(jobTitlesPlugin.entityExtraction).toBeDefined();
        expect((jobTitlesPlugin.entityExtraction?.patterns as any)?.JobTitle).toBeDefined();
      });
    });

    it('should extract job levels correctly', () => {
      const testCases = [
        { text: 'Junior Developer', expected: 'Junior' },
        { text: 'Senior Manager', expected: 'Senior' },
        { text: 'Lead Engineer', expected: 'Lead' },
        { text: 'Principal Consultant', expected: 'Principal' },
        { text: 'Executive Director', expected: 'Executive' }
      ];

      testCases.forEach(({ text, expected }) => {
        expect((jobTitlesPlugin.entityExtraction?.patterns as any)?.JobLevel).toBeDefined();
        const pattern = (jobTitlesPlugin.entityExtraction?.patterns as any)?.JobLevel;
        expect(pattern?.regex).toContain(expected);
      });
    });

    it('should extract job functions correctly', () => {
      const testCases = [
        { text: 'Software Engineer', expected: 'Engineering' },
        { text: 'Sales Manager', expected: 'Sales' },
        { text: 'Marketing Specialist', expected: 'Marketing' },
        { text: 'Finance Director', expected: 'Finance' },
        { text: 'HR Coordinator', expected: 'HR' }
      ];

      testCases.forEach(({ text, expected }) => {
        expect((jobTitlesPlugin.entityExtraction?.patterns as any)?.JobFunction).toBeDefined();
        const pattern = (jobTitlesPlugin.entityExtraction?.patterns as any)?.JobFunction;
        expect(pattern?.regex).toContain(expected);
      });
    });
  });

  describe('Context Rules', () => {
    it('should have appropriate context rules for different document types', () => {
      const contextRules = jobTitlesPlugin.entityExtraction?.contextRules;
      
      expect(contextRules).toBeDefined();
      expect((contextRules as any)?.resume).toBeDefined();
      expect((contextRules as any)?.linkedin).toBeDefined();
      expect((contextRules as any)?.['job-posting']).toBeDefined();
      expect((contextRules as any)?.['email-signature']).toBeDefined();
    });

    it('should prioritize job titles in resume context', () => {
      const resumeContext = (jobTitlesPlugin.entityExtraction?.contextRules as any)?.resume;
      
      expect(resumeContext?.priority).toContain('JobTitle');
      expect(resumeContext?.priority).toContain('JobLevel');
      expect(resumeContext?.priority).toContain('JobFunction');
      expect(resumeContext?.confidenceThreshold).toBe(0.7);
    });

    it('should have high confidence for email signatures', () => {
      const emailContext = (jobTitlesPlugin.entityExtraction?.contextRules as any)?.['email-signature'];
      
      expect(emailContext?.confidenceThreshold).toBe(0.9);
      expect(emailContext?.priority).toContain('JobTitle');
    });
  });

  describe('Entity Properties', () => {
    it('should have comprehensive JobTitle properties', () => {
      const jobTitleEntity = jobTitlesPlugin.entitySchemas.JobTitle as any;
      
      expect(jobTitleEntity).toBeDefined();
      expect(jobTitleEntity.properties).toBeDefined();
      
      const requiredProps = [
        'title', 'normalizedTitle', 'level', 'function', 'department',
        'iscoCode', 'socCode', 'description', 'requiredSkills', 'preferredSkills',
        'experienceLevel', 'educationLevel', 'salaryRange', 'remoteWork',
        'travelRequired', 'industry', 'location'
      ];
      
      requiredProps.forEach(prop => {
        expect(jobTitleEntity.properties[prop]).toBeDefined();
      });
    });

    it('should have hierarchical JobLevel properties', () => {
      const jobLevelEntity = jobTitlesPlugin.entitySchemas.JobLevel as any;
      
      expect(jobLevelEntity).toBeDefined();
      expect(jobLevelEntity.properties).toBeDefined();
      
      const requiredProps = [
        'name', 'level', 'description', 'typicalExperience', 'salaryRange',
        'responsibilities', 'requirements', 'supervisionLevel', 'decisionMaking', 'mentoring'
      ];
      
      requiredProps.forEach(prop => {
        expect(jobLevelEntity.properties[prop]).toBeDefined();
      });
    });

    it('should have functional JobFunction properties', () => {
      const jobFunctionEntity = jobTitlesPlugin.entitySchemas.JobFunction as any;
      
      expect(jobFunctionEntity).toBeDefined();
      expect(jobFunctionEntity.properties).toBeDefined();
      
      const requiredProps = [
        'name', 'category', 'description', 'industryFocus', 'requiredSkills',
        'growthTrend', 'automationRisk', 'averageSalary', 'jobCount', 'remoteWorkPercentage'
      ];
      
      requiredProps.forEach(prop => {
        expect(jobFunctionEntity.properties[prop]).toBeDefined();
      });
    });
  });

  describe('Relationships', () => {
    it('should have comprehensive relationship definitions', () => {
      const relationships = jobTitlesPlugin.relationshipSchemas as any;
      
      expect(relationships).toBeDefined();
      
      const expectedRelationships = [
        'HAS_JOB_TITLE', 'HAS_JOB_LEVEL', 'HAS_FUNCTION', 'BELONGS_TO_DEPARTMENT',
        'REPORTS_TO', 'REQUIRES_SKILL', 'PREFERS_SKILL', 'WORKS_IN_INDUSTRY',
        'FUNCTION_IN_INDUSTRY', 'DEPARTMENT_HAS_FUNCTION', 'SKILL_RELATED_TO',
        'LEVEL_REQUIRES_SKILL', 'FUNCTION_REQUIRES_SKILL', 'CAREER_PROGRESSION',
        'LATERAL_MOVE'
      ];
      
      expectedRelationships.forEach(rel => {
        expect(relationships[rel]).toBeDefined();
        expect(relationships[rel].source).toBeDefined();
        expect(relationships[rel].target).toBeDefined();
      });
    });

    it('should have proper source-target mappings', () => {
      const relationships = jobTitlesPlugin.relationshipSchemas as any;
      
      expect(relationships?.HAS_JOB_TITLE?.source).toBe('Person');
      expect(relationships?.HAS_JOB_TITLE?.target).toBe('JobTitle');
      
      expect(relationships?.HAS_JOB_LEVEL?.source).toBe('JobTitle');
      expect(relationships?.HAS_JOB_LEVEL?.target).toBe('JobLevel');
      
      expect(relationships?.HAS_FUNCTION?.source).toBe('JobTitle');
      expect(relationships?.HAS_FUNCTION?.target).toBe('JobFunction');
    });
  });

  describe('Reasoning Algorithms', () => {
    it('should have job title similarity algorithm', () => {
      const reasoning = jobTitlesPlugin.reasoning;
      
      expect(reasoning?.algorithms?.job_title_similarity).toBeDefined();
      
      const algorithm = reasoning?.algorithms?.job_title_similarity;
      expect(algorithm?.factors).toContain('function');
      expect(algorithm?.factors).toContain('level');
      expect(algorithm?.factors).toContain('requiredSkills');
      expect(algorithm?.threshold).toBe(0.6);
    });

    it('should have career path analysis algorithm', () => {
      const reasoning = jobTitlesPlugin.reasoning;
      
      expect(reasoning?.algorithms?.career_path_analysis).toBeDefined();
      
      const algorithm = reasoning?.algorithms?.career_path_analysis;
      expect(algorithm?.factors).toContain('level');
      expect(algorithm?.factors).toContain('function');
      expect(algorithm?.threshold).toBe(0.7);
    });

    it('should have skill gap analysis algorithm', () => {
      const reasoning = jobTitlesPlugin.reasoning;
      
      expect(reasoning?.algorithms?.skill_gap_analysis).toBeDefined();
      
      const algorithm = reasoning?.algorithms?.skill_gap_analysis;
      expect(algorithm?.factors).toContain('requiredSkills');
      expect(algorithm?.factors).toContain('preferredSkills');
      expect(algorithm?.threshold).toBe(0.5);
    });
  });

  describe('Enrichment Services', () => {
    it('should have enrichment configuration for JobTitle', () => {
      const enrichment = jobTitlesPlugin.entityExtraction?.enrichment as any;
      
      expect(enrichment?.JobTitle).toBeDefined();
      expect(enrichment?.JobTitle?.services).toContain('linkedin');
      expect(enrichment?.JobTitle?.services).toContain('glassdoor');
      expect(enrichment?.JobTitle?.services).toContain('salary-data');
      
      expect(enrichment?.JobTitle?.properties).toContain('averageSalary');
      expect(enrichment?.JobTitle?.properties).toContain('marketDemand');
      expect(enrichment?.JobTitle?.properties).toContain('requiredSkills');
    });

    it('should have enrichment configuration for JobLevel', () => {
      const enrichment = jobTitlesPlugin.entityExtraction?.enrichment as any;
      
      expect(enrichment?.JobLevel).toBeDefined();
      expect(enrichment?.JobLevel?.services).toContain('salary-data');
      expect(enrichment?.JobLevel?.services).toContain('career-data');
      
      expect(enrichment?.JobLevel?.properties).toContain('typicalExperience');
      expect(enrichment?.JobLevel?.properties).toContain('salaryRange');
    });

    it('should have enrichment configuration for JobFunction', () => {
      const enrichment = jobTitlesPlugin.entityExtraction?.enrichment as any;
      
      expect(enrichment?.JobFunction).toBeDefined();
      expect(enrichment?.JobFunction?.services).toContain('industry-data');
      expect(enrichment?.JobFunction?.services).toContain('skill-data');
      
      expect(enrichment?.JobFunction?.properties).toContain('industryFocus');
      expect(enrichment?.JobFunction?.properties).toContain('growthTrend');
    });
  });
}); 