# MCP Server Architecture

This document outlines the architecture of the Model-Context-Protocol (MCP) server, which acts as the primary entry point for natural language queries into the knowledge platform.

## Overview

The MCP server is a Node.js process responsible for exposing a set of "tools" to a client. In our case, it exposes a single powerful `query` tool. The client, typically a user-facing application, can call this tool with a natural language question. The server then translates this question into a structured command, executes it against the knowledge graph, and returns a result.

The entire implementation is self-contained within `src/mcp-server.ts`.

## Core Components & Flow

Our implementation uses the low-level API provided by the `@modelcontextprotocol/sdk` for maximum control and clarity. The architecture is built around two primary request handlers.

### 1. `ListToolsRequestSchema` Handler

- **Purpose**: This handler's job is to announce the tools that the server makes available.
- **Implementation**: When a client first connects, it typically asks the server for a list of its capabilities. Our `setRequestHandler(ListToolsRequestSchema, ...)` implementation responds with an array containing our single `queryTool` object.
- **Key Takeaway**: This is the "advertisement" phase. Without it, the client would not know that a `query` tool exists.

### 2. `CallToolRequestSchema` Handler

- **Purpose**: This handler executes the logic when a client actually calls a tool.
- **Implementation**: The `setRequestHandler(CallToolRequestSchema, ...)` implementation contains the core logic:
    1.  It checks if the requested tool `name` is `'query'`.
    2.  It extracts the `query` argument from the request parameters.
    3.  It instantiates the `QueryTranslator` service from the `tsyringe` dependency injection container.
    4.  It calls `queryTranslator.translate(query)` to convert the natural language question into a structured JSON command.
    5.  It wraps the result in a `CallToolResult` object and sends it back to the client.
- **Key Takeaway**: This is the "execution" phase. It's where the application's business logic is integrated with the MCP protocol.

## Startup Process

1.  The `scripts/test-llm-orchestrator.ts` script initiates a `StdioClientTransport`, which starts the `src/mcp-server.ts` process using `ts-node`.
2.  `src/mcp-server.ts` runs:
    - It imports and runs `reflect-metadata` and `./register-ontologies` to set up the dependency injection container.
    - It creates an `McpServer` instance.
    - It attaches the `ListTools` and `CallTool` request handlers.
    - It creates a `StdioServerTransport` and connects the server to it.
    - It logs to `stderr` that it is ready.
3.  The client connects, calls the `query` tool, receives the response, and closes the connection.

This explicit, handler-based architecture is robust and avoids the complexities and potential race conditions of higher-level configuration objects, especially in a project with a complex TypeScript setup. 