---
title: "Per-Request Credentials"
description: Pass provider API keys per NeuroLink instance or per generate/stream call for multi-tenant AI applications
keywords: [credentials, api-key, multi-tenant, byok, per-request]
---

# Per-Request Credentials

> **Status**: Stable | **Availability**: SDK only

## Overview

NeuroLink allows provider credentials to be supplied at two levels below the environment-variable default: on the `NeuroLink` constructor (instance level) and on individual `generate()` / `stream()` calls (per-call level). Credentials are resolved in the following order of precedence:

```
per-call credentials  >  instance credentials  >  environment variables
```

This enables multi-tenant architectures where different users or tenants supply their own provider API keys (bring-your-own-key, BYOK), without requiring separate NeuroLink instances per user or touching the process environment.

Typical use cases:

- **Multi-tenant SaaS** — each API request carries the calling user's provider key; no shared key leakage between tenants
- **BYOK products** — end users paste their OpenAI / Anthropic keys in settings; you forward them to NeuroLink per call
- **Testing and CI** — inject credentials programmatically without setting environment variables
- **Provider switching** — override only the active provider's credentials while leaving others to fall through to env vars

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Instance-level default: all calls from this instance use these credentials
const neurolink = new NeuroLink({
  credentials: {
    openai: { apiKey: "sk-instance-key" },
  },
});

// Per-call override: this single call uses a different key
const result = await neurolink.generate({
  input: { text: "Summarize this document" },
  provider: "openai",
  credentials: {
    openai: { apiKey: "sk-tenant-key" },
  },
});
```

## Instance-Level vs Per-Call

### Instance-Level Credentials

Set `credentials` in the `NeuroLink` constructor. These apply as the default for every `generate()` and `stream()` call made on that instance. Useful when serving a single tenant or when you have a known key for the duration of the instance lifecycle.

```typescript
const neurolink = new NeuroLink({
  credentials: {
    anthropic: { apiKey: "sk-ant-..." },
    openai: { apiKey: "sk-..." },
  },
});
```

### Per-Call Credentials

Set `credentials` directly on `generate()` or `stream()`. These override the instance-level credentials for that single call only. Only the providers you explicitly set are overridden — others continue falling through to instance credentials and then environment variables.

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic",
  credentials: {
    anthropic: { apiKey: "sk-ant-user-specific-key" },
    // openai left unset — falls through to instance or env var
  },
});
```

### Precedence Rules

| Level       | Scope                 | Set on                                                   |
| ----------- | --------------------- | -------------------------------------------------------- |
| Per-call    | Single request only   | `generate({ credentials })` or `stream({ credentials })` |
| Instance    | All calls on instance | `new NeuroLink({ credentials })`                         |
| Environment | Process-wide fallback | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …                 |

Unset providers at any level fall through to the next. You never need to repeat a credential at the per-call level if the instance default is correct.

## Provider Credential Reference

All fields are optional — omit any field you want to fall through to a lower-precedence level.

| Provider          | Key                | Fields                                                                                             |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| OpenAI            | `openai`           | `apiKey`, `baseURL`                                                                                |
| Anthropic         | `anthropic`        | `apiKey`, `oauthToken`                                                                             |
| Google AI Studio  | `googleAiStudio`   | `apiKey`                                                                                           |
| Google Vertex AI  | `vertex`           | `projectId`, `location`, `apiKey` (Express Mode), `serviceAccountKey`, `clientEmail`, `privateKey` |
| Amazon Bedrock    | `bedrock`          | `accessKeyId`, `secretAccessKey`, `sessionToken`, `region`                                         |
| Amazon SageMaker  | `sagemaker`        | `accessKeyId`, `secretAccessKey`, `sessionToken`, `region`, `endpoint`                             |
| Azure OpenAI      | `azure`            | `apiKey`, `resourceName`, `deploymentName`, `apiVersion`                                           |
| Mistral           | `mistral`          | `apiKey`                                                                                           |
| Hugging Face      | `huggingFace`      | `apiKey`, `baseURL`                                                                                |
| OpenRouter        | `openrouter`       | `apiKey`, `baseURL`                                                                                |
| LiteLLM           | `litellm`          | `apiKey`, `baseURL`                                                                                |
| OpenAI-Compatible | `openaiCompatible` | `apiKey`, `baseURL`                                                                                |
| Ollama            | `ollama`           | `baseURL`                                                                                          |

