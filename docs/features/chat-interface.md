# Chat Interface and Query Engine Documentation

This document provides an overview of the chat interface architecture and the intelligent query engine powering it.

## 1. Architecture Overview

The chat feature is composed of two main parts: a frontend user interface and a backend API.

-   **Frontend (`chat-ui/`)**: A modern, responsive user interface built with **React** and **Vite**. It handles user input, displays the conversation history, and communicates with the backend API.
-   **Backend (`src/api.ts`)**: A lightweight server built with **Express.js**. It exposes a single API endpoint for chat interactions and orchestrates the services responsible for understanding and answering user queries.

```mermaid
graph TD
    subgraph Frontend (React - Port 5173)
        A[Chat UI] -->|HTTP Request| B{Vite Proxy}
    end

    subgraph Backend (Express - Port 3001)
        B --> C[/api/chat]
        C --> D[ChatService]
        D --> E{QueryTranslator}
        D --> F[Neo4jConnection]
        E --> G(OpenAI - gpt-4o-mini)
        F --> H[(Neo4j Database)]
        D --> G
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
```

## 2. API Endpoint

### `POST /api/chat`

This is the primary endpoint for all chat interactions.

-   **Request Body**:
    ```json
    {
      "query": "The user's natural language question."
    }
    ```
-   **Response Body (Success)**:
    ```json
    {
      "response": "The AI-generated natural language answer."
    }
    ```
-   **Response Body (Error)**:
    ```json
    {
      "error": "A description of the error."
    }
    ```

## 3. Core Services

### `QueryTranslatorService`

This service is the "brain" of the operation. It takes a raw, natural-language query from the user (e.g., "liste moi les projets liés à Offshore Holdings Ltd.") and, using a powerful prompt with detailed rules and examples, translates it into a structured JSON object that the system can execute.

-   **Input**: `(rawQuery: string, history: ConversationTurn[])`
-   **Output**: `StructuredQuery` (e.g., `{ "command": "show_related", "resourceTypes": ["Project", "Deal"], ... }`)

It is designed to handle context, ambiguity (e.g., "projets"), and queries in different languages.

### `ChatService`

This service orchestrates the entire query-handling process.

1.  It receives the raw query and passes it to the `QueryTranslatorService`.
2.  Based on the structured query returned, it fetches data from the Neo4j database using `Neo4jConnection`.
    -   For `show` commands, it performs a direct lookup.
    -   For `show_related` commands, it first finds the source entity (e.g., "Offshore Holdings Ltd.") and then finds all related target entities (e.g., "Projects" and "Deals").
3.  It takes the raw data results from Neo4j and the original user query and sends them to an OpenAI model (`gpt-4o-mini`) for **Retrieval-Augmented Generation (RAG)**. This final step generates a coherent, natural-language response, avoiding the contradictions seen in earlier versions.