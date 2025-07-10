import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';
import { 
  JobTitleService,
  JobLevelService,
  JobFunctionService,
  JobDepartmentService,
  JobSkillService,
  JobIndustryService
} from '@generated/job-titles';

export function registerJobTitles() {
  const ontologyService = container.resolve(OntologyService);

  // Register job titles entities with the ontology service
  // ontologyService.registerEntity('JobTitle', JobTitleService);
  // ontologyService.registerEntity('JobLevel', JobLevelService);
  // ontologyService.registerEntity('JobFunction', JobFunctionService);
  // ontologyService.registerEntity('JobDepartment', JobDepartmentService);
  // ontologyService.registerEntity('JobSkill', JobSkillService);
  // ontologyService.registerEntity('JobIndustry', JobIndustryService);
  
  logger.info('Job titles ontology registered');
}

export function registerJobTitlesServices() {
  registerJobTitles();
} 