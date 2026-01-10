# GitHub Action Guide

**Last Updated:** January 10, 2026
**NeuroLink Version:** 8.32.0

Run AI-powered workflows with 13 providers directly in GitHub Actions. The NeuroLink GitHub Action enables automated code review, issue triage, content generation, and more.

---

## Overview

The NeuroLink GitHub Action provides a unified interface to integrate AI capabilities into your CI/CD workflows. It supports all 13 NeuroLink providers through a single, consistent configuration.

**Key Features:**

- **Multi-provider support** - 13 AI providers with unified interface
- **PR/Issue comments** - Auto-post AI responses with intelligent comment updates
- **Cost tracking** - Built-in analytics with usage metrics
- **Quality evaluation** - Response scoring and validation
- **Multimodal** - Support for images, PDFs, CSVs, and videos
- **Extended thinking** - Deep reasoning with thinking tokens
- **Job summaries** - Detailed execution summaries in workflow runs

---

## Quick Start

### Basic Usage

```yaml
name: AI Workflow

on:
  pull_request:
    types: [opened]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-task:
    runs-on: ubuntu-latest
    steps:
      - uses: juspay/neurolink@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Review this pull request for potential issues"
          post_comment: true
```

### Auto Provider Detection

When you set `provider: auto` (the default), NeuroLink automatically selects the best available provider based on which API keys you provide:

```yaml
- uses: juspay/neurolink@v1
  with:
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Analyze this code"
    # Auto-selects from available providers
```

---

## Provider Configuration

NeuroLink supports 13 AI providers. Configure each by providing the required credentials as secrets.

### Provider Quick Reference

| Provider          | Required Inputs                                                    | Example Models                             |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| OpenAI            | `openai_api_key`                                                   | gpt-4o, gpt-4o-mini, o1                    |
| Anthropic         | `anthropic_api_key`                                                | claude-sonnet-4-20250514, claude-3-5-haiku |
| Google AI Studio  | `google_ai_api_key`                                                | gemini-2.5-pro, gemini-2.5-flash           |
| Vertex AI         | `google_vertex_project`, `google_application_credentials`          | gemini-\*, claude-\*                       |
| Amazon Bedrock    | `aws_access_key_id`, `aws_secret_access_key`                       | claude-\*, titan-\*, nova-\*               |
| Azure OpenAI      | `azure_openai_api_key`, `azure_openai_endpoint`                    | gpt-4o, gpt-4-turbo                        |
| Mistral           | `mistral_api_key`                                                  | mistral-large, mistral-small               |
| Hugging Face      | `huggingface_api_key`                                              | Various open models                        |
| OpenRouter        | `openrouter_api_key`                                               | 300+ models                                |
| LiteLLM           | `litellm_api_key`, `litellm_base_url`                              | Proxy to 100+ models                       |
| Ollama            | -                                                                  | Local models                               |
| SageMaker         | `aws_access_key_id`, `aws_secret_access_key`, `sagemaker_endpoint` | Custom endpoints                           |
| OpenAI-Compatible | `openai_compatible_api_key`, `openai_compatible_base_url`          | vLLM, custom APIs                          |

---

### OpenAI

```yaml
- uses: juspay/neurolink@v1
  with:
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    provider: openai
    model: gpt-4o
    prompt: "Your prompt here"
```

**Environment Variables:**

- `OPENAI_API_KEY` - Your OpenAI API key (starts with `sk-`)

**Available Models:**

- `gpt-4o` - Most capable model
- `gpt-4o-mini` - Fast and cost-effective
- `o1` - Advanced reasoning model
- `gpt-4-turbo` - Previous generation flagship

---

### Anthropic

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    provider: anthropic
    model: claude-sonnet-4-20250514
    prompt: "Your prompt here"
```

**Environment Variables:**

- `ANTHROPIC_API_KEY` - Your Anthropic API key (starts with `sk-ant-`)

**Available Models:**

- `claude-sonnet-4-20250514` - Best overall performance
- `claude-3-5-haiku` - Fast and efficient
- `claude-opus-4-20250514` - Maximum capability

**Extended Thinking Support:** Anthropic models support extended thinking for deep reasoning tasks.

---

### Google AI Studio

```yaml
- uses: juspay/neurolink@v1
  with:
    google_ai_api_key: ${{ secrets.GOOGLE_AI_API_KEY }}
    provider: google-ai
    model: gemini-2.5-flash
    prompt: "Your prompt here"
