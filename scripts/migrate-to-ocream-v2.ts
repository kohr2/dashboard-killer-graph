#!/usr/bin/env ts-node

// Migration Script: Convert Existing CRM Data to O-CREAM-v2
// This script demonstrates how to migrate existing Contact/Organization/Communication/Task data
// to the new O-CREAM-v2 ontological structure

import { 
  DOLCECategory,
  RelationshipType,
  KnowledgeType,
  ActivityType,
  createInformationElement,
  oCreamV2
} from '../src/crm-core/domain/ontology/o-cream-v2';
import { 
  OCreamContactEntity,
  createOCreamContact 
} from '../src/crm-core/domain/entities/contact-ontology';

// Sample existing data structures (simulating your current entities)
interface LegacyContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyOrganization {
  id: string;
  name: string;
  industry: string;
  size: string;
  website?: string;
  contacts: string[];
}

interface LegacyCommunication {
  id: string;
  type: string;
  subject: string;
  content?: string;
  contactId: string;
  organizationId?: string;
  status: string;
  createdAt: Date;
}

interface LegacyTask {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  contactId: string;
  dueDate?: Date;
  createdAt: Date;
}

class OCreamV2Migrator {
  private migratedContacts: Map<string, OCreamContactEntity> = new Map();
  private migrationStats = {
    contactsMigrated: 0,
    organizationsMigrated: 0,
    communicationsMigrated: 0,
    tasksMigrated: 0,
    relationshipsCreated: 0,
    knowledgeElementsCreated: 0,
    activitiesCreated: 0
  };

  async migrateContacts(legacyContacts: LegacyContact[]): Promise<void> {
    console.log(`🔄 Migrating ${legacyContacts.length} contacts to O-CREAM-v2...`);

    for (const legacy of legacyContacts) {
      try {
        // Create O-CREAM-v2 contact
        const oCreamContact = createOCreamContact({
          firstName: legacy.firstName,
          lastName: legacy.lastName,
          email: legacy.email,
          phone: legacy.phone,
          organizationId: legacy.organizationId,
          preferences: {
            migrationDate: new Date().toISOString(),
            legacyId: legacy.id,
            migratedFrom: 'legacy-crm'
          }
        });

        // Override timestamps to preserve original data
        (oCreamContact as any).createdAt = legacy.createdAt;
        oCreamContact.updatedAt = legacy.updatedAt;

        // Create migration history knowledge element
        const migrationKE = createInformationElement({
          title: `Migration History: ${legacy.firstName} ${legacy.lastName}`,
          type: KnowledgeType.CUSTOMER_HISTORY,
          content: {
            migrationDate: new Date(),
            originalId: legacy.id,
            originalCreatedAt: legacy.createdAt,
            migrationSource: 'legacy-crm',
            dataIntegrity: 'verified'
          },
          source: 'Migration System',
          reliability: 1.0,
          confidentiality: 'internal',
          relatedEntities: [oCreamContact.id],
          metadata: {
            migrationType: 'contact-migration',
            version: '1.0'
          }
        });

        oCreamContact.addKnowledgeElement(migrationKE.id);
        oCreamV2.addEntity(migrationKE);

        this.migratedContacts.set(legacy.id, oCreamContact);
        this.migrationStats.contactsMigrated++;
        this.migrationStats.knowledgeElementsCreated++;

        console.log(`✅ Migrated contact: ${legacy.firstName} ${legacy.lastName} (${legacy.id} → ${oCreamContact.id})`);
      } catch (error) {
        console.error(`❌ Failed to migrate contact ${legacy.id}:`, error);
      }
    }
  }

