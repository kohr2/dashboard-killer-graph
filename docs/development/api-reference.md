# API Reference

This document provides a reference for the API endpoints available in the Conversational Knowledge Platform.

## Chat API

The Chat API provides an interface for interacting with the conversational agent.

### POST /api/chat/query

This endpoint allows you to send a natural language query to the platform and receive a response.

**Request Body:**

```json
{
  "query": "string"
}
```

- `query` (string, required): The natural language query to be processed.

**Responses:**

- **200 OK:** The query was successfully processed.

  ```json
  {
    "response": "string"
  }
  ```
  
  - `response` (string): The natural language response from the agent.

- **400 Bad Request:** The request was malformed (e.g., missing the `query` field).

  ```json
  {
    "error": "Query is required"
  }
  ```

- **500 Internal Server Error:** An unexpected error occurred on the server.

  ```json
  {
    "error": "An internal error occurred",
    "details": "string"
  }
  ```
  - `details` (string): Additional details about the error, if available. 