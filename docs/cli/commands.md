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
| `batch`               | Process multiple prompts from a file.                       | `npx @juspay/neurolink batch prompts.txt --format json`                     |
| `loop`                | Interactive session with persistent variables & memory.     | `npx @juspay/neurolink loop --auto-redis`                                   |
| `setup` / `s`         | Guided provider onboarding and validation.                  | `npx @juspay/neurolink setup --provider openai`                             |
| `status`              | Health check for configured providers.                      | `npx @juspay/neurolink status --verbose`                                    |
| `get-best-provider`   | Show the best available AI provider.                        | `npx @juspay/neurolink get-best-provider --format json`                     |
| `models list`         | Inspect available models and capabilities.                  | `npx @juspay/neurolink models list --capability vision`                     |
| `config <subcommand>` | Initialise, validate, export, or reset configuration.       | `npx @juspay/neurolink config validate`                                     |
| `memory <subcommand>` | View, export, or clear conversation history.                | `npx @juspay/neurolink memory history NL_x3yr --format json`                |
| `mcp <subcommand>`    | Manage Model Context Protocol servers/tools.                | `npx @juspay/neurolink mcp list`                                            |
| `ollama <subcommand>` | Manage Ollama local AI models.                              | `npx @juspay/neurolink ollama list-models`                                  |
| `sagemaker <command>` | Manage Amazon SageMaker endpoints and models.               | `npx @juspay/neurolink sagemaker status`                                    |
| `server <subcommand>` | Manage NeuroLink HTTP server                                |                                                                             |
| `serve`               | Start server in foreground mode                             |                                                                             |
| `validate`            | Alias for `config validate`.                                | `npx @juspay/neurolink validate`                                            |
| `completion`          | Generate shell completion script.                           | `npx @juspay/neurolink completion > ~/.neurolink-completion.sh`             |

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
- `--image`, `-i` – attach one or more image files/URLs for multimodal prompts.
- `--pdf` – attach one or more PDF files for document analysis.
- `--csv`, `-c` – attach one or more CSV files for data analysis.
- `--file` – attach any supported file type (auto-detected: Excel, Word, RTF, JSON, YAML, XML, HTML, SVG, Markdown, code files, and more).
- `--temperature`, `-t` – creativity (default `0.7`).
- `--maxTokens`, `--max` – response limit (default `1000`).
- `--system`, `-s` – system prompt.
- `--format`, `-f`, `--output-format` – `text` (default), `json`, or `table`.
- `--output`, `-o` – write response to file.
- `--imageOutput`, `--image-output` – custom path for generated image (default: `generated-images/image-<timestamp>.png`).
- `--enableAnalytics` / `--enableEvaluation` – capture metrics & quality scores.
- `--evaluationDomain` – domain hint for the judge model.
- `--domainAware` – use domain-aware evaluation (default `false`).
- `--context` – JSON string appended to analytics/evaluation context.
- `--domain`, `-d` – domain type for specialized processing: `healthcare`, `finance`, `analytics`, `ecommerce`, `education`, `legal`, `technology`, `generic`, `auto`.
- `--disableTools` – bypass MCP tools for this call.
- `--timeout` – seconds before aborting the request (default `120`).
- `--region`, `-r` – Vertex AI region (e.g., `us-central1`, `europe-west1`, `asia-northeast1`).
- `--debug`, `-v`, `--verbose` – verbose logging and full JSON payloads.
- `--quiet`, `-q` – suppress non-essential output (default `true`).

**CSV Options:**

- `--csvMaxRows` – maximum number of CSV rows to process (default `1000`).
- `--csvFormat` – CSV output format: `raw` (default), `markdown`, `json`.

**Video Input (Analysis):**

- `--video` – attach video file for analysis (MP4, WebM, MOV, AVI, MKV).
- `--video-frames` – number of frames to extract (default `8`).
- `--video-quality` – frame quality 0–100 (default `85`).
- `--video-format` – frame format: `jpeg` (default) or `png`.
- `--transcribe-audio` – extract and transcribe audio from video (default `false`).

**Text-to-Speech (TTS):**