  async migrateCommunications(legacyCommunications: LegacyCommunication[]): Promise<void> {
    console.log(`🔄 Migrating ${legacyCommunications.length} communications to O-CREAM-v2 activities...`);

    for (const legacy of legacyCommunications) {
      try {
        const contact = this.migratedContacts.get(legacy.contactId);
        if (!contact) {
          console.warn(`⚠️  Contact ${legacy.contactId} not found for communication ${legacy.id}`);
          continue;
        }

        // Map legacy communication type to O-CREAM-v2 activity type
        const activityType = this.mapCommunicationToActivityType(legacy.type);

        // Create CRM Activity
        const activity = {
          id: `activity_${legacy.id}`,
          category: DOLCECategory.PERDURANT,
          type: activityType,
          name: legacy.subject,
          description: legacy.content,
          participants: [contact.id],
          status: this.mapCommunicationStatus(legacy.status),
          success: legacy.status === 'completed',
          context: {
            originalType: legacy.type,
            legacyId: legacy.id,
            migrationDate: new Date().toISOString()
          },
          createdAt: legacy.createdAt,
          updatedAt: legacy.createdAt
        };

        // Register activity with ontology
        oCreamV2.addEntity(activity as any);
        contact.addCommunicationActivity(activity.id);

        // Create communication log knowledge element
        const commLogKE = createInformationElement({
          title: `Communication Log: ${legacy.subject}`,
          type: KnowledgeType.COMMUNICATION_LOG,
          content: {
            activityId: activity.id,
            originalCommunication: legacy,
            migrationDate: new Date(),
            communicationType: legacy.type,
            outcome: legacy.status
          },
          source: 'Migration System',
          reliability: 0.95,
          confidentiality: 'internal',
          relatedEntities: [contact.id],
          metadata: {
            activityType: activityType,
            originalId: legacy.id
          }
        });

        contact.addKnowledgeElement(commLogKE.id);
        oCreamV2.addEntity(commLogKE);

        this.migrationStats.communicationsMigrated++;
        this.migrationStats.activitiesCreated++;
        this.migrationStats.knowledgeElementsCreated++;

        console.log(`✅ Migrated communication: ${legacy.subject} (${legacy.id} → ${activity.id})`);
      } catch (error) {
        console.error(`❌ Failed to migrate communication ${legacy.id}:`, error);
      }
    }
  }

  async migrateTasks(legacyTasks: LegacyTask[]): Promise<void> {
    console.log(`🔄 Migrating ${legacyTasks.length} tasks to O-CREAM-v2 activities...`);

    for (const legacy of legacyTasks) {
      try {
        const contact = this.migratedContacts.get(legacy.contactId);
        if (!contact) {
          console.warn(`⚠️  Contact ${legacy.contactId} not found for task ${legacy.id}`);
          continue;
        }

        // Map legacy task to O-CREAM-v2 activity type
        const activityType = this.mapTaskToActivityType(legacy.priority, legacy.title);

        // Create CRM Activity
        const activity = {
          id: `task_${legacy.id}`,
          category: DOLCECategory.PERDURANT,
          type: activityType,
          name: legacy.title,
          description: legacy.description,
          participants: [contact.id],
          status: this.mapTaskStatus(legacy.status),
          success: legacy.status === 'completed',
          endTime: legacy.dueDate,
          context: {
            originalPriority: legacy.priority,
            legacyId: legacy.id,
            migrationDate: new Date().toISOString(),
            taskType: 'migrated-task'
          },
          createdAt: legacy.createdAt,
          updatedAt: legacy.createdAt
        };

        // Register activity with ontology
        oCreamV2.addEntity(activity as any);
        contact.addActivity(activity.id);

        this.migrationStats.tasksMigrated++;
        this.migrationStats.activitiesCreated++;

        console.log(`✅ Migrated task: ${legacy.title} (${legacy.id} → ${activity.id})`);
      } catch (error) {
        console.error(`❌ Failed to migrate task ${legacy.id}:`, error);
      }
    }
  }

