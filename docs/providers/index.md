# Provider Documentation

This section contains comprehensive documentation for all AI providers supported by NeuroLink.

## Quick Links

- **[Capability Matrix](capability-matrix.md)** - Complete feature comparison across all providers
- **[Provider Comparison](../reference/provider-comparison.md)** - Use case recommendations and cost analysis
- **[Provider Behavior](../provider-behavior.md)** - Provider-specific quirks and best practices
- **[Feature Compatibility](../reference/provider-feature-compatibility.md)** - Test-based compatibility reference

## Supported Providers

NeuroLink supports 12 AI providers with unified access through a single API:

| Provider          | Documentation                                                         | Status        |
| ----------------- | --------------------------------------------------------------------- | ------------- |
| OpenAI            | [Setup Guide](../getting-started/provider-setup.md#openai)            | ✅ Production |
| Anthropic         | [Setup Guide](../getting-started/provider-setup.md#anthropic)         | ✅ Production |
| Google AI Studio  | [Setup Guide](../getting-started/provider-setup.md#google-ai)         | ✅ Production |
| Google Vertex AI  | [Setup Guide](../getting-started/provider-setup.md#vertex)            | ✅ Production |
| AWS Bedrock       | [Setup Guide](../getting-started/provider-setup.md#bedrock)           | ✅ Production |
| Azure OpenAI      | [Setup Guide](../getting-started/provider-setup.md#azure)             | ✅ Production |
| LiteLLM           | [Integration Guide](../LITELLM-INTEGRATION.md)                        | ✅ Production |
| AWS SageMaker     | [Integration Guide](../SAGEMAKER-INTEGRATION.md)                      | ✅ Production |
| Mistral AI        | [Setup Guide](../getting-started/provider-setup.md#mistral)           | ✅ Production |
| Hugging Face      | [Setup Guide](../getting-started/provider-setup.md#huggingface)       | ✅ Production |
| Ollama            | [Setup Guide](../OLLAMA-SETUP.md)                                     | ✅ Production |
| OpenAI Compatible | [Setup Guide](../getting-started/provider-setup.md#openai-compatible) | ✅ Production |

## Choosing a Provider

See the [Capability Matrix](capability-matrix.md) for detailed feature comparison, or use this quick guide:

- **Getting Started?** → [Google AI Studio](../getting-started/provider-setup.md#google-ai) (free tier)
- **Production Quality?** → [OpenAI](../getting-started/provider-setup.md#openai) or [Anthropic](../getting-started/provider-setup.md#anthropic)
- **Enterprise/Compliance?** → [Vertex AI](../getting-started/provider-setup.md#vertex), [Bedrock](../getting-started/provider-setup.md#bedrock), or [Azure](../getting-started/provider-setup.md#azure)
- **Privacy-Critical?** → [Ollama](../OLLAMA-SETUP.md) (local)
- **EU Compliance?** → [Mistral AI](../getting-started/provider-setup.md#mistral)
- **Multi-Provider?** → [LiteLLM](../LITELLM-INTEGRATION.md) (100+ models)