```

**Environment Variables:**

- `GOOGLE_AI_API_KEY` - Your Google AI Studio API key

**Available Models:**

- `gemini-2.5-pro` - Most capable Gemini model
- `gemini-2.5-flash` - Fast and cost-effective
- `gemini-2.0-flash` - Previous generation

**Free Tier:** Google AI Studio offers a generous free tier (1M tokens/day).

---

### Google Vertex AI

```yaml
- uses: juspay/neurolink@v1
  with:
    google_vertex_project: ${{ secrets.GCP_PROJECT_ID }}
    google_vertex_location: us-central1
    google_application_credentials: ${{ secrets.GCP_CREDENTIALS_BASE64 }}
    provider: vertex
    model: gemini-2.5-flash
    prompt: "Your prompt here"
```

**Environment Variables:**

- `GOOGLE_VERTEX_PROJECT` - Your GCP project ID
- `GOOGLE_VERTEX_LOCATION` - GCP region (default: `us-central1`)
- `GOOGLE_APPLICATION_CREDENTIALS` - Base64-encoded service account JSON

**Setup Service Account:**

```bash
# Create service account
gcloud iam service-accounts create neurolink-action

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:neurolink-action@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create key and base64 encode
gcloud iam service-accounts keys create key.json \
  --iam-account=neurolink-action@PROJECT_ID.iam.gserviceaccount.com
cat key.json | base64 > key_base64.txt
```

---

### Amazon Bedrock

```yaml
- uses: juspay/neurolink@v1
  with:
    aws_access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws_region: us-east-1
    bedrock_model_id: anthropic.claude-3-5-sonnet-20241022-v2:0
    provider: bedrock
    prompt: "Your prompt here"
```

**Environment Variables:**

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: `us-east-1`)
- `AWS_SESSION_TOKEN` - Optional session token for temporary credentials

**Available Models:**

- `anthropic.claude-3-5-sonnet-20241022-v2:0` - Claude on Bedrock
- `amazon.titan-text-express-v1` - Amazon Titan
- `amazon.nova-pro-v1:0` - Amazon Nova

**OIDC Authentication (Recommended):**

For better security, use GitHub OIDC instead of static credentials:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  ai-task:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - uses: juspay/neurolink@v1
        with:
          provider: bedrock
          bedrock_model_id: anthropic.claude-3-5-sonnet-20241022-v2:0
          prompt: "Your prompt here"
```

---

### Azure OpenAI

```yaml
- uses: juspay/neurolink@v1
  with:
    azure_openai_api_key: ${{ secrets.AZURE_OPENAI_API_KEY }}
    azure_openai_endpoint: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
    azure_openai_deployment: gpt-4o
    provider: azure
    prompt: "Your prompt here"
```

**Environment Variables:**

- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL (e.g., `https://your-resource.openai.azure.com`)
- `AZURE_OPENAI_DEPLOYMENT` - Deployment name

---

### Mistral

```yaml
- uses: juspay/neurolink@v1
  with:
    mistral_api_key: ${{ secrets.MISTRAL_API_KEY }}
    provider: mistral
    model: mistral-large-latest
    prompt: "Your prompt here"
```

**Environment Variables:**

- `MISTRAL_API_KEY` - Your Mistral API key

**Available Models:**

- `mistral-large-latest` - Most capable
- `mistral-small-latest` - Cost-effective
- `codestral-latest` - Optimized for code

---

### Hugging Face

```yaml
- uses: juspay/neurolink@v1
  with:
    huggingface_api_key: ${{ secrets.HUGGINGFACE_API_KEY }}
    provider: huggingface
    model: meta-llama/Llama-3.1-8B-Instruct
    prompt: "Your prompt here"
```

**Environment Variables:**

- `HUGGINGFACE_API_KEY` - Your Hugging Face API key (starts with `hf_`)

---

### OpenRouter

```yaml
- uses: juspay/neurolink@v1
  with:
    openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
    provider: openrouter
    model: anthropic/claude-3-5-sonnet
    prompt: "Your prompt here"
```

**Environment Variables:**

- `OPENROUTER_API_KEY` - Your OpenRouter API key

**Benefits:**

- Access to 300+ models through single API
- Pay-per-use pricing
- Automatic failover between providers

---

### LiteLLM

