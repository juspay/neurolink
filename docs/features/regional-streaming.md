---
title: Regional Streaming Controls
description: Region-specific model deployment and routing for compliance and latency optimization
keywords: regional routing, compliance, latency, data residency, aws region, multi-region
---

# Regional Streaming Controls

Latency, compliance, and model availability often depend on which region you call. NeuroLink 7.45.0 threads the `region` parameter through the generate/stream stack so you can target specific data centres when working with providers that expose regional endpoints.

## Supported Providers

| Provider                 | How to Set Region                                                          | Defaults    |
| ------------------------ | -------------------------------------------------------------------------- | ----------- |
| **Amazon Bedrock**       | `AWS_REGION` env, `config init`, or request `region` option                | `us-east-1` |
| **Amazon SageMaker**     | `SAGEMAKER_DEFAULT_ENDPOINT` + `AWS_REGION` or request `region`            | `us-east-1` |
| **Google Vertex AI**     | `GOOGLE_VERTEX_LOCATION` / `config init` / request `region`                | `us-east5`  |
| **Azure OpenAI**         | Deployment-specific endpoint; use `AZURE_OPENAI_ENDPOINT` (region encoded) | —           |
| **LiteLLM pass-through** | Use LiteLLM server configuration                                           | —           |

Providers without native region controls ignore the option safely.

## CLI Usage

The CLI reads region information from configuration profiles or provider environment variables.

```bash
# Bedrock: ensure AWS credentials + region set
export AWS_REGION=ap-south-1
npx @juspay/neurolink generate "Translate catalog" --provider bedrock

# Vertex AI: switch to Tokyo region for lower latency
export GOOGLE_VERTEX_LOCATION=asia-northeast1
npx @juspay/neurolink stream "Localise onboarding" --provider vertex --model gemini-2.5-pro

# One-off override via shell env
AWS_REGION=eu-west-1 npx @juspay/neurolink stream "Summarise EMEA incidents" --provider bedrock
```

Run `neurolink config init` to persist region defaults per provider.

## SDK Usage

```typescript
const neurolink = new NeuroLink({ enableOrchestration: true });

const result = await neurolink.generate({
  input: { text: "Compile regional latency metrics" },
  provider: "vertex",
  model: "gemini-2.5-pro",
  region: "europe-west4",
  enableEvaluation: true,
});

console.log(result.content, result.provider);
```

Streaming obeys the same option:

```typescript
const stream = await neurolink.stream({
  input: { text: "Narrate service availability" },
  provider: "bedrock",
  model: "anthropic.claude-3-sonnet",
  region: "eu-central-1",
});
```

## Operational Tips

!!! tip "Compliance & Data Residency"
Use regional routing to comply with data sovereignty requirements (GDPR, HIPAA, etc.). Pin the `region` parameter to ensure AI processing stays within approved geographical boundaries for sensitive workloads.

!!! tip "Latency Optimization"
Co-locate your NeuroLink deployment with your application servers. For example, if your API runs in `eu-west-1`, set `region: "eu-west-1"` for Bedrock/Vertex calls to minimize cross-region latency penalties.

- **Compliance** – ensure the requested region is enabled for the model (e.g., Anthropic via Vertex only supports `us` regions).
- **Latency** – co-locate with your application servers to avoid cross-region penalties.
- **Fallbacks** – when orchestration re-routes to a provider that ignores `region`, the call completes but logs a warning.
- **Credentials** – AWS requests still require valid IAM credentials; Vertex needs service account rights in the target location.

## Troubleshooting

| Symptom                                | Fix                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `Invalid region format`                | Use standard IDs (`us-east-1`, `asia-northeast1`).                         |
| `Model not available in region`        | Switch to a supported region or change model (see provider console).       |
| `Credential error after region change` | Re-run `neurolink config init` so stored credentials match the new region. |
| `High latency on fallback provider`    | Disable orchestration or pin a provider/model explicitly.                  |

## Related Material

- [SageMaker Integration Guide](../SAGEMAKER-INTEGRATION.md)
- [Enterprise Proxy Setup](../ENTERPRISE-PROXY-SETUP.md)
- [Dynamic Models Guide](../advanced/dynamic-models.md)
