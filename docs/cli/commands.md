# CLI Command Reference

The NeuroLink CLI mirrors the SDK. Every command shares consistent options and outputs so you can prototype in the terminal and port the workflow to code later.

## Install or Run Ad-hoc

```bash
# Run without installation
npx @juspay/neurolink --help

# Install globally
npm install -g @juspay/neurolink

# Local project dependency
npm install @juspay/neurolink
```

## Command Map

| Command               | Description                                                 | Example                                                                     |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `generate` / `gen`    | One-shot content generation with optional multimodal input. | `npx @juspay/neurolink generate "Draft release notes" --image ./before.png` |
| `stream`              | Real-time streaming output with tool support.               | `npx @juspay/neurolink stream "Narrate sprint demo" --enableAnalytics`      |
| `loop`                | Interactive session with persistent variables & memory.     | `npx @juspay/neurolink loop --auto-redis`                                   |
| `setup`               | Guided provider onboarding and validation.                  | `npx @juspay/neurolink setup --provider openai`                             |
| `status`              | Health check for configured providers.                      | `npx @juspay/neurolink status --verbose`                                    |
| `models list`         | Inspect available models and capabilities.                  | `npx @juspay/neurolink models list --capability vision`                     |
| `config <subcommand>` | Initialise, validate, export, or reset configuration.       | `npx @juspay/neurolink config validate`                                     |
| `memory <subcommand>` | View, export, or clear conversation history.                | `npx @juspay/neurolink memory history NL_x3yr --format json`                |
| `mcp <subcommand>`    | Manage Model Context Protocol servers/tools.                | `npx @juspay/neurolink mcp list`                                            |
| `validate`            | Alias for `config validate`.                                | `npx @juspay/neurolink validate`                                            |

## Primary Commands

### `generate <input>` {#generate}

```bash
npx @juspay/neurolink generate "Summarise design doc" \
  --provider google-ai --model gemini-2.5-pro \
  --image ./screenshots/ui.png --enableAnalytics --enableEvaluation
```

Key flags:

- `--provider`, `-p` – provider slug (default `auto`).
- `--model`, `-m` – model name for the chosen provider.
- `--image`, `-i` – attach one or more files/URLs for multimodal prompts.
- `--temperature`, `-t` – creativity (default `0.7`).
- `--maxTokens` – response limit (default `1000`).
- `--system`, `-s` – system prompt.
- `--format`, `-f` – `text` (default), `json`, or `table`.
- `--output`, `-o` – write response to file.
- `--enableAnalytics` / `--enableEvaluation` – capture metrics & quality scores.
- `--evaluationDomain` – domain hint for the judge model.
- `--context` – JSON string appended to analytics/evaluation context.
- `--disableTools` – bypass MCP tools for this call.
- `--timeout` – seconds before aborting the request (default `120`).
- `--debug` – verbose logging and full JSON payloads.
- `--quiet` – suppress spinners.

`gen` is a short alias with the same options.

### `stream <input>` {#stream}

```bash
npx @juspay/neurolink stream "Walk through the timeline" \
  --provider openai --model gpt-4o --enableEvaluation
```

`stream` shares the same flags as `generate` and adds chunked output for live UIs. Evaluation results are emitted after the stream completes when `--enableEvaluation` is set.

### Model Evaluation {#eval}

Evaluate AI model outputs for quality, accuracy, and safety using NeuroLink's built-in evaluation engine.

**Via generate/stream commands:**

```bash
# Enable evaluation on any command
npx @juspay/neurolink generate "Write a product description" \
  --enableEvaluation \
  --evaluationDomain "e-commerce"
```

**Evaluation Output:**

```json
{
  "response": "...",
  "evaluation": {
    "score": 0.85,
    "metrics": {
      "accuracy": 0.9,
      "safety": 1.0,
      "relevance": 0.8
    },
    "judge_model": "gpt-4o",
    "feedback": "High quality response with clear structure"
  }
}
```

**Key Evaluation Flags:**

- `--enableEvaluation` – Activate quality scoring
- `--evaluationDomain <domain>` – Context hint for the judge (e.g., "medical", "legal", "technical")
- `--context <json>` – Additional context for evaluation

