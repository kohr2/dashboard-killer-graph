import { OrganizationDTO } from '@generated/crm/generated/OrganizationDTO';

export interface IOrganizationRepository {
  findById(id: string): Promise<OrganizationDTO | null>;
  findByName(name: string): Promise<OrganizationDTO | null>;
  save(organization: OrganizationDTO): Promise<OrganizationDTO>;
  update(organization: OrganizationDTO): Promise<OrganizationDTO>;
  delete(id: string): Promise<void>;
} 