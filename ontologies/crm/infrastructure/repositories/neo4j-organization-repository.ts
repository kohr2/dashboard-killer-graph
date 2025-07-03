import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { IOrganizationRepository } from '@crm/repositories/i-organization-repository';
import { OrganizationDTO } from '@generated/crm/OrganizationDTO';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

@injectable()
export class Neo4jOrganizationRepository implements IOrganizationRepository {
  constructor(
    @inject(Neo4jConnection) private neo4jConnection: Neo4jConnection,
  ) {}

  private _mapRecordToOrganizationDTO(record: any): OrganizationDTO | null {
    if (!record) {
      return null;
    }
    const node = record.get('o');
    if (!node || !node.properties) {
      return null;
    }
    const props = node.properties;
    return {
      id: props.id,
      name: props.name,
      type: 'Organization',
      label: 'Organization',
      enrichedData: props.enrichedData || '',
      legalName: props.legalName || '',
      industry: props.industry || '',
      website: props.website || '',
      description: props.description || '',
      size: props.size || '',
      foundedYear: props.foundedYear || '',
      headquarters: props.headquarters || '',
      address: props.address || '',
      phone: props.phone || '',
      email: props.email || '',
      parentOrganizationId: props.parentOrganizationId || '',
      activities: props.activities || '',
      knowledgeElements: props.knowledgeElements || '',
      validationStatus: props.validationStatus || 'VALID',
      createdAt: props.createdAt || new Date().toISOString(),
      updatedAt: props.updatedAt || new Date().toISOString(),
      preferences: props.preferences || '',
    };
  }

  async findById(id: string): Promise<OrganizationDTO | null> {
    const session = this.neo4jConnection.getSession();
    try {
      const query = 'MATCH (o:Organization {id: $id}) RETURN o';
      const result = await session.run(query, { id });
      if (result.records.length === 0) {
        return null;
      }
      return this._mapRecordToOrganizationDTO(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async findByName(name: string): Promise<OrganizationDTO | null> {
    const session = this.neo4jConnection.getSession();
    try {
      const query = 'MATCH (o:Organization {name: $name}) RETURN o LIMIT 1';
      const result = await session.run(query, { name });
      if (result.records.length === 0) {
        return null;
      }
      return this._mapRecordToOrganizationDTO(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async save(organization: OrganizationDTO): Promise<OrganizationDTO> {
    const session = this.neo4jConnection.getSession();
    try {
      const existingOrg = await this.findByName(organization.name);
      if (existingOrg) {
        logger.warn(
          `Organization with name "${organization.name}" already exists. Returning existing.`,
        );
        return existingOrg;
      }

      const newId = uuidv4();
      const now = new Date().toISOString();

      const props = {
        id: newId,
        name: organization.name,
        legalName: organization.legalName || null,
        industry: organization.industry || null,
        website: organization.website || null,
        description: organization.description || null,
        size: organization.size || null,
        foundedYear: organization.foundedYear || null,
        headquarters: organization.headquarters || null,
        address: organization.address || null,
        phone: organization.phone || null,
        email: organization.email || null,
        parentOrganizationId: organization.parentOrganizationId || null,
        activities: organization.activities || null,
        knowledgeElements: organization.knowledgeElements || null,
        validationStatus: organization.validationStatus || 'VALID',
        enrichedData: organization.enrichedData || null,
        createdAt: now,
        updatedAt: now,
        preferences: organization.preferences || null,
      };

      const query = `
      CREATE (o:Organization {
        id: $id,
        name: $name,
        legalName: $legalName,
        industry: $industry,
        website: $website,
        description: $description,
        size: $size,
        foundedYear: $foundedYear,
        headquarters: $headquarters,
        address: $address,
        phone: $phone,
        email: $email,
        parentOrganizationId: $parentOrganizationId,
        activities: $activities,
        knowledgeElements: $knowledgeElements,
        validationStatus: $validationStatus,
        enrichedData: $enrichedData,
        createdAt: $createdAt,
        updatedAt: $updatedAt,
        preferences: $preferences
      })
      RETURN o
    `;
      const result = await session.run(query, props);

      const savedRecord = this._mapRecordToOrganizationDTO(result.records[0]);
      if (!savedRecord) {
        throw new Error('Failed to save organization: no record returned.');
      }
      return savedRecord;
    } finally {
      await session.close();
    }
  }

  async update(organization: OrganizationDTO): Promise<OrganizationDTO> {
    const session = this.neo4jConnection.getSession();
    try {
      const now = new Date().toISOString();
      const propsToUpdate = {
        name: organization.name,
        legalName: organization.legalName,
        industry: organization.industry,
        website: organization.website,
        description: organization.description,
        size: organization.size,
        foundedYear: organization.foundedYear,
        headquarters: organization.headquarters,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        parentOrganizationId: organization.parentOrganizationId,
        activities: organization.activities,
        knowledgeElements: organization.knowledgeElements,
        validationStatus: organization.validationStatus,
        enrichedData: organization.enrichedData,
        updatedAt: now,
        preferences: organization.preferences,
      };

      const query = `
      MATCH (o:Organization {id: $id})
      SET o += $props
      RETURN o
    `;
      const result = await session.run(query, {
        id: organization.id,
        props: propsToUpdate,
      });

      const updatedRecord = this._mapRecordToOrganizationDTO(result.records[0]);
      if (!updatedRecord) {
        throw new Error(
          `Failed to update organization with id ${organization.id}.`,
        );
      }
      return updatedRecord;
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<void> {
    const session = this.neo4jConnection.getSession();
    try {
      const query = 'MATCH (o:Organization {id: $id}) DETACH DELETE o';
      await session.run(query, { id });
    } finally {
      await session.close();
    }
  }
} 