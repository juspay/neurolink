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

| Command               | Description                                                      | Example                                                                     |
| --------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `generate` / `gen`    | One-shot content generation with optional multimodal input.      | `npx @juspay/neurolink generate "Draft release notes" --image ./before.png` |
| `stream`              | Real-time streaming output with tool support.                    | `npx @juspay/neurolink stream "Narrate sprint demo" --enableAnalytics`      |
| `batch`               | Process multiple prompts from a file.                            | `npx @juspay/neurolink batch prompts.txt --format json`                     |
| `loop`                | Interactive session with persistent variables & memory.          | `npx @juspay/neurolink loop --auto-redis`                                   |
| `auth <subcommand>`   | Manage provider authentication (API key or OAuth).               | `npx @juspay/neurolink auth login anthropic --method oauth`                 |
| `setup` / `s`         | Guided provider onboarding and validation.                       | `npx @juspay/neurolink setup --provider openai`                             |
| `status`              | Health check for configured providers.                           | `npx @juspay/neurolink status --verbose`                                    |
| `get-best-provider`   | Show the best available AI provider.                             | `npx @juspay/neurolink get-best-provider --format json`                     |
| `models list`         | Inspect available models and capabilities.                       | `npx @juspay/neurolink models list --capability vision`                     |
| `config <subcommand>` | Initialise, validate, export, or reset configuration.            | `npx @juspay/neurolink config validate`                                     |
| `memory <subcommand>` | View, export, or clear conversation history.                     | `npx @juspay/neurolink memory history NL_x3yr --format json`                |
| `mcp <subcommand>`    | Manage Model Context Protocol servers/tools.                     | `npx @juspay/neurolink mcp list`                                            |
| `ollama <subcommand>` | Manage Ollama local AI models.                                   | `npx @juspay/neurolink ollama list-models`                                  |
| `sagemaker <command>` | Manage Amazon SageMaker endpoints and models.                    | `npx @juspay/neurolink sagemaker status`                                    |
| `server <subcommand>` | Manage NeuroLink HTTP server                                     | `npx @juspay/neurolink server start --port 3000`                            |
| `serve`               | Start server in foreground mode                                  | `npx @juspay/neurolink serve --port 3000`                                   |
| `proxy <subcommand>`  | Manage the Claude multi-account proxy and its local telemetry.   | `npx @juspay/neurolink proxy telemetry setup`                               |
| `rag <subcommand>`    | RAG document processing (chunk, index, query).                   | `npx @juspay/neurolink rag chunk ./docs/guide.md`                           |
| `workflow <sub>`      | Manage and execute AI workflows.                                 | `npx @juspay/neurolink workflow list`                                       |
| `observability`       | Observability and telemetry management (aliases: `obs`, `otel`). | `npx @juspay/neurolink observability status`                                |
| `telemetry`           | Telemetry and exporter management (alias: `tel`).                | `npx @juspay/neurolink telemetry status`                                    |
| `docs`                | Start the NeuroLink documentation MCP server.                    | `npx @juspay/neurolink docs --transport http --port 3001`                   |
| `validate`            | Alias for `config validate`.                                     | `npx @juspay/neurolink validate`                                            |
| `completion`          | Generate shell completion script.                                | `npx @juspay/neurolink completion > ~/.neurolink-completion.sh`             |

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
- `--thinkingLevel` – thinking level for extended reasoning (Anthropic Claude, Gemini 2.5+, Gemini 3): `minimal`, `low`, `medium`, `high`.

**Anthropic Subscription Options:**

- `--auth-method` – authentication method: `api-key` or `oauth`. Overrides auto-detection.
- `--subscription-tier` – subscription tier: `free`, `pro`, `max`, `max_5`, `max_20`, or `api`. Overrides auto-detection from token/env.
- `--enable-beta` – enable Anthropic beta features (experimental capabilities, computer use, etc.). Default `false`.