```yaml
- uses: juspay/neurolink@v1
  with:
    litellm_api_key: ${{ secrets.LITELLM_API_KEY }}
    litellm_base_url: https://your-litellm-proxy.com
    provider: litellm
    model: gpt-4
    prompt: "Your prompt here"
```

**Environment Variables:**

- `LITELLM_API_KEY` - Your LiteLLM API key
- `LITELLM_BASE_URL` - Your LiteLLM proxy URL

---

### Amazon SageMaker

```yaml
- uses: juspay/neurolink@v1
  with:
    aws_access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws_region: us-east-1
    sagemaker_endpoint: your-endpoint-name
    provider: sagemaker
    prompt: "Your prompt here"
```

**Environment Variables:**

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `SAGEMAKER_ENDPOINT` - SageMaker endpoint name

---

### OpenAI-Compatible

For self-hosted models (vLLM, Ollama, etc.) that implement the OpenAI API:

```yaml
- uses: juspay/neurolink@v1
  with:
    openai_compatible_api_key: ${{ secrets.CUSTOM_API_KEY }}
    openai_compatible_base_url: https://your-api.com/v1
    provider: openai-compatible
    model: your-model-name
    prompt: "Your prompt here"
```

**Environment Variables:**

- `OPENAI_COMPATIBLE_API_KEY` - API key for your endpoint
- `OPENAI_COMPATIBLE_BASE_URL` - Base URL for the API

---

## Inputs Reference

All inputs are organized by category for easy reference.

### Core Inputs

| Input    | Description                        | Required | Default |
| -------- | ---------------------------------- | -------- | ------- |
| `prompt` | The prompt to send to the AI model | Yes      | -       |

### Provider Selection

| Input      | Description                                                                                                                                                                  | Required | Default          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| `provider` | AI provider: `openai`, `anthropic`, `google-ai`, `vertex`, `azure`, `bedrock`, `mistral`, `huggingface`, `openrouter`, `litellm`, `ollama`, `sagemaker`, `openai-compatible` | No       | `auto`           |
| `model`    | Specific model to use                                                                                                                                                        | No       | Provider default |

### API Keys

| Input                       | Description               | Required | Default |
| --------------------------- | ------------------------- | -------- | ------- |
| `openai_api_key`            | OpenAI API key            | No       | -       |
| `anthropic_api_key`         | Anthropic API key         | No       | -       |
| `google_ai_api_key`         | Google AI Studio API key  | No       | -       |
| `azure_openai_api_key`      | Azure OpenAI API key      | No       | -       |
| `mistral_api_key`           | Mistral AI API key        | No       | -       |
| `huggingface_api_key`       | Hugging Face API key      | No       | -       |
| `openrouter_api_key`        | OpenRouter API key        | No       | -       |
| `litellm_api_key`           | LiteLLM API key           | No       | -       |
| `openai_compatible_api_key` | OpenAI-compatible API key | No       | -       |

### AWS Configuration

| Input                   | Description                             | Required | Default     |
| ----------------------- | --------------------------------------- | -------- | ----------- |
| `aws_access_key_id`     | AWS Access Key ID for Bedrock/SageMaker | No       | -           |
| `aws_secret_access_key` | AWS Secret Access Key                   | No       | -           |
| `aws_region`            | AWS Region                              | No       | `us-east-1` |
| `aws_session_token`     | AWS Session Token                       | No       | -           |
| `bedrock_model_id`      | AWS Bedrock model ID                    | No       | -           |
| `sagemaker_endpoint`    | Amazon SageMaker endpoint               | No       | -           |

### Google Cloud Configuration

| Input                            | Description                               | Required | Default       |
| -------------------------------- | ----------------------------------------- | -------- | ------------- |
| `google_vertex_project`          | Google Cloud project ID for Vertex AI     | No       | -             |
| `google_vertex_location`         | Google Cloud location                     | No       | `us-central1` |
| `google_application_credentials` | GCP service account JSON (base64 encoded) | No       | -             |

### Azure Configuration

| Input                     | Description                  | Required | Default |
| ------------------------- | ---------------------------- | -------- | ------- |
| `azure_openai_endpoint`   | Azure OpenAI endpoint URL    | No       | -       |
| `azure_openai_deployment` | Azure OpenAI deployment name | No       | -       |

### LiteLLM/OpenAI-Compatible Configuration

| Input                        | Description                | Required | Default |
| ---------------------------- | -------------------------- | -------- | ------- |
| `litellm_base_url`           | LiteLLM base URL           | No       | -       |
| `openai_compatible_base_url` | OpenAI-compatible base URL | No       | -       |