**Judge Models:**

NeuroLink uses GPT-4o by default as the judge model, but you can configure different models for evaluation in your SDK configuration.

**Use Cases:**

- Quality assurance for production outputs
- A/B testing different prompts
- Safety validation before deployment
- Compliance checking for regulated industries

**Learn more:** [Auto Evaluation Guide](../features/auto-evaluation.md)

---

### `loop`

**Interactive session mode** with persistent state, conversation memory, and session variables. Perfect for iterative workflows and experimentation.

```bash
# Start loop with Redis-backed conversation memory
npx @juspay/neurolink loop --enable-conversation-memory --auto-redis

# Start loop without Redis auto-detection
npx @juspay/neurolink loop --enable-conversation-memory --no-auto-redis
```

**Key capabilities:**

- Run any CLI command without restarting session
- Persistent session variables: `set provider openai`, `set temperature 0.9`
- Conversation memory: AI remembers previous turns within session
- Redis auto-detection: Automatically connects if `REDIS_URL` is set
- Export session history as JSON for analytics

**Session management commands (inside loop):**

- `set <key> <value>` – Set session variable (provider, model, temperature, etc.)
- `get <key>` – Show current value
- `show` – Display all active session variables
- `clear` – Reset all session variables
- `exit` – Exit loop session

See the complete guide: [CLI Loop Sessions](../features/cli-loop-sessions.md)

### `setup`

**Interactive provider configuration wizard** that guides you through API key setup, credential validation, and recommended model selection.

```bash
# Launch interactive setup wizard
npx @juspay/neurolink setup

# Show all available providers
npx @juspay/neurolink setup --list

# Configure a specific provider
npx @juspay/neurolink setup --provider openai
npx @juspay/neurolink setup --provider bedrock
npx @juspay/neurolink setup --provider google-ai
```

**What the wizard does:**

1. **Prompts for API keys** – Securely collects credentials
2. **Validates authentication** – Tests connection to provider
3. **Writes `.env` file** – Safely stores credentials (creates if missing)
4. **Recommends models** – Suggests best models for your use case
5. **Shows example commands** – Quick-start examples to try immediately

**Supported providers:**
OpenAI, Anthropic, Google AI, Vertex AI, Bedrock, Azure, Hugging Face, Ollama, Mistral, and more.

See also: [Provider Setup Guide](../getting-started/provider-setup.md)

### `status`

```bash
npx @juspay/neurolink status --verbose
```

Displays provider availability, authentication status, recent error summaries, and response latency.

### `models`

```bash
# List all models for a provider
npx @juspay/neurolink models list --provider google-ai

# Filter by capability
npx @juspay/neurolink models list --capability vision --format table
```

### `config`

Manage persistent configuration stored in the NeuroLink config directory.

```bash
npx @juspay/neurolink config init
npx @juspay/neurolink config validate
npx @juspay/neurolink config export --format json > neurolink-config.json
```

### `memory`

**Manage conversation history** stored in Redis. View, export, or clear session data for analytics and debugging.

```bash
# List all active sessions
npx @juspay/neurolink memory list

# View session statistics
npx @juspay/neurolink memory stats

# View conversation history (text format)
npx @juspay/neurolink memory history <SESSION_ID>

# Export session as JSON (Q4 2025 - for analytics)
npx @juspay/neurolink memory export --session-id <SESSION_ID> --format json > session.json

# Export all sessions
npx @juspay/neurolink memory export-all --output ./exports/

# Delete a single session
npx @juspay/neurolink memory clear <SESSION_ID>

# Delete all sessions
npx @juspay/neurolink memory clear-all
```

**Export formats:**

- `json` – Structured data with metadata, timestamps, token counts
- `csv` – Tabular format for spreadsheet analysis

**Note:** Requires Redis-backed conversation memory. Set `REDIS_URL` environment variable.

See the complete guide: [Redis Conversation Export](../features/conversation-history.md)

### `mcp`

Manage Model Context Protocol servers and tools. Supports stdio, SSE, WebSocket, and HTTP transports.