The full type definition is `NeurolinkCredentials` in `src/lib/types/providers.ts`.

## SDK Examples

### OpenAI

```typescript
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum entanglement" },
  provider: "openai",
  model: "gpt-4o",
  credentials: {
    openai: { apiKey: "sk-tenant-abc123" },
  },
});
```

Custom base URL for OpenAI-compatible proxies:

```typescript
credentials: {
  openai: { apiKey: "sk-...", baseURL: "https://my-proxy.example.com/v1" },
}
```

### Anthropic

```typescript
const result = await neurolink.generate({
  input: { text: "Write a haiku" },
  provider: "anthropic",
  credentials: {
    anthropic: { apiKey: "sk-ant-api03-..." },
  },
});
```

OAuth token (Anthropic Claude subscription):

```typescript
credentials: {
  anthropic: { oauthToken: "eyJ..." },
}
```

### Vertex AI — Express Mode

Express Mode uses a simple API key instead of service-account credentials, making it suitable for per-request BYOK flows:

```typescript
const result = await neurolink.generate({
  input: { text: "Summarize this" },
  provider: "vertex",
  model: "gemini-2.5-pro",
  credentials: {
    vertex: {
      apiKey: "AIza...", // Express Mode key
      projectId: "my-project",
      location: "us-central1",
    },
  },
});
```

Full service-account credentials (server-side only — keep private keys out of client code):

```typescript
credentials: {
  vertex: {
    projectId: "my-project",
    location: "us-central1",
    serviceAccountKey: JSON.stringify(serviceAccountJson),
    // OR inline fields:
    // clientEmail: "sa@project.iam.gserviceaccount.com",
    // privateKey: "-----BEGIN RSA PRIVATE KEY-----\n...",
  },
}
```

### Amazon Bedrock

```typescript
const result = await neurolink.generate({
  input: { text: "Draft a press release" },
  provider: "bedrock",
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  credentials: {
    bedrock: {
      accessKeyId: "AKIA...",
      secretAccessKey: "wJalrXUt...",
      region: "us-east-1",
      // sessionToken: "AQoDYXdz..." // for temporary STS credentials
    },
  },
});
```

### Azure OpenAI

```typescript
const result = await neurolink.generate({
  input: { text: "Translate to French" },
  provider: "azure",
  credentials: {
    azure: {
      apiKey: "az-key-...",
      resourceName: "my-azure-resource",
      deploymentName: "gpt-4o",
      apiVersion: "2024-02-01",
    },
  },
});
```

### Streaming with Credentials

`credentials` works identically on `stream()`. Note that `neurolink.stream()`
returns a `StreamResult` wrapper — iterate over its `.stream` property:

```typescript
const result = await neurolink.stream({
  input: { text: "Tell me a story" },
  provider: "openai",
  credentials: {
    openai: { apiKey: "sk-tenant-xyz" },
  },
});

for await (const chunk of result.stream) {
  if ("content" in chunk && chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

### Multi-Tenant Request Handler

A typical pattern for a multi-tenant API endpoint. Note the provider-name →
credential-key mapping: the registered provider names (`google-ai`,
`openai-compatible`, `huggingface`) differ from their `NeurolinkCredentials`
slot keys (`googleAiStudio`, `openaiCompatible`, `huggingFace`), so map
explicitly to avoid runtime surprises.

```typescript
import { NeuroLink, type NeurolinkCredentials } from "@juspay/neurolink";

