---
title: Guardrails Middleware
description: Block PII, profanity, and unsafe content with built-in content filtering and safety checks
keywords: guardrails, content filtering, PII detection, safety, middleware, bad words, profanity
---

# Guardrails Middleware

> **Since**: v7.42.0 | **Status**: Stable | **Availability**: SDK (CLI + SDK)

## Overview

**What it does**: Guardrails middleware provides real-time content filtering and policy enforcement for AI model outputs, blocking profanity, PII, unsafe content, and custom-defined terms.

**Why use it**: Protect your application from generating harmful, inappropriate, or non-compliant content. Ensures AI responses meet safety standards and regulatory requirements.

**Common use cases**:

- Content moderation for user-facing applications
- PII (Personally Identifiable Information) redaction
- Profanity filtering for family-friendly apps
- Compliance with industry regulations (COPPA, GDPR, etc.)
- Brand safety and reputation management

## Quick Start

:::tip[Zero Configuration]
Guardrails work out of the box with the `security` preset. No custom configuration required for basic content filtering.
:::

### SDK Example with Security Preset

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  middleware: {
    preset: "security", // (1)!
  },
});

const result = await neurolink.generate({
  // (2)!
  prompt: "Tell me about security best practices",
});

// Output is automatically filtered for bad words and unsafe content
console.log(result.content); // (3)!
```

1. Enables guardrails middleware with default configuration
2. All generate/stream calls automatically apply filtering
3. Content is already filtered - safe to display to users

### Custom Guardrails Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
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
            filterModel: "gpt-4o-mini", // (5)!
          },
        },
      },
    },
  },
});
```

1. Master switch for guardrails middleware
2. Enable keyword-based filtering (fast, regex-based)
3. Custom terms to filter/redact from outputs
4. Enable AI-powered content safety check (slower, more accurate)
5. Use fast, cheap model for safety evaluation

### CLI Usage

```bash
# Enable guardrails via environment variable
export NEUROLINK_MIDDLEWARE_PRESET="security"

npx @juspay/neurolink generate "Write a product description" --enable-analytics

# Guardrails are automatically applied to all generations
```

## Configuration

| Option                    | Type       | Default | Required | Description                          |
| ------------------------- | ---------- | ------- | -------- | ------------------------------------ |
| `enabled`                 | `boolean`  | `true`  | No       | Enable/disable guardrails middleware |
| `badWords.enabled`        | `boolean`  | `false` | No       | Enable keyword-based filtering       |
| `badWords.list`           | `string[]` | `[]`    | No       | List of terms to filter/redact       |
| `modelFilter.enabled`     | `boolean`  | `false` | No       | Enable AI-based content safety check |
| `modelFilter.filterModel` | `string`   | -       | No       | Model to use for safety evaluation   |

### Environment Variables

```bash
# Enable guardrails preset
export NEUROLINK_MIDDLEWARE_PRESET="security"

# Or enable all middleware (includes guardrails + analytics)
export NEUROLINK_MIDDLEWARE_PRESET="all"
```

### Config File

```typescript
// .neurolink.config.ts
export default {
  middleware: {
    preset: "security",
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          badWords: {
            enabled: true,
            list: [
              // Custom filtered terms
              "confidential",
              "internal-use-only",
              // PII patterns
              "ssn",
              "credit-card",
            ],
          },
          modelFilter: {
            enabled: true,
            filterModel: "gpt-4o-mini", // Fast, cheap safety model
          },
        },
      },
    },
  },
};
```

## How It Works

### Filtering Pipeline

1. **User prompt** → Sent to AI model
2. **AI generates response** → Initial content created
3. **Guardrails middleware intercepts**:
   - **Bad word filtering**: Regex-based term replacement
   - **Model-based filtering**: AI evaluates content safety
4. **Filtered response** → Delivered to user

### Bad Word Filtering

Simple regex-based replacement:

```typescript
// Input: "This contains spam and other spam words"
// Output: "This contains **** and other **** words"
```

- Case-insensitive matching
- Replaces with asterisks (`*`) of equal length
- Works in both `generate` and `stream` modes

### Model-Based Filtering

:::danger[PII Detection Accuracy]
While guardrails filter common PII patterns, always review critical outputs manually. False negatives can occur with obfuscated data or uncommon PII formats. For high-stakes compliance, combine with dedicated PII detection services.
:::

AI-powered safety check:

```typescript
// Guardrails sends content to filter model:
// "Is the following text safe? Respond with only 'safe' or 'unsafe'."

// If unsafe:
// Output: "<REDACTED BY AI GUARDRAIL>"
```

- Uses separate, lightweight model (e.g., `gpt-4o-mini`)
- Binary safe/unsafe classification
- Full redaction on unsafe detection

## Advanced Usage

### Combining with Other Middleware

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  middleware: {
    preset: "all", // Enables guardrails + analytics + others
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          badWords: {
            enabled: true,
            list: ["profanity1", "profanity2"],
          },
        },
      },
      analytics: {
        enabled: true,
      },
    },
  },
});
```

### Streaming with Guardrails

```typescript
const stream = await neurolink.streamText({
  prompt: "Write a long story",
});

// Chunks are filtered in real-time as they stream
for await (const chunk of stream) {
  console.log(chunk.content); // Already filtered
}
```

### Dynamic Guardrails

```typescript
// Add/remove filtered terms dynamically
const customWords = await loadBlocklistFromDatabase();

const neurolink = new NeuroLink({
  middleware: {
    middlewareConfig: {
      guardrails: {
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

- `preset: "security"` → Enables guardrails with defaults
- `preset: "all"` → Enables guardrails + all other middleware
- `middlewareConfig.guardrails` → Custom guardrails configuration

See [guardrails-ai-integration.md](../guardrails-ai-integration.md) for complete integration guide.

## Troubleshooting

### Problem: Guardrails not filtering content

**Cause**: Middleware not enabled or preset not configured
**Solution**:

```typescript
// Ensure preset is set or guardrails explicitly enabled
const neurolink = new NeuroLink({
  middleware: {
    preset: "security", // ← Must set this
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
    filterModel: "gpt-4o-mini",  // ← Fast and cheap
    // filterModel: "gpt-4",  // ❌ Too slow/expensive
  },
}
```

### Problem: Guardrails not working in streaming mode

**Cause**: Streaming guardrails only support bad word filtering (not model-based)
**Solution**:

```typescript
// For streaming, rely on bad word filtering
// Model-based filtering works in generate() mode only
const result = await neurolink.generate({
  // Use generate, not stream
  prompt: "...",
});
```

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
  guardrails: {
    badWords: {
      enabled: true,  // Fast regex filtering
      list: [...criticalTerms],
    },
    modelFilter: {
      enabled: false,  // Disable for speed (or use sampling)
    },
  },
}
```

## Compliance Use Cases

### COPPA (Children's Online Privacy)

```typescript
config: {
  badWords: {
    enabled: true,
    list: ["email", "phone", "address", "age", "location"],
  },
  modelFilter: {
    enabled: true,  // Detect attempts to collect PII
  },
}
```

### GDPR Data Protection

```typescript
config: {
  badWords: {
    enabled: true,
    list: [
      "credit-card", "ssn", "passport",
      "bank-account", "medical-record",
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

1. Guardrails are now enabled via middleware presets
2. Old `guardrailsConfig` option deprecated - use `middlewareConfig.guardrails`
3. No breaking changes - existing configs still work
4. Recommended: Switch to `preset: "security"` for simplified setup

For complete technical documentation and advanced integration patterns, see [guardrails-ai-integration.md](../guardrails-ai-integration.md).