```bash
# Generate with explicit subscription tier
npx @juspay/neurolink generate "Explain quantum computing" \
  --provider anthropic --subscription-tier pro

# Generate with OAuth auth method
npx @juspay/neurolink generate "Write a poem" \
  --provider anthropic --authMethod oauth --enableBeta

# Stream with max tier
npx @juspay/neurolink stream "Tell me a story" \
  --provider anthropic --subscriptionTier max
```

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

**Presentation Generation (PPT):**

- `--outputMode ppt` – switch to presentation generation mode. Alternatively, any `--ppt*` flag automatically activates PPT mode.
- `--pptPages`, `--pages` – number of slides to generate (5-50, default `10` when PPT mode is enabled).
- `--pptTheme` – presentation theme/style: `modern`, `corporate`, `creative`, `minimal`, `dark` (default: AI selects based on topic).
- `--pptAudience` – target audience: `business`, `students`, `technical`, `general` (default: AI selects based on topic).
- `--pptTone` – presentation tone: `professional`, `casual`, `educational`, `persuasive` (default: AI selects based on topic).
- `--pptOutput`, `--po` – path to save generated PPTX file (e.g., `./output.pptx`).
- `--pptAspectRatio` – slide aspect ratio: `16:9` or `4:3` (default: `16:9` when PPT mode is enabled).
- `--pptNoImages` – disable AI image generation for slides (default `false`).

```bash
# Generate a presentation
npx @juspay/neurolink generate "Quarterly business review for Q4 2025" \
  --outputMode ppt --pptPages 15 --pptTheme corporate --pptOutput ./q4-review.pptx

# Generate with audience and tone
npx @juspay/neurolink generate "Introduction to machine learning" \
  --pptPages 20 --pptAudience students --pptTone educational --pptOutput ./ml-intro.pptx

# Minimal presentation without AI images
npx @juspay/neurolink generate "Project status update" \
  --outputMode ppt --pptNoImages --pptOutput ./status.pptx
```

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
| `thinkingLevel`       | string  | Thinking level (Anthropic Claude, Gemini 2.5+, Gemini 3).  | `minimal`, `low`, `medium`, `high`                                     |

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

### `auth <subcommand>` {#auth}

Manage authentication with AI providers. Supports traditional API key authentication and OAuth 2.1 with PKCE for Claude subscription plans (Pro/Max).

```bash
# Interactive login (prompts for authentication method)
npx @juspay/neurolink auth login anthropic

# Login with a specific method
npx @juspay/neurolink auth login anthropic --method api-key
npx @juspay/neurolink auth login anthropic --method oauth
npx @juspay/neurolink auth login anthropic --method create-api-key

# Check authentication status for all providers
npx @juspay/neurolink auth status

# Check status for a specific provider
npx @juspay/neurolink auth status anthropic

# Refresh expired OAuth tokens
npx @juspay/neurolink auth refresh anthropic

# Clear stored credentials
npx @juspay/neurolink auth logout anthropic
```

**Subcommands:**

| Subcommand           | Description                                        |
| -------------------- | -------------------------------------------------- |
| `login <provider>`   | Authenticate with an AI provider                   |
| `logout <provider>`  | Clear stored credentials for a provider            |
| `status [provider]`  | Show authentication status (all providers if none) |
| `refresh <provider>` | Manually refresh OAuth tokens for a provider       |

**Login flags:**

| Flag                | Alias | Type    | Default | Description                                                    |
| ------------------- | ----- | ------- | ------- | -------------------------------------------------------------- |
| `--method`          | `-m`  | string  |         | Authentication method: `api-key`, `oauth`, or `create-api-key` |
| `--non-interactive` |       | boolean | `false` | Skip interactive prompts (requires environment variables)      |

**Shared flags:**

| Flag       | Alias | Type    | Default | Description                   |
| ---------- | ----- | ------- | ------- | ----------------------------- |
| `--format` |       | string  | `text`  | Output format: `text`, `json` |
| `--quiet`  | `-q`  | boolean | `false` | Suppress non-essential output |
| `--debug`  |       | boolean | `false` | Enable debug output           |

