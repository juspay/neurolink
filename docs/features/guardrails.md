---
title: Guardrails Middleware
description: Block PII, profanity, and unsafe content with built-in content filtering and safety checks
keywords: guardrails, content filtering, PII detection, safety, middleware, bad words, profanity
---

# Guardrails Middleware

> **Since**: v7.42.0 | **Status**: Stable | **Availability**: SDK (per-call `middleware` option; the CLI has no guardrails flag)

## Overview

**What it does**: Guardrails middleware provides real-time content filtering and policy enforcement for AI model outputs, blocking profanity, PII, unsafe content, and custom-defined terms.

**Why use it**: Redact terms you name, and optionally screen the user's input or the model's reply with a second model, before the text reaches your application.

**What it does not do on its own**: nothing is filtered until you turn guardrails on for a call **and** give them something to look for (a word list, regex patterns, a filter model or a pre-call evaluation). There is no built-in word list.

**Common use cases**:

- Content moderation for user-facing applications
- PII (Personally Identifiable Information) redaction
- Profanity filtering for family-friendly apps
- Compliance with industry regulations (COPPA, GDPR, etc.)
- Brand safety and reputation management

## Quick Start

:::warning[Opt-in per call, and empty by default]
Guardrails are configured on each `generate()` / `stream()` call through the `middleware` option. The `NeuroLink` constructor does not accept a `middleware` option, and no environment variable turns guardrails on.

`preset: "security"` only switches the guardrails middleware on. It ships no word list and no filter model, so on its own it redacts nothing. Add `badWords`, `modelFilter` or `precallEvaluation` as shown below.
:::

### SDK Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Tell me about security best practices" },
  middleware: {
    preset: "security", // (1)!
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["spam", "scam"] }, // (2)!
        },
      },
    },
  },
});

console.log(result.content); // (3)!
```

1. Turns the guardrails middleware on (the preset sets `guardrails.enabled: true` and nothing else)
2. The terms to redact; without this the call returns the model's text unchanged
3. "spam" and "scam" in the reply come back as `[REDACTED]`

### Custom Guardrails Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write a product description" },
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        enabled: true, // (1)!
        config: {
          badWords: {
            enabled: true, // (2)!
            list: ["spam", "scam", "inappropriate-term"], // (3)!
          },
          modelFilter: {
            enabled: true, // (4)!
            filterModel: "openai:gpt-4o-mini", // (5)!
          },
        },
      },
    },
  },
});
```

1. Master switch for guardrails middleware (the `security` preset sets this too)
2. Enable keyword-based filtering (fast, no extra model call)
3. Custom terms to redact from the reply (case-insensitive substring match)
4. Enable the AI safety check (an extra model call per `generate()`; `generate()` only, see below)
5. Model that judges the reply, as `"provider:model"` (a bare model id is created on the default provider)

### CLI

The CLI has no guardrails flag and does not read a guardrails environment variable, so `neurolink generate` and `neurolink stream` run without guardrails. Use the SDK, or place your own SDK code in front of the model.

## Configuration

Everything lives under the call's `middleware` option:

```typescript
middleware: {
  preset?: "default" | "all" | "security",
  middlewareConfig?: {
    guardrails?: { enabled?: boolean; config?: GuardrailsMiddlewareConfig },
  },
  enabledMiddleware?: string[],  // e.g. ["guardrails"]
  disabledMiddleware?: string[],
}
```

### Presets

| Preset     | Turns on                  | Notes                                                                                       |
| ---------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `default`  | `analytics`               | Applied only when the call sets none of `preset`, `middlewareConfig` or `enabledMiddleware` |
| `security` | `guardrails`              | Switch only; no word list or filter model                                                   |
| `all`      | `analytics`, `guardrails` | Not "all middleware": auto-evaluation and lifecycle are not included                        |

`middlewareConfig.guardrails.enabled: true` (or `enabledMiddleware: ["guardrails"]`) also works without a preset, and then enables nothing else. A `config` block on its own does not switch guardrails on: without a preset, `enabled: true` or `enabledMiddleware`, the options are ignored and nothing is redacted.

### Guardrails options (`middlewareConfig.guardrails.config`)

