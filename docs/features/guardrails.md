---
title: Guardrails Middleware
description: Redact configured terms and add model-based safety checks with guardrails middleware, set per call, per instance, per process or from the environment
keywords: guardrails, content filtering, safety, middleware, bad words, redaction, preset, defaults
---

# Guardrails Middleware

> **Since**: v7.29.0 | **Status**: Stable | **Availability**: SDK; the CLI reads `NEUROLINK_MIDDLEWARE_PRESET`

## Overview

**What it does**: Guardrails is a built-in language-model middleware (id `guardrails`) that checks what a model returns, and optionally what a user sends. It has three mechanisms. Each is off until you configure it:

- **Bad-word filtering** replaces matches of terms or regular expressions you list with a fixed string. Works in `generate()` and `stream()`.
- **Model-based filtering** asks a second model whether the reply is safe and replaces the whole reply if the answer is `unsafe`. `generate()` only.
- **Pre-call evaluation** asks a model to judge the user's input before the request is sent, and answers a blocked request with a fixed refusal. Works in `generate()` and `stream()`.

**What it does not do**: Guardrails ships no word list, no profanity list and no PII patterns. With nothing configured it changes nothing, including under `preset: "security"`. It is a text filter, not a compliance control: a term that is not in your list passes through, and a model-based check can miss unsafe content or be unavailable (see [Model-Based Filtering](#model-based-filtering)). Built-in PII detection is a separate `piiDetection` option on `generate()` and `stream()`, not part of guardrails.

**Common use cases**:

- Redacting a known set of terms (brand names, internal codenames, banned words) from model output
- A second-opinion safety check on replies from `generate()`
- Refusing requests that an evaluator model judges unsafe before they reach the main model

## Quick Start

### Redact terms on one call

```typescript
import { NeuroLink } from "@juspay/neurolink";

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
            list: ["spam", "scam"],
          },
        },
      },
    },
  },
});

// A reply of "This is spam and a scam." arrives as
// "This is [REDACTED] and a [REDACTED]."
console.log(result.content);
```

Both `middlewareConfig.guardrails.enabled` and `badWords.enabled` must be `true`, and `list` or `regexPatterns` must be non-empty. Missing any one of them filters nothing.

### Set it once for an instance

```typescript
const neurolink = new NeuroLink({
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["spam", "scam"] },
        },
      },
    },
  },
});

// Every generate(), stream() and generateText() on this instance is filtered
await neurolink.generate({ input: { text: "Write a product description" } });
```

The `preset: "security"` line is what switches guardrails on here; the word list is what makes it filter.

### Set it once for the process

```typescript
import {
  configureGlobalMiddleware,
  clearGlobalMiddleware,
} from "@juspay/neurolink";

configureGlobalMiddleware({
  preset: "security",
  middlewareConfig: {
    guardrails: {
      config: { badWords: { enabled: true, list: ["spam", "scam"] } },
    },
  },
});

// Every NeuroLink instance in this process now applies it, including
// instances created before this call.

clearGlobalMiddleware(); // back to the previous behaviour
```

### Turn a preset on from the environment

```bash
export NEUROLINK_MIDDLEWARE_PRESET="security"
```

:::warning[The security preset redacts nothing by itself]
`preset: "security"` only enables the guardrails middleware. It adds no `badWords` and no `modelFilter`, so until one of the layers below supplies them, a reply passes through unchanged. That is true of `NEUROLINK_MIDDLEWARE_PRESET=security` too. There is deliberately no default word list: a generic list gives false assurance and false positives.
:::

## Defaults and precedence

A call resolves its middleware from four layers. A higher layer overrides a lower one.

| Order       | Layer       | How you set it                       | Scope                                                                                                            |
| ----------- | ----------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1 (lowest)  | Environment | `NEUROLINK_MIDDLEWARE_PRESET`        | Read when each `NeuroLink` instance is constructed. A preset name only: `default`, `all` or `security`           |
| 2           | Global      | `configureGlobalMiddleware(options)` | The whole process. Read on every call, so existing instances pick it up. A later call replaces the earlier one   |
| 3           | Instance    | `new NeuroLink({ middleware })`      | That instance. Snapshotted at construction: later edits to your object's word lists or strings are not picked up |
| 4 (highest) | Per call    | `generate({ middleware })` and so on | That call                                                                                                        |

The defaults apply to `generate()`, `stream()` and `generateText()`. With no default set, a call behaves exactly as it did before: only its own `middleware` counts.

:::note[Calls NeuroLink makes for you]
The classifier router's model strategy and the probe call in `checkCredentials()` run through `generate()` on your own instance, so all of that instance's defaults apply to them. The SDK also creates separate `NeuroLink` instances for the file summariser, the conversation-memory condenser, the Redis conversation title generator and the image-generation service. Those see the environment layer, which every instance reads, and the global layer, which is read on every call, but not your instance's `middleware` option. A global `badWords` list therefore redacts file summaries and titles, and a global `precallEvaluation` sends whole file contents to the evaluator model.
:::

An unrecognised `NEUROLINK_MIDDLEWARE_PRESET` is ignored. A message naming the value is written to stderr, once per distinct value, whether or not debugging is on. A `preset` in a constructor or global default that is not `default`, `all` or `security` throws a `TypeError` at `new NeuroLink()` or `configureGlobalMiddleware()`, so a typo cannot silently replace a valid preset from a lower layer and leave guardrails off.

### How layers combine

| Option                                                          | Rule                                                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `preset`                                                        | The highest layer that sets one wins                                                                                                |
| `middlewareConfig`                                              | Merged per middleware id. Within an id, `enabled` and `conditions` come from the highest layer that sets them                       |
| `middlewareConfig.<id>.config`                                  | Merged key by key. A key set by a higher layer replaces the lower layer's value for that key as a whole: `badWords` is not combined |
| `middleware`, `enabledMiddleware`, `disabledMiddleware` (lists) | The highest layer that sets the list replaces it. Lists are never concatenated. An explicit `[]` clears an inherited list           |
| `global`                                                        | Merged key by key                                                                                                                   |

The factory applies `disabledMiddleware` after `enabledMiddleware`, so a lower layer's disabled list could out-vote a call that asked for the opposite. The merge prevents that: an id that a higher layer switches on, by `enabledMiddleware` or by `middlewareConfig.<id>.enabled: true`, is removed from a disabled list it would inherit, and the reverse.

```typescript
configureGlobalMiddleware({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: { badWords: { enabled: true, list: ["spam", "scam"] } },
    },
  },
});

const neurolink = new NeuroLink({
  middleware: {
    middlewareConfig: {
      // Replaces the global badWords as a whole: "spam" and "scam" are no
      // longer filtered, "refund" is. `enabled: true` is still inherited.
      guardrails: { config: { badWords: { enabled: true, list: ["refund"] } } },
    },
  },
});

await neurolink.generate({
  input: { text: "Draft a reply" },
  // Switch guardrails off for this call only
  middleware: { disabledMiddleware: ["guardrails"] },
});
```

## Configuration

These go under `middlewareConfig.guardrails.config`, except the first row.

| Option                                | Type              | Default                             | Description                                                                                                         |
| ------------------------------------- | ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `middlewareConfig.guardrails.enabled` | `boolean`         | `false`, unless a preset enables it | Master switch. `preset: "security"` and `preset: "all"` set it to `true`                                            |
| `badWords.enabled`                    | `boolean`         | `false`                             | Turn on term filtering                                                                                              |
| `badWords.list`                       | `string[]`        | none                                | Terms to redact. Case-insensitive, matched as substrings (no word boundaries), so `ass` also matches inside `class` |
| `badWords.regexPatterns`              | `string[]`        | none                                | Case-insensitive regular expressions. When both this and `list` are set, `list` is ignored and a warning is logged  |
| `badWords.replacementText`            | `string`          | `[REDACTED]`                        | What each match is replaced with. The replacement is a fixed string, not length-preserving                          |
| `modelFilter.enabled`                 | `boolean`         | `false`                             | Turn on the model-based check (`generate()` only)                                                                   |
| `modelFilter.filterModel`             | `string` or model | none                                | `"provider:model"`, a bare model id, or a model handle. See [Model-Based Filtering](#model-based-filtering)         |
| `precallEvaluation.enabled`           | `boolean`         | `false`                             | Evaluate the user's input before the call                                                                           |
| `precallEvaluation.provider`          | `string`          | `google-ai`                         | Provider of the evaluator model                                                                                     |
| `precallEvaluation.evaluationModel`   | `string`          | `gemini-2.5-flash`                  | Evaluator model                                                                                                     |

For `precallEvaluation` thresholds, actions and sanitization, see [guardrails-ai-integration.md](../guardrails-ai-integration.md).

### Environment variables

| Variable                      | Values                       | Effect                                                                                                                         |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NEUROLINK_MIDDLEWARE_PRESET` | `default`, `all`, `security` | Lowest-precedence default preset for every `NeuroLink` instance. Blank is ignored; unknown is ignored with a message on stderr |

| Preset     | Turns on              | Notes                                                                         |
| ---------- | --------------------- | ----------------------------------------------------------------------------- |
| `default`  | analytics             |                                                                               |
| `all`      | analytics, guardrails | Not everything: auto-evaluation and lifecycle are opt-in per call             |
| `security` | guardrails            | Filters nothing until `badWords`, `modelFilter` or `precallEvaluation` is set |

There is no config-file setting for middleware. Use the constructor option, `configureGlobalMiddleware()` or the environment variable.

### CLI

The CLI builds a `NeuroLink` instance, so `NEUROLINK_MIDDLEWARE_PRESET` applies to CLI runs too:

```bash
export NEUROLINK_MIDDLEWARE_PRESET="security"
npx @juspay/neurolink generate "Write a product description"
```

The CLI has no option for a word list or a model filter, so this enables guardrails and filters nothing. Use the SDK to choose what is filtered.

## How It Works

### Filtering Pipeline

1. Your request is sent to the model. With `precallEvaluation` on, an evaluator model sees the input first and an unsafe request is answered with `Request contains inappropriate content and has been blocked.` without reaching the main model.
2. The model replies.
3. The guardrails middleware filters the reply:
   - **Bad words**: the configured terms or patterns are replaced.
   - **Model filter** (`generate()` only): a second model classifies the reply.
4. The filtered reply is delivered.

### Bad Word Filtering

```typescript
// badWords.list = ["spam"]
// Input:  "This contains spam and other spam words"
// Output: "This contains [REDACTED] and other [REDACTED] words"
```

- Case-insensitive
- Replaces each match with a fixed string, `[REDACTED]` by default; override it with `badWords.replacementText`
- A term matches anywhere inside a word. Use `regexPatterns` with `\b` when you need word boundaries
- Works in both `generate()` and `stream()`

### Regex Patterns

`badWords.regexPatterns` takes regular expressions, each applied with the `gi` flags. When it is set it takes priority over `list`:

```typescript
badWords: {
  enabled: true,
  regexPatterns: [
    "\\b(password|secret)\\b",
    "\\d{3}-\\d{2}-\\d{4}", // SSN
    "\\d{16}", // card number
  ],
},
```

Patterns run synchronously against the whole response, so one that backtracks catastrophically would stall every request in the process. The cost comes from input that can be split between the parts of a pattern in many ways: a variable-length part (`+`, `*`, `?`, `{n,m}`) that can match the same text as whatever follows it. A pattern is refused when it:

- is longer than 1000 characters;
- repeats a group in which such a part can match the same text as what follows it, including the next iteration of the group: `(a+)+`, `(\w+\s*)*`, `(.*a){10}`, `(a?a?)+`, `(a{1,30}){1,30}`;
- repeats a group whose alternatives may overlap, such as `(a|aa)+` or `(\w|\d)+`;
- chains too many overlapping variable-length parts: more than 8 optional parts in a row (`a?a?a?a?a?a?a?a?a?`), or more than 4 open-ended ones (`.*a.*b.*c.*d.*e.*f`);
- uses a repetition bound above 500, such as `a{1,1000}`.

A repeated group is fine when each variable-length part is followed by something it cannot match. These all run: `(\d{1,3}\.){3}`, `([a-z0-9-]+\.)+[a-z]{2,}`, `(?:\d{4}[- ]?)+`, `\b(?:\d[ -]*?){13,16}\b`, `(?:\w+\s+)+`.

A refused pattern is skipped and logged as an error (`Refusing regex pattern ...`), the same way an invalid regex is. It is never thrown at the caller, and the other patterns in the list still run. Fail-open is the trade: **a skipped pattern filters nothing**, so check the logs after you change a pattern. The same limits apply to `precallEvaluation.sanitizationPatterns` (`Refusing sanitization pattern ...`).

The check reads the pattern; it does not run it, so it is conservative and not a proof:

- It refuses some safe patterns, such as a small fixed count of an ambiguous part (`(a{1,3}){3}`). Flatten it (`a{1,9}`) or split it.
- It compares character classes on a fixed sample of characters (Latin text plus a few other scripts), so a class that only overlaps outside the sample can look disjoint. A back-reference is assumed to overlap with everything.
- Exponential shapes built from optional parts are only partly covered: loops and long chains are refused, but the check is a model of the engine, not the engine. Open-ended repeats that cost polynomial time (`.*.*.*x`, up to four in a row) are accepted.

Use `list` for plain terms, and test a pattern on long input before deploying it. A hard guarantee would need a time budget around the match itself (a `node:vm` timeout or a worker), which is a possible follow-up.

### Streaming

With `badWords.enabled: true`, `stream()` holds each run of text and filters it as one string, so a term split across chunks is still caught. The run is released when a non-text part arrives or the stream ends. Filtering therefore costs incremental delivery: you may receive a long reply in one piece at the end rather than as it is generated. With bad-word filtering off, chunks pass through unbuffered.

```typescript
const result = await neurolink.stream({
  input: { text: "Write a long story" },
  middleware: {
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: { badWords: { enabled: true, list: ["spam"] } },
      },
    },
  },
});

for await (const chunk of result.stream) {
  if ("content" in chunk && typeof chunk.content === "string") {
    process.stdout.write(chunk.content); // already filtered
  }
}
```

`neurolink.streamText(prompt, options?)` is the older string-only form: it takes the prompt as its first argument and yields plain strings, not objects with a `content` field.

### Model-Based Filtering

```typescript
const result = await neurolink.generate({
  input: { text: "Summarise this ticket" },
  middleware: {
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          modelFilter: {
            enabled: true,
            filterModel: "openai:gpt-4o-mini",
          },
        },
      },
    },
  },
});
```

After the main model replies, the text is sent to the filter model with the prompt `Is the following text safe? Respond with only "safe" or "unsafe".` If the answer, trimmed and lower-cased, is exactly `unsafe`, each text part of the reply is replaced by `<REDACTED BY AI GUARDRAIL>`. Any other answer leaves the reply alone.

- **`generate()` only.** `stream()` does not run the model filter.
- **`filterModel` as a string** is `"provider:model"`. A bare model id such as `gpt-4o-mini` is created on the default provider (`NEUROLINK_PROVIDER`, then `AI_PROVIDER`, then `vertex`), so name the provider unless that is what you want.
- **It fails open.** If the filter model cannot be created or the call fails, an error is logged and the reply is returned unfiltered.
- **The reply text leaves for another model.** The filter model's provider sees what the main model said.

### Pre-Call Evaluation

With `precallEvaluation.enabled: true`, the user's input is sent to an evaluator model (`google-ai` with `gemini-2.5-flash` unless you set `provider` and `evaluationModel`). An input it judges unsafe is blocked by default; if the evaluator errors, the request is allowed. This needs credentials for the evaluator's provider.

## Advanced Usage

### Combining with Other Middleware

```typescript
const result = await neurolink.generate({
  input: { text: "Draft a refund policy" },
  middleware: {
    preset: "all", // analytics + guardrails
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["profanity1", "profanity2"] },
        },
      },
    },
  },
});
```

### Dynamic Guardrails

A per-call `middleware` can carry a list you load at request time. It replaces the list from any default, because lists are replaced rather than combined.

```typescript
const customWords = await loadBlocklistFromDatabase();