```bash
# List registered servers/tools
npx @juspay/neurolink mcp list

# Auto-discover MCP servers from config files
npx @juspay/neurolink mcp discover

# Install popular MCP servers
npx @juspay/neurolink mcp install filesystem
npx @juspay/neurolink mcp install github

# Add custom servers with different transports
npx @juspay/neurolink mcp add myserver "python server.py" --transport stdio
npx @juspay/neurolink mcp add webserver "http://localhost:8080" --transport sse --url "http://localhost:8080/sse"

# Add HTTP remote server with authentication
npx @juspay/neurolink mcp add remote-api "https://api.example.com/mcp" \
  --transport http \
  --url "https://api.example.com/mcp" \
  --headers '{"Authorization": "Bearer YOUR_TOKEN"}'

# Test server connectivity
npx @juspay/neurolink mcp test myserver

# Remove a server
npx @juspay/neurolink mcp remove myserver
```

**MCP Command Options:**

| Option        | Description                                         |
| ------------- | --------------------------------------------------- |
| `--transport` | Transport type: `stdio`, `sse`, `websocket`, `http` |
| `--url`       | URL for SSE/WebSocket/HTTP transport                |
| `--headers`   | JSON string with HTTP headers for authentication    |
| `--args`      | Command arguments (comma-separated)                 |
| `--env`       | Environment variables (JSON string)                 |
| `--cwd`       | Working directory for the server                    |

**HTTP Transport Features:**

- Custom headers for authentication (Bearer tokens, API keys)
- Configurable timeouts and connection options
- Automatic retry with exponential backoff
- Rate limiting to prevent API throttling
- OAuth 2.1 support with PKCE

See [MCP HTTP Transport Guide](../MCP-HTTP-TRANSPORT.md) for complete configuration options.

## Global Flags (available on every command)

| Flag                        | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `--configFile <path>`       | Use a specific configuration file.                                        |
| `--dryRun`                  | Generate without calling providers (returns mocked analytics/evaluation). |
| `--no-color`                | Disable ANSI colours.                                                     |
| `--delay <ms>`              | Delay between batched operations.                                         |
| `--domain <slug>`           | Select a domain configuration for analytics/evaluation.                   |
| `--toolUsageContext <text>` | Describe expected tool usage for better evaluation feedback.              |

## JSON-Friendly Automation

- `--format json` returns structured output including analytics, evaluation, tool calls, and response metadata.
- Combine with `--enableAnalytics --enableEvaluation` to capture usage costs and quality scores in automation pipelines.
- Use `--output <file>` to persist raw responses alongside JSON logs.

## Troubleshooting

| Issue                              | Tip                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Unknown argument`                 | Check spelling; run `command --help` for the latest options.                                             |
| CLI exits immediately              | Upgrade to the newest release or clear old `neurolink` binaries on PATH.                                 |
| Provider shows as `not-configured` | Run `neurolink setup --provider <name>` or populate `.env`.                                              |
| Analytics/evaluation missing       | Ensure both `--enableAnalytics`/`--enableEvaluation` and provider credentials for the judge model exist. |

For advanced workflows (batching, tooling, configuration management) see the relevant guides in the documentation sidebar.

---

## Related Features

**Q4 2025:**

- [CLI Loop Sessions](../features/cli-loop-sessions.md) – Persistent interactive mode with session management
- [Redis Conversation Export](../features/conversation-history.md) – Export session history via `memory export`
- [Guardrails Middleware](../features/guardrails.md) – Content filtering (use `--middleware-preset security`)

**Q3 2025:**

- [Multimodal Chat](../features/multimodal-chat.md) – Use `--image` flag with `generate` or `stream`
- [Auto Evaluation](../features/auto-evaluation.md) – Enable with `--enableEvaluation`
- [Provider Orchestration](../features/provider-orchestration.md) – Automatic fallback and routing

**Documentation:**

- [SDK API Reference](../sdk/api-reference.md) – TypeScript API equivalents
- [Configuration Guide](../CONFIGURATION.md) – Environment variables and config files
- [Troubleshooting](../TROUBLESHOOTING.md) – Detailed error solutions