| Option                                                        | Type                                             | Default                          | Description                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `badWords.enabled`                                            | `boolean`                                        | off                              | Turn keyword/regex redaction on                                                                                      |
| `badWords.list`                                               | `string[]`                                       | none                             | Terms to redact: case-insensitive, matched anywhere in a word (`age` matches inside `page`)                          |
| `badWords.regexPatterns`                                      | `string[]`                                       | none                             | Regex sources, applied with the `gi` flags. When present, `list` is ignored                                          |
| `badWords.replacementText`                                    | `string`                                         | `[REDACTED]`                     | Replacement for every match                                                                                          |
| `modelFilter.enabled`                                         | `boolean`                                        | off                              | Ask a second model whether the reply is safe (`generate()` only)                                                     |
| `modelFilter.filterModel`                                     | `string`                                         | none                             | `"provider:model"`, a bare model id (default provider) or a model handle. Required when `modelFilter.enabled` is set |
| `precallEvaluation.enabled`                                   | `boolean`                                        | off                              | Have a model rate the user's input before the call                                                                   |
| `precallEvaluation.provider` / `.evaluationModel`             | `string`                                         | `google-ai` / `gemini-2.5-flash` | Model that rates the input                                                                                           |
| `precallEvaluation.thresholds`                                | `{ safetyScore?, appropriatenessScore? }`        | `7` / `6`                        | Scores below these trigger an action                                                                                 |
| `precallEvaluation.actions`                                   | `{ onUnsafe?, onInappropriate?, onSuspicious? }` | `block` / `warn` / `log`         | `block`, `sanitize`, `warn` or `log`                                                                                 |
| `precallEvaluation.sanitizationPatterns` / `.replacementText` | `string[]` / `string`                            | none / `[REDACTED]`              | Regexes applied to the input when an action is `sanitize`                                                            |

### Sharing one configuration

Because the constructor takes no `middleware`, keep the options in a constant and pass it on each call:

```typescript
const guard = {
  preset: "security",
  middlewareConfig: {
    guardrails: {
      config: { badWords: { enabled: true, list: ["confidential"] } },
    },
  },
};

await neurolink.generate({ input: { text: "..." }, middleware: guard });
await neurolink.stream({ input: { text: "..." }, middleware: guard });
```

There is no `.neurolink.config.ts` support for middleware.

## How It Works

### Filtering Pipeline

1. **Pre-call** (only with `precallEvaluation.enabled`): the user's input is rated; it is blocked, sanitized, or passed on with a log line
2. **The model answers**
3. **Bad word filtering** (`badWords.enabled`): matches in the reply are replaced
4. **Model-based filtering** (`modelFilter.enabled`, `generate()` only): a second model judges the reply
5. **The filtered reply** is returned

### Bad Word Filtering

Regex replacement, with no model call:

```typescript
// Input:  "This contains spam and other spam words"
// Output: "This contains [REDACTED] and other [REDACTED] words"
```

- Case-insensitive
- `list` entries match anywhere, including inside longer words; use `regexPatterns` with `\b` for word-bounded matching
- Replaces each match with a fixed string, `[REDACTED]` by default (not length-preserving asterisks); override it with `badWords.replacementText`
- Applies to `generate()` and `stream()`
- **Streaming buffers.** With `badWords.enabled`, each run of text is held back and filtered as one string, so a term split across chunks cannot slip through. The run is released when a non-text part arrives or the stream ends, which means a filtered stream does not deliver text incrementally. With bad-word filtering off, chunks pass through untouched.

### Model-Based Filtering

:::danger[PII Detection Accuracy]
Guardrails have no PII detector. They redact only the terms and patterns you configure, and the model filter is a single safe/unsafe judgement. False negatives are expected with obfuscated data or uncommon formats. For high-stakes compliance, combine with dedicated PII detection services.
:::

```typescript
// Guardrails sends the reply to the filter model:
// "Is the following text safe? Respond with only "safe" or "unsafe"."

// If the model answers "unsafe":
// Output: "<REDACTED BY AI GUARDRAIL>"
```

- Uses a separate, lightweight model (e.g. `openai:gpt-4o-mini`)
- Binary safe/unsafe classification; the whole reply is replaced on `unsafe`
- `generate()` only: the streaming path does not run it
- **Fails open.** If the filter model cannot be created or the call fails, the error is logged and the reply is returned unfiltered

### Pre-call Evaluation

With `precallEvaluation.enabled`, a model scores the user's input (safety and appropriateness, 1-10) before the main call. A blocked request returns the text `Request contains inappropriate content and has been blocked.` and the main model is never called. It also fails open: if the evaluation call or its parsing fails, the request is allowed.

## Advanced Usage

### Combining with Other Middleware

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

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

### Streaming with Guardrails

```typescript
const result = await neurolink.stream({
  input: { text: "Write a long story" },
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        config: { badWords: { enabled: true, list: ["spam"] } },
      },
    },
  },
});

// The middleware must be passed on the stream() call itself.
// With bad-word filtering on, text arrives in filtered runs rather than token by token.
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    console.log(chunk.content);
  }
}
```

### Dynamic Guardrails

