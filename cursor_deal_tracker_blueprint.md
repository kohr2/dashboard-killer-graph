# 📘 Deal Tracker App Blueprint for Cursor

This document provides a complete blueprint to implement an ontology-powered deal tracking and CRM intelligence system using [Cursor](https://www.cursor.so/), Neo4j, and modern NLP pipelines.

It is designed as a **two-layer architecture**:

1. **Generic CRM Layer** — a "Kill the Dashboard" interface that captures communication, task management, and workflow logic. Includes its own formal **CRM Ontology** for structured modeling.
2. **Financial Expertise Layer** — a semantic enrichment and query engine tailored for private equity, M&A, and deal lifecycle management.

---

## 🗺️ Visual Architecture Overview

```
            ┌────────────────────────────┐
            │   Layer 2: Financial       │
            │   Expertise Layer          │
            │   - Ontology rules         │
            │   - Deal probability calc  │
            │   - LOI / NDA stages       │
            └────────────▲───────────────┘
                         │
            ┌────────────┴───────────────┐
            │   Layer 1: CRM/Comms Base  │
            │   - Emails (Graph API)     │
            │   - Tasks (Salesforce)     │
            │   - Timeline, Querying     │
            └────────────────────────────┘
```

## 🧱 Stack Overview

| Layer                | Stack                          | Purpose                                                             |
| -------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Ontology (CRM)       | OWL (Protégé) / RDF (Turtle)   | Structure for tasks, timelines, entities, and communication         |
| Ontology (Finance)   | OWL (Protégé) / RDF (Turtle)   | Domain-specific financial modeling (bidding, LOI, diligence, etc.)  |
| Graph DB             | Neo4j                          | Relationship queries: deals, tasks, communication                   |
| NLP                  | spaCy + LLM API                | Parse emails, extract entities & intents                            |
| CRM Integration      | Salesforce via REST API        | Sync contact and task metadata                                      |
| Email Ingestion      | Microsoft Graph API            | Access and process Outlook email threads                            |
| App UI (Layer 1)     | Cursor (LangChain + React)     | "Kill the dashboard" natural language interface                     |
| Financial Layer (L2) | Cursor agents + Ontology layer | Domain-specific modeling for deal-making, diligence, investor logic |

---

## 📁 Folder Structure

```
/deal-tracking-app
│
├── /ontology
│   ├── crm_layer.owl             # CRM Ontology: emails, tasks, workflows
│   ├── finance_layer.owl         # Financial expertise ontology
│   └── schema.ttl                # Combined RDF representation
│
├── /graph
│   └── ingest_to_neo4j.py        # Push RDF triples to Neo4j (via RDFLib or py2neo)
│
├── /nlp
│   ├── extract_entities.py       # spaCy + LLM hybrid extraction
│   ├── map_to_ontology.py        # Map email data → RDF triples
│
├── /email_ingestion
│   └── microsoft_graph_api.py    # Email access via Microsoft Graph API
│
├── /crm_sync
│   └── salesforce_api.py         # Salesforce sync
│
├── /ui
│   ├── app.tsx                   # Cursor frontend for both layers
│   ├── timeline_view.tsx         # Deal visualizer
│   └── entity_panel.tsx          # Detail view (emails, tasks)
│
├── /expertsys
│   ├── finance_rules.ttl         # Expert system logic (LOI triggers, diligence stages)
│   ├── bid_probability.py        # ML model or rule-based bid likelihood estimator
│
├── /config
│   ├── .env
│   └── settings.yaml
```

---

## 👤 User Stories

- As a **Principal**, I want to ask: “What’s the latest on Project Gotham?” and get a summary from emails + tasks.
- As a **VP**, I want to know: “Is Audax likely to bid?” and receive a risk-weighted prediction.
- As an **Analyst**, I want to tag an email as ‘LOI stage’ and see it update the deal lifecycle automatically.

---

## 🧠 Cursor LLM Agent Design

### Layer 1: `CRMAgent`

- Ontology-backed agent for querying communications, responsibilities, and deal stages
- Answers: "What’s the latest on Project X?", "Who owns this task?"
- Uses CRM ontology + Neo4j + APIs

### Layer 2: `DealExpertAgent`

- Expert agent layered atop CRM graph
- Answers: "What’s the likelihood of Audax bidding?", "Where are we in diligence?"
- Uses finance ontology + domain rules

### Shared Tools:

```ts
runCypherQuery(input: string): string
getCRMStatus(deal: string): string
summarizeEmailThread(dealId: string): string
calculateBidLikelihood(dealId: string, investor: string): float
```

---

## 🔁 CRM + Email API Integration

- **Salesforce** REST API → Tasks, Contacts
- **Microsoft Graph API** → Email threads, subject lines, recipients, timestamps, attachments

---

## 🔍 Insight Suggestion Engine (Graph Intelligence)

### 🔧 Inference Rules

- OWL2 or SPARQL CONSTRUCT rules for:
  - Overdue tasks → `Status = "Delayed"`
  - Emails with LOI intent → advance stage to `LOIIssued`

### 🔄 Heuristic-Based Patterns

| Insight Type          | Graph Pattern Example                                          |
| --------------------- | -------------------------------------------------------------- |
| Stalling deal         | No new `Email` or `Task` in 7+ days                            |
| Hot investor          | ≥3 emails + `HAS_INTENT = Interest`                            |
| Misaligned task owner | Task assigned to person not involved in recent comms           |
| Missing NDA           | `InDiligence` stage with no attached `:Document` of type `NDA` |

### 🔮 LLM-Generated Suggestions (LangChain Tool)

```ts
suggestGraphInsights(): string
```

> “Investor Blue Owl engaged 3x this week, but no follow-up sent. Task overdue by 3 days.”

### 🧠 Vector Similarity (Optional)

- Embed past deals, match on stage + sector + outcome
- Tool: `suggestSimilarDeals(dealId: string): string[]`

### 📊 Insight Panel UI

Display auto-generated insights:

```json
[
  { "type": "Risk", "message": "No updates on Gotham in 10 days", "linked_to": "Project Gotham" },
  { "type": "Opportunity", "message": "Audax re-engaged on Helix — suggest follow-up." }
]
```

---

## ✅ Deployment Plan

1. Design and build **two ontologies** (CRM + Finance) in Protégé
2. Load RDF into Neo4j with `neosemantics`
3. Build Cursor app with `CRMAgent` and `DealExpertAgent`
4. Connect Salesforce + Microsoft Graph APIs
5. Define SPARQL/Cypher insight rules and LangChain tools
6. Add insight panel to UI
7. Test on sample data with 3–5 deals and 10+ emails/tasks

---

## 📈 KPIs to Validate Success

- ✅ 90% of user requests resolved by natural language
- ✅ Task follow-ups reduced by 50%
- ✅ Deals flagged as cold within 24h of inactivity

---

> Built for Cursor, powered by Ontologies + Graph AI. Modular by design, extensible with finance-specific expertise.