### Generation Parameters

| Input           | Description                                | Required | Default    |
| --------------- | ------------------------------------------ | -------- | ---------- |
| `temperature`   | Sampling temperature (0.0-2.0)             | No       | `0.7`      |
| `max_tokens`    | Maximum tokens in response                 | No       | `4096`     |
| `system_prompt` | System prompt for context                  | No       | -          |
| `command`       | CLI command: `generate`, `stream`, `batch` | No       | `generate` |

### Multimodal Inputs

| Input         | Description                 | Required | Default |
| ------------- | --------------------------- | -------- | ------- |
| `image_paths` | Comma-separated image paths | No       | -       |
| `pdf_paths`   | Comma-separated PDF paths   | No       | -       |
| `csv_paths`   | Comma-separated CSV paths   | No       | -       |
| `video_paths` | Comma-separated video paths | No       | -       |

### Extended Thinking

| Input              | Description                                        | Required | Default  |
| ------------------ | -------------------------------------------------- | -------- | -------- |
| `thinking_enabled` | Enable extended thinking                           | No       | `false`  |
| `thinking_level`   | Thinking level: `minimal`, `low`, `medium`, `high` | No       | `medium` |
| `thinking_budget`  | Thinking token budget                              | No       | `10000`  |

### Features

| Input               | Description                              | Required | Default |
| ------------------- | ---------------------------------------- | -------- | ------- |
| `enable_analytics`  | Enable usage analytics and cost tracking | No       | `false` |
| `enable_evaluation` | Enable response quality evaluation       | No       | `false` |
| `enable_tools`      | Enable MCP tools                         | No       | `false` |
| `mcp_config_path`   | Path to `.mcp-config.json` file          | No       | -       |

### Output Configuration

| Input           | Description                   | Required | Default |
| --------------- | ----------------------------- | -------- | ------- |
| `output_format` | Output format: `text`, `json` | No       | `text`  |
| `output_file`   | Output file path              | No       | -       |

### GitHub Integration

| Input                     | Description                                      | Required | Default               |
| ------------------------- | ------------------------------------------------ | -------- | --------------------- |
| `post_comment`            | Post AI response as PR/issue comment             | No       | `false`               |
| `update_existing_comment` | Update existing NeuroLink comment instead of new | No       | `true`                |
| `comment_tag`             | HTML comment tag to identify NeuroLink comments  | No       | `neurolink-action`    |
| `github_token`            | GitHub token for PR/issue operations             | No       | `${{ github.token }}` |

### Advanced Options

| Input               | Description                         | Required | Default  |
| ------------------- | ----------------------------------- | -------- | -------- |
| `timeout`           | Request timeout in seconds          | No       | `300`    |
| `debug`             | Enable debug logging                | No       | `false`  |
| `neurolink_version` | NeuroLink CLI version to install    | No       | `latest` |
| `working_directory` | Working directory for CLI execution | No       | `.`      |

---

## Outputs Reference

The action provides the following outputs for use in subsequent steps:

| Output              | Description                                  | Example                              |
| ------------------- | -------------------------------------------- | ------------------------------------ |
| `response`          | AI response text content                     | `"Here is the review..."`            |
| `response_json`     | Full JSON response including metadata        | `{"content": "...", "model": "..."}` |
| `provider`          | Provider that was used                       | `anthropic`                          |
| `model`             | Model that was used                          | `claude-sonnet-4-20250514`           |
| `tokens_used`       | Total tokens consumed                        | `1523`                               |
| `prompt_tokens`     | Input/prompt tokens                          | `423`                                |
| `completion_tokens` | Output/completion tokens                     | `1100`                               |
| `cost`              | Estimated cost in USD (if analytics enabled) | `0.0234`                             |
| `execution_time`    | Execution time in milliseconds               | `2341`                               |
| `evaluation_score`  | Quality score 0-100 (if evaluation enabled)  | `87`                                 |
| `comment_id`        | GitHub comment ID (if post_comment enabled)  | `1234567890`                         |
| `error`             | Error message if execution failed            | `null`                               |

### Using Outputs

```yaml
- name: AI Analysis
  uses: juspay/neurolink@v1
  id: ai
  with:
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    prompt: "Analyze this code"
    enable_analytics: true

- name: Use AI Response
  run: |
    echo "Response: ${{ steps.ai.outputs.response }}"
    echo "Tokens: ${{ steps.ai.outputs.tokens_used }}"
    echo "Cost: ${{ steps.ai.outputs.cost }}"
```

