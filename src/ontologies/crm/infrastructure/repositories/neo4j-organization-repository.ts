import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { IOrganizationRepository } from '@crm/domain/repositories/i-organization-repository';
import { Organization } from '@crm/domain/entities/organization';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

@injectable()
export class Neo4jOrganizationRepository implements IOrganizationRepository {
  constructor(
    @inject(Neo4jConnection) private neo4jConnection: Neo4jConnection,
  ) {}

  private _mapRecordToOrganization(record: any): Organization | null {
    if (!record) {
      return null;
    }
    const node = record.get('o');
    if (!node || !node.properties) {
      return null;
    }
    const props = node.properties;
    return new Organization(
      props.id,
      props.name,
      props.website,
      props.industry,
      props.enrichedData,
      new Date(props.createdAt),
      new Date(props.updatedAt),
    );
  }

  async findById(id: string): Promise<Organization | null> {
    const session = this.neo4jConnection.getSession();
    try {
      const query = 'MATCH (o:Organization {id: $id}) RETURN o';
      const result = await session.run(query, { id });
      if (result.records.length === 0) {
        return null;
      }
      return this._mapRecordToOrganization(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async findByName(name: string): Promise<Organization | null> {
    const session = this.neo4jConnection.getSession();
    try {
      const query = 'MATCH (o:Organization {name: $name}) RETURN o LIMIT 1';
      const result = await session.run(query, { name });
      if (result.records.length === 0) {
        return null;
      }
      return this._mapRecordToOrganization(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async save(organization: Organization): Promise<Organization> {
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
      const now = new Date();

      const props = {
        id: newId,
        name: organization.name,
        website: organization.website || null,
        industry: organization.industry || null,
        enrichedData: organization.enrichedData || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const query = `
      CREATE (o:Organization {
        id: $id,
        name: $name,
        website: $website,
        industry: $industry,
        enrichedData: $enrichedData,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      RETURN o
    `;
      const result = await session.run(query, props);

      const savedRecord = this._mapRecordToOrganization(result.records[0]);
      if (!savedRecord) {
        throw new Error('Failed to save organization: no record returned.');
      }
      return savedRecord;
    } finally {
      await session.close();
    }
  }

  async update(organization: Organization): Promise<Organization> {
    const session = this.neo4jConnection.getSession();
    try {
      const now = new Date().toISOString();
      const propsToUpdate = {
        name: organization.name,
        website: organization.website,
        industry: organization.industry,
        enrichedData: organization.enrichedData,
        updatedAt: now,
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

      const updatedRecord = this._mapRecordToOrganization(result.records[0]);
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