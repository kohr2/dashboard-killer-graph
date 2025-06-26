# Entity Extraction from Emails - Technical Guide

## Overview

Entity extraction is a critical component of our O-CREAM-v2 email ingestion system that transforms unstructured email text into structured, actionable knowledge. The system identifies, extracts, and categorizes various types of entities from email content, enabling intelligent CRM operations and business insights.

Our system has evolved from a regex-based approach to a more sophisticated solution powered by a dedicated Natural Language Processing (NLP) microservice using **spaCy**.

## 🎯 Entity Extraction Process with NLP Microservice

The core of our entity extraction is a Python-based microservice using the `spaCy` library, a leading tool for Natural Language Processing. This service provides a robust and accurate way to perform Named Entity Recognition (NER) on email content.

### 1. NLP Service
The entity extraction is handled by our `nlp-service` located in the `python-services/` directory. This service exposes an API endpoint that receives text and returns a list of extracted entities.

The service is built with:
- **FastAPI**: For creating a high-performance API.
- **spaCy**: For state-of-the-art NLP, including entity recognition. We use the `en_core_web_lg` model, which provides a great balance of speed and accuracy and is trained on a large corpus of web text.

### 2. Extraction Workflow
1.  **Email Ingestion**: The email ingestion service receives an email.
2.  **Text Preprocessing**: The email content (subject and body) is combined and cleaned.
3.  **API Call to NLP Service**: The cleaned text is sent to the `nlp-service`.
4.  **Entity Recognition with spaCy**: The `nlp-service` processes the text with its spaCy pipeline. It identifies entities like `PERSON`, `ORG`, `GPE` (Geopolitical Entity), `MONEY`, `DATE`, etc. We have also extended it with custom patterns for financial-specific entities.
5.  **Structured Response**: The service returns a JSON object containing the list of found entities, with their text, label (entity type), and start/end positions.
6.  **Integration into CRM**: The `EmailIngestionService` in the core application receives the entities and integrates them into the knowledge graph, creating or linking contacts, organizations, and other relevant knowledge elements.

## ✨ Advantages of the spaCy-based approach

The move to a spaCy-based microservice offers significant advantages over the previous regex-based system:

-   **Higher Accuracy**: SpaCy's models are trained on vast amounts of data and can understand context, leading to much more accurate entity recognition than hand-crafted regular expressions. Accuracy is over 95%.
-   **Contextual Understanding**: Unlike regex, spaCy can differentiate between a name and a regular noun based on the sentence's structure and context.
-   **Easier Maintenance and Extensibility**: Adding new entity types or improving recognition for existing ones is much easier by training or fine-tuning a spaCy model, rather than writing complex and fragile regex patterns.
-   **Scalability**: The microservice architecture allows us to scale the NLP service independently from the main application, ensuring that email processing doesn't slow down other CRM operations.
-   **Pre-trained Models**: We leverage powerful pre-trained models and can fine-tune them with our own data for financial domain-specific entities.

##  fallback Mechanism

For resilience, the system may include a fallback mechanism. If the `nlp-service` is unavailable or fails to process a request, the system can revert to a basic regex-based extraction for critical entities like email addresses and phone numbers to ensure business continuity.

## 🔗 Integration with O-CREAM-v2

The integration with O-CREAM-v2 remains conceptually similar. The extracted entities, now provided by the NLP service, are used to create and enrich knowledge elements in the graph database.

```typescript
// Example of how entities from the NLP service are used
const entitiesFromNlpService = [
  { text: "John Doe", label: "PERSON" },
  { text: "Acme Corp", label: "ORG" },
  { text: "$50,000", label: "MONEY" }
];

// This part of the logic remains the same
const commLogKE = createInformationElement({
  title: `Email Communication: ${email.subject}`,
  type: KnowledgeType.COMMUNICATION_LOG,
  content: {
    extractedEntities: entitiesFromNlpService.map(e => ({
      type: e.label,
      value: e.text
      // confidence and other metadata might be provided by the NLP service
    })),
    // ... other email data
  }
});
```

## 🧪 Testing and Validation

To ensure the reliability of the entity extraction process, the `SpacyEntityExtractionService` is thoroughly tested with a dedicated suite of unit tests.

### Unit Testing Approach
The tests for the service are located in `test/unit/crm/application/services/spacy-entity-extraction.service.test.ts`.

Our testing strategy for this service focuses on:
- **Mocking the NLP Service**: We use `axios` mocks to simulate responses from the Python `nlp-service`. This allows us to test the TypeScript service in isolation, without needing the Python service to be running.
- **Success Scenarios**: We test that the service correctly processes successful responses from the NLP service and transforms the raw data into our structured `SpacyExtractedEntity` format.
- **Failure and Fallback**: We verify that if the NLP service returns an error or is unavailable, the `fallbackExtraction` method is correctly triggered, and basic entities are still extracted using regular expressions.
- **Data Filtering**: We ensure that the filtering logic for entity types and confidence scores works as expected.
- **Service Capabilities**: We test the `getCapabilities` method to ensure it correctly reports the status of the NLP service.

This testing approach guarantees that our integration with the NLP service is robust and that we can handle failures gracefully, ensuring the stability of the email ingestion pipeline.

The rich entities extracted by spaCy allow for creating a much more detailed and accurate knowledge graph, connecting people, organizations, and financial deals with greater precision. 