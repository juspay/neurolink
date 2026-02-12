# CLI Guide

Complete guide to NeuroLink's command line interface.

## Installation

```bash
npm install -g @juspay/neurolink
```

## Basic Commands

### Text Generation

```bash
neurolink generate "Write a haiku about coding"
```

### Provider Management

```bash
neurolink provider list
neurolink provider status
```

## MCP Commands

### Server Management

```bash
neurolink mcp install <server>
neurolink mcp list
neurolink mcp status
```

### Tool Integration

```bash
neurolink mcp tools
neurolink mcp test <server>
```

## Server Management

Advanced server configuration and management commands.

### Server Commands

```bash
# Start server with specific framework
neurolink serve --framework express --port 8080

# Background mode for production
neurolink server start --port 3000 --framework hono
neurolink server status --format json
neurolink server stop

# Route inspection
neurolink server routes --group agent
neurolink server routes --method POST --format json

# Configuration
neurolink server config --get defaultPort
neurolink server config --set rateLimit.maxRequests=200

# OpenAPI generation
neurolink server openapi -o openapi.yaml --format yaml
```

For detailed server adapter documentation, see the [Server Adapters Guide](../guides/server-adapters/index.md).

For detailed command reference, see [Commands Reference](../cli/commands.md).
