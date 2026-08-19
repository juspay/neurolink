# OpenCode Support for NeuroLink Proxy

## Status: Implemented & Verified

This document was originally written as a design proposal. Every item it called out as missing or to-be-built has since been implemented and verified end-to-end (see §11). The "what was built" wording in §4 and §8 reflects the delivered state; future-tense language has been kept only where it explains historical context.

---

## 1. Overview

NeuroLink's proxy currently supports **Claude Code** as a client — when `neurolink proxy start` runs, it automatically configures Claude Code by writing `ANTHROPIC_BASE_URL` to `~/.claude/settings.json`. Claude Code then sends Anthropic Messages API requests to the proxy, which routes them to any provider.

This document describes adding **OpenCode** as a second supported client with the **same zero-config experience**: `neurolink proxy start` should auto-configure OpenCode so it connects to the proxy with no manual setup.

### What is OpenCode?

[OpenCode](https://opencode.ai) (github.com/sst/opencode) is an open-source AI coding agent built by the SST team. It is a **TypeScript monorepo** that shares the same technology stack as NeuroLink:

- **Vercel AI SDK** (`ai` package) with `streamText()`, `Tool` types, `ModelMessage`
- **Provider SDKs**: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`, `@ai-sdk/google`, `@ai-sdk/amazon-bedrock`, `@ai-sdk/azure`, `@ai-sdk/xai`, `@ai-sdk/mistral`, `@ai-sdk/groq`, `@openrouter/ai-sdk-provider`, and more
- **MCP**: `@modelcontextprotocol/sdk` for tool integration
- **Zod**: for tool parameter schemas

OpenCode is provider-agnostic. It supports Claude, OpenAI, Google, Bedrock, Groq, Azure, xAI, Mistral, Cohere, and any OpenAI-compatible endpoint via `@ai-sdk/openai-compatible`.

---

## 2. How Claude Code Auto-Configuration Works Today

When `neurolink proxy start` runs:

1. **Server starts** on configured port (default 4141)
2. **Accounts are loaded** from proxy config + OAuth credentials
3. **Claude Code settings are auto-configured**:
   - Writes to `~/.claude/settings.json`
   - Sets `env.ANTHROPIC_BASE_URL = "http://localhost:<port>"`
   - Sets `env.ENABLE_TOOL_SEARCH = "true"`
   - Preserves original values in `__proxy_original_env` for restoration
4. **On proxy stop**: restores original Claude Code settings

Key code (`src/cli/commands/proxy.ts`):

```typescript
const CLAUDE_SETTINGS_PATH = join(homedir(), ".claude", "settings.json");
const PROXY_MANAGED_KEYS = ["ANTHROPIC_BASE_URL", "ENABLE_TOOL_SEARCH"];

async function setClaudeProxySettings(baseUrl: string): Promise<void> {
  // Reads ~/.claude/settings.json
  // Snapshots original env values
  // Sets ANTHROPIC_BASE_URL to proxy URL
  // Writes back
}
```

Claude Code then sends all requests to the proxy's `/v1/messages` endpoint (Anthropic Messages API format).

---

## 3. How OpenCode Configuration Works

### Config File Locations

OpenCode uses XDG base directories via the `xdg-basedir` npm package, which
resolves `XDG_CONFIG_HOME || ~/.config` on **every** platform — there is no
macOS special case. (OpenCode's binary does contain a
`/Library/Application Support/opencode` literal, but that is
`systemManagedConfigDir()`, an MDM policy directory at the filesystem root
with no `$HOME` prefix — not the per-user config path.)

| Platform    | Global Config Path                              |
| ----------- | ----------------------------------------------- |
| **macOS**   | `~/.config/opencode/opencode.json`              |
| **Linux**   | `~/.config/opencode/opencode.json`              |
| **Windows** | `~/.config/opencode/opencode.json` (unverified) |

The macOS row was verified empirically against OpenCode 1.3.13 (embedded
`xdg-basedir` source in the shipped binary, plus `opencode models` confirming
which file is actually loaded). The Windows row follows from the same
branch-free resolution code but has **not** been checked on a Windows machine.

Project-level config: `.opencode/opencode.json` in any parent directory.

### Provider Config Schema

From `packages/opencode/src/config/config.ts` (line 787-846):

```typescript
Config.Provider = ModelsDev.Provider.partial().extend({
  models: z.record(z.string(), ModelsDev.Model.partial()).optional(),
  options: z
    .object({
      apiKey: z.string().optional(),
      baseURL: z.string().optional(),
      // ... timeout, chunkTimeout, etc.
    })
    .catchall(z.any())
    .optional(),
});

Config.Info = z.object({
  // ...
  provider: z.record(z.string(), Config.Provider).optional(),
  model: z.string().optional(), // format: "provider/model"
  // ...
});
```

### How OpenCode Loads Providers

From `packages/opencode/src/provider/provider.ts`:

1. **Bundled providers** are imported directly (line 127-150):

   ```typescript
   const BUNDLED_PROVIDERS = {
     "@ai-sdk/openai": createOpenAI,
     "@ai-sdk/anthropic": createAnthropic,
     "@ai-sdk/openai-compatible": createOpenAICompatible,
     // ... 20+ providers
   };
   ```

2. **Custom providers** from config's `provider` field get initialized with their `options` (including `baseURL`, `apiKey`)

3. **Model definitions** come from `models.dev` API (fetched and cached) + config overrides

4. **Auto-discovery**: if env vars for a provider are set (e.g., `ANTHROPIC_API_KEY`), that provider loads automatically

### The Key: `@ai-sdk/openai-compatible`

When OpenCode uses a custom provider with `npm: "@ai-sdk/openai-compatible"`, it:

- Creates an SDK instance via `createOpenAICompatible({ baseURL, apiKey })`
- Sends requests to `{baseURL}/chat/completions` (the AI SDK appends the path)
- Uses standard OpenAI Chat Completions wire format
- Handles streaming via SSE (`data: {"choices":[...]}` format)

---

## 4. The Gap (Closed): What Was Built

### Endpoints — Added

The proxy now exposes both shapes:

| Endpoint                                  | Format                      | For client   | Status                                |
| ----------------------------------------- | --------------------------- | ------------ | ------------------------------------- |
| `POST /v1/messages`                       | Anthropic Messages API      | Claude Code  | Pre-existing                          |
| `POST /v1/messages/count_tokens`          | Anthropic                   | Claude Code  | Pre-existing                          |
| `GET /v1/models` (Anthropic format)       | Anthropic                   | Claude Code  | Pre-existing                          |
| **`POST /v1/chat/completions`**           | **OpenAI Chat Completions** | **OpenCode** | **Added (`openaiProxyRoutes.ts`)**    |
| **`GET /v1/models` (OpenAI list format)** | **OpenAI**                  | **OpenCode** | **Added (`buildModelsListResponse`)** |

### Auto-Configuration — Added

`src/cli/commands/proxy.ts` gained the symmetric helpers used during `proxy start` / `proxy stop`:

- `setOpenCodeProxySettings(baseUrl)` — line 293, writes the `provider.neurolink` block to OpenCode's `opencode.json` (XDG-resolved path)
- `clearOpenCodeProxySettings(baseUrl)` — line 341, removes only entries whose `baseURL` matches the proxy's
- Wired into the start path (line 1431) and stop/uninstall paths (lines 1292, 2357)
- Skipped automatically under `--dev` so isolated dev instances never touch the user's OpenCode config

---

## 5. Architecture

### Data Flow

```
OpenCode                        NeuroLink Proxy                   Any Provider
───────                         ──────────────                    ────────────
@ai-sdk/openai-compatible
  createOpenAICompatible({
    baseURL: "http://localhost:4141/v1",
    apiKey: "proxy-key"
  })
      │
      ▼
POST /v1/chat/completions ────▶ openaiProxyRoutes.ts
  {                               │
    model: "claude-sonnet-4",     ├─ parseOpenAIRequest()
    messages: [...],              │    → Extract system prompt
    tools: [...],                 │    → Flatten messages
    stream: true                  │    → Convert tools (function → AI SDK)
  }                               │    → Map tool_choice
                                  │
                                  ├─ ModelRouter.resolve(model)
                                  │    → claude-* → anthropic
                                  │    → gemini-* → vertex
                                  │    → custom mappings
                                  │
                                  ├─ buildProxyTranslationPlan()
                                  │    → Classify request
                                  │    → Build fallback chain
                                  │
                                  ├─ ctx.neurolink.stream(options) ──────▶ Any Provider
                                  │                                        (Anthropic, Google,
                                  │                                         OpenAI, Bedrock, etc.)
                                  ▼
                              serializeOpenAIResponse()
                              OpenAIStreamSerializer
                                  │
SSE Response ◀────────────────────┘
  data: {"choices":[{"delta":{"content":"..."}}]}
  data: {"choices":[{"delta":{"tool_calls":[...]}}]}
  data: {"choices":[{"delta":{},"finish_reason":"stop"}]}
  data: [DONE]
```

### Symmetric Design

| Aspect                 | Claude Code Path                    | OpenCode Path                        |
| ---------------------- | ----------------------------------- | ------------------------------------ |
| **Wire format**        | Anthropic Messages API              | OpenAI Chat Completions              |
| **Endpoint**           | `POST /v1/messages`                 | `POST /v1/chat/completions`          |
| **Format translator**  | `claudeFormat.ts`                   | `openaiFormat.ts` (NEW)              |
| **Route handler**      | `claudeProxyRoutes.ts`              | `openaiProxyRoutes.ts` (NEW)         |
| **Stream serializer**  | `ClaudeStreamSerializer`            | `OpenAIStreamSerializer` (NEW)       |
| **Auto-config target** | `~/.claude/settings.json`           | XDG `opencode.json`                  |
| **Auto-config key**    | `env.ANTHROPIC_BASE_URL`            | `provider.neurolink.options.baseURL` |
| **Internal pipeline**  | Same `ctx.neurolink.stream()`       | Same `ctx.neurolink.stream()`        |
| **Model routing**      | Same `ModelRouter`                  | Same `ModelRouter`                   |
| **Account management** | Same accounts, cooldowns, fallbacks | Same accounts, cooldowns, fallbacks  |

---

## 6. Wire Format Translation

### Request: OpenAI → Internal

| OpenAI Field                                     | NeuroLink Internal                             | Notes                                |
| ------------------------------------------------ | ---------------------------------------------- | ------------------------------------ |
| `messages[role="system"].content`                | `systemPrompt`                                 | Concatenate multiple system messages |
| `messages[role="user/assistant/tool"]`           | `conversationMessages[]`                       | Flatten to `{role, content}`         |
| Last user message `.content`                     | `prompt`                                       | Extracted as string                  |
| `messages[role="assistant"].tool_calls`          | Inline as `[tool_use:id:name] {args}`          | Same pattern as `claudeFormat.ts`    |
| `messages[role="tool"]`                          | Inline as `[tool_result:tool_call_id] content` | Same pattern as `claudeFormat.ts`    |
| `content[type="image_url"].image_url.url`        | `images[]`                                     | From latest user message only        |
| `tools[].function.{name,description,parameters}` | `tools{}` via `jsonSchema()`                   | AI SDK format                        |
| `tool_choice: "auto"/"required"/"none"`          | `toolChoice`                                   | Direct mapping                       |
| `tool_choice: {type:"function",function:{name}}` | `toolChoice: "required"` + `toolChoiceName`    | Named tool                           |
| `max_tokens` / `max_completion_tokens`           | `maxTokens`                                    | Default 4096 if unset                |
| `temperature`, `top_p`                           | `temperature`, `topP`                          | Direct                               |
| `stop`                                           | `stopSequences`                                | Direct                               |
| `stream`                                         | `stream`                                       | Direct                               |

### Response: Internal → OpenAI

| NeuroLink `InternalResult`              | OpenAI Response                                                     |
| --------------------------------------- | ------------------------------------------------------------------- |
| `content`                               | `choices[0].message.content`                                        |
| `toolCalls[].toolName`                  | `choices[0].message.tool_calls[].function.name`                     |
| `toolCalls[].args`                      | `choices[0].message.tool_calls[].function.arguments` (stringified!) |
| `toolCalls[].toolCallId`                | `choices[0].message.tool_calls[].id`                                |
| `finishReason: "end_turn"/"stop"`       | `finish_reason: "stop"`                                             |
| `finishReason: "tool-calls"/"tool_use"` | `finish_reason: "tool_calls"`                                       |
| `finishReason: "length"/"max_tokens"`   | `finish_reason: "length"`                                           |
| `usage.input`                           | `usage.prompt_tokens`                                               |
| `usage.output`                          | `usage.completion_tokens`                                           |
| `usage.total`                           | `usage.total_tokens`                                                |
| `model`                                 | `model`                                                             |
| `reasoning`                             | Not standard — drop or use custom field                             |

### Streaming: Internal → OpenAI SSE

| Event           | SSE Frame                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Stream start    | `data: {"choices":[{"delta":{"role":"assistant"}}]}`                                                                                    |
| Text chunk      | `data: {"choices":[{"delta":{"content":"text"}}]}`                                                                                      |
| Tool call start | `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_xx","type":"function","function":{"name":"Read","arguments":""}}]}}]}` |
| Tool call args  | `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"chunk"}}]}}]}`                                           |
| Finish          | `data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{...}}`                                                                 |
| Done            | `data: [DONE]`                                                                                                                          |

---

## 7. Auto-Configuration Design

### Current (Claude Code)

```
neurolink proxy start
  → setClaudeProxySettings("http://localhost:4141")
    → writes ~/.claude/settings.json
      → env.ANTHROPIC_BASE_URL = "http://localhost:4141"

neurolink proxy stop
  → clearClaudeProxySettings()
    → restores original ~/.claude/settings.json values
```

### New (OpenCode) — Same Pattern

```
neurolink proxy start
  → setClaudeProxySettings(...)   // existing
  → setOpenCodeProxySettings("http://localhost:4141/v1", "proxy-key")  // NEW
    → detects OpenCode config path (XDG)
    → reads existing opencode.json (or creates)
    → adds provider.neurolink = {
        npm: "@ai-sdk/openai-compatible",
        name: "NeuroLink Proxy",
        env: [],
        models: { /* available models from proxy config */ },
        options: {
          baseURL: "http://localhost:4141/v1",
          apiKey: "proxy-key"
        }
      }
    → preserves original values for restoration
    → writes back

neurolink proxy stop
  → clearClaudeProxySettings()      // existing
  → clearOpenCodeProxySettings()     // NEW
    → removes provider.neurolink from opencode.json
    → restores original values
```

### OpenCode Config Path Resolution

```typescript
// Same logic as OpenCode's global/index.ts
import { xdgConfig } from "xdg-basedir";
const OPENCODE_CONFIG_DIR = join(
  xdgConfig ?? join(homedir(), ".config"),
  "opencode",
);
const OPENCODE_CONFIG_PATH = join(OPENCODE_CONFIG_DIR, "opencode.json");
```

On macOS and Linux alike: `~/.config/opencode/opencode.json`
(`XDG_CONFIG_HOME` wins when set)

### Detection

The proxy should detect whether OpenCode is installed before writing config:

```typescript
async function isOpenCodeInstalled(): Promise<boolean> {
  // Check if opencode config directory exists (XDG path)
  // Or check if opencode binary exists in PATH (which opencode)
  // Or check if ~/.opencode/ exists in any parent directory
}
```

If OpenCode is not installed, skip auto-configuration silently (same behavior as Claude Code — if `~/.claude/` doesn't exist, the proxy doesn't fail).

### Alternative: Env-Var Based Auto-Config

OpenCode's provider system has an `autoload` mechanism. Each provider's custom loader checks for env vars (via `input.env.some((item) => env[item])`). If the provider's required env vars are present, it autoloads.

For providers using `@ai-sdk/openai-compatible`, the env vars are typically:

- `OPENAI_COMPATIBLE_BASE_URL` — the endpoint URL
- `OPENAI_COMPATIBLE_API_KEY` — the API key

**This means an even simpler auto-config path**: instead of writing to `opencode.json`, the proxy could write env vars to a shared `.env` file or inject them into the process environment. However, the config-file approach is more reliable and matches the Claude Code pattern.

### Both Approaches Combined

The proxy should use **both** approaches for maximum compatibility:

1. **Config file** (primary): Write `provider.neurolink` to `opencode.json` — this gives users a visible, editable config entry with model definitions
2. **Env vars** (fallback): If the config file approach fails (permissions, etc.), fall back to writing env vars that `@ai-sdk/openai-compatible` auto-detects

---

## 8. Implementation (Delivered)

### New Files (in this branch)

| File                                         | Purpose                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/proxy/openaiFormat.ts`              | OpenAI ↔ Internal translator (parser, serializer, SSE transform)   |
| `src/lib/server/routes/openaiProxyRoutes.ts` | `/v1/chat/completions` + `/v1/models` + Anthropic loopback bridge  |
| `src/lib/proxy/proxyTranslationEngine.ts`    | Unified translation engine shared with the Claude route (refactor) |
| `test/fixtures/opencode-local-proxy.json`    | OpenCode fixture pointing at the dev proxy                         |
| `docs/features/opencode-proxy-support.md`    | This document (design + manual testing playbook)                   |

OpenAI wire types and `ProxyFormat` / `StreamSerializerAdapter` live in `src/lib/types/proxy.ts` (the canonical types barrel; the original design-time path `proxyTypes.ts` was renamed during the release-line refactor).

### Modified Files

| File                                         | Change (delivered)                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/lib/server/routes/index.ts`             | Adds `openaiProxy` flag + unified `proxy` flag; registers `createOpenAIProxyRoutes`         |
| `src/cli/commands/proxy.ts`                  | Adds `setOpenCodeProxySettings()` and `clearOpenCodeProxySettings()`; wired into start/stop |
| `src/lib/proxy/modelRouter.ts`               | Surfaces `getModelMappings()` / `getPassthroughModels()` for `buildModelsListResponse`      |
| `src/lib/types/proxy.ts`                     | OpenAI wire-format types + `ProxyFormat` + `StreamSerializerAdapter`                        |
| `src/lib/types/server.ts`                    | `CreateRoutesOptions` gains `proxy` and `openaiProxy` flags                                 |
| `src/lib/server/routes/claudeProxyRoutes.ts` | Refactored to share the new translation engine; `/v1/models` returns the unified list       |

### Reused As-Is (no changes needed)

| Component                         | Why it works                                    |
| --------------------------------- | ----------------------------------------------- |
| `ModelRouter`                     | `resolve()` is format-agnostic                  |
| `routingPolicy.ts`                | Request classification works on internal format |
| `proxyConfig.ts`                  | Account pools, model mappings — format-agnostic |
| `proxyTracer.ts`                  | OTel tracing — format-agnostic                  |
| `requestLogger.ts`                | Structured logging — format-agnostic            |
| `usageStats.ts`                   | Per-account stats — format-agnostic             |
| NeuroLink `generate()`/`stream()` | The entire backend — unchanged                  |

### Historical Build Sequence (delivered in this order, all complete)

1. ✅ OpenAI wire types added to the proxy types barrel
2. ✅ `openaiFormat.ts` — parser, response serializer, streaming SSE serializer, error builder
3. ✅ `openaiProxyRoutes.ts` — `/v1/chat/completions` + `/v1/models` + Anthropic loopback bridge
4. ✅ `routes/index.ts` updated with `openaiProxy` and unified `proxy` flags
5. ✅ `setOpenCodeProxySettings()` / `clearOpenCodeProxySettings()` added to `proxy.ts`
6. ✅ `neurolink proxy start` auto-configures OpenCode (skipped under `--dev`)
7. ✅ Manual test plan in §11; verified end-to-end against OpenCode 1.3.13

---

## 9. User Experience

### Before (Manual)

User must manually edit OpenCode config to add a custom provider. No auto-detection.

### After (Zero-Config)

```bash
neurolink proxy start
# Output:
# NeuroLink Proxy v9.47.0 listening on http://localhost:4141
# Claude Code: configured (ANTHROPIC_BASE_URL → http://localhost:4141)
# OpenCode:    configured (provider.neurolink → http://localhost:4141/v1)
# 3 accounts loaded (2 anthropic, 1 vertex)
```

Both Claude Code and OpenCode immediately connect to the proxy. No manual configuration needed.

### Model Selection in OpenCode

After auto-config, users select models in OpenCode's TUI model picker. Available models come from the proxy's model mappings + available accounts. The proxy serves them via `GET /v1/models`.

---

## 10. Edge Cases

| Case                                    | Handling                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| OpenCode not installed                  | Skip auto-config silently                                                                         |
| Existing `provider.neurolink` in config | Update `baseURL`/`apiKey`, preserve other fields                                                  |
| Proxy stops unexpectedly                | OpenCode falls back to its other configured providers                                             |
| `n > 1` in request                      | Ignore — return single choice (NeuroLink generates n=1)                                           |
| `response_format: json_object`          | Map to `structuredOutput` where provider supports it                                              |
| Reasoning/thinking content              | Not in standard OpenAI format — drop (OpenCode handles this per-provider via `ProviderTransform`) |
| Image content in messages               | `image_url` blocks → extract to `images[]`                                                        |
| Legacy `functions` field                | Not supported — `tools` only (matches OpenCode's behavior)                                        |
| `stream_options: {include_usage: true}` | Include usage in final streaming chunk                                                            |
| Auth (`Authorization: Bearer`)          | Accept any token (validate against proxy config if auth is enabled)                               |

---

## 11. Manual Testing & Verification

This section is a self-contained playbook for verifying the OpenCode proxy support end to end. It assumes you are on the `feat/opencode-support-for-proxy` branch and the global proxy on `:55669` should remain untouched throughout.

### 11.1 Prerequisites

- Node 20+ and `pnpm` available
- `opencode` CLI installed (`opencode --version` should print 1.3.x or newer)
- `jq` and `curl` available
- A working `~/.neurolink/proxy-config.yaml` and `~/.neurolink/.env` (used by the global proxy)
- The `dist/` directory built from this branch (`pnpm run build:cli` if not built)

### 11.2 Mental Model

You are starting a **second** proxy instance, isolated from the global one:

|                        | Global proxy    | Dev proxy under test     |
| ---------------------- | --------------- | ------------------------ |
| Port                   | 55669           | 5555                     |
| State dir              | `~/.neurolink/` | `<repo>/.neurolink-dev/` |
| Managed by             | launchd         | foreground process       |
| Touched by these tests | Never           | Yes                      |

Two safety invariants checked throughout:

- `curl http://localhost:55669/health` → 200 (global never goes down)
- The dev PID from `.neurolink-dev/proxy-state.json` ≠ the global PID from `~/.neurolink/proxy-state.json`

### 11.3 Why a non-Claude alias is required

OpenCode 1.3.13 hardcodes the Anthropic SDK whenever the model name contains `claude` — it bypasses `/v1/chat/completions` and posts directly to `/v1/messages`. To exercise this branch's new OpenAI endpoint end-to-end, the OpenCode fixture must use a non-claude alias (we use `gpt-4o`) and the proxy must be told to map that alias to a real Anthropic model. We map to **Haiku** because Sonnet aggressively rate-limits 150-KB requests with OpenCode's full tool set and produces noisy 429s during testing.

### 11.4 One-time setup

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy

# (a) Build CLI if needed
pnpm run build:cli

# (b) Start fresh — wipe any prior dev state. Global state untouched.
rm -rf .neurolink-dev
mkdir -p .neurolink-dev

# (c) Routing config: extend your global mappings with the gpt-4o alias.
#     Output goes only to .neurolink-dev/proxy-config.yaml — global config is unchanged.
jq '.routing["model-mappings"] += [{"from":"gpt-4o","to":"claude-haiku-4-5","provider":"anthropic"}]' \
  ~/.neurolink/proxy-config.yaml > .neurolink-dev/proxy-config.yaml

# (d) OpenCode fixture in an isolated workspace.
#     The repo ships two fixtures:
#       - test/fixtures/opencode-local-proxy.json              (claude-sonnet-4-6, hits /v1/messages — exercises Claude passthrough)
#       - test/fixtures/opencode-local-proxy-openai-route.json (gpt-4o alias,    hits /v1/chat/completions — exercises this branch's new code)
#     For end-to-end verification of this branch you want the second one.
mkdir -p /tmp/opencode-proxy-test
cp test/fixtures/opencode-local-proxy-openai-route.json /tmp/opencode-proxy-test/opencode.json
```

### 11.5 Start the dev proxy (separate terminal)

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy
node dist/cli/index.js proxy start --dev --port 5555 --config .neurolink-dev/proxy-config.yaml
```

`--dev` scopes all state to `.neurolink-dev/`, skips launchd, and skips client auto-configuration. Wait for `Server is ready`.

In a third terminal, tail the proxy lifecycle log:

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy
tail -f .neurolink-dev/logs/proxy-$(date -u +%F).jsonl | jq
```

### 11.6 Smoke checks

| #   | Check                 | Command                                                                                  | Pass criteria                 |
| --- | --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| S1  | Dev proxy up          | `curl -s http://localhost:5555/health \| jq`                                             | `status: "ok"`, `ready: true` |
| S2  | Global untouched      | `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:55669/health`                 | `200`                         |
| S3  | Routing alias visible | `curl -s http://localhost:5555/v1/models \| jq '.data \| map(.id)'`                      | List contains `gpt-4o`        |
| S4  | PIDs distinct         | `jq -r .pid .neurolink-dev/proxy-state.json && jq -r .pid ~/.neurolink/proxy-state.json` | Two different numbers         |

### 11.7 Wire-level tests (curl directly — no OpenCode needed)

These prove the proxy code is correct in isolation. Each test should print `HTTP 200` and a sane response.

```bash
PROXY=http://localhost:5555

# W1 Non-streaming
curl -s $PROXY/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"Reply with one word: hello."}],"max_tokens":20}' \
  | jq '.choices[0].message.content'

# W2 Streaming
curl -N -s $PROXY/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"Count to 3."}],"max_tokens":30,"stream":true}'

# W3 Tool call (request)
curl -s $PROXY/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-4-6","max_tokens":200,
       "messages":[{"role":"user","content":"What is the weather in Tokyo? Use the tool."}],
       "tools":[{"type":"function","function":{"name":"get_weather","description":"Get current weather",
         "parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}]}' \
  | jq '{finish: .choices[0].finish_reason, tool_calls: .choices[0].message.tool_calls}'

# W4 Tool result round-trip — multi-turn with assistant.tool_calls + role:tool message
curl -s $PROXY/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-4-6","max_tokens":100,
       "messages":[
         {"role":"user","content":"What is the weather in Tokyo?"},
         {"role":"assistant","content":null,"tool_calls":[{"id":"toolu_X","type":"function","function":{"name":"get_weather","arguments":"{\"city\":\"Tokyo\"}"}}]},
         {"role":"tool","tool_call_id":"toolu_X","content":"{\"temp_celsius\":18,\"condition\":\"cloudy\"}"}
       ],
       "tools":[{"type":"function","function":{"name":"get_weather","description":"Get current weather",
         "parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}]}' \
  | jq '.choices[0].message.content'

# W5 Streaming tool call
curl -N -s $PROXY/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-4-6","max_tokens":100,"stream":true,
       "messages":[{"role":"user","content":"Get weather in Paris."}],
       "tools":[{"type":"function","function":{"name":"get_weather","description":"Get weather",
         "parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}]}'
```

Expected:

- W1: a one-word reply
- W2: SSE chunks ending with `data: [DONE]`, each chunk is `chatcmpl-...` shape
- W3: `finish: "tool_calls"`, `tool_calls[0].function.name == "get_weather"`, args `{"city":"Tokyo"}`
- W4: a sentence describing 18°C cloudy weather in Tokyo
- W5: deltas containing `delta.tool_calls[0]` with progressively concatenating `function.arguments`, ending with `finish_reason: "tool_calls"`

### 11.8 OpenCode end-to-end tests

Run from the OpenCode workspace so it picks up the fixture:

```bash
cd /tmp/opencode-proxy-test
```

| #   | Command                                                                                                                                                                                                          | Pass criteria                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| E1  | `opencode run "Reply with exactly one word: hello"`                                                                                                                                                              | Output contains `hello`                                                         |
| E2  | `opencode run "What is 17 multiplied by 23? Reply with just the number."`                                                                                                                                        | Output contains `391`                                                           |
| E3  | `echo "test content $(date)" > marker.txt && opencode run "Read the file marker.txt and tell me what's in it. Just the content."`                                                                                | Output contains `test content`                                                  |
| E4  | `opencode run "Run the bash command 'echo PROXY_E2E_OK' and report its output. Just the output."`                                                                                                                | Output contains `PROXY_E2E_OK`                                                  |
| E5  | `rm -f output.txt && opencode run "Create a file output.txt with the text 'success token 7426'. Then read it back."`                                                                                             | `cat output.txt` shows `success token 7426`                                     |
| E6  | `mkdir -p src && echo "function alpha() { return 1; }" > src/a.js && echo "function alpha2() { return 3; }" > src/b.js && opencode run "Use grep to find all functions whose name starts with 'alpha' in src/."` | Output mentions both `alpha` and `alpha2`                                       |
| E7  | `opencode run --format json "Reply with one word: jsontest"`                                                                                                                                                     | Output is JSON-line stream including `step_start`, `text`, `step_finish` events |
| E8  | `opencode run "Write a TypeScript function called add that takes two numbers and returns their sum. Reply with just the code."`                                                                                  | Output contains `function add` (or `const add =`)                               |
| E9  | Multi-turn: capture session id from a first JSON run, then continue (snippet below)                                                                                                                              | Second turn recalls the number from the first                                   |
| E10 | `LONG=$(seq 1 200 \| sed 's/^/item_/' \| tr '\n' ' '); opencode run "Items: $LONG. Reply with only the integer count."`                                                                                          | Output contains `200`                                                           |

Snippet for E9:

```bash
SID=$(opencode run --format json "Remember the number 8472. Reply 'noted'." 2>&1 \
  | jq -r 'select(.sessionID)|.sessionID' | head -1)
opencode run --session "$SID" "What number did I tell you to remember? Just the number."
# expected: 8472
```

### 11.9 Empirical proof the request flowed through _this branch's_ code

Run this immediately after any OpenCode test above:

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy
DATE=$(date -u +%F)

# (a) Body captures appeared on disk for that request.
ls -td .neurolink-dev/logs/bodies/$DATE/*/ | head -2

# (b) The captured body contains the exact prompt you typed and was tagged with the alias.
DIR=$(ls -td .neurolink-dev/logs/bodies/$DATE/*/ | head -1)
REQ=$(ls "$DIR" | grep client_request | head -1)
gunzip -c "$DIR$REQ" | jq '{
  user_agent: .headers["user-agent"],
  content_length: .headers["content-length"],
  body_model: (.body | (if type=="string" then fromjson else . end) | .model),
  user_msg: (.body | (if type=="string" then fromjson else . end) | .messages[-1].content)
}'
```

Pass criteria for (b):

- `user_agent: "node"` — OpenCode runs on Node
- `content_length` ≥ 100000 — only OpenCode sends bodies that large (114 tool defs)
- `body_model: "claude-haiku-4-5"` — the proxy's router rewrote `gpt-4o` → `claude-haiku-4-5` _before_ this capture, proving the request passed through `openaiProxyRoutes.ts` and `routingPolicy.ts`
- `user_msg` is the exact string you sent OpenCode

Independent confirmation from OpenCode's own logs:

```bash
cd /tmp/opencode-proxy-test
opencode run --print-logs --log-level INFO "ping" 2>&1 \
  | grep -E "providerID=neurolink|pkg=@ai-sdk/openai-compatible"
```

Pass: two lines including `pkg=@ai-sdk/openai-compatible using bundled provider` — proves the OpenAI-compatible SDK was used, not the bundled Anthropic SDK.

### 11.10 Negative test (proves OpenCode is exclusively talking to the dev proxy)

Stop the dev proxy and verify OpenCode hangs/errors. This rules out any "OpenCode silently bypassed the proxy and went straight to Anthropic" hypothesis.

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy
DEV_PID=$(jq -r '.pid' .neurolink-dev/proxy-state.json)
GLOBAL_PID=$(jq -r '.pid' ~/.neurolink/proxy-state.json)
[ "$DEV_PID" = "$GLOBAL_PID" ] && echo "ABORT: PIDs match — refusing to kill global" && exit 1
kill -TERM "$DEV_PID" && sleep 2
curl -s -o /dev/null -w "dev :5555 after stop: %{http_code}\n" http://localhost:5555/health    # expect 000
curl -s -o /dev/null -w "global :55669 still: %{http_code}\n"  http://localhost:55669/health    # expect 200

cd /tmp/opencode-proxy-test
timeout 30 opencode run "ping" ; echo "exit=$?"
# Pass: exit 124 (timeout) and no LLM reply printed → OpenCode could not reach any model.
```

Then restart the proxy and rerun any E1–E10 to confirm recovery.

### 11.11 Isolation audit

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy

# Global proxy unaffected
curl -s -o /dev/null -w "global :55669 health: %{http_code}\n" http://localhost:55669/health        # 200

# Dev state lives only in repo-local dir, never in HOME
ls .neurolink-dev/                                                   # has proxy-state.json, logs/, account-quotas.json
[ -f ~/.neurolink/proxy-state-dev.json ] && echo "BAD: dev leaked into HOME" || echo "no leakage"

# Dev proxy is bound only to 5555
lsof -nP -iTCP:5555 -sTCP:LISTEN | head -3
```

### 11.12 Cleanup

```bash
cd /path/to/neurolink/feat/opencode-support-for-proxy
DEV_PID=$(jq -r '.pid' .neurolink-dev/proxy-state.json)
GLOBAL_PID=$(jq -r '.pid' ~/.neurolink/proxy-state.json)
[ "$DEV_PID" != "$GLOBAL_PID" ] && kill -TERM "$DEV_PID"
# Optional: remove dev state
# rm -rf .neurolink-dev
# Optional: remove test workspace
# rm -rf /tmp/opencode-proxy-test
```

### 11.13 Pass/fail summary checklist

A clean run looks like this:

- [ ] S1–S4 all pass (proxy up, global untouched, alias visible, PIDs distinct)
- [ ] W1–W5 all return HTTP 200 with the expected fields
- [ ] E1–E10 all produce the expected output strings
- [ ] §11.9 (a) shows ≥1 capture per OpenCode run; (b) shows your prompt verbatim and `body_model: claude-haiku-4-5`
- [ ] §11.9 OpenCode debug log shows `pkg=@ai-sdk/openai-compatible`
- [ ] §11.10 OpenCode times out / errors out when proxy is killed; resumes when restarted
- [ ] §11.11 global :55669 health is 200 throughout

If any step deviates, the directory `.neurolink-dev/logs/bodies/$(date -u +%F)/<requestId>/` for the failing request contains the exact request body, every retry attempt, and the upstream response — open the matching `*-upstream_response-attempt-N.json.gz` for the upstream error message.

### 11.14 Known caveats

- OpenCode 1.3.13 always sends `claude-*` model names with Anthropic format (bypassing `/v1/chat/completions`). Tests must use the alias indirection described above.
- Anthropic Sonnet aggressively 429s 150-KB requests when its per-account burst budget is in cooldown. The alias points to **Haiku** to avoid this. If you need to test Sonnet specifically, expect intermittent 429s.
- Both the parent `/v1/chat/completions` request and (for Anthropic-routed traffic) the inner loopback `/v1/messages` request now emit lifecycle entries in `proxy-*.jsonl`. The parent line carries `accountType: "openai-bridge"`; the child carries the OAuth account details from the Claude passthrough path. Filter on `requestId` to correlate them, or filter on `path: /v1/chat/completions` to see only the parent entries.