---

## Advanced Features

### Multimodal Processing

Process images, PDFs, CSVs, and videos along with text prompts.

#### Image Analysis

```yaml
- uses: actions/checkout@v4

- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Describe what you see in these screenshots"
    image_paths: "screenshots/screen1.png,screenshots/screen2.png"
    provider: anthropic
    model: claude-sonnet-4-20250514
```

#### PDF Processing

```yaml
- uses: juspay/neurolink@v1
  with:
    google_ai_api_key: ${{ secrets.GOOGLE_AI_API_KEY }}
    prompt: "Summarize the key points from this document"
    pdf_paths: "docs/report.pdf"
    provider: google-ai
    model: gemini-2.5-pro
```

#### CSV Analysis

```yaml
- uses: juspay/neurolink@v1
  with:
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    prompt: "Analyze trends in this data and provide insights"
    csv_paths: "data/metrics.csv"
    provider: openai
    model: gpt-4o
```

**Provider Multimodal Support:**

| Provider     | Images | PDFs | CSV | Video |
| ------------ | ------ | ---- | --- | ----- |
| Anthropic    | Yes    | Yes  | Yes | No    |
| OpenAI       | Yes    | No   | Yes | No    |
| Google AI    | Yes    | Yes  | Yes | Yes   |
| Vertex AI    | Yes    | Yes  | Yes | Yes   |
| Bedrock      | Yes    | Yes  | Yes | No    |
| Azure OpenAI | Yes    | No   | Yes | No    |

---

### Extended Thinking

Enable deep reasoning for complex tasks. Supported by Anthropic and Google AI/Vertex providers.

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: |
      Analyze this complex architecture and identify potential
      security vulnerabilities, performance bottlenecks, and
      suggest improvements.
    provider: anthropic
    model: claude-sonnet-4-20250514
    thinking_enabled: true
    thinking_level: high
    thinking_budget: "20000"
```

**Thinking Levels:**

| Level     | Description                  | Token Budget | Use Case            |
| --------- | ---------------------------- | ------------ | ------------------- |
| `minimal` | Quick reasoning              | ~2,000       | Simple analysis     |
| `low`     | Basic analysis               | ~5,000       | Code review         |
| `medium`  | Balanced reasoning (default) | ~10,000      | Architecture review |
| `high`    | Deep comprehensive analysis  | ~20,000      | Security audit      |

---

### Analytics and Cost Tracking

Enable analytics to track usage and estimate costs:

```yaml
- uses: juspay/neurolink@v1
  id: ai
  with:
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    prompt: "Generate a comprehensive report"
    enable_analytics: true

- name: Check Usage
  run: |
    echo "Tokens used: ${{ steps.ai.outputs.tokens_used }}"
    echo "Estimated cost: $${{ steps.ai.outputs.cost }}"
```

The job summary will include detailed analytics:

- Token breakdown (prompt vs completion)
- Estimated cost in USD
- Provider and model used
- Execution time

---

### Response Quality Evaluation

Enable evaluation to score response quality (0-100):

```yaml
- uses: juspay/neurolink@v1
  id: ai
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Write unit tests for the authentication module"
    enable_evaluation: true

- name: Check Quality
  run: |
    SCORE="${{ steps.ai.outputs.evaluation_score }}"
    if [ "$SCORE" -lt 70 ]; then
      echo "Warning: Low quality score ($SCORE)"
      exit 1
    fi
```

---

### MCP Tools Integration

Enable MCP tools to extend AI capabilities:

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Search for files containing 'TODO' comments"
    enable_tools: true
    mcp_config_path: ".mcp-config.json"
```

Example `.mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
```

---

## GitHub Integration

### PR Comments

Post AI responses directly as PR comments:

````yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR diff
        id: diff
        run: |
          git diff origin/${{ github.base_ref }}...HEAD > diff.txt
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          head -c 50000 diff.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: AI Code Review
        uses: juspay/neurolink@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this pull request diff:

            ```diff
            ${{ steps.diff.outputs.diff }}
            ```
          post_comment: true
          update_existing_comment: true
          comment_tag: "neurolink-review"
````

### Issue Comments

Post AI responses to issues:

