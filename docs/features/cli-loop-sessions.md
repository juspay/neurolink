---
title: CLI Loop Sessions
description: Persistent interactive mode with conversation memory and session state for prompt engineering
keywords: cli loop, interactive mode, session state, conversation memory, prompt engineering, repl
---

# CLI Loop Sessions

`neurolink loop` delivers a persistent CLI workspace so you can explore prompts, tweak parameters, and inspect state without restarting the CLI. Session variables, Redis-backed history, and built-in help turn the CLI into a playground for prompt engineering and operator runbooks.

## Quick Start

```bash
# Enter interactive loop mode with Anthropic as the default provider
npx @juspay/neurolink loop --provider anthropic

# Inside the loop, just type prompts:
#   ⎔ neurolink » explain quantum entanglement
#   ⎔ neurolink » now simplify that for a 10-year-old
#   ⎔ neurolink » exit
```

## Why Loop Mode

- **Stateful sessions** – keep provider/model/temperature context between commands.
- **Memory on demand** – enable in-memory or Redis-backed conversation history per session.
- **Fast iteration** – reuse the entire command surface (`generate`, `stream`, `memory`, etc.) without leaving the loop.
- **Guided UX** – ASCII banner, inline help, and validation for every session variable.

:::tip[Keyboard Shortcuts]
Loop mode supports **tab completion** for commands and session variables, **arrow key history** for navigating previous commands, and **Ctrl+C** to cancel the current operation without exiting the loop.
:::

## Starting a Session

=== "CLI"

    ```bash
    # Default: in-memory session variables, Redis auto-detected when available
    npx @juspay/neurolink loop

    # Disable Redis auto-detection and stay in-memory
    npx @juspay/neurolink loop --no-auto-redis

    # Turn off memory entirely (prompt-by-prompt mode)
    npx @juspay/neurolink loop --enable-conversation-memory=false

    # Custom retention limits
    npx @juspay/neurolink loop --max-sessions 100 --max-turns-per-session 50
    ```

    When conversation memory is enabled, the CLI prints the generated session ID so you can export transcripts later via `neurolink memory history <id>`.

=== "SDK (Programmatic Loop)"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    // Create a NeuroLink instance with session state
    const neurolink = new NeuroLink({
      conversationMemory: {
        enabled: true,  // (1)!
        store: "redis",  // (2)!
        maxTurnsPerSession: 50,
      },
    });

    // Simulate loop-like behavior with persistent context
    const sessionId = "my-session-123";  // (3)!

    // First interaction
    const result1 = await neurolink.generate({
      input: { text: "What is NeuroLink?" },
      context: { sessionId },  // (4)!
      provider: "google-ai",
      enableEvaluation: true,
    });

    // Second interaction - memory preserved
    const result2 = await neurolink.generate({
      input: { text: "How do I enable HITL?" },
      context: { sessionId },  // (5)!
      provider: "google-ai",
    });

    console.log(result2.content);  // AI remembers previous context
    ```

    1. Enable conversation memory for stateful sessions
    2. Use Redis for persistence across restarts
    3. Create a session identifier
    4. Attach session ID to track conversation
    5. Reuse same session ID to maintain context

## Session Commands

Inside the loop prompt (`⎔ neurolink »`) you can manage context without leaving the session:

| Command                | Purpose                                                 | Example                   |
| ---------------------- | ------------------------------------------------------- | ------------------------- |
| `/help`                | Show loop-specific commands plus full CLI help.         | `/help`                   |
| `/set <key> <value>`   | Persist a generation option (validated against schema). | `/set provider google-ai` |
| `/get <key>`           | Inspect the current value.                              | `/get provider`           |
| `/unset <key>`         | Remove a single session variable.                       | `/unset temperature`      |
| `/show`                | List all session variables.                             | `/show`                   |
| `/clear`               | Reset every session variable.                           | `/clear`                  |
| `exit` / `quit` / `:q` | Leave loop mode.                                        | `exit`                    |

### Common Variables

- `provider` – any provider except `auto` (`/set provider google-ai`).
- `model` – model slug from `models list` (`/set model gemini-2.5-pro`).
- `temperature` – floating point number (`/set temperature 0.6`).
- `enableEvaluation` / `enableAnalytics` – toggles for observability (`/set enableEvaluation true`).
- `context` – JSON-encoded metadata (`/set context {"userId":"42"}`).
- `NEUROLINK_EVALUATION_THRESHOLD` – dynamic quality gate (`/set NEUROLINK_EVALUATION_THRESHOLD 8`).

> Type `/set help` in the loop to view every available key and its validation rules.

## Using CLI Commands in Loop Mode

In loop mode, you can interact with the AI naturally by typing your prompts directly:

```
⎔ neurolink » what are the seven wonders?
⎔ neurolink » explain quantum physics
⎔ neurolink » tell me a story about space exploration
```

To use other CLI commands explicitly, prefix them with a forward slash `/`:

```
⎔ neurolink » /generate "Draft changelog from sprint notes" --enableEvaluation
⎔ neurolink » /batch file.txt
⎔ neurolink » /status --verbose
⎔ neurolink » /models list --capability vision
```

:::tip[Quick Reference]

- **No prefix**: Streams a response to your prompt
- **`/` prefix**: Executes CLI commands or session commands (e.g., `/help`, `/set`, `/generate`, `/batch`)
- **`//` prefix**: Escape to stream prompts starting with `/` (e.g., `//what is /usr/bin?`)
- **Exit commands**: `exit`, `quit`, or `:q` work without prefix to leave loop mode
  :::

Errors are handled gracefully; parsing issues surface inline without closing the loop.

## Conversation Memory & Redis Auto-Detect

:::tip[Redis Persistence]
When Redis is detected, loop sessions survive restarts. Exit the loop, close your terminal, and resume later with the same session ID to continue where you left off. Perfect for long-running prompt engineering workflows.
:::

- By default the loop enables conversation memory (`--enable-conversation-memory=true`).
- `--auto-redis` probes for a reachable Redis instance using existing environment variables (`REDIS_URL`, etc.).
- When Redis is available you’ll see `✅ Using Redis for persistent conversation memory` in the banner.
- History is segmented by generated session IDs and stored with tool transcripts.

Manage history with standard CLI commands (inside or outside loop):

```bash
# Overview of stored sessions
npx @juspay/neurolink memory stats

# Export a specific transcript as JSON
npx @juspay/neurolink memory history NL_r1bd2 --format json > transcript.json

# Clear loop history
npx @juspay/neurolink memory clear NL_r1bd2
```

## Best Practices

- Commit to a provider/model via `/set` at the start of a session to avoid noisy auto-routing during experiments.
- Use `/set enableAnalytics true` and `/set enableEvaluation true` to apply observability globally.
- Combine with the interactive setup wizard (`neurolink setup --list`) to configure credentials mid-session.
- If you switch projects, run `/clear` or start a new loop to avoid leaking context.

## Troubleshooting

| Symptom                            | Resolution                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `A loop session is already active` | Use `exit` in the existing session or close the terminal tab before starting a new one. |
| Redis warning but memory disabled  | Ensure Redis credentials are valid or run with `--no-auto-redis`.                       |
| Session variable rejected          | Run `/set help` to check allowed values; booleans must be `true`/`false`.               |
| Commands exit unexpectedly         | Update to the latest CLI so the session-aware error handler is included.                |

## Related Features

**Q4 2025 Features:**

- [Redis Conversation Export](conversation-history.md) – Export loop session history as JSON for analytics

**Q3 2025 Features:**

- [Multimodal Chat](multimodal-chat.md) – Use images in loop sessions
- [Auto Evaluation](auto-evaluation.md) – Enable quality scoring with `set enableEvaluation true`

**Documentation:**

- [CLI Commands](../cli/commands.md) – Complete command reference
- [Conversation Memory](../conversation-memory.md) – Memory system deep dive
- [Mem0 Integration](../mem0-integration.md) – Semantic memory with vectors