- `--tts` – enable text-to-speech output (default `false`).
- `--ttsVoice` – TTS voice to use (e.g., `en-US-Neural2-C`).
- `--ttsFormat` – audio output format: `mp3` (default), `wav`, `ogg`, `opus`.
- `--ttsSpeed` – speaking rate 0.25–4.0 (default `1.0`).
- `--ttsQuality` – audio quality level: `standard` (default) or `hd`.
- `--ttsOutput` – save TTS audio to file (supports absolute and relative paths).
- `--ttsPlay` – auto-play generated audio (default `false`).

**Extended Thinking:**

- `--thinking`, `--think` – enable extended thinking/reasoning capability (default `false`).
- `--thinkingBudget` – token budget for extended thinking (5000–100000, default `10000`). Supported by Anthropic Claude and Gemini 2.5+ models.
- `--thinkingLevel` – thinking level for Gemini 3 models: `minimal`, `low`, `medium`, `high`.

**File Input Examples:**

```bash
# Attach multiple file types
npx @juspay/neurolink generate "Analyze this data" \
  --file ./report.xlsx \
  --file ./config.yaml \
  --file ./diagram.svg

# Mix file types with images and PDFs
npx @juspay/neurolink generate "Compare architecture" \
  --file ./main.ts \
  --pdf ./spec.pdf \
  --image ./screenshot.png
```

See [File Processors Guide](../features/file-processors.md) for all 17+ supported file types.

**Video Generation (Veo 3.1):**

- `--outputMode` – output mode: `text` (default) or `video`.
- `--image` – path to input image file (required for video generation, e.g., ./input.jpg).
- `--videoOutput`, `-vo` – path to save generated video file.
- `--videoResolution` – `720p` or `1080p` (default `720p`).
- `--videoLength` – duration: `4`, `6`, or `8` seconds (default `4`).
- `--videoAspectRatio` – `9:16` (portrait) or `16:9` (landscape, default `16:9`).
- `--videoAudio` – include synchronized audio (default `true`).

**Note:** Video generation requires Vertex AI provider (`vertex`) and Veo 3.1 model (`veo-3.1`). The provider auto-switches to Vertex when `--outputMode video` is specified. Supported image formats: PNG, JPEG, WebP (max 20MB).

`gen` is a short alias with the same options.

### `stream <input>` {#stream}

```bash
npx @juspay/neurolink stream "Walk through the timeline" \
  --provider openai --model gpt-4o --enableEvaluation
```

`stream` shares the same flags as `generate` and adds chunked output for live UIs. Evaluation results are emitted after the stream completes when `--enableEvaluation` is set.

### `batch <file>` {#batch}

Process multiple prompts from a file in sequence.

```bash
# Process prompts from a file
npx @juspay/neurolink batch prompts.txt

# Export results as JSON
npx @juspay/neurolink batch questions.txt --format json

# Use Vertex AI with 2s delay between requests
npx @juspay/neurolink batch tasks.txt -p vertex --delay 2000

# Save results to file
npx @juspay/neurolink batch batch.txt --output results.json
```

`batch` shares the same flags as `generate`. The input file should contain one prompt per line. Results are returned as an array of `{ prompt, response }` objects. A default 1-second delay is applied between requests; override with `--delay <ms>`.

---

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

# Force start a new conversation (skip selection menu)
npx @juspay/neurolink loop --new

# Resume a specific conversation by session ID
npx @juspay/neurolink loop --resume abc123def456

# List available conversations and exit
npx @juspay/neurolink loop --list-conversations

