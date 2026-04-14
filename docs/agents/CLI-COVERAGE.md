# Multi-Agent Networks CLI Coverage Report

## Summary

The Multi-Agent Networks feature has full CLI coverage. All agent and network
commands are implemented in `src/cli/commands/agent.ts` via the
`AgentCommandFactory` class.

## SDK Coverage

The SDK provides full programmatic access to Multi-Agent Networks:

```typescript
import { NeuroLink } from "neurolink";

const neurolink = new NeuroLink();

// Create and execute an agent
const agent = neurolink.createAgent(definition);
const result = await agent.execute("Your input here");

// Create and execute a network
const network = neurolink.createNetwork(config);
const result = await neurolink.executeNetwork(network, { message: input });
```

## CLI Coverage

### Agent Commands

#### `neurolink agent create`

Create a new agent definition from inline flags or a JSON file.

```bash
# Inline flags
neurolink agent create \
  --id researcher \
  --name "Research Agent" \
  --description "Searches and analyzes information" \
  --instructions "You are a research assistant..." \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022

# From a JSON file
neurolink agent create --file agent-config.json
```

**Status:** Implemented

---

#### `neurolink agent list`

List all agents registered in the current session.

```bash
neurolink agent list

neurolink agent list --format json

neurolink agent list --format table --detailed
```

**Status:** Implemented

---

#### `neurolink agent execute` / `neurolink agent run`

Execute a registered agent. `run` is an alias for `execute`.

```bash
neurolink agent execute researcher "Find information about AI trends"

neurolink agent run writer "Write a blog post" --stream

neurolink agent execute researcher "Analyze this" \
  --context '{"language": "typescript"}' \
  --maxSteps 15
```

**Status:** Implemented

---

### Network Commands

#### `neurolink network create`

Create an agent network from a JSON configuration file.

```bash
neurolink network create \
  --name "Content Team" \
  --file network-config.json

# Override router settings
neurolink network create \
  --name "Content Team" \
  --file network-config.json \
  --routerProvider anthropic \
  --routerModel claude-3-5-sonnet-20241022
```

**Status:** Implemented

---

#### `neurolink network list`

List all networks registered in the current session.

```bash
neurolink network list

neurolink network list --format json

neurolink network list --format table --detailed
```

**Status:** Implemented

---

#### `neurolink network execute` / `neurolink network run`

Execute a registered network. `run` is an alias for `execute`.

```bash
neurolink network execute content-team "Write an article about AI"

neurolink network run research-team "Analyze market trends" --stream

neurolink network execute content-team "Research topic" \
  --maxSteps 20 \
  --timeout 120000
```

**Status:** Implemented

---

## Shared Flags

All `agent` and `network` subcommands support:

| Flag             | Type                | Default | Description                   |
| ---------------- | ------------------- | ------- | ----------------------------- |
| `--format`       | `text\|json\|table` | `text`  | Output format                 |
| `--output`       | `string`            | —       | Save output to file           |
| `--quiet` / `-q` | `boolean`           | `false` | Suppress non-essential output |
| `--debug`        | `boolean`           | `false` | Enable debug output           |

`agent execute` / `agent run` and `network execute` / `network run` also accept:

| Flag         | Type      | Default  | Description                            |
| ------------ | --------- | -------- | -------------------------------------- |
| `--stream`   | `boolean` | `false`  | Stream output in real-time             |
| `--context`  | `string`  | —        | Additional context as JSON             |
| `--maxSteps` | `number`  | `10`     | Maximum execution steps                |
| `--timeout`  | `number`  | `120000` | Timeout in milliseconds (network only) |

## Commands Not Implemented

The following commands are out of scope for the current implementation:

- `neurolink agent show <id>` — show individual agent details
- `neurolink agent delete <id>` — remove a registered agent
- `neurolink network show <id>` — show individual network details
- `neurolink network delete <id>` — remove a registered network
- `neurolink network status <id>` — live network health/load status
- `neurolink message send` / `neurolink message broadcast` — direct messaging

Session state (registered agents and networks) is in-memory and does not
persist across CLI invocations.

## Source Reference

- Implementation: `src/cli/commands/agent.ts`
- Command factory class: `AgentCommandFactory`
- Agent subcommands: `create`, `list`, `execute`, `run`
- Network subcommands: `create`, `list`, `execute`, `run`
