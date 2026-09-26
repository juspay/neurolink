# Logging Guidelines

How NeuroLink logs, and what a contributor has to get right. This documents the
convention the codebase already follows — it is not a proposal to change it.

## The logger

Import the shared logger. Never call `console.*` in `src/`: ESLint's
`no-console` rule fails the build for `console.log`, and the exceptions for
`warn`/`error`/`info` exist for a handful of legacy call sites, not as an
invitation.

```typescript
import { logger } from "../utils/logger.js";
```

There is one logger for the whole process. `logger.setEventEmitter()` attaches
the process-wide sink; per-instance events reach a worker only through its
`onLog` bridge (see [per-instance routing](#per-instance-routing) below).

## Levels

| Level   | Use for                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `debug` | Routine operation: request construction, cache hits, resolution steps, internal state. The default for anything that fires per request.    |
| `info`  | Events an operator would want in a quiet log: a server binding, a provider registering, an MCP server connecting. Not per-request chatter. |
| `warn`  | Something recoverable happened and the code carried on: a retry, a fallback, a deprecated option, a degraded capability.                   |
| `error` | An operation failed, or a failure was swallowed and the caller will not see it.                                                            |

`logger.always()` bypasses level filtering and writes to the console
unconditionally. It is **CLI output**, not logging — user-facing text that must
appear regardless of `--debug`. Of ~2,260 call sites, ~2,150 are in `src/cli/`.
Do not reach for it in `src/lib/`.

### Nothing below `error` is visible by default

`shouldLog()` suppresses every level except `error` unless debug mode is on
(`--debug`, or `NEUROLINK_DEBUG=true`). `NEUROLINK_LOG_LEVEL` then sets the
floor within debug mode. Two consequences worth internalising:

- A `debug` log is not emitted in a normal run, but its arguments are still
  evaluated. Prefer `debug` over silence.
- A condition a user must act on cannot be reported at `warn` alone — they will
  never see it. Either raise it to `error` or surface it on the result object.

### Choosing between `warn` and `debug`

The common mistake is logging an ordinary outcome at `warn`. If a branch is
reached on a healthy request, it is `debug`, however unwelcome it looks locally.
`FileDetector` is the worked example: a detection that lands below the
confidence threshold is the normal case for most files, so it logs at `debug`
and says so in a comment. A detection where _no_ strategy identified a type at
all is a genuine failure, and logs at `error`.

## Format

Pass a message and a structured data object. The message is a constant; the
variables go in the object, where a log consumer can index them.

```typescript
// Good
logger.debug("[OpenAI] Request built", {
  provider: this.providerName,
  model,
  toolCount: tools.length,
});

// Avoid — nothing downstream can filter on this
logger.debug(`[OpenAI] Built request for ${model} with ${tools.length} tools`);
```

Prefix the message with the emitting component in brackets — `[NeuroLink]`,
`[OpenAI]`, `[FileDetector]`, `[MCP]`. Grepping a debug run is how most of this
gets read.

Template literals are not banned, and a short one carrying a single value is
fine. What matters is that a value a consumer would want to filter on ends up in
the data object rather than baked into the message string.

## Guard expensive serialization

`logger.debug(...)` evaluates its arguments before `shouldLog()` ever runs, so a
`JSON.stringify` of a large payload costs full price on every request even when
nothing is logged. Guard it:

```typescript
if (logger.shouldLog("debug")) {
  logger.debug("[Provider] Full response", {
    body: safeDebugSerialize(response),
  });
}
```

The guard is only needed for work that is expensive to produce. Passing an
object you already hold is free — the logger does not serialize it unless it
emits.

## Never log secrets

API keys, tokens, credentials, presigned URL query strings, user prompt content
and absolute host paths must not reach a log or a thrown error message.
`src/lib/utils/logSanitize.ts` has the helpers, and they are the reason several
past leaks are closed:

| Helper                      | Use for                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `redactUrlForError(url)`    | A URL in a log or error — strips query and fragment, so a presigned token cannot survive.  |
| `redactUrlCredentials`      | A URL that may carry `user:password@`.                                                     |
| `redactPathFromMessage`     | A filesystem path in a message.                                                            |
| `sanitizeErrorCause`        | An error from Node/undici — these embed the full request URL or path in their own message. |
| `sanitizeHeaders`           | A header bag before logging it.                                                            |
| `sanitizeRecord`            | An arbitrary object, with string truncation.                                               |
| `safeDebugSerialize`        | A large value in a debug log, length-capped.                                               |
| `transformParamsForLogging` | Tool-call parameters before logging them (this one lives in `transformationUtils.ts`).     |

The rule for errors is the same as for logs: an error message is read by more
people than a log line, not fewer.

## Per-instance routing

The logger attributes events to the NeuroLink instance that emitted them. The
SDK entry points — `generate`, `stream`, `generateText` — run their bodies
inside an `AsyncLocalStorage` scope carrying the instance's id, so a log call
anywhere beneath them is attributed without threading an instance through every
call site.

That is what lets a worker's `onLog` bridge
(`NeuroLink.createWorkerInstance({ onLog })`) receive only that worker's events.
Two things sit outside the scope by construction: logs emitted while a consumer
drains a returned stream (iteration runs in the consumer's context), and logs
emitted outside any call — construction, background MCP reconnects, module init
— which stay unattributed rather than being charged to an arbitrary instance.

A process-wide sink installed with `logger.setEventEmitter()` still receives
everything.

## Checklist for a new log call

- Level matches the table above, and a routine branch is `debug`.
- Message is a constant with a `[Component]` prefix; variables are in the data
  object.
- Anything expensive to build is behind `logger.shouldLog("debug")`.
- No key, token, credential, prompt body, presigned URL or absolute host path
  in either the message or the data — run it through `logSanitize.ts` if in
  doubt.