# Use in-memory storage only
npx @juspay/neurolink loop --no-auto-redis
```

**Loop-specific flags:**

| Flag                           | Alias | Type    | Default | Description                                           |
| ------------------------------ | ----- | ------- | ------- | ----------------------------------------------------- |
| `--enable-conversation-memory` |       | boolean | true    | Enable conversation memory for the loop session       |
| `--max-sessions`               |       | number  | 50      | Maximum number of conversation sessions to keep       |
| `--max-turns-per-session`      |       | number  | 20      | Maximum turns per conversation session                |
| `--auto-redis`                 |       | boolean | true    | Automatically use Redis if available                  |
| `--resume`                     | `-r`  | string  |         | Directly resume a specific conversation by session ID |
| `--new`                        | `-n`  | boolean |         | Force start a new conversation (skip selection menu)  |
| `--list-conversations`         | `-l`  | boolean |         | List available conversations and exit                 |
| `--compact-threshold`          |       | number  | 0.8     | Context compaction trigger threshold (0.0–1.0)        |
| `--disable-compaction`         |       | boolean | false   | Disable automatic context compaction                  |

**Key capabilities:**

- Run any CLI command without restarting session
- Persistent session variables: `set provider openai`, `set temperature 0.9`
- Conversation memory: AI remembers previous turns within session
- Redis auto-detection: Automatically connects if `REDIS_URL` is set
- Export session history as JSON for analytics
- Automatic context compaction when usage exceeds threshold

**Session management commands (inside loop):**

| Command             | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `help`              | Show all available loop mode commands and standard CLI help. |
| `set <key> <value>` | Set a session variable. Use `set help` for available keys.   |
| `get <key>`         | Show current value of a session variable.                    |
| `unset <key>`       | Remove a session variable.                                   |
| `show`              | Display all currently set session variables.                 |
| `clear`             | Reset all session variables.                                 |
| `exit`              | Exit loop session. Aliases: `quit`, `:q`.                    |

**Settable session variables (via `set`):**

| Variable              | Type    | Description                                                | Allowed Values                                                         |
| --------------------- | ------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `provider`            | string  | The AI provider to use.                                    | `openai`, `anthropic`, `google-ai`, `vertex`, `bedrock`, `azure`, etc. |
| `model`               | string  | The specific model to use from the provider.               | Any valid model name                                                   |
| `temperature`         | number  | Controls randomness of the output (e.g., 0.2, 0.8).        |                                                                        |
| `maxTokens`           | number  | The maximum number of tokens to generate.                  |                                                                        |
| `output`              | string  | AI response format value.                                  | `text`, `json`, `structured`, `none`                                   |
| `systemPrompt`        | string  | The system prompt to guide the AI's behavior.              |                                                                        |
| `timeout`             | number  | Timeout for the generation request in milliseconds.        |                                                                        |
| `disableTools`        | boolean | Disable all tool usage for the AI.                         |                                                                        |
| `maxSteps`            | number  | Maximum number of tool execution steps.                    |                                                                        |
| `enableAnalytics`     | boolean | Enable or disable analytics for responses.                 |                                                                        |
| `enableEvaluation`    | boolean | Enable or disable AI-powered evaluation of responses.      |                                                                        |
| `evaluationDomain`    | string  | Domain expertise for evaluation.                           |                                                                        |
| `toolUsageContext`    | string  | Context about tools/MCPs used in the interaction.          |                                                                        |
| `enableSummarization` | boolean | Enable automatic conversation summarization.               |                                                                        |
| `thinking`            | boolean | Enable extended thinking/reasoning capability.             |                                                                        |
| `thinkingBudget`      | number  | Token budget for thinking (Anthropic models: 5000–100000). |                                                                        |
| `thinkingLevel`       | string  | Thinking level for Gemini 3 models.                        | `minimal`, `low`, `medium`, `high`                                     |

**Context Budget Warnings:**

During a loop session, NeuroLink monitors context window usage after each generation command:

- **60% used (gray):** A subtle status line is shown: `Context: 62% used`.
- **80% used (yellow):** A prominent warning with token counts is shown:
  ```
  Context usage: 83% of window (12,450 / 15,000 tokens)
  Auto-compaction will trigger to preserve conversation quality.
  ```
  When `--disable-compaction` is not set, the system automatically compacts the context to free up space while preserving conversation quality.

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

See [MCP HTTP Transport Guide](../mcp-http-transport.md) for complete configuration options.

### `batch`

See [`batch <file>`](#batch) above.

### `get-best-provider`

Show the best available AI provider based on current configuration and availability.

```bash
# Get best available provider
npx @juspay/neurolink get-best-provider

# Get provider as JSON
npx @juspay/neurolink get-best-provider --format json

# Just the provider name
npx @juspay/neurolink get-best-provider --quiet
```

### `ollama <command>`

Manage Ollama local AI models. Requires Ollama to be installed on the local machine.

```bash
# List installed models
npx @juspay/neurolink ollama list-models

# Download a model
npx @juspay/neurolink ollama pull llama3

# Remove a model
npx @juspay/neurolink ollama remove llama3

# Check Ollama service status
npx @juspay/neurolink ollama status