// Maps registered provider names to their NeurolinkCredentials slot keys.
// Most providers are 1:1; only the three camelCase ones need translation.
const PROVIDER_TO_CRED_KEY = {
  openai: "openai",
  anthropic: "anthropic",
  "google-ai": "googleAiStudio",
  vertex: "vertex",
  bedrock: "bedrock",
  sagemaker: "sagemaker",
  azure: "azure",
  mistral: "mistral",
  huggingface: "huggingFace",
  openrouter: "openrouter",
  litellm: "litellm",
  "openai-compatible": "openaiCompatible",
  ollama: "ollama",
} as const satisfies Record<string, keyof NeurolinkCredentials>;

// Single shared instance — no keys baked in
const neurolink = new NeuroLink();

async function handleAIRequest(req: Request) {
  const { prompt, provider, tenantApiKey } = await req.json();
  const credKey =
    PROVIDER_TO_CRED_KEY[provider as keyof typeof PROVIDER_TO_CRED_KEY];
  if (!credKey) {
    return Response.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  }

  const result = await neurolink.generate({
    input: { text: prompt },
    provider,
    credentials: {
      // This example uses { apiKey: tenantApiKey } which works for API-key providers.
      [credKey]: { apiKey: tenantApiKey },
    } as NeurolinkCredentials,
  });

  return Response.json({ text: result.content });
}
```

> **Note:** This example assumes API-key authentication. Providers like Bedrock
> (which use `accessKeyId`/`secretAccessKey`) and Ollama (which use `baseURL`)
> require different credential shapes — see the [Provider Credential Reference](#provider-credential-reference) above.

## Limitations

1. **CLI does not support `--credentials`** — passing API keys as CLI flags would expose them in shell history, process lists, and log aggregators. Use environment variables for CLI usage instead.

2. **No credential rotation within a streaming call** — credentials are resolved once when `generate()` or `stream()` is called; you cannot swap keys mid-stream.

3. **No built-in secret storage** — NeuroLink passes credentials directly to the underlying provider SDK. Key storage, rotation, and encryption are the caller's responsibility. Consider integrating with a secrets manager (AWS Secrets Manager, HashiCorp Vault, Passetto) before injecting credentials into calls.

4. **Ollama accepts only `baseURL`** — Ollama does not use API keys; only the endpoint URL can be overridden.

5. **Unrecognised fields are silently ignored** — each provider only reads the fields documented in the reference table above. Passing extra fields has no effect.

6. **Internal fallback switches providers** — When a provider call fails and NeuroLink's internal fallback activates (selecting a different provider), the per-request credentials scoped to the original provider do not apply to the fallback provider. The fallback provider resolves credentials from its own instance-level or environment-variable sources. If you need strict per-call credential control and want to prevent fallback provider switches, set `disableInternalFallback: true` on the stream/generate call.

## Key Files

| File                                    | Purpose                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/types/providers.ts`            | `NeurolinkCredentials` type definition                                     |
| `src/lib/types/configTypes.ts`          | `NeurolinkConstructorConfig.credentials` field                             |
| `src/lib/types/generateTypes.ts`        | `GenerateOptions.credentials` + `TextGenerationOptions.credentials` fields |
| `src/lib/types/streamTypes.ts`          | `StreamOptions.credentials` field                                          |
| `src/lib/factories/providerFactory.ts`  | Per-provider credential slice extraction                                   |
| `src/lib/factories/providerRegistry.ts` | All 21+ provider factory registrations                                     |
| `src/lib/neurolink.ts`                  | `resolveCredentials()` merge helper + `generate()`/`stream()` threading    |

## See Also

- [Authentication Providers](/docs/features/authentication-providers) -- token validation, RBAC, and session management for your own API endpoints
- [Observability Guide](/docs/features/observability) -- tracing generate/stream calls. Credentials are passed only to the underlying provider SDK, not captured in NeuroLink span attributes; if you attach custom span enrichment, avoid logging the `credentials` field.
- [SDK API Reference](/docs/sdk/api-reference) -- complete SDK reference
