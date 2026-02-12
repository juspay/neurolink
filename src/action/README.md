# NeuroLink GitHub Action

Run AI-powered workflows with 13 providers directly in GitHub Actions.

## Quick Start

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this code"
    post_comment: true
```

## Supported Providers

| Provider          | Input                       | Example Models                             |
| ----------------- | --------------------------- | ------------------------------------------ |
| OpenAI            | `openai_api_key`            | gpt-4o, gpt-4o-mini, o1                    |
| Anthropic         | `anthropic_api_key`         | claude-sonnet-4-20250514, claude-3-5-haiku |
| Google AI         | `google_ai_api_key`         | gemini-2.5-pro, gemini-2.5-flash           |
| Vertex AI         | `google_vertex_project`     | gemini-_, claude-_                         |
| Bedrock           | `aws_access_key_id`         | claude-_, titan-_, nova-\*                 |
| Azure             | `azure_openai_api_key`      | gpt-4o, gpt-4-turbo                        |
| Mistral           | `mistral_api_key`           | mistral-large, mistral-small               |
| Hugging Face      | `huggingface_api_key`       | Various open models                        |
| OpenRouter        | `openrouter_api_key`        | 300+ models                                |
| LiteLLM           | `litellm_api_key`           | Proxy to 100+ models                       |
| Ollama            | -                           | Local models                               |
| SageMaker         | `aws_access_key_id`         | Custom endpoints                           |
| OpenAI-Compatible | `openai_compatible_api_key` | vLLM, custom APIs                          |

## Features

- **Multi-provider support** - 13 AI providers with unified interface
- **PR/Issue comments** - Auto-post AI responses with comment updates
- **Cost tracking** - Built-in analytics with `enable_analytics: true`
- **Quality evaluation** - Response scoring with `enable_evaluation: true`
- **Multimodal** - Support for images, PDFs, CSVs, videos
- **Extended thinking** - Deep reasoning with thinking tokens
- **Job summaries** - Detailed execution summaries in workflow runs

## Inputs

See [action.yml](../../action.yml) for complete input documentation.

## Outputs

| Output             | Description                                 |
| ------------------ | ------------------------------------------- |
| `response`         | AI response text                            |
| `response_json`    | Full response with metadata                 |
| `provider`         | Provider used                               |
| `model`            | Model used                                  |
| `tokens_used`      | Total tokens consumed                       |
| `cost`             | Estimated cost (if analytics enabled)       |
| `evaluation_score` | Quality score 0-100 (if evaluation enabled) |
| `comment_id`       | GitHub comment ID (if post_comment enabled) |

## Examples

See [examples/](examples/) for workflow templates:

- PR code review
- Issue triage with labeling
- Code generation

## Security

- All API keys are automatically masked in logs
- Use GitHub Secrets for all credentials
- Consider OIDC for AWS instead of static keys

## License

MIT - See [LICENSE](../../LICENSE)