# Start/stop Ollama service
npx @juspay/neurolink ollama start
npx @juspay/neurolink ollama stop

# Interactive Ollama setup
npx @juspay/neurolink ollama setup
```

**Subcommands:**

| Subcommand       | Description                  |
| ---------------- | ---------------------------- |
| `list-models`    | List installed Ollama models |
| `pull <model>`   | Download an Ollama model     |
| `remove <model>` | Remove an Ollama model       |
| `status`         | Check Ollama service status  |
| `start`          | Start Ollama service         |
| `stop`           | Stop Ollama service          |
| `setup`          | Interactive Ollama setup     |

### `sagemaker <command>`

Manage Amazon SageMaker AI models and endpoints.

```bash
# Check SageMaker configuration and connectivity
npx @juspay/neurolink sagemaker status

# Test connectivity to an endpoint
npx @juspay/neurolink sagemaker test my-endpoint

# List available endpoints
npx @juspay/neurolink sagemaker list-endpoints

# Show current SageMaker configuration
npx @juspay/neurolink sagemaker config

# Interactive setup
npx @juspay/neurolink sagemaker setup

# Validate configuration and credentials
npx @juspay/neurolink sagemaker validate

# Run performance benchmark
npx @juspay/neurolink sagemaker benchmark my-endpoint
```

**Subcommands:**

| Subcommand             | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `status`               | Check SageMaker configuration and connectivity   |
| `test <endpoint>`      | Test connectivity to a SageMaker endpoint        |
| `list-endpoints`       | List available SageMaker endpoints               |
| `config`               | Show current SageMaker configuration             |
| `setup`                | Interactive SageMaker configuration setup        |
| `validate`             | Validate SageMaker configuration and credentials |
| `benchmark <endpoint>` | Run performance benchmark against endpoint       |

### `completion`

Generate a shell completion script for bash.

```bash
# Generate shell completion
npx @juspay/neurolink completion

# Save completion script
npx @juspay/neurolink completion > ~/.neurolink-completion.sh

# Enable completions (bash)
source ~/.neurolink-completion.sh
```

Add the completion script to your shell profile for persistent completions.

---

## `serve`

Start the NeuroLink HTTP server in foreground mode.

### Usage

```bash
neurolink serve [options]
```

### Options

| Option        | Alias | Type    | Default | Description                                              |
| ------------- | ----- | ------- | ------- | -------------------------------------------------------- |
| `--port`      | `-p`  | number  | 3000    | Port to listen on                                        |
| `--host`      | `-H`  | string  | 0.0.0.0 | Host to bind to                                          |
| `--framework` | `-f`  | string  | hono    | Web framework: hono, express, fastify, koa               |
| `--basePath`  |       | string  | /api    | Base path for all routes                                 |
| `--cors`      |       | boolean | true    | Enable CORS                                              |
| `--rateLimit` |       | number  | 100     | Rate limit (requests per 15-minute window, 0 to disable) |
| `--swagger`   |       | boolean | false   | Enable Swagger UI and OpenAPI endpoints                  |
| `--watch`     | `-w`  | boolean | false   | Enable watch mode                                        |
| `--config`    | `-c`  | string  |         | Path to config file                                      |

### Swagger/OpenAPI Endpoints

When `--swagger` is enabled, these endpoints become available:

| Endpoint                | Description                              |
| ----------------------- | ---------------------------------------- |
| `GET /api/openapi.json` | OpenAPI 3.1 specification in JSON format |
| `GET /api/openapi.yaml` | OpenAPI 3.1 specification in YAML format |
| `GET /api/docs`         | Interactive Swagger UI documentation     |

> **Note:** Disable with `--no-swagger` in production to avoid exposing API structure.

### Examples

```bash
# Start with defaults
neurolink serve

# Start on specific port with Express
neurolink serve --port 8080 --framework express

# Start with custom config file
neurolink serve --config ./server.config.json
```

---

## `server <subcommand>`

Manage NeuroLink HTTP server for exposing AI agents as REST APIs.

### Subcommands

| Subcommand | Description                         |
| ---------- | ----------------------------------- |
| `start`    | Start the HTTP server in background |
| `stop`     | Stop the running server             |
| `status`   | Show server status                  |
| `routes`   | List all registered routes          |
| `config`   | Show or modify server configuration |
| `openapi`  | Generate OpenAPI specification      |

---

### `server start`

Start the HTTP server in background mode.

```bash
neurolink server start [options]
```

| Option        | Alias | Type    | Default | Description                                              |
| ------------- | ----- | ------- | ------- | -------------------------------------------------------- |
| `--port`      | `-p`  | number  | 3000    | Port to listen on                                        |
| `--host`      | `-H`  | string  | 0.0.0.0 | Host to bind to                                          |
| `--framework` | `-f`  | string  | hono    | Framework: hono, express, fastify, koa                   |
| `--basePath`  |       | string  | /api    | Base path for all routes                                 |
| `--cors`      |       | boolean | true    | Enable CORS                                              |
| `--rateLimit` |       | number  | 100     | Rate limit (requests per 15-minute window, 0 to disable) |

**Examples:**

```bash
# Start with defaults
neurolink server start

# Start on port 8080 with Express
neurolink server start -p 8080 --framework express
```

---

### `server stop`

Stop a running background server.

```bash
neurolink server stop [options]
```

| Option    | Type    | Default | Description                                 |
| --------- | ------- | ------- | ------------------------------------------- |
| `--force` | boolean | false   | Force stop even if server is not responding |

**Examples:**

```bash
# Stop gracefully
neurolink server stop

# Force stop
neurolink server stop --force
```

---

### `server status`

Show server status information.

```bash
neurolink server status [options]
```

| Option     | Type   | Default | Description               |
| ---------- | ------ | ------- | ------------------------- |
| `--format` | string | text    | Output format: text, json |

**Examples:**

```bash
# Text output
neurolink server status

# JSON output for scripting
neurolink server status --format json
```

---

### `server routes`

List all registered server routes.

```bash
neurolink server routes [options]
```

| Option     | Type   | Default | Description                                                  |
| ---------- | ------ | ------- | ------------------------------------------------------------ |
| `--format` | string | table   | Output format: text, json, table                             |
| `--group`  | string | all     | Filter by route group: agent, tool, mcp, memory, health, all |
| `--method` | string | all     | Filter by HTTP method: GET, POST, PUT, DELETE, PATCH, all    |

**Examples:**

```bash
# List all routes in table format
neurolink server routes

# List only agent routes
neurolink server routes --group agent

# List all POST endpoints as JSON
neurolink server routes --method POST --format json
```

---

### `server config`

Show or modify server configuration.

```bash
neurolink server config [options]
```

| Option     | Type    | Default | Description                            |
| ---------- | ------- | ------- | -------------------------------------- |
| `--get`    | string  |         | Get a specific config value            |
| `--set`    | string  |         | Set a config value (format: key=value) |
| `--reset`  | boolean | false   | Reset configuration to defaults        |
| `--format` | string  | text    | Output format: text, json              |

**Examples:**

```bash
# Show all configuration
neurolink server config

# Get specific value
neurolink server config --get defaultPort

# Set a value
neurolink server config --set defaultPort=8080

# Reset to defaults
neurolink server config --reset
```

---

### `server openapi`

Generate OpenAPI specification.

```bash
neurolink server openapi [options]
```

| Option       | Alias | Type   | Default | Description               |
| ------------ | ----- | ------ | ------- | ------------------------- |
| `--output`   | `-o`  | string | stdout  | Output file path          |
| `--format`   |       | string | json    | Output format: json, yaml |
| `--basePath` |       | string | /api    | Base path for all routes  |
| `--title`    |       | string |         | API title                 |
| `--version`  |       | string |         | API version               |

**Examples:**

```bash
# Generate to stdout
neurolink server openapi

# Save to file
neurolink server openapi -o openapi.json

