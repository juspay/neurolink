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

For detailed command reference, see [Commands Reference](../cli/commands.md).
