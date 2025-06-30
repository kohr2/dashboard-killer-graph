import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerFinancial } from './register';

const financialEntities = {
  "Investor": {
    "description": "A party that owns some stake in an organization by way of investment. This is regardless of whether the investor is also a constitutional owner (e.g., shareholder) in the entity. Based on FIBO definition."
  },
  "Fund": {
    "description": "A collective investment vehicle (CIV) consisting of a pool of funds from multiple investors, managed by a professional firm. Examples include private equity funds, hedge funds, or mutual funds. Based on FIBO's concept of an Investment Fund."
  },
  "Deal": {
    "keyProperties": ["dealType", "sector", "purpose"],
    "description": "A specific business or financial transaction that is proposed, under negotiation, or completed. It represents an opportunity for investment, acquisition, or partnership between parties, aligned with the FIBO concept of a financial transaction."
  },
  "TargetCompany": {
    "keyProperties": ["industry", "website"],
    "description": "The legal entity (e.g., corporation, partnership) that is the subject of a deal, such as an acquisition, merger, or investment. It is the company being acquired, invested in, or partnered with. Aligned with FIBO's concept of a 'Contractually Capable Entity'."
  },
  "Sector": {
    "description": "An industry sector or sub-sector used to classify a company based on its primary business activities. Aligned with FIBO's 'Industry Sector Classifier' and typically based on a standard like GICS (Global Industry Classification Standard)."
  },
  "GeographicRegion": {
    "description": "A geographic or geopolitical area, such as a country, state, or city, relevant to a deal or an entity's operations. Aligned with FIBO's 'Geographic Region' and 'Geopolitical Entity' concepts from its Locations ontology."
  },
  "Mandate": {
    "description": "A set of rules, policies, and objectives that govern an investment fund's strategy. It defines constraints such as asset classes, geographic focus, sector focus, and deal size. Aligned with FIBO's 'Fund Portfolio Investment Policy' concept."
  },
  "Sponsor": {
    "description": "The entity, typically a private equity firm, that initiates, manages, and promotes a specific fund or deal. Aligned with FIBO's 'Fund Management Company' concept, which is also referred to as 'fund sponsor'."
  },
  "Relationship": {
    "description": "A documented connection between two or more legal entities, such as co-investors, a sponsor and a target company, or past employment. Aligned with FIBO's concept of a 'Relationship Record' used for describing relationships between legal entities."
  },
  "Event": {
    "description": "A point-in-time happening relevant to a deal or entity, such as a bid, investment, exit, or due diligence process. Aligned with FIBO's general concept of an 'Occurrence' (or 'Event'), often specializing as a 'Transaction Event'."
  },
  "MonetaryAmount": {
    "isProperty": true,
    "description": "An amount of money, typically associated with a deal size, fund size, or transaction value. To be used as a property of another entity."
  },
  "Date": {
    "isProperty": true,
    "description": "A specific point in time, such as a deadline, closing date, or event date. To be used as a property of another entity."
  },
  "Percent": {
    "isProperty": true,
    "description": "A percentage value, such as an interest rate, ownership stake, or deal likelihood. To be used as a property of another entity."
  },
  "Time": {
    "isProperty": true,
    "description": "A specific time of day, often associated with an event or deadline. To be used as a property of another entity."
  },
  "Document": {
    "description": "A piece of written, printed, or electronic matter that provides information or evidence related to a financial context, such as an NDA, CIM, or legal agreement. Aligned with FIBO's concept of a 'Legal Document' or 'Contractual Document'."
  },
  "Process": {
    "description": "A series of actions or steps taken to achieve a financial outcome, such as a due diligence process, a bidding process, or an underwriting process. Aligned with FIBO's 'Business Process' concept."
  },
  "LegalDocument": {
    "parent": "Document",
    "description": "A document with legal significance within a financial context, such as a merger agreement, NDA, or credit agreement. Aligned with FIBO's 'Legal Document' concept."
  },
  "RegulatoryInformation": {
    "description": "Information related to regulatory filings, such as SEC filings (e.g., 10-K, 8-K) or other disclosures to a regulatory authority. This entity can be linked to a company or a deal to provide context on compliance and regulatory events."
  }
};

const financialRelationships = {
  "INVESTED_IN": { "domain": "Investor", "range": "Deal", "description": "Historical or active participation" },
  "MANAGES": { "domain": "Investor", "range": "Fund", "description": "Investor manages Fund X" },
  "HAS_MANDATE": { "domain": "Fund", "range": "Mandate", "description": "Fund strategy constraints" },
  "TARGETS": { "domain": "Deal", "range": "TargetCompany", "description": "Entity targeted in the deal" },
  "OPERATES_IN": { "domain": "TargetCompany", "range": ["Sector", "GeographicRegion"], "description": "Sector classification" },
  "HAS_PROCESS_TYPE": { "domain": "Deal", "range": "string", "description": "e.g., auction, bilateral" },
  "SIMILAR_TO": { "domain": "Deal", "range": "Deal", "description": "Weighted similarity relationship" },
  "BID_ON": { "domain": "Investor", "range": "Deal", "description": "Investor participated in bid" },
  "HAS_RELATIONSHIP_WITH": { "domain": "Investor", "range": ["Sponsor", "TargetCompany"], "description": "Past interaction or deal co-participation" },
  "EXITED": { "domain": "Investor", "range": "Deal", "description": "Indicates past divestment" },
  "HAS_INTEREST_IN": { "domain": "Investor", "range": "Sector", "description": "Indicates an investor's interest in a specific market sector." },
  "HAS_DOCUMENT": { "domain": "Deal", "range": "Document", "description": "Associates a deal with a related document, such as an NDA or CIM." },
  "FOLLOWS_PROCESS": { "domain": "Deal", "range": "Process", "description": "Describes the process a deal is following, such as an auction or a proprietary sourcing method." }
};

export const financialPlugin: OntologyPlugin = {
  name: 'financial',
  entitySchemas: financialEntities,
  relationshipSchemas: financialRelationships,
  serviceProviders: {
    register: registerFinancial,
  },
}; 