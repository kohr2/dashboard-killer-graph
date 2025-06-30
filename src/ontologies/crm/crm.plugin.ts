import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerCrm } from './register';

const crmEntities = {
  "Party": {
    "description": "Represents an actor, either an individual (Person) or a group (Organization). This is an abstract concept serving as a parent for more specific actor types."
  },
  "Person": {
    "parent": "Party",
    "keyProperties": ["email", "title"],
    "description": "Represents a legal entity or a formal group of people with a particular purpose, such as a company, institution, or association. In the CRM context, it is typically the entity managing customer relationships or a business customer itself. Based on the O-CREAM concept of an enterprise or actor involved in business activities."
  },
  "Organization": {
    "parent": "Party",
    "keyProperties": ["legalName", "industry"],
    "description": "Represents a legal entity or a formal group of people with a particular purpose, such as a company, institution, or association. In the CRM context, it is typically the entity managing customer relationships or a business customer itself. Based on the O-CREAM concept of an enterprise or actor involved in business activities.",
    "enrichment": {
      "service": "EDGAR"
    }
  },
  "ContactPoint": {
    "description": "A means of contacting an entity, like an email address or phone number."
  },
  "Email": {
    "parent": "ContactPoint",
    "isProperty": true,
    "description": "A unique electronic address for sending and receiving messages."
  },
  "PhoneNumber": {
    "parent": "ContactPoint",
    "description": "A sequence of digits assigned to a telephone endpoint for routing calls."
  },
  "Activity": {
    "description": "An abstract concept representing a process or a set of actions performed by one or more actors, such as a communication or a task."
  },
  "Communication": {
    "parent": "Activity",
    "keyProperties": ["status", "channel"],
    "description": "Represents an interaction or exchange of information between parties, such as an email, call, or meeting. In O-CREAM, this is a central activity that connects organizations and individuals."
  },
  "Contact": {
    "parent": "Person",
    "description": "A person of interest in a professional context, such as a business lead, a partner, or a team member.",
    "properties": {
      "name": {
        "type": "string",
        "description": "The full name of the contact."
      },
      "email": {
        "type": "string",
        "description": "The primary email address of the contact."
      },
      "title": {
        "type": "string",
        "description": "The job title or role of the contact (e.g., 'CEO', 'Investment Analyst')."
      }
    }
  }
};

const crmRelationships = {
  "WORKS_FOR": { "domain": "Person", "range": "Organization", "description": "Indicates employment." },
  "HAS_EMAIL": { "domain": "Person", "range": "Email", "description": "Links a person to their email." },
  "HAS_PHONE": { "domain": "Person", "range": "PhoneNumber", "description": "Links a person to their phone number." },
  "CONTACTED": { "domain": "Person", "range": "Person", "description": "Indicates one person contacted another." },
  "PART_OF": { "domain": "Communication", "range": ["Person", "Organization"], "description": "An entity mentioned in or part of a communication." }
};

export const crmPlugin: OntologyPlugin = {
  name: 'crm',
  entitySchemas: crmEntities,
  relationshipSchemas: crmRelationships,
  serviceProviders: {
    register: registerCrm,
  },
}; 