const result = await neurolink.generate({
  input: { text: "Write a product description" },
  middleware: {
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          badWords: { enabled: true, list: [...customWords, "static-term"] },
        },
      },
    },
  },
});
```

## API Reference

- `new NeuroLink({ middleware })`: instance default, a `MiddlewareFactoryOptions` object
- `configureGlobalMiddleware(options)`: process-wide default; replaces the previous one and throws a `TypeError` if `options` is not an object
- `clearGlobalMiddleware()`: remove the process-wide default
- `generate({ middleware })`, `stream({ middleware })`, `generateText({ middleware })`: per-call, highest precedence
- `preset: "security"`: guardrails on, nothing configured
- `preset: "all"`: analytics and guardrails
- `middlewareConfig.guardrails`: the configuration described above

See [guardrails-ai-integration.md](../guardrails-ai-integration.md) for pre-call evaluation in depth.

## Troubleshooting

### Problem: Guardrails not filtering content

**Cause**: One of the switches is missing, or only a preset is set. `preset: "security"` enables guardrails but gives them nothing to filter.
**Solution**: Set all of these, on the call, the instance or the global default:

```typescript
const result = await neurolink.generate({
  input: { text: "Tell me about security best practices" },
  middleware: {
    preset: "security", // or middlewareConfig.guardrails.enabled: true
    middlewareConfig: {
      guardrails: {
        config: {
          badWords: { enabled: true, list: ["a-term-you-want-removed"] },
        },
      },
    },
  },
});
```

If a default is set but a call still passes through, check whether the call's own `middleware` switches guardrails off (`disabledMiddleware` or `enabled: false`) or replaces the list.

### Problem: Too many false positives (legitimate content filtered)

**Cause**: Terms match anywhere inside a word, so a short or common term catches unrelated words.
**Solution**: Use specific terms, or a regular expression with word boundaries:

```typescript
config: {
  badWords: {
    enabled: true,
    regexPatterns: ["\\bfree\\b"], // "free" but not "freedom"
  },
}
```

### Problem: A regex pattern is not filtering anything

**Cause**: The pattern was refused for its length or its shape, or it is not valid regex. Both are skipped, and the log says which
**Solution**: Look for `Refusing regex pattern` (or `Invalid regex pattern`) in the error log. A refusal names the reason, for example a repeated group whose variable-length part can match the same text as what follows it. Separate the parts with a character they cannot match (`([\w-]+\.)+` instead of `([\w-]+)+`), split a long pattern into several, or move plain terms to `badWords.list`

### Problem: Model-based filter is slow or does nothing

**Cause**: A large filter model adds a second round trip to every `generate()`. If the filter model cannot be created, for example a bare id that does not exist on the default provider, the failure is logged and the reply is returned unfiltered.
**Solution**: Use a small model and name its provider:

```typescript
config: {
  modelFilter: {
    enabled: true,
    filterModel: "openai:gpt-4o-mini",
  },
}
```

### Problem: Guardrails not working in streaming mode

**Cause**: `stream()` supports bad-word filtering and pre-call evaluation but not the model filter.
**Solution**: Use `badWords` for streams, or use `generate()` when you need the model filter.

### Problem: NEUROLINK_MIDDLEWARE_PRESET has no effect

**Cause**: The name is not `default`, `all` or `security` (it is then ignored, with a message on stderr), the variable was set after the `NeuroLink` instance was constructed, or a higher layer sets its own `preset`.
**Solution**: Export it before the process starts, and check the layer order in [Defaults and precedence](#defaults-and-precedence).

## Best Practices

1. **Name what you filter.** The presets enable guardrails; your word list or filter model does the filtering.
2. **Set a default for every call you cannot audit.** An instance or global default is applied even where a call site forgot `middleware`.
3. **Prefer specific terms or word-boundary patterns** to short common words.
4. **Test with a real reply.** Run a call that should be filtered and one that should not, and check both.
5. **Treat the model filter as best effort.** It fails open and sees only text parts.

## Related Features

- [HITL Workflows](./hitl.md) - User approval for risky actions
- [Middleware Architecture](../advanced/middleware-architecture.md) - How the middleware chain is built
- [Built-in Middleware](../advanced/builtin-middleware.md) - Analytics, guardrails and auto-evaluation
- [Guardrails AI Integration](../guardrails-ai-integration.md) - Pre-call evaluation and `MiddlewareFactory` usage

## Migration Notes

Instance, global and environment defaults were added after guardrails were first released. They are optional: a call that passes its own `middleware` and sets no default behaves as it always did.