```yaml
name: AI Issue Response

on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  respond:
    runs-on: ubuntu-latest
    steps:
      - uses: juspay/neurolink@v1
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          prompt: |
            Provide a helpful response to this issue:

            Title: ${{ github.event.issue.title }}
            Body: ${{ github.event.issue.body }}
          post_comment: true
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Comment Update Behavior

When `update_existing_comment: true` (default):

- The action looks for an existing comment with the specified `comment_tag`
- If found, it updates that comment instead of creating a new one
- This prevents comment spam on PRs with multiple pushes

To always create new comments:

```yaml
- uses: juspay/neurolink@v1
  with:
    # ...
    post_comment: true
    update_existing_comment: false
```

### Job Summary

The action automatically writes a detailed summary to the GitHub Actions job summary, including:

- AI response content
- Provider and model used
- Token usage breakdown
- Cost estimate (if analytics enabled)
- Evaluation score (if evaluation enabled)
- Execution time

---

## Example Workflows

Complete workflow examples are available in the repository:

### PR Code Review

See [`src/action/examples/pr-review.yml`](../../src/action/examples/pr-review.yml)

````yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR diff
        id: diff
        run: |
          git diff origin/${{ github.base_ref }}...HEAD > diff.txt
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          head -c 50000 diff.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: AI Code Review
        uses: juspay/neurolink@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this pull request diff and provide constructive feedback:

            ```diff
            ${{ steps.diff.outputs.diff }}
            ```

            Focus on:
            1. Potential bugs or issues
            2. Code quality improvements
            3. Security concerns
          provider: anthropic
          model: claude-sonnet-4-20250514
          post_comment: true
          enable_analytics: true
````

### Issue Triage

See [`src/action/examples/issue-triage.yml`](../../src/action/examples/issue-triage.yml)

```yaml
name: AI Issue Triage

on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Triage Issue
        uses: juspay/neurolink@v1
        id: triage
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          prompt: |
            Analyze this GitHub issue and respond with JSON:

            Title: ${{ github.event.issue.title }}
            Body: ${{ github.event.issue.body }}

            {
              "category": "bug|feature|question|docs",
              "priority": "high|medium|low",
              "labels": ["suggested", "labels"],
              "summary": "one line summary"
            }
          provider: openai
          model: gpt-4o-mini
          output_format: json

      - name: Apply labels
        uses: actions/github-script@v7
        with:
          script: |
            const analysis = JSON.parse('${{ steps.triage.outputs.response }}');
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: analysis.labels
            });
```

### Code Generation

See [`src/action/examples/code-generation.yml`](../../src/action/examples/code-generation.yml)

```yaml
name: AI Code Generation

on:
  workflow_dispatch:
    inputs:
      prompt:
        description: "What to generate"
        required: true

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Code
        uses: juspay/neurolink@v1
        id: codegen
        with:
          google_ai_api_key: ${{ secrets.GOOGLE_AI_API_KEY }}
          prompt: ${{ inputs.prompt }}
          provider: google-ai
          model: gemini-2.5-pro
          temperature: "0.3"
          enable_evaluation: true
```

### Multi-Provider Fallback

```yaml
name: AI with Fallback

on:
  workflow_dispatch:
    inputs:
      prompt:
        required: true

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Try Primary Provider
        uses: juspay/neurolink@v1
        id: primary
        continue-on-error: true
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          provider: anthropic
          prompt: ${{ inputs.prompt }}

      - name: Fallback Provider
        if: steps.primary.outcome == 'failure'
        uses: juspay/neurolink@v1
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          provider: openai
          prompt: ${{ inputs.prompt }}
