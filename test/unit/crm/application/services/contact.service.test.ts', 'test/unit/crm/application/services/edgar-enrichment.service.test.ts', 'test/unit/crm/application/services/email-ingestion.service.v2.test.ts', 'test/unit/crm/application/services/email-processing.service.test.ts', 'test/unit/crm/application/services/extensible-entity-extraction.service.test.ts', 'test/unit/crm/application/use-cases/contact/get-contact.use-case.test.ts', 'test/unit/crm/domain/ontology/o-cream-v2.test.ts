import { ContactService } from '@crm/application/services/contact';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { Person, Organization } from '@crm/domain/ontology/o-cream-v2';
import { ContactResponseDto } from '@crm/application/dto/contact.dto';
import { oCreamV2 } from '@crm/domain/ontology/o-cream-v2';

import { EdgarEnrichmentService } from '@crm/application/services/edgar-enrichment';

import { EmailIngestionService } from '@crm/application/services/email-ingestion';
import { EmailProcessingService } from '@crm/application/services/email-processing';

import { EmailProcessingService } from '@crm/application/services/email-processing';
import { CommunicationRepository } from '@crm/domain/repositories/communication-repository';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { SpacyEntityExtractionService } from '@crm/application/services/spacy-entity-extraction';
import { OCreamV2Ontology } from '@crm/domain/ontology/o-cream-v2';

import { ExtensibleEntityExtractionService, ExtensionEntityRegistry } from '@crm/application/services/extensible-entity-extraction';
import { SpacyEntityExtractionService } from '@crm/application/services/spacy-entity-extraction';
import { OCreamV2Ontology } from '@crm/domain/ontology/o-cream-v2';

import { GetContactUseCase, GetContactRequest } from '@crm/application/use-cases/contact/get-contact.use-case';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { oCreamV2 } from '@crm/domain/ontology/o-cream-v2';

import { OCreamV2Ontology, DOLCECategory, RelationshipType, KnowledgeType, ActivityType, SoftwareType, createInformationElement, createActivity } from '@crm/domain/ontology/o-cream-v2'; 