**Authentication methods:**

- **`api-key`** -- Traditional API key authentication. Prompts for your Anthropic API key and stores it in the project `.env` file. Best for API-billed usage.
- **`oauth`** -- Direct OAuth 2.1 with PKCE. Opens a browser for Claude subscription (Pro/Max) authorization. Tokens are stored securely in `~/.neurolink/` and auto-refreshed. Experimental.
- **`create-api-key`** -- OAuth-based API key creation (recommended for Claude Pro/Max). Authenticates via OAuth, then creates a standard API key through the Anthropic console. Combines the convenience of OAuth login with standard API key compatibility.

**Supported providers:** `anthropic`

**Status output:**

`auth status` displays the authentication method, subscription tier (free/pro/max/api), token expiry, and refresh token availability for each configured provider. Use `--format json` for machine-readable output.

**Examples (local development):**

```bash
# Interactive authentication (choose method via prompt)
pnpm run cli -- auth login anthropic

# Authenticate using OAuth for Claude Pro/Max subscription
pnpm run cli -- auth login anthropic --method oauth

# Create an API key via OAuth (recommended for Claude Pro/Max)
pnpm run cli -- auth login anthropic --method create-api-key

# Use a traditional API key
pnpm run cli -- auth login anthropic --method api-key

# Non-interactive login (reads ANTHROPIC_API_KEY from environment)
pnpm run cli -- auth login anthropic --method api-key --non-interactive

# Show status for all providers
pnpm run cli -- auth status

# Show status as JSON (for scripting)
pnpm run cli -- auth status --format json

# Refresh expired OAuth tokens
pnpm run cli -- auth refresh anthropic

# Clear all stored credentials for Anthropic
pnpm run cli -- auth logout anthropic
```

**Credential storage:**

- API keys are saved to the project `.env` file as `ANTHROPIC_API_KEY`.
- OAuth tokens are stored in `~/.neurolink/<provider>-credentials.json` with restricted file permissions.
- The `logout` subcommand clears both stored credentials and offers to remove the key from `.env`.

See also: [Claude Subscription Guide](../features/claude-subscription.md) | [Provider Setup Guide](../getting-started/provider-setup.md)

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

Manage and discover AI models across all providers.

```bash
# List all models for a provider
npx @juspay/neurolink models list --provider google-ai

# Filter by capability
npx @juspay/neurolink models list --capability vision --format table
```

**Subcommands:**

| Subcommand           | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `list`               | List available models with filtering options         |
| `search [query]`     | Search models by capabilities, use case, or features |
| `best`               | Get the best model recommendation for your use case  |
| `resolve <model>`    | Resolve model aliases and find exact model names     |
| `compare <models..>` | Compare multiple models side by side                 |
| `stats`              | Show model registry statistics and insights          |

**Global models options:**

| Option     | Type    | Default | Description                               |
| ---------- | ------- | ------- | ----------------------------------------- |
| `--format` | string  | `table` | Output format: `table`, `json`, `compact` |
| `--output` | string  |         | Save output to file                       |
| `--quiet`  | boolean | `false` | Suppress non-essential output             |
| `--debug`  | boolean | `false` | Enable debug output                       |

#### `models list`

```bash
npx @juspay/neurolink models list [options]
```

| Option         | Type    | Default | Description                                                                                                                        |
| -------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--provider`   | string  |         | Filter by AI provider                                                                                                              |
| `--category`   | string  |         | Filter by model category: `general`, `coding`, `creative`, `vision`, `reasoning`                                                   |
| `--capability` | array   |         | Filter by required capabilities: `vision`, `functionCalling`, `codeGeneration`, `reasoning`, `multimodal`, `streaming`, `jsonMode` |
| `--deprecated` | boolean | `false` | Include deprecated models                                                                                                          |

```bash
npx @juspay/neurolink models list --provider openai
npx @juspay/neurolink models list --capability vision
npx @juspay/neurolink models list --category coding
```

#### `models search [query]`

Search models by capabilities, use case, or features.

```bash
npx @juspay/neurolink models search [query] [options]
```

| Option          | Type   | Default | Description                                                                                                               |
| --------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--use-case`    | string |         | Filter by primary use case: `coding`, `creative`, `analysis`, `conversation`, `reasoning`, `translation`, `summarization` |
| `--max-cost`    | number |         | Maximum cost per 1K tokens (USD)                                                                                          |
| `--min-context` | number |         | Minimum context window size (tokens)                                                                                      |
| `--max-context` | number |         | Maximum context window size (tokens)                                                                                      |
| `--performance` | string |         | Required performance level: `fast`, `medium`, `slow`, `high`, `low`                                                       |

```bash
npx @juspay/neurolink models search vision
npx @juspay/neurolink models search --use-case coding --max-cost 0.01
npx @juspay/neurolink models search --min-context 100000
```

#### `models best`

Get the best model recommendation for your use case.

```bash
npx @juspay/neurolink models best [options]
```

| Option                       | Type    | Description                                  |
| ---------------------------- | ------- | -------------------------------------------- |
| `--coding`                   | boolean | Optimize for code generation and programming |
| `--creative`                 | boolean | Optimize for creative writing and content    |
| `--analysis`                 | boolean | Optimize for data analysis and research      |
| `--conversation`             | boolean | Optimize for conversational interactions     |
| `--reasoning`                | boolean | Optimize for logical reasoning tasks         |
| `--translation`              | boolean | Optimize for language translation            |
| `--summarization`            | boolean | Optimize for text summarization              |
| `--cost-effective`           | boolean | Prioritize cost-effectiveness                |
| `--high-quality`             | boolean | Prioritize output quality over cost          |
| `--fast`                     | boolean | Prioritize response speed                    |
| `--require-vision`           | boolean | Require vision/image processing capability   |
| `--require-function-calling` | boolean | Require function calling capability          |
| `--exclude-providers`        | array   | Exclude specific providers                   |
| `--prefer-local`             | boolean | Prefer local/offline models                  |

```bash
npx @juspay/neurolink models best --coding
npx @juspay/neurolink models best --cost-effective --require-vision
npx @juspay/neurolink models best --fast --exclude-providers ollama
```

#### `models resolve <model>`

Resolve model aliases and find exact model names.

```bash
npx @juspay/neurolink models resolve <model> [options]
```

| Option    | Type    | Default | Description                             |
| --------- | ------- | ------- | --------------------------------------- |
| `--fuzzy` | boolean | `true`  | Enable fuzzy matching for partial names |

```bash
npx @juspay/neurolink models resolve claude-latest
npx @juspay/neurolink models resolve gpt4
npx @juspay/neurolink models resolve fastest
```

#### `models compare <models..>`

Compare multiple models side by side.

```bash
npx @juspay/neurolink models compare <models..>
```

```bash
npx @juspay/neurolink models compare gpt-4o claude-3.5-sonnet gemini-2.5-pro
npx @juspay/neurolink models compare fastest cheapest best-coding
```

#### `models stats`

Show model registry statistics and insights.

```bash
npx @juspay/neurolink models stats [options]
```

| Option       | Type    | Default | Description                              |
| ------------ | ------- | ------- | ---------------------------------------- |
| `--detailed` | boolean | `false` | Show detailed statistics with breakdowns |

```bash
npx @juspay/neurolink models stats
npx @juspay/neurolink models stats --detailed
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
npx @juspay/neurolink mcp add webserver "node server.js" --transport sse

# Test server connectivity
npx @juspay/neurolink mcp test myserver

# Remove a server
npx @juspay/neurolink mcp remove myserver
```

**MCP Command Options (`mcp add`):**

| Option        | Description                                         |
| ------------- | --------------------------------------------------- |
| `--transport` | Transport type: `stdio`, `http`, `sse`, `websocket` |
| `--args`      | Command arguments (array)                           |
| `--env`       | Environment variables (JSON string)                 |

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

## proxy \<subcommand\>

Manage the Claude multi-account proxy server and the local OpenObserve stack used for proxy observability.

```bash
# Start the proxy on the default port
npx @juspay/neurolink proxy start

# Check live proxy status
npx @juspay/neurolink proxy status --format json

# Bring up OpenObserve + OTEL collector + dashboard
npx @juspay/neurolink proxy telemetry setup
```

**Subcommands:**

| Subcommand           | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `start`              | Start the Claude multi-account proxy in the foreground                     |
| `status`             | Show live proxy status, including attempts vs completed requests           |
| `telemetry <action>` | Manage the local OpenObserve stack and maintained dashboard for the proxy  |
| `setup`              | One-command onboarding: auth + service install + Claude Code configuration |
| `install`            | Install the proxy as a persistent background service                       |
| `uninstall`          | Remove the persistent background service                                   |

### proxy start

```bash
npx @juspay/neurolink proxy start
npx @juspay/neurolink proxy start --port 8080 --strategy fill-first
npx @juspay/neurolink proxy start --config ./proxy-config.yaml --env-file ./proxy.env
```

| Option              | Alias | Type    | Default                          | Description                                               |
| ------------------- | ----- | ------- | -------------------------------- | --------------------------------------------------------- |
| `--port`            | `-p`  | number  | `55669`                          | Port to listen on                                         |
| `--host`            | `-H`  | string  | `127.0.0.1`                      | Host to bind to                                           |
| `--strategy`        | `-s`  | string  | `fill-first`                     | Account selection strategy: `fill-first` or `round-robin` |
| `--health-interval` |       | number  | `30`                             | Health check interval in seconds                          |
| `--config`          | `-c`  | string  | `~/.neurolink/proxy-config.yaml` | Path to proxy config file                                 |
| `--env-file`        |       | string  |                                  | Path to proxy provider env file                           |
| `--passthrough`     |       | boolean | `false`                          | Transparent forwarding: no retry, rotation, or polyfill   |
| `--debug`           | `-d`  | boolean | `false`                          | Enable debug output                                       |
| `--quiet`           | `-q`  | boolean | `false`                          | Suppress non-essential output                             |

### proxy status

```bash
npx @juspay/neurolink proxy status
npx @juspay/neurolink proxy status --format json
```

| Option     | Alias | Type    | Default | Description                     |
| ---------- | ----- | ------- | ------- | ------------------------------- |
| `--format` |       | string  | `text`  | Output format: `text` or `json` |
| `--quiet`  | `-q`  | boolean | `false` | Suppress non-essential output   |

### proxy telemetry \<action\>

Manage the repo-owned local OpenObserve stack in `scripts/observability/`.

```bash
npx @juspay/neurolink proxy telemetry setup
npx @juspay/neurolink proxy telemetry status
npx @juspay/neurolink proxy telemetry logs
```

| Action             | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| `setup`            | Start OpenObserve + OTEL collector and import the maintained dashboard  |
| `start`            | Start the local telemetry stack without re-importing the dashboard      |
| `stop`             | Stop the local telemetry stack                                          |
| `status`           | Show local stack health and endpoint info                               |
| `logs`             | Follow OpenObserve and collector logs                                   |
| `import-dashboard` | Re-import the dashboard and dedupe older dashboards with the same title |

| Option    | Alias | Type    | Default | Description                                          |
| --------- | ----- | ------- | ------- | ---------------------------------------------------- |
| `--quiet` | `-q`  | boolean | `false` | Suppress the local CLI spinner and delegate directly |

### proxy setup

```bash
npx @juspay/neurolink proxy setup
npx @juspay/neurolink proxy setup --no-service
npx @juspay/neurolink proxy setup --port 9000 --method oauth
```

| Option         | Alias | Type    | Default | Description                                              |
| -------------- | ----- | ------- | ------- | -------------------------------------------------------- |
| `--port`       | `-p`  | number  | `55669` | Proxy port                                               |
| `--method`     |       | string  | `oauth` | Auth method: `oauth` or `api-key`                        |
| `--no-service` |       | boolean | `false` | Skip service installation and start in foreground        |
| `--env-file`   |       | string  |         | Path to proxy provider env file to persist for the proxy |

### proxy install

```bash
npx @juspay/neurolink proxy install
npx @juspay/neurolink proxy install --port 9000 --host 0.0.0.0
```

| Option       | Alias | Type   | Default     | Description                                                  |
| ------------ | ----- | ------ | ----------- | ------------------------------------------------------------ |
| `--port`     | `-p`  | number | `55669`     | Proxy port                                                   |
| `--host`     |       | string | `127.0.0.1` | Proxy host                                                   |
| `--env-file` |       | string |             | Path to proxy provider env file to persist for the service   |
| `--config`   |       | string |             | Path to proxy routing config file to persist for the service |

### proxy uninstall

```bash
npx @juspay/neurolink proxy uninstall
```

For the full operational guide, routing model, and the maintained OpenObserve dashboard, see [Claude Proxy](../features/claude-proxy.md) and [Claude Proxy Observability](../features/claude-proxy-observability.md).

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

| Option       | Alias | Type    | Default     | Description                                         |
| ------------ | ----- | ------- | ----------- | --------------------------------------------------- |
| `--strategy` | `-s`  | string  | `recursive` | Chunking strategy                                   |
| `--maxSize`  | `-m`  | number  | `1000`      | Maximum chunk size                                  |
| `--overlap`  | `-o`  | number  | `200`       | Overlap between chunks                              |
| `--format`   | `-f`  | string  | `text`      | Output format: `text`, `json`, `table`              |
| `--output`   |       | string  | stdout      | Output file path                                    |
| `--extract`  | `-e`  | boolean | `false`     | Extract metadata (title, summary, keywords) via LLM |
| `--provider` | `-p`  | string  |             | Provider for semantic chunking/metadata extraction  |
| `--model`    |       | string  |             | Model for semantic chunking/metadata extraction     |
| `--verbose`  | `-v`  | boolean | `false`     | Enable verbose output                               |

**Chunking Strategies:** `character`, `recursive`, `sentence`, `token`, `markdown`, `html`, `json`, `latex`, `semantic`, `semantic-markdown`

**Examples:**

```bash
# Default chunking
neurolink rag chunk ./docs/guide.md

# Markdown-aware chunking with JSON output
neurolink rag chunk ./docs/guide.md --strategy markdown --format json

# Custom size and overlap
neurolink rag chunk ./docs/guide.md --maxSize 512 --overlap 50 --output chunks.json

# Extract metadata with LLM
neurolink rag chunk ./docs/guide.md --extract --provider openai --verbose
```

### rag index

Index a document for semantic search with vector embeddings.

```bash
neurolink rag index <file> [options]
```

| Option        | Alias | Type    | Default     | Description             |
| ------------- | ----- | ------- | ----------- | ----------------------- |
| `--indexName` | `-n`  | string  | filename    | Name for the index      |
| `--strategy`  | `-s`  | string  | auto-detect | Chunking strategy       |
| `--maxSize`   | `-m`  | number  | `1000`      | Maximum chunk size      |
| `--overlap`   | `-o`  | number  | `200`       | Overlap between chunks  |
| `--provider`  | `-p`  | string  | auto        | Provider for embeddings |
| `--model`     |       | string  |             | Model for embeddings    |
| `--graph`     | `-g`  | boolean | `false`     | Build Graph RAG index   |
| `--verbose`   | `-v`  | boolean | `false`     | Enable verbose output   |

**Examples:**

```bash
# Index a document with default settings
neurolink rag index ./docs/guide.md

# Index with a custom name and Graph RAG
neurolink rag index ./docs/guide.md --indexName my-docs --graph

# Index with specific provider and verbose output
neurolink rag index ./docs/api.md --provider openai --verbose
```

### rag query

Query indexed documents using vector, hybrid, or Graph RAG search.

```bash
neurolink rag query <query> [options]
```

| Option        | Alias | Type    | Default | Description                            |
| ------------- | ----- | ------- | ------- | -------------------------------------- |
| `--indexName` | `-n`  | string  |         | Name of the index to query             |
| `--topK`      | `-k`  | number  | `5`     | Number of results to return            |
| `--hybrid`    | `-h`  | boolean | `false` | Use hybrid search (vector + BM25)      |
| `--graph`     | `-g`  | boolean | `false` | Use Graph RAG search                   |
| `--provider`  | `-p`  | string  | auto    | Provider for embeddings                |
| `--model`     |       | string  |         | Model for embeddings                   |
| `--format`    | `-f`  | string  | `text`  | Output format: `text`, `json`, `table` |
| `--verbose`   | `-v`  | boolean | `false` | Enable verbose output                  |

**Examples:**

```bash
# Basic vector search
neurolink rag query "How does authentication work?"

# Hybrid search with more results
neurolink rag query "API endpoints" --hybrid --topK 10

# Graph RAG search with JSON output
neurolink rag query "architecture overview" --graph --format json

# Query a specific index
neurolink rag query "chunking strategies" --indexName my-docs --verbose
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

---

## workflow \<subcommand\>

Manage and execute AI workflows (consensus, fallback, adaptive, multi-judge).

```bash
# List available predefined workflows
npx @juspay/neurolink workflow list

# Show details of a specific workflow
npx @juspay/neurolink workflow info consensus-3

# Execute a workflow with a prompt
npx @juspay/neurolink workflow execute consensus-3 "Compare approaches to caching"
```

**Subcommands:**

| Subcommand                | Description                         |
| ------------------------- | ----------------------------------- |
| `list`                    | List available predefined workflows |
| `info <name>`             | Show details of a workflow          |
| `execute <name> <prompt>` | Execute a workflow with a prompt    |

**`workflow execute` flags:**

| Option       | Type    | Default | Description                       |
| ------------ | ------- | ------- | --------------------------------- |
| `--provider` | string  |         | Override AI provider              |
| `--model`    | string  |         | Override model name               |
| `--timeout`  | number  |         | Execution timeout in milliseconds |
| `--verbose`  | boolean | `false` | Enable verbose output             |

**Examples:**

```bash
# Execute with provider override
npx @juspay/neurolink workflow execute adaptive-quality "Deep analysis of microservices" \
  --provider openai --model gpt-4o --verbose

# Execute with timeout
npx @juspay/neurolink workflow execute fallback-fast "Translate to Spanish" --timeout 30000
```

---

## observability \<subcommand\>

Observability and telemetry management. Aliases: `obs`, `otel`.

```bash
# Show telemetry and observability status
npx @juspay/neurolink observability status

# Show metrics summary
npx @juspay/neurolink obs metrics --detailed

# List configured exporters
npx @juspay/neurolink otel exporters

# Show cost breakdown
npx @juspay/neurolink observability costs --by-model
```

**Subcommands:**

| Subcommand  | Alias  | Description                             |
| ----------- | ------ | --------------------------------------- |
| `status`    |        | Show telemetry and observability status |
| `metrics`   |        | Show metrics summary                    |
| `exporters` | `exp`  | List configured exporters               |
| `costs`     | `cost` | Show cost breakdown                     |

**Shared flags (all subcommands):**

| Option     | Alias | Type    | Default | Description                            |
| ---------- | ----- | ------- | ------- | -------------------------------------- |
| `--format` | `-f`  | string  | `text`  | Output format: `text`, `json`, `table` |
| `--quiet`  | `-q`  | boolean | `false` | Minimal output                         |

**`metrics` flags:**

| Option       | Alias | Type    | Default | Description                                 |
| ------------ | ----- | ------- | ------- | ------------------------------------------- |
| `--detailed` | `-d`  | boolean | `false` | Show detailed metrics including percentiles |

**`costs` flags:**

| Option          | Alias | Type    | Default | Description                     |
| --------------- | ----- | ------- | ------- | ------------------------------- |
| `--by-model`    | `-m`  | boolean | `true`  | Show cost breakdown by model    |
| `--by-provider` | `-p`  | boolean | `true`  | Show cost breakdown by provider |

---

## telemetry \<subcommand\>

Telemetry and exporter management. Alias: `tel`.

```bash
# Show exporter status and health
npx @juspay/neurolink telemetry status

# Configure an exporter
npx @juspay/neurolink tel configure --exporter langfuse --config '{"publicKey":"pk-...","secretKey":"sk-..."}'

# List all available and configured exporters
npx @juspay/neurolink telemetry list-exporters

# Flush pending spans to exporters
npx @juspay/neurolink telemetry flush

# Show token usage and cost statistics
npx @juspay/neurolink telemetry stats --detailed
```

**Subcommands:**

| Subcommand       | Aliases      | Description                                 |
| ---------------- | ------------ | ------------------------------------------- |
| `status`         |              | Show exporter status and health             |
| `configure`      |              | Configure an exporter with JSON settings    |
| `list-exporters` | `list`, `ls` | List all available and configured exporters |
| `flush`          |              | Flush all pending spans to exporters        |
| `stats`          |              | Show token usage and cost statistics        |

**Shared flags (all subcommands):**

| Option     | Alias | Type    | Default | Description                            |
| ---------- | ----- | ------- | ------- | -------------------------------------- |
| `--format` | `-f`  | string  | `text`  | Output format: `text`, `json`, `table` |
| `--quiet`  | `-q`  | boolean | `false` | Minimal output                         |

**`configure` flags:**

| Option       | Alias | Type   | Required | Description                                                                                                      |
| ------------ | ----- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `--exporter` | `-e`  | string | yes      | Exporter name: `langfuse`, `langsmith`, `otel`, `datadog`, `sentry`, `braintrust`, `arize`, `posthog`, `laminar` |
| `--config`   | `-c`  | string | yes      | JSON configuration string                                                                                        |

**`flush` flags:**

| Option      | Alias | Type   | Default | Description             |
| ----------- | ----- | ------ | ------- | ----------------------- |
| `--timeout` | `-t`  | number | `30000` | Timeout in milliseconds |

**`stats` flags:**

| Option          | Alias | Type    | Default | Description                |
| --------------- | ----- | ------- | ------- | -------------------------- |
| `--detailed`    | `-d`  | boolean | `false` | Show detailed statistics   |
| `--by-model`    | `-m`  | boolean | `true`  | Show breakdown by model    |
| `--by-provider` | `-p`  | boolean | `true`  | Show breakdown by provider |

---

## docs

Start the NeuroLink documentation MCP server.

```bash
# Start docs server with stdio transport (default)
npx @juspay/neurolink docs

# Start docs server with HTTP transport on custom port
npx @juspay/neurolink docs --transport http --port 3001
```

| Option        | Alias | Type   | Default | Description                                            |
| ------------- | ----- | ------ | ------- | ------------------------------------------------------ |
| `--transport` | `-t`  | string | `stdio` | Transport protocol: `stdio` (local) or `http` (remote) |
| `--port`      | `-p`  | number | `3001`  | Port for HTTP transport (ignored for stdio)            |

**Note:** Requires the docs site to be built first (`cd docs-site && pnpm build`). The server exposes documentation search and retrieval tools via MCP.

---

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
