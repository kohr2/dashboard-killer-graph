# Entity Extraction from Emails - Technical Guide

## Overview

Entity extraction is a critical component of our email ingestion system that transforms unstructured email text into structured, actionable knowledge. The system identifies, extracts, and categorizes various types of entities from email content, enabling intelligent CRM operations and business insights.

Our system has evolved from a regex-based approach to a more sophisticated solution powered by a dedicated Natural Language Processing (NLP) microservice.

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
6.  **Integration into CRM**: The `EmailIngestionService` in the core application receives the entities and prepares them for integration into the knowledge graph.

### 3. Entity Linking and Deduplication with Vector Search

A crucial step after extraction is to link the new entities to existing ones in our Neo4j knowledge graph. This process, often called "entity linking" or "resolution," prevents the creation of duplicate nodes (e.g., multiple nodes for "Apple Inc.").

**It is important to note that vector search is applied to the extracted entities, not the raw email text itself.**

1.  **Vector Embedding**: For each entity extracted from the email, we generate a numerical vector representation (an "embedding") using a sentence-transformer model in our NLP service. This embedding captures the semantic meaning of the entity's name.
2.  **Similarity Search**: This embedding is then used to query a vector index in Neo4j. The query searches for nodes with a similar vector, returning a "similarity score."
3.  **Decision Logic**:
    -   If a node with a high similarity score (e.g., > 0.92) is found, we reuse this existing node.
    -   If no similar node is found, a new entity node is created in the graph, and its embedding is stored as a property.
4.  **Graph Update**: The `Communication` node representing the email is then linked to the appropriate entity nodes (either pre-existing or newly created).

This process ensures the knowledge graph remains clean, consistent, and densely connected over time.

### 🏛️ Data Enrichment Framework

Once entities are extracted and linked, the system can further enhance them through a generic **Data Enrichment Framework**. This framework is designed to augment our internal data with valuable information from external sources like Salesforce, financial databases (e.g., EDGAR), or other third-party APIs.

The entire framework is located in `src/platform/enrichment/`.

#### Key Components

1.  **`IEnrichmentService.ts`**: This is the core interface that defines the contract for any enrichment service. It mandates a single method, `enrich(entities: any[])`, which takes a list of entities and returns them, potentially with new data appended.

2.  **`EnrichmentOrchestrator.service.ts`**: This service acts as a registry and a dispatcher for all available enrichment services.
    -   **Registration**: Other parts of the application (like extensions) can register their specific enrichment services with the orchestrator.
    -   **Execution**: It has a primary method, `enrichEntities(entities)`, that iterates through all registered services and executes them sequentially, passing the output of one service as the input to the next.

3.  **`ContentProcessingService.ts`**: The main `ContentProcessingService` (in `src/platform/processing/`) is responsible for invoking the enrichment process. After extracting the initial graph from content, it passes the list of entities to the `EnrichmentOrchestratorService` before they are saved to the database.

#### How to Add a New Enrichment Service

The framework is designed to be highly extensible. Adding a new data source is a straightforward process:

1.  **Create the Service Class**: Create a new file, for example, `MyApiEnrichment.service.ts`, in a relevant module. The class must implement the `IEnrichmentService` interface.

    ```typescript
    // src/extensions/my-extension/application/services/my-api-enrichment.service.ts
    import { IEnrichmentService } from '@platform/enrichment';

    export class MyApiEnrichmentService implements IEnrichmentService {
      readonly name = 'MyAPI'; // Unique name for the service

      async enrich(entities: any[]): Promise<any[]> {
        for (const entity of entities) {
          if (entity.type === 'Organization' && entity.properties.website) {
            // Call your external API
            const extraData = await myApiClient.getData(entity.properties.website);
            // Append new data
            entity.properties.extraData = extraData;
          }
        }
        return entities;
      }
    }
    ```

2.  **Register the Service**: In the main application entry point or the extension's registration file, instantiate and register your new service with the orchestrator.

    ```typescript
    // In a suitable initialization file
    import { EnrichmentOrchestratorService } from '@platform/enrichment';
    import { MyApiEnrichmentService } from './my-api-enrichment.service';

    const orchestrator = new EnrichmentOrchestratorService();
    orchestrator.register(new MyApiEnrichmentService());

    // The orchestrator is now ready to be used by the ContentProcessingService
    ```

This modular approach allows us to easily connect new data sources, making our knowledge graph richer and more valuable over time.

### 🚀 High-Performance Batch Processing

To handle large volumes of emails efficiently, the system has been refactored to support high-performance batch processing. The previous sequential approach, where each email was processed one by one, created a significant bottleneck due to network latency and the serial nature of the API calls.

The new architecture addresses this with two key components:

1.  **Asynchronous Batch Endpoint (`/batch-extract-graph`)**: The Python NLP service now features a `/batch-extract-graph` endpoint. This endpoint accepts a list of documents and processes them concurrently using `asyncio` and an `AsyncOpenAI` client. This parallel execution means that the total time to process a batch of emails is roughly equal to the time it takes to process the single longest email, rather than the sum of all of them. For the demo dataset of 28 emails, this reduced the end-to-end LLM processing time from over 2 minutes to approximately 11 seconds.

2.  **Centralized `ContentProcessingService`**: In the TypeScript application, a new generic `ContentProcessingService` has been introduced in the platform layer (`src/platform/processing/`). This service is responsible for orchestrating the batch workflow:
    - It gathers the content from all emails.
    - It makes a single API call to the `/batch-extract-graph` endpoint.
    - It then performs a subsequent batch call to retrieve vector embeddings for all extracted entities at once.
    - Finally, it intelligently maps the results back to their original source documents.

This batch-oriented, asynchronous architecture provides a massive improvement in throughput for the email ingestion pipeline.

## 🏛️ Ontology-Driven Architecture

A key architectural principle of the system is that its capabilities are extended through modular business domains (like CRM or Financial), each providing its own `ontology.json` file. This makes the system's logic fundamentally **ontology-driven**.

This approach allows for a modular and extensible system where each business domain can define its own concepts, relationships, and rules without altering the core platform.

### Defining Entities as Properties

Not all identified concepts should become distinct nodes in our knowledge graph. Some concepts, like an email address, a monetary amount, or a specific date, are better represented as *properties* of a core entity (like a `Person` or a `Deal`).

To manage this, each extension's ontology can use an `"isProperty"` flag.

When an entity in an `ontology.json` file is marked with `"isProperty": true`, the system-wide `OntologyService` recognizes it not as a standalone node, but as an attribute to be attached to another entity.

**Example: Defining `Email` as a Property**

In the CRM extension (`src/ontologies/crm/ontology.json`), the `Email` entity is defined as follows:

```json
{
  "Email": {
    "parent": "ContactPoint",
    "isProperty": true,
    "description": "A unique electronic address for sending and receiving messages."
  }
}
```

### Dynamic Processing by the NLP Service

This ontology-driven approach is fully dynamic.
1.  At startup, the main application reads all `ontology.json` files from the extensions.
2.  It compiles a list of all entity types that are marked with `"isProperty": true`.
3.  This list is sent to the Python NLP Service.
4.  The NLP Service then dynamically adjusts its instructions for the underlying AI model, telling it **not** to create nodes for these types, but to instead attach them as properties to the most relevant core entity it can find.

This ensures that the logic for how an entity is treated resides entirely within the ontology of the extension that defines it, making the system highly modular and easy to maintain.

## ✨ Advantages of the NLP-based approach

The move to an NLP-based microservice offers significant advantages over the previous regex-based system:

-   **Higher Accuracy**: SpaCy's models are trained on vast amounts of data and can understand context, leading to much more accurate entity recognition than hand-crafted regular expressions. Accuracy is over 95%.
-   **Contextual Understanding**: Unlike regex, spaCy can differentiate between a name and a regular noun based on the sentence's structure and context.
-   **Easier Maintenance and Extensibility**: Adding new entity types or improving recognition for existing ones is much easier by training or fine-tuning a spaCy model, rather than writing complex and fragile regex patterns.
-   **Scalability**: The microservice architecture allows us to scale the NLP service independently from the main application, ensuring that email processing doesn't slow down other operations.
-   **Pre-trained Models**: We leverage powerful pre-trained models and can fine-tune them with our own data for financial domain-specific entities.

## fallback Mechanism

For resilience, the system may include a fallback mechanism. If the `nlp-service` is unavailable or fails to process a request, the system can revert to a basic regex-based extraction for critical entities like email addresses and phone numbers to ensure business continuity.

## 🧪 Testing and Validation

To ensure the reliability of the entity extraction process, the integration with the NLP service is thoroughly tested with a dedicated suite of unit tests.

### Unit Testing Approach
The tests for the service are located in `test/unit/crm/application/services/spacy-entity-extraction.service.test.ts`.

Our testing strategy for this service focuses on:
- **Mocking the NLP Service**: We use `axios` mocks to simulate responses from the Python `nlp-service`. This allows us to test the TypeScript service in isolation, without needing the Python service to be running.
- **Success Scenarios**: We test that the service correctly processes successful responses from the NLP service and transforms the raw data into the expected structured format.
- **Failure and Fallback**: We verify that if the NLP service returns an error or is unavailable, a fallback mechanism can be triggered to ensure business continuity.
- **Data Filtering**: We ensure that the filtering logic for entity types and confidence scores works as expected.
- **Service Capabilities**: We test the `getCapabilities` method to ensure it correctly reports the status of the NLP service.

This testing approach guarantees that our integration with the NLP service is robust and that we can handle failures gracefully, ensuring the stability of the email ingestion pipeline.

The rich entities extracted by the NLP service allow for creating a much more detailed and accurate knowledge graph, connecting people, organizations, and financial deals with greater precision. 