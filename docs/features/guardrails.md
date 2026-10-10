---
title: Guardrails Middleware
description: Redact prohibited terms and patterns, block unsafe prompts and screen responses with a safety model, configured per call
keywords: guardrails, content filtering, PII redaction, safety, middleware, bad words, profanity
---

# Guardrails Middleware

> **Since**: v7.42.0 | **Status**: Stable | **Availability**: SDK only (no CLI flag)

## Overview

**What it does**: The guardrails middleware filters what goes into and comes out of a model call. It can redact terms or regex patterns from responses, ask a safety model whether a response is safe, and evaluate a prompt before it reaches the model, blocking or sanitizing it.

**What it does not do**: It has no built-in word list, PII detector or safety model. Every check is off until you configure it, so turning the middleware on (for example with `preset: "security"`) filters nothing by itself.

**Common use cases**:

- Redacting internal terms, codenames or known-sensitive strings from responses
- Masking PII that matches a pattern you supply (emails, phone numbers, IDs)
- Profanity filtering against your own list
- Screening prompts with a safety model before they reach the main model

## How guardrails are enabled

Guardrails are configured **per call**, through the `middleware` option of `generate()` and `stream()`. There is no instance-wide or global switch:

- The `NeuroLink` constructor does not accept a `middleware` option.
- No environment variable (such as `NEUROLINK_MIDDLEWARE_PRESET`) or config file enables middleware.
- The CLI has no guardrails flag.

To apply the same guardrails everywhere, keep the configuration in one object and pass it on every call (see [Sharing one configuration](#sharing-one-configuration)).

Two things must both be true for anything to be filtered:

1. **The middleware is enabled** for the call, by any one of:
   - `preset: "security"` (guardrails only) or `preset: "all"` (guardrails and analytics);
   - `middlewareConfig.guardrails.enabled: true`;
   - `enabledMiddleware: ["guardrails"]`.

   A `middlewareConfig.guardrails` entry without one of these stays disabled.

2. **At least one check is configured** in `middlewareConfig.guardrails.config`: `badWords`, `modelFilter` or `precallEvaluation`.

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write a product description" },
  middleware: {
    preset: "security", // (1)!
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: {
            enabled: true, // (2)!
            list: ["spam", "scam"], // (3)!
          },
        },
      },
    },
  },
});

// "This is spam and a scam." comes back as
// "This is [REDACTED] and a [REDACTED]."
console.log(result.content);
```

1. Enables the guardrails middleware for this call; the preset alone configures no checks
2. Turns on term redaction
3. Terms to redact from the response, matched case-insensitively

## Configuration

All checks live under `middleware.middlewareConfig.guardrails.config`.

### `badWords` — redact terms and patterns

| Option            | Type       | Default        | Description                                                |
| ----------------- | ---------- | -------------- | ---------------------------------------------------------- |
| `enabled`         | `boolean`  | `false`        | Turn redaction on                                          |
| `list`            | `string[]` | `[]`           | Literal terms to redact                                    |
| `regexPatterns`   | `string[]` | `[]`           | Regular expressions to redact; when set, `list` is ignored |
| `replacementText` | `string`   | `"[REDACTED]"` | What each match is replaced with                           |

Matching rules:

- Both forms match **case-insensitively**, as substrings. `list: ["spam"]` also redacts the `spam` in `spammer` (giving `[REDACTED]mer`); use `regexPatterns: ["\\bspam\\b"]` to match whole words only.
- `list` entries are literal text (regex characters are escaped). `regexPatterns` entries are compiled with the `gi` flags; an invalid pattern is logged and skipped.
- If both `list` and `regexPatterns` are set, only `regexPatterns` is applied, and a warning is logged.

### `modelFilter` — ask a safety model about the response

| Option        | Type                     | Default | Description                                                                                                   |
| ------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| `enabled`     | `boolean`                | `false` | Turn the model check on                                                                                       |
| `filterModel` | `string` or model handle | -       | `"provider:model"` (e.g. `"openai:gpt-4o-mini"`), a bare model id for the default provider, or a model handle |

After `badWords` runs, the response text is sent to `filterModel` with the prompt `Is the following text safe? Respond with only "safe" or "unsafe".` If the answer is exactly `unsafe`, every text part of the response is replaced with `<REDACTED BY AI GUARDRAIL>`. The check:

- runs on `generate()` only, not on `stream()`;
- needs `filterModel` set — `enabled: true` without it does nothing;
- **fails open**: if the filter model cannot be created or called, the error is logged and the response is returned as is.

### `precallEvaluation` — screen the prompt before the call

| Option                 | Type       | Default              | Description                                                                      |
| ---------------------- | ---------- | -------------------- | -------------------------------------------------------------------------------- |
| `enabled`              | `boolean`  | `false`              | Turn prompt evaluation on                                                        |
| `provider`             | `string`   | `"google-ai"`        | Provider for the evaluation model                                                |
| `evaluationModel`      | `string`   | `"gemini-2.5-flash"` | Evaluation model                                                                 |
| `evaluationPrompt`     | `string`   | built-in             | Custom evaluation prompt; `{USER_INPUT}` is replaced with the user's text        |
| `thresholds`           | `object`   | `7` / `6`            | `safetyScore` and `appropriatenessScore` (1–10) below which a prompt is flagged  |
| `actions`              | `object`   | per action           | `onUnsafe` (default `block`), `onInappropriate` (`warn`), `onSuspicious` (`log`) |
| `sanitizationPatterns` | `string[]` | `[]`                 | Regexes applied to the prompt when the action is `sanitize`                      |
| `replacementText`      | `string`   | `"[REDACTED]"`       | Replacement used by `sanitizationPatterns`                                       |

The user's text is scored by the evaluation model before the main model is called. A `block` action skips the main model and returns `Request contains inappropriate content and has been blocked.` as the response (on `stream()`, as the only chunk). `sanitize` rewrites the user's text with `sanitizationPatterns`; `warn` and `log` only log. Like the model filter, the evaluation **fails open**: an evaluation error or an unparseable answer allows the prompt.

## How It Works

1. **Before the call** — if `precallEvaluation` is enabled, the prompt is evaluated and may be blocked or sanitized.
2. **The model responds.**
3. **After the call** — `badWords` redacts the response text, then (on `generate()` only) `modelFilter` may replace it.

On `generate()`, adjacent text parts are joined before filtering, so a term split across two parts is still caught.

### Streaming

`stream()` applies `precallEvaluation` and `badWords`; `modelFilter` is not applied.

With `badWords` enabled, the stream is **buffered**, not filtered chunk by chunk: a run of text is held until a non-text part arrives or the stream ends, then filtered as one string and released. This is what stops a prohibited term split across chunks from slipping through, but it means a filtered stream typically arrives as a single text chunk at the end instead of incrementally. Without `badWords`, chunks pass through unbuffered.

```typescript
const result = await neurolink.stream({
  input: { text: "Write a long story" },
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["confidential"] },
        },
      },
    },
  },
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content); // already filtered
  }
}
```

## Advanced Usage

### Sharing one configuration

The SDK has no global middleware setting, so define the configuration once and pass it on each call:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const guardrails = {
  preset: "security",
  middlewareConfig: {
    guardrails: {
      config: {
        badWords: {
          enabled: true,
          regexPatterns: [
            "\\b[\\w.+-]+@[\\w-]+\\.[\\w.]+\\b", // email addresses
            "\\b\\d{3}-\\d{2}-\\d{4}\\b", // US SSN format
          ],
        },
      },
    },
  },
};

const neurolink = new NeuroLink();

const a = await neurolink.generate({
  input: { text: "Summarise the ticket" },
  middleware: guardrails,
});
const b = await neurolink.stream({
  input: { text: "Draft a reply" },
  middleware: guardrails,
});
```

### Model-based filtering

```typescript
const result = await neurolink.generate({
  input: { text: "Write a product description" },
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["inappropriate-term"] },
          modelFilter: {
            enabled: true,
            filterModel: "openai:gpt-4o-mini", // fast, cheap safety model
          },
        },
      },
    },
  },
});
```

### Pre-call evaluation

```typescript
const result = await neurolink.generate({
  input: { text: userMessage },
  middleware: {
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          precallEvaluation: {
            enabled: true,
            provider: "google-ai",
            evaluationModel: "gemini-2.5-flash",
            actions: { onUnsafe: "block", onInappropriate: "sanitize" },
            sanitizationPatterns: ["\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b"], // phone numbers
          },
        },
      },
    },
  },
});
```

### Combining with other middleware

`preset: "all"` enables exactly two built-in middleware: analytics and guardrails. Guardrails still need a configured check:

```typescript
const result = await neurolink.generate({
  input: { text: "Draft a refund policy" },
  middleware: {
    preset: "all", // analytics + guardrails
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: {
            enabled: true,
            list: ["profanity1", "profanity2"],
          },
        },
      },
    },
  },
});
```

### Dynamic word lists

The configuration is read on every call, so a list loaded at runtime applies immediately:

```typescript
const customWords = await loadBlocklistFromDatabase();

const result = await neurolink.generate({
  input: { text: "Write a product description" },
  middleware: {
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          badWords: {
            enabled: true,
            list: [...customWords, "static-term"],
          },
        },
      },
    },
  },
});
```

## API Reference

- `preset: "security"` → enables the guardrails middleware; configures no checks
- `preset: "all"` → enables the analytics and guardrails middleware; configures no checks
- `middlewareConfig.guardrails.enabled` → enables the guardrails middleware
- `enabledMiddleware: ["guardrails"]` → enables the guardrails middleware
- `middlewareConfig.guardrails.config` → `badWords`, `modelFilter`, `precallEvaluation` (see [Configuration](#configuration))

See [guardrails-ai-integration.md](../guardrails-ai-integration.md) for using the middleware directly with `MiddlewareFactory`.

## Troubleshooting

### Problem: Guardrails not filtering content

**Cause**: The middleware is enabled but no check is configured, or a check is configured but the middleware is not enabled. A bare `preset: "security"` redacts nothing, and so does a `middlewareConfig.guardrails` entry without `enabled: true` (or a preset, or `enabledMiddleware`).

**Solution**: enable the middleware **and** configure a check, on the call itself:

```typescript
const result = await neurolink.generate({
  input: { text: "Tell me about security best practices" },
  middleware: {
    preset: "security", // enables the middleware
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["confidential"] }, // the check
        },
      },
    },
  },
});
```

Also check that `middleware` is on the `generate()` / `stream()` options, not on `new NeuroLink({ ... })`, which does not read it.

### Problem: Too many false positives (legitimate content filtered)

**Cause**: `list` terms match as case-insensitive substrings, so short or common terms hit inside other words.

**Solution**: use specific terms, or whole-word regexes:

```typescript
badWords: {
  enabled: true,
  regexPatterns: ["\\bvery-specific-bad-term\\b"],
}
```

### Problem: Model-based filter is slow

**Cause**: Every `generate()` call makes a second model call to the filter model.

**Solution**: use a small, fast model, or rely on `badWords` for high-throughput paths:

```typescript
modelFilter: {
  enabled: true,
  filterModel: "openai:gpt-4o-mini",
}
```

### Problem: Model filter has no effect in streaming mode

**Cause**: `modelFilter` runs on `generate()` only. `stream()` applies `badWords` and `precallEvaluation`.

**Solution**: use `generate()` where a model-based check is required:

```typescript
const result = await neurolink.generate({
  input: { text: "..." },
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        config: {
          modelFilter: { enabled: true, filterModel: "openai:gpt-4o-mini" },
        },
      },
    },
  },
});
```

### Problem: A filtered stream arrives all at once

**Cause**: With `badWords` enabled, text is buffered so a term split across chunks cannot slip through (see [Streaming](#streaming)).

**Solution**: this is expected. If incremental delivery matters more than catching split terms, filter the stream yourself instead of using `badWords`.

## Best Practices

1. **Configure a check explicitly** — a preset only switches the middleware on.
2. **Prefer patterns for PII** — `list: ["email"]` redacts the word "email", not email addresses; use `regexPatterns` for data shapes.
3. **Layer protections** — `badWords` for known terms, `modelFilter` or `precallEvaluation` for open-ended safety.
4. **Remember the model checks fail open** — if the filter or evaluation model is unavailable, content passes; do not rely on them as the only control for compliance.
5. **Test with real content** — verify filtering does not break legitimate responses, and monitor false positives.

:::danger[PII Detection Accuracy]
Pattern-based redaction only catches what your patterns describe. Obfuscated or unusually formatted data will get through. For high-stakes compliance, combine guardrails with a dedicated PII detection service.
:::

## Related Features

- [HITL Workflows](./hitl.md) - User approval for risky actions
- [Middleware Architecture](../middleware.md) - Custom middleware development
- [Analytics Integration](../advanced/analytics.md) - Track filtered content metrics