  async createOrganizationRelationships(legacyOrganizations: LegacyOrganization[]): Promise<void> {
    console.log(`🔄 Creating organization relationships for ${legacyOrganizations.length} organizations...`);

    for (const org of legacyOrganizations) {
      try {
        for (const contactId of org.contacts) {
          const contact = this.migratedContacts.get(contactId);
          if (!contact) continue;

          // Create employment relationship
          const relationship = {
            id: `rel_${org.id}_${contact.id}`,
            relationshipType: RelationshipType.EMPLOYMENT,
            sourceEntityId: contact.id,
            targetEntityId: org.id,
            sourceRole: 'employee',
            targetRole: 'employer',
            temporal: {
              startTime: contact.createdAt
            },
            properties: {
              organizationName: org.name,
              industry: org.industry,
              organizationSize: org.size,
              website: org.website
            },
            context: 'Employment relationship migrated from legacy CRM',
            strength: 0.8,
            createdAt: contact.createdAt,
            updatedAt: new Date()
          };

          oCreamV2.addRelationship(relationship);
          contact.addRelationship(relationship.id);

          // Create organizational knowledge element
          const orgKE = createInformationElement({
            title: `Organization Context: ${org.name}`,
            type: KnowledgeType.CUSTOMER_PROFILE,
            content: {
              organizationId: org.id,
              organizationName: org.name,
              industry: org.industry,
              size: org.size,
              website: org.website,
              relationshipType: 'employment'
            },
            source: 'Migration System',
            reliability: 0.9,
            confidentiality: 'internal',
            relatedEntities: [contact.id, org.id],
            metadata: {
              relationshipId: relationship.id,
              organizationType: 'employer'
            }
          });

          contact.addKnowledgeElement(orgKE.id);
          oCreamV2.addEntity(orgKE);

          this.migrationStats.relationshipsCreated++;
          this.migrationStats.knowledgeElementsCreated++;
        }

        this.migrationStats.organizationsMigrated++;
        console.log(`✅ Created relationships for organization: ${org.name}`);
      } catch (error) {
        console.error(`❌ Failed to create relationships for organization ${org.id}:`, error);
      }
    }
  }

  // Helper methods for mapping legacy data to O-CREAM-v2
  private mapCommunicationToActivityType(legacyType: string): ActivityType {
    const mapping: Record<string, ActivityType> = {
      'email': ActivityType.CUSTOMER_SUPPORT,
      'call': ActivityType.CUSTOMER_SUPPORT,
      'meeting': ActivityType.OPPORTUNITY_MANAGEMENT,
      'sms': ActivityType.CUSTOMER_SUPPORT,
      'note': ActivityType.DATA_COLLECTION
    };
    return mapping[legacyType] || ActivityType.CUSTOMER_SUPPORT;
  }

  private mapTaskToActivityType(priority: string, title: string): ActivityType {
    if (title.toLowerCase().includes('lead') || title.toLowerCase().includes('qualify')) {
      return ActivityType.LEAD_QUALIFICATION;
    }
    if (title.toLowerCase().includes('proposal') || title.toLowerCase().includes('quote')) {
      return ActivityType.PROPOSAL_PREPARATION;
    }
    if (title.toLowerCase().includes('negotiat') || title.toLowerCase().includes('close')) {
      return ActivityType.NEGOTIATION;
    }
    if (priority === 'high' || priority === 'urgent') {
      return ActivityType.OPPORTUNITY_MANAGEMENT;
    }
    return ActivityType.CUSTOMER_SUPPORT;
  }

  private mapCommunicationStatus(legacyStatus: string): 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed' {
    const mapping: Record<string, any> = {
      'pending': 'planned',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    };
    return mapping[legacyStatus] || 'completed';
  }

  private mapTaskStatus(legacyStatus: string): 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed' {
    const mapping: Record<string, any> = {
      'pending': 'planned',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };
    return mapping[legacyStatus] || 'planned';
  }

  generateMigrationReport(): void {
    console.log('\n📊 O-CREAM-v2 Migration Report');
    console.log('=====================================');
    console.log(`✅ Contacts migrated: ${this.migrationStats.contactsMigrated}`);
    console.log(`✅ Organizations processed: ${this.migrationStats.organizationsMigrated}`);
    console.log(`✅ Communications migrated: ${this.migrationStats.communicationsMigrated}`);
    console.log(`✅ Tasks migrated: ${this.migrationStats.tasksMigrated}`);
    console.log(`✅ Relationships created: ${this.migrationStats.relationshipsCreated}`);
    console.log(`✅ Knowledge elements created: ${this.migrationStats.knowledgeElementsCreated}`);
    console.log(`✅ Activities created: ${this.migrationStats.activitiesCreated}`);
    
    const ontologyExport = oCreamV2.exportOntology();
    console.log(`\n🧠 Ontology Statistics:`);
    console.log(`   Total entities: ${ontologyExport.metadata.entityCount}`);
    console.log(`   Total relationships: ${ontologyExport.metadata.relationshipCount}`);
    console.log(`   Type distribution:`, ontologyExport.typeDistribution);
  }

  async validateMigration(): Promise<boolean> {
    console.log('\n🔍 Validating O-CREAM-v2 migration...');
    
    let validationErrors = 0;
    
    for (const [legacyId, contact] of this.migratedContacts) {
      const isValid = contact.validateOntology();
      if (!isValid) {
        console.error(`❌ Validation failed for contact ${legacyId} → ${contact.id}`);
        validationErrors++;
      }
    }

    if (validationErrors === 0) {
      console.log('✅ All migrated entities passed O-CREAM-v2 validation');
      return true;
    } else {
      console.error(`❌ ${validationErrors} entities failed validation`);
      return false;
    }
  }
}

