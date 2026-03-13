# API Reference

Complete API reference for NeuroLink.

## Core API

### Generate Text

```http
POST /api/generate
```

### Stream Text

```http
POST /api/stream
```

### Provider Status

```http
GET /api/status
```

## Embeddings

### Generate Embedding

```http
POST /api/agent/embed
```

**Request body:**

```json
{
  "text": "Hello world",
  "provider": "googleAiStudio",
  "model": "gemini-embedding-001"
}
```

**Response:**

```json
{
  "embedding": [0.123, -0.456, ...],
  "provider": "googleAiStudio",
  "model": "gemini-embedding-001",
  "dimension": 768
}
```

### Generate Batch Embeddings

```http
POST /api/agent/embed-many
```

**Request body:**

```json
{
  "texts": ["First document", "Second document", "Third document"],
  "provider": "openai",
  "model": "text-embedding-3-small"
}
```

**Response:**

```json
{
  "embeddings": [[0.123, -0.456, ...], [0.789, -0.012, ...], [0.345, -0.678, ...]],
  "provider": "openai",
  "model": "text-embedding-3-small",
  "count": 3,
  "dimension": 1536
}
```

## MCP Integration

### List MCP Tools

```http
GET /api/mcp/tools
```

### Execute MCP Tool

```http
POST /api/mcp/execute
```

### MCP Server Status

```http
GET /api/mcp/status
```

For complete API documentation, see [API Reference](../sdk/api-reference.md).