```typescript
// Add/remove filtered terms dynamically
const customWords = await loadBlocklistFromDatabase();

const neurolink = new NeuroLink();

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

### Middleware Configuration

- `preset: "security"` → turns guardrails on (no word list, no filter model)
- `preset: "all"` → turns on analytics and guardrails
- `middlewareConfig.guardrails` → `{ enabled?, config? }`; `config` holds the options in the table above

See [guardrails-ai-integration.md](../guardrails-ai-integration.md) for the lower-level `MiddlewareFactory` integration.

## Troubleshooting

### Problem: Guardrails not filtering content

**Cause**: Guardrails were not passed on that call, or nothing is configured to match. A bare `preset: "security"` redacts nothing, and `middleware` set on `new NeuroLink({...})` is ignored.
**Solution**:

```typescript
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Tell me about security best practices" },
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        config: { badWords: { enabled: true, list: ["term-to-redact"] } }, // ← needed
      },
    },
  },
});
```

### Problem: Too many false positives (legitimate content filtered)

**Cause**: Overly aggressive bad word list
**Solution**:

```typescript
// Use more specific terms, avoid common words
config: {
  badWords: {
    list: [
      "very-specific-bad-term",  // Good
      // "free",  // Bad - too common
    ],
  },
}
```

### Problem: Model-based filter is slow

**Cause**: Using large/expensive model for filtering
**Solution**:

```typescript
// Switch to faster, cheaper model
config: {
  modelFilter: {
    enabled: true,
    filterModel: "openai:gpt-4o-mini",  // ← Fast and cheap
    // filterModel: "openai:gpt-4",  // ❌ Too slow/expensive
  },
}
```

### Problem: Guardrails not working in streaming mode

**Cause**: `middleware` was not passed to `stream()`, or `modelFilter` was the only filter configured (it runs for `generate()` only)
**Solution**:

```typescript
// Pass the same middleware to stream() and rely on badWords for streams
const result = await neurolink.stream({
  input: { text: "..." },
  middleware: guard, // e.g. the shared constant from "Sharing one configuration"
});
```

### Problem: Model-based filter does nothing

**Cause**: The filter fails open. If `filterModel` cannot be created (missing credentials for the provider, wrong id) or the call errors, the reply is returned unfiltered and the error appears only in the logs.
**Solution**: Use the `"provider:model"` form, make sure that provider is configured, and check the log for `Model-based filter failed`.

## Best Practices

### Content Filtering Strategy

1. **Start with presets** - Use `preset: "security"` as baseline
2. **Layer protections** - Combine bad words + model filtering
3. **Use lightweight filter models** - `gpt-4o-mini` for speed
4. **Test thoroughly** - Verify filtering doesn't break legitimate content
5. **Monitor and iterate** - Track false positives/negatives

### Bad Word List Curation

✅ **Do**:

- Include specific harmful terms
- Use exact phrases, not single characters
- Regularly update based on user reports
- Consider context-specific terms for your domain

❌ **Don't**:

- Add common English words (high false positive rate)
- Include single letters or short words
- Rely solely on bad words (use model filter too)

### Performance Optimization

```typescript
// For high-throughput applications:
config: {
  badWords: {
    enabled: true,  // Regex redaction, no model call
    list: [...criticalTerms],
  },
  modelFilter: {
    enabled: false,  // Skip the extra model call (or use sampling)
  },
}
```

## Compliance Use Cases

The configurations below are starting points, not a PII detector: they redact only what the patterns match. A plain `list` redacts the listed words wherever they appear (including inside longer words) and cannot recognise actual card numbers, SSNs or addresses, so formats are better expressed as `regexPatterns`.

### COPPA (Children's Online Privacy)

```typescript
config: {
  badWords: {
    enabled: true,
    regexPatterns: ["\\b(email|phone number|home address)\\b"],
  },
  modelFilter: {
    enabled: true,  // generate() only
    filterModel: "openai:gpt-4o-mini",
  },
}
```

### GDPR Data Protection

```typescript
config: {
  badWords: {
    enabled: true,
    regexPatterns: [
      "\\b\\d{3}-\\d{2}-\\d{4}\\b",       // US SSN shape
      "\\b(?:\\d[ -]?){13,16}\\b",           // card-number shape
    ],
  },
}
```

## Related Features

- [HITL Workflows](./hitl.md) - User approval for risky actions
- [Middleware Architecture](../middleware.md) - Custom middleware development
- [Analytics Integration](../advanced/analytics.md) - Track filtered content metrics

## Migration Notes

If upgrading from versions before v7.42.0:

1. Guardrails are enabled through the per-call `middleware` option (presets or `middlewareConfig.guardrails`)
2. There is no constructor-level or environment-variable switch; pass the options on each call
3. No breaking changes for per-call `middleware` configs

For complete technical documentation and advanced integration patterns, see [guardrails-ai-integration.md](../guardrails-ai-integration.md).