# Generate YAML format
neurolink server openapi --format yaml -o openapi.yaml
```

## Global Flags (available on every command)

| Flag                        | Alias                   | Default | Description                                                               |
| --------------------------- | ----------------------- | ------- | ------------------------------------------------------------------------- |
| `--provider`                | `-p`                    | `auto`  | AI provider to use (auto-selects best available).                         |
| `--model`                   | `-m`                    |         | Specific model to use.                                                    |
| `--temperature`             | `-t`                    | `0.7`   | Creativity level (0.0 = focused, 1.0 = creative).                         |
| `--maxTokens`               | `--max`                 | `1000`  | Maximum tokens to generate.                                               |
| `--system`                  | `-s`                    |         | System prompt to guide AI behavior.                                       |
| `--format`                  | `-f`, `--output-format` | `text`  | Output format: `text`, `json`, `table`.                                   |
| `--output`                  | `-o`                    |         | Save output to file.                                                      |
| `--configFile <path>`       |                         |         | Use a specific configuration file.                                        |
| `--dryRun`                  |                         | `false` | Generate without calling providers (returns mocked analytics/evaluation). |
| `--noColor`                 |                         | `false` | Disable ANSI colours.                                                     |
| `--delay <ms>`              |                         |         | Delay between batched operations.                                         |
| `--domain <slug>`           | `-d`                    |         | Domain type for specialized processing and optimization.                  |
| `--toolUsageContext <text>` |                         |         | Describe expected tool usage for better evaluation feedback.              |
| `--debug`                   | `-v`, `--verbose`       | `false` | Enable debug mode with verbose output.                                    |
| `--quiet`                   | `-q`                    | `true`  | Suppress non-essential output.                                            |
| `--timeout`                 |                         | `120`   | Maximum execution time in seconds.                                        |
| `--disableTools`            |                         | `false` | Disable MCP tool integration.                                             |
| `--enableAnalytics`         |                         | `false` | Enable usage analytics collection.                                        |
| `--enableEvaluation`        |                         | `false` | Enable AI response quality evaluation.                                    |
| `--region`                  | `-r`                    |         | Vertex AI region (e.g., `us-central1`).                                   |

## JSON-Friendly Automation

- `--format json` returns structured output including analytics, evaluation, tool calls, and response metadata.
- Combine with `--enableAnalytics --enableEvaluation` to capture usage costs and quality scores in automation pipelines.
- Use `--output <file>` to persist raw responses alongside JSON logs.

## rag \<subcommand\>

Document processing and RAG pipeline commands.

| Subcommand | Description                                 |
| ---------- | ------------------------------------------- |
| `chunk`    | Chunk a document using a specified strategy |
| `index`    | Index documents into a vector store         |
| `query`    | Query indexed documents                     |

### rag chunk

Chunk a document file into smaller pieces for RAG processing.

```bash
neurolink rag chunk <file> [options]
```

| Option            | Alias | Type   | Default     | Description                |
| ----------------- | ----- | ------ | ----------- | -------------------------- |
| `--strategy`      | `-s`  | string | `recursive` | Chunking strategy          |
| `--chunk-size`    |       | number | `1000`      | Maximum chunk size         |
| `--chunk-overlap` |       | number | `200`       | Overlap between chunks     |
| `--output`        | `-o`  | string | stdout      | Output file path           |
| `--format`        | `-f`  | string | `text`      | Output format (text, json) |

**Chunking Strategies:** `character`, `recursive`, `sentence`, `token`, `markdown`, `html`, `json`, `latex`, `semantic`, `semantic-markdown`

**Examples:**

```bash
# Default chunking
neurolink rag chunk ./docs/guide.md

# Markdown-aware chunking with JSON output
neurolink rag chunk ./docs/guide.md --strategy markdown --format json

# Custom size and overlap
neurolink rag chunk ./docs/guide.md --chunk-size 512 --chunk-overlap 50 --output chunks.json
```

### RAG Flags on generate/stream

RAG can also be used directly with `generate` and `stream` commands via `--rag-files`:

```bash
neurolink generate "What is this about?" --rag-files ./docs/guide.md
neurolink stream "Summarize" --rag-files ./docs/a.md ./docs/b.md --rag-top-k 10
```

| Flag                  | Type     | Default       | Description                         |
| --------------------- | -------- | ------------- | ----------------------------------- |
| `--rag-files`         | string[] | -             | File paths to load for RAG context  |
| `--rag-strategy`      | string   | auto-detected | Chunking strategy for RAG documents |
| `--rag-chunk-size`    | number   | 1000          | Maximum chunk size in characters    |
| `--rag-chunk-overlap` | number   | 200           | Overlap between adjacent chunks     |
| `--rag-top-k`         | number   | 5             | Number of top results to retrieve   |

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
- [Configuration Guide](../configuration.md) – Environment variables and config files
- [Troubleshooting](../troubleshooting.md) – Detailed error solutions