```

---

## Troubleshooting

### Common Issues

#### Authentication Errors

**Symptoms:**

- `Invalid API key`
- `401 Unauthorized`
- `Authentication failed`

**Solutions:**

1. **Verify secret is set correctly:**

   ```yaml
   - run: |
       if [ -z "${{ secrets.OPENAI_API_KEY }}" ]; then
         echo "Secret is not set"
         exit 1
       fi
   ```

2. **Check key format:**
   - OpenAI keys start with `sk-`
   - Anthropic keys start with `sk-ant-`
   - Google AI keys are alphanumeric

3. **Ensure secret name matches exactly:**

   ```yaml
   # Correct
   openai_api_key: ${{ secrets.OPENAI_API_KEY }}

   # Wrong (different case)
   openai_api_key: ${{ secrets.openai_api_key }}
   ```

---

#### Rate Limiting

**Symptoms:**

- `429 Too Many Requests`
- `Rate limit exceeded`

**Solutions:**

1. **Add delays between requests:**

   ```yaml
   - uses: juspay/neurolink@v1
     with:
       # ...

   - run: sleep 5

   - uses: juspay/neurolink@v1
     with:
       # ...
   ```

2. **Use different providers for parallel jobs:**

   ```yaml
   jobs:
     review-1:
       uses: juspay/neurolink@v1
       with:
         provider: anthropic
         # ...

     review-2:
       uses: juspay/neurolink@v1
       with:
         provider: openai
         # ...
   ```

---

#### Timeout Errors

**Symptoms:**

- `Request timeout`
- Action runs for full timeout then fails

**Solutions:**

1. **Increase timeout:**

   ```yaml
   - uses: juspay/neurolink@v1
     with:
       timeout: "600" # 10 minutes
       # ...
   ```

2. **Reduce prompt size:**

   ```yaml
   - name: Truncate diff
     run: |
       head -c 30000 diff.txt > diff_truncated.txt
   ```

3. **Use faster model:**
   ```yaml
   - uses: juspay/neurolink@v1
     with:
       model: gpt-4o-mini # Faster than gpt-4o
       # ...
   ```

---

#### Comment Posting Fails

**Symptoms:**

- `Resource not accessible by integration`
- `403 Forbidden` on comment creation

**Solutions:**

1. **Check permissions:**

   ```yaml
   permissions:
     contents: read
     pull-requests: write # Required for PR comments
     issues: write # Required for issue comments
   ```

2. **Use explicit token:**

   ```yaml
   - uses: juspay/neurolink@v1
     with:
       github_token: ${{ secrets.GITHUB_TOKEN }}
       post_comment: true
       # ...
   ```

3. **For organization repos, check token permissions in Actions settings**

---

#### Empty or Truncated Response

**Symptoms:**

- Response is cut off
- Empty `response` output

**Solutions:**

1. **Increase max_tokens:**

   ```yaml
   - uses: juspay/neurolink@v1
     with:
       max_tokens: "8192"
       # ...
   ```

2. **Check for content filtering:**
   Some providers may filter certain content. Try a different provider or rephrase the prompt.

3. **Enable debug logging:**
   ```yaml
   - uses: juspay/neurolink@v1
     with:
       debug: true
       # ...
   ```

---

### Debug Mode

Enable debug mode for detailed logging:

```yaml
- uses: juspay/neurolink@v1
  with:
    debug: true
    # ...
```

Debug output includes:

- Full request/response payloads (with secrets masked)
- Provider selection logic
- Token counting details
- Error stack traces

---

### Getting Help

If you encounter issues:

1. **Check the [Troubleshooting Guide](troubleshooting.md)** for common issues
2. **Enable debug mode** to get detailed logs
3. **Search existing issues** on GitHub
4. **Open a new issue** with:
   - Workflow file (with secrets redacted)
   - Debug logs
   - Error message
   - Expected vs actual behavior

---

## Security Best Practices

### API Key Management

1. **Always use GitHub Secrets** - Never hardcode API keys
2. **Use environment-specific secrets** - Separate keys for staging/production
3. **Rotate keys regularly** - Update secrets periodically
4. **Limit key permissions** - Use keys with minimal required scope

### Credential Masking

All API keys are automatically masked in logs. The action ensures:

- Keys are never printed to stdout
- Keys are masked in debug output
- Keys are not exposed in job summaries

### OIDC for Cloud Providers

For AWS and GCP, prefer OIDC authentication over static credentials:

```yaml
# AWS OIDC
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
    aws-region: us-east-1

# GCP OIDC
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/github/providers/github
    service_account: neurolink@project.iam.gserviceaccount.com
```

### Workflow Permissions

Use minimal permissions in your workflows:

```yaml
permissions:
  contents: read # Only if you need to checkout code
  pull-requests: write # Only if posting PR comments
  issues: write # Only if posting issue comments
```

---

## See Also

- [Provider Selection Guide](provider-selection.md) - Choose the best provider for your use case
- [Troubleshooting Guide](troubleshooting.md) - Diagnose and resolve issues
- [SDK API Reference](../sdk/api-reference.md) - Full SDK documentation
- [CLI Reference](../cli/commands.md) - CLI command documentation
- [MCP Server Catalog](mcp/server-catalog.md) - Available MCP tools

---

## License

MIT - See [LICENSE](../../LICENSE)