// Demo migration execution
async function runMigrationDemo(): Promise<void> {
  console.log('🚀 Starting O-CREAM-v2 Migration Demo\n');

  const migrator = new OCreamV2Migrator();

  // Sample legacy data
  const legacyContacts: LegacyContact[] = [
    {
      id: 'legacy-contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@acme.com',
      phone: '+1-555-0123',
      organizationId: 'legacy-org-1',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2023-12-01')
    },
    {
      id: 'legacy-contact-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@techcorp.com',
      phone: '+1-555-0456',
      organizationId: 'legacy-org-2',
      createdAt: new Date('2023-03-20'),
      updatedAt: new Date('2023-11-15')
    }
  ];

  const legacyOrganizations: LegacyOrganization[] = [
    {
      id: 'legacy-org-1',
      name: 'Acme Corporation',
      industry: 'Technology',
      size: 'large',
      website: 'https://acme.com',
      contacts: ['legacy-contact-1']
    },
    {
      id: 'legacy-org-2',
      name: 'TechCorp Solutions',
      industry: 'Software',
      size: 'medium',
      website: 'https://techcorp.com',
      contacts: ['legacy-contact-2']
    }
  ];

  const legacyCommunications: LegacyCommunication[] = [
    {
      id: 'legacy-comm-1',
      type: 'email',
      subject: 'Product Demo Request',
      content: 'Customer interested in our enterprise solution',
      contactId: 'legacy-contact-1',
      organizationId: 'legacy-org-1',
      status: 'completed',
      createdAt: new Date('2023-06-10')
    },
    {
      id: 'legacy-comm-2',
      type: 'call',
      subject: 'Follow-up Call',
      content: 'Discussed pricing and implementation timeline',
      contactId: 'legacy-contact-2',
      status: 'completed',
      createdAt: new Date('2023-07-22')
    }
  ];

  const legacyTasks: LegacyTask[] = [
    {
      id: 'legacy-task-1',
      title: 'Prepare proposal for Acme Corp',
      description: 'Create detailed proposal for enterprise solution',
      priority: 'high',
      status: 'completed',
      contactId: 'legacy-contact-1',
      dueDate: new Date('2023-06-20'),
      createdAt: new Date('2023-06-12')
    },
    {
      id: 'legacy-task-2',
      title: 'Schedule technical demo',
      description: 'Coordinate with technical team for product demo',
      priority: 'medium',
      status: 'in_progress',
      contactId: 'legacy-contact-2',
      dueDate: new Date('2023-08-01'),
      createdAt: new Date('2023-07-25')
    }
  ];

  try {
    // Execute migration steps
    await migrator.migrateContacts(legacyContacts);
    await migrator.migrateCommunications(legacyCommunications);
    await migrator.migrateTasks(legacyTasks);
    await migrator.createOrganizationRelationships(legacyOrganizations);

    // Validate migration
    const isValid = await migrator.validateMigration();

    // Generate report
    migrator.generateMigrationReport();

    if (isValid) {
      console.log('\n🎉 O-CREAM-v2 migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with validation errors');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runMigrationDemo().catch(console.error);
}

export { OCreamV2Migrator, runMigrationDemo }; 