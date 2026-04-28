# ⚙️ Provider Configuration Guide

NeuroLink supports multiple AI providers with flexible authentication methods. This guide covers complete setup for all supported providers.

## Supported Providers

- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-4-turbo
- **Amazon Bedrock** - Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3 Haiku
- **Amazon SageMaker** - Custom models deployed on SageMaker endpoints
- **Google Vertex AI** - Gemini 3 Flash/Pro (preview), Gemini 2.5 Flash, Claude 4.0 Sonnet
- **Google AI Studio** - Gemini 1.5 Pro, Gemini 2.0 Flash, Gemini 1.5 Flash
- **Anthropic** - Claude 4.5 Opus/Sonnet/Haiku, Claude 4.0 Opus/Sonnet, Claude 3.7 Sonnet
- **Azure OpenAI** - GPT-4, GPT-3.5-Turbo
- **LiteLLM** - 100+ models from all providers via proxy server
- **Hugging Face** - 100,000+ open source models including DialoGPT, GPT-2, GPT-Neo
- **Ollama** - Local AI models including Llama 2, Code Llama, Mistral, Vicuna
- **Mistral AI** - Mistral Tiny, Small, Medium, and Large models
- **DeepSeek** - deepseek-chat (V3) and deepseek-reasoner (R1)
- **NVIDIA NIM** - Llama 3.3 70B and 400+ catalog models via NVIDIA hosted or self-hosted NIM
- **LM Studio** - Any model loaded in LM Studio desktop app (local, no API key required)
- **llama.cpp** - Any GGUF model served by llama-server (local, no API key required)

## 💰 Model Availability & Cost Considerations

**Important Notes:**

- **Model Availability**: Specific models may not be available in all regions or require special access
- **Cost Variations**: Pricing differs significantly between providers and models (e.g., Claude 3.5 Sonnet vs GPT-4o)
- **Rate Limits**: Each provider has different rate limits and quota restrictions
- **Local vs Cloud**: Ollama (local) has no per-request cost but requires hardware resources
- **Enterprise Tiers**: AWS Bedrock, Google Vertex AI, and Azure typically offer enterprise pricing

**Best Practices:**

- Use `new NeuroLink()` with automatic provider selection for cost-optimized routing
- Monitor usage through built-in analytics to track costs
- Consider local models (Ollama) for development and testing
- Check provider documentation for current pricing and availability

## 🏢 Enterprise Proxy Support

**All providers support corporate proxy environments automatically.** Simply set environment variables:

```bash
export HTTPS_PROXY=http://your-corporate-proxy:port
export HTTP_PROXY=http://your-corporate-proxy:port
```

**No code changes required** - NeuroLink automatically detects and uses proxy settings.

**For detailed proxy setup** → See [Enterprise & Proxy Setup Guide](../enterprise-proxy-setup.md)

## OpenAI Configuration {#openai}

### Basic Setup

```bash
export OPENAI_API_KEY="sk-your-openai-api-key"
```

### Optional Configuration

```bash
export OPENAI_MODEL="gpt-4o"  # Default model to use
```

### Supported Models

- `gpt-4o` (default) - Latest multimodal model
- `gpt-4o-mini` - Cost-effective variant
- `gpt-4-turbo` - High-performance model

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 500,
  timeout: "30s", // Optional: Override default 30s timeout
});
```

### Timeout Configuration

- **Default Timeout**: 30 seconds
- **Supported Formats**: Milliseconds (`30000`), human-readable (`'30s'`, `'1m'`, `'5m'`)
- **Environment Variable**: `OPENAI_TIMEOUT='45s'` (optional)

## Amazon Bedrock Configuration {#bedrock}

### 🚨 Critical Setup Requirements

**⚠️ IMPORTANT: Anthropic Models Require Inference Profile ARN**

For Anthropic Claude models in Bedrock, you **MUST** use the full inference profile ARN, not simple model names:

```bash
# ✅ CORRECT: Use full inference profile ARN
export BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# ❌ WRONG: Simple model names cause "not authorized to invoke this API" errors
# export BEDROCK_MODEL="anthropic.claude-3-sonnet-20240229-v1:0"
```

### Basic AWS Credentials

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-2"
```

### Session Token Support (Development)

For temporary credentials (common in development environments):

```bash
export AWS_SESSION_TOKEN="your-session-token"  # Required for temporary credentials
```

### Available Inference Profile ARNs

Replace `<account_id>` with your AWS account ID:

```bash
# Claude 3.7 Sonnet (Latest - Recommended)
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# Claude 3.5 Sonnet
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"

# Claude 3 Haiku
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
```

### Why Inference Profiles?

- **Cross-Region Access**: Faster access across AWS regions
- **Better Performance**: Optimized routing and response times
- **Higher Availability**: Improved model availability and reliability
- **Different Permissions**: Separate permission model from base models

### Complete Bedrock Configuration

```bash
# Required AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-2"

# Optional: Session token for temporary credentials
export AWS_SESSION_TOKEN="your-session-token"

# Required: Inference profile ARN (not simple model name)
export BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# Alternative environment variable names (backward compatibility)
export BEDROCK_MODEL_ID="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write a haiku about AI" },
  provider: "bedrock",
  temperature: 0.8,
  maxTokens: 100,
  timeout: "45s", // Optional: Override default 45s timeout
});
```

### Timeout Configuration

- **Default Timeout**: 45 seconds (longer due to cold starts)
- **Supported Formats**: Milliseconds (`45000`), human-readable (`'45s'`, `'1m'`, `'2m'`)
- **Environment Variable**: `BEDROCK_TIMEOUT='1m'` (optional)

### Account Setup Requirements

To use AWS Bedrock, ensure your AWS account has:

1. **Bedrock Service Access**: Enable Bedrock in your AWS region
2. **Model Access**: Request access to Anthropic Claude models
3. **IAM Permissions**: Your credentials need `bedrock:InvokeModel` permissions
4. **Inference Profile Access**: Access to the specific inference profiles

### IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": ["arn:aws:bedrock:*:*:inference-profile/us.anthropic.*"]
    }
  ]
}
```

## Amazon SageMaker Configuration

**Amazon SageMaker** allows you to use your own custom models deployed on SageMaker endpoints. This provider is perfect for:

- **Custom Model Hosting** - Deploy your fine-tuned models
- **Enterprise Compliance** - Full control over model infrastructure
- **Cost Optimization** - Pay only for inference usage
- **Performance** - Dedicated compute resources

### Basic AWS Credentials

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"  # Your SageMaker region
```

### SageMaker-Specific Configuration

```bash
# Required: Your SageMaker endpoint name
export SAGEMAKER_DEFAULT_ENDPOINT="your-endpoint-name"

# Optional: Timeout and retry settings
export SAGEMAKER_TIMEOUT="30000"      # 30 seconds (default)
export SAGEMAKER_MAX_RETRIES="3"      # Retry attempts (default)
```

### Advanced Model Configuration

```bash
# Optional: Model-specific settings
export SAGEMAKER_MODEL="custom-model-name"    # Model identifier
export SAGEMAKER_MODEL_TYPE="custom"          # Model type
export SAGEMAKER_CONTENT_TYPE="application/json"
export SAGEMAKER_ACCEPT="application/json"
```

### Session Token Support (for IAM Roles)

```bash
export AWS_SESSION_TOKEN="your-session-token"  # For temporary credentials
```

### Complete SageMaker Configuration

```bash
# AWS Credentials
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

# SageMaker Settings
export SAGEMAKER_DEFAULT_ENDPOINT="my-model-endpoint-2024"
export SAGEMAKER_TIMEOUT="45000"
export SAGEMAKER_MAX_RETRIES="5"
```

### Usage Example

```bash
# Test SageMaker endpoint
npx @juspay/neurolink sagemaker test my-endpoint

# Generate text with SageMaker
npx @juspay/neurolink generate "Analyze this data" --provider sagemaker

# Interactive setup
npx @juspay/neurolink sagemaker setup
```

### CLI Commands

```bash
# Check SageMaker configuration
npx @juspay/neurolink sagemaker status

# Validate connection
npx @juspay/neurolink sagemaker validate

# Show current configuration
npx @juspay/neurolink sagemaker config

# Performance benchmark
npx @juspay/neurolink sagemaker benchmark my-endpoint

# List available endpoints (requires AWS CLI)
npx @juspay/neurolink sagemaker list-endpoints
```

### Timeout Configuration

Configure request timeouts for SageMaker endpoints:

```bash
export SAGEMAKER_TIMEOUT="60000"  # 60 seconds for large models
```

### Prerequisites

1. **SageMaker Endpoint**: Deploy a model to SageMaker and get the endpoint name
2. **AWS IAM Permissions**: Ensure your credentials have `sagemaker:InvokeEndpoint` permission
3. **Endpoint Status**: Endpoint must be in "InService" status

### IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sagemaker:InvokeEndpoint"],
      "Resource": "arn:aws:sagemaker:*:*:endpoint/*"
    }
  ]
}
```

### Environment Variables Reference

| Variable                     | Required | Default   | Description               |
| ---------------------------- | -------- | --------- | ------------------------- |
| `AWS_ACCESS_KEY_ID`          | ✅       | -         | AWS access key            |
| `AWS_SECRET_ACCESS_KEY`      | ✅       | -         | AWS secret key            |
| `AWS_REGION`                 | ✅       | us-east-1 | AWS region                |
| `SAGEMAKER_DEFAULT_ENDPOINT` | ✅       | -         | SageMaker endpoint name   |
| `SAGEMAKER_TIMEOUT`          | ❌       | 30000     | Request timeout (ms)      |
| `SAGEMAKER_MAX_RETRIES`      | ❌       | 3         | Retry attempts            |
| `AWS_SESSION_TOKEN`          | ❌       | -         | For temporary credentials |

### 📖 Complete SageMaker Guide

For comprehensive SageMaker setup, advanced features, and production deployment:
**[📖 Complete SageMaker Integration Guide](../sagemaker-integration.md)** - Includes:

- Model deployment examples
- Cost optimization strategies
- Enterprise security patterns
- Multi-model endpoint management
- Performance testing and monitoring
- Troubleshooting and debugging

## Google Vertex AI Configuration {#vertex}

NeuroLink supports **three authentication methods** for Google Vertex AI to accommodate different deployment environments:

### Method 1: Service Account File (Recommended for Production)

Best for production environments where you can store service account files securely.

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"
```

**Setup Steps:**

1. Create a service account in Google Cloud Console
2. Download the service account JSON file
3. Set the file path in `GOOGLE_APPLICATION_CREDENTIALS`

### Method 2: Service Account JSON String (Good for Containers/Cloud)

Best for containerized environments where file storage is limited.

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"
```

**Setup Steps:**

1. Copy the entire contents of your service account JSON file
2. Set it as a single-line string in `GOOGLE_SERVICE_ACCOUNT_KEY`
3. NeuroLink will automatically create a temporary file for authentication

### Method 3: Individual Environment Variables (Good for CI/CD)

Best for CI/CD pipelines where individual secrets are managed separately.

```bash
export GOOGLE_AUTH_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
export GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE..."
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"
```

**Setup Steps:**

1. Extract `client_email` and `private_key` from your service account JSON
2. Set them as individual environment variables
3. NeuroLink will automatically assemble them into a temporary service account file

### Authentication Detection

NeuroLink automatically detects and uses the best available authentication method in this order:

1. **File Path** (`GOOGLE_APPLICATION_CREDENTIALS`) - if file exists
2. **JSON String** (`GOOGLE_SERVICE_ACCOUNT_KEY`) - if provided
3. **Individual Variables** (`GOOGLE_AUTH_CLIENT_EMAIL` + `GOOGLE_AUTH_PRIVATE_KEY`) - if both provided

### Complete Vertex AI Configuration

```bash
# Required for all methods
export GOOGLE_VERTEX_PROJECT="your-gcp-project-id"

# Optional
export GOOGLE_VERTEX_LOCATION="us-east5"        # Default: us-east5
export VERTEX_MODEL_ID="claude-sonnet-4@20250514"  # Default model

# Choose ONE authentication method:

# Method 1: Service Account File
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Method 2: Service Account JSON String
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# Method 3: Individual Environment Variables
export GOOGLE_AUTH_CLIENT_EMAIL="service-account@your-project.iam.gserviceaccount.com"
export GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "vertex",
  model: "gemini-2.5-flash",
  temperature: 0.6,
  maxTokens: 800,
  timeout: "1m", // Optional: Override default 60s timeout
});
```

### Timeout Configuration

- **Default Timeout**: 60 seconds (longer due to GCP initialization)
- **Supported Formats**: Milliseconds (`60000`), human-readable (`'60s'`, `'1m'`, `'2m'`)
- **Environment Variable**: `VERTEX_TIMEOUT='90s'` (optional)

### Supported Models

**Gemini 3 (Preview):**

- `gemini-3-flash-preview` - Latest Gemini 3 Flash with extended thinking support
- `gemini-3-pro-preview` - Latest Gemini 3 Pro with extended thinking support

**Gemini 2.x:**

- `gemini-2.5-flash` (default) - Fast, efficient model

**Anthropic Models:**

- `claude-sonnet-4@20250514` - High-quality reasoning (Anthropic via Vertex AI)

**Video Generation:**

- `veo-3.1` / `veo-3.1-generate-001` - Video generation from image + text prompt (8-second videos with audio)

> **Video Generation:** Use `output.mode: "video"` with Veo 3.1 to generate videos. See [Video Generation Guide](../features/video-generation.md).

> **PPT Generation:** Use `output.mode: "ppt"` with supported providers (Vertex AI, Google AI, OpenAI, Anthropic, Azure OpenAI, or Bedrock) and compatible text models to generate PowerPoint presentations. See [PPT Generation Guide](../features/ppt-generation.md).

### Gemini 3 Extended Thinking Configuration

Gemini 3 models support **extended thinking** (also known as "thinking mode"), which allows the model to reason more deeply before providing responses. This is particularly useful for complex reasoning tasks, math problems, and multi-step analysis.

#### Environment Variables for Gemini 3

```bash
# Required: Google Vertex AI credentials (same as above)
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"

# Gemini 3 model selection
export VERTEX_MODEL_ID="gemini-3-flash-preview"  # or gemini-3-pro-preview
```

#### Extended Thinking Configuration

Configure thinking level to control how much reasoning the model performs:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Enable extended thinking with thinkingLevel configuration
const result = await neurolink.generate({
  input: { text: "Solve this complex math problem step by step: ..." },
  provider: "vertex",
  model: "gemini-3-flash-preview",
  temperature: 0.7,
  maxTokens: 4000,
  // Gemini 3 extended thinking configuration
  thinkingLevel: "medium", // Options: "minimal", "low", "medium", "high"
});
```

#### Thinking Levels

| Level     | Description                             | Best For                          |
| --------- | --------------------------------------- | --------------------------------- |
| `minimal` | No extended thinking, fastest responses | Simple queries, quick answers     |
| `low`     | Brief reasoning before responding       | Moderate complexity tasks         |
| `medium`  | Balanced reasoning depth (recommended)  | Most use cases                    |
| `high`    | Deep reasoning, thorough analysis       | Complex math, multi-step problems |

#### Usage Example with Extended Thinking

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Complex reasoning task with high thinking level
const result = await neurolink.generate({
  input: {
    text: "Analyze the following business scenario and provide strategic recommendations...",
  },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high",
  maxTokens: 8000,
  timeout: "2m", // Extended timeout for deep thinking
});

console.log(result.content);
```

#### CLI Usage with Gemini 3

```bash
# Generate with Gemini 3 Flash
npx @juspay/neurolink generate "Explain quantum computing" --provider vertex --model gemini-3-flash-preview

# Stream with Gemini 3 Pro
npx @juspay/neurolink stream "Write a detailed analysis" --provider vertex --model gemini-3-pro-preview
```

### Claude Sonnet 4 via Vertex AI Configuration

NeuroLink provides first-class support for Claude Sonnet 4 through Google Vertex AI. This configuration has been thoroughly tested and verified working.

#### Working Configuration Example

```bash
# ✅ VERIFIED WORKING CONFIGURATION
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-east5"
export GOOGLE_AUTH_CLIENT_EMAIL="service-account@your-project.iam.gserviceaccount.com"
export GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[Your private key content here]
-----END PRIVATE KEY-----"
```

#### Performance Metrics (Verified)

- **Generation Response**: ~2.6 seconds
- **Health Check**: Working status detection
- **Streaming**: Fully functional
- **Tool Integration**: Ready for MCP tools

#### Usage Examples

```bash
# Generation test
node dist/cli/index.js generate "test" --provider vertex --model claude-sonnet-4@20250514

# Streaming test
node dist/cli/index.js stream "Write a short poem" --provider vertex --model claude-sonnet-4@20250514

# Health check
node dist/cli/index.js status
# Expected: vertex: ✅ Working (2599ms)
```

### Google Cloud Setup Requirements

To use Google Vertex AI, ensure your Google Cloud project has:

1. **Vertex AI API Enabled**: Enable the Vertex AI API in your project
2. **Service Account**: Create a service account with Vertex AI permissions
3. **Model Access**: Ensure access to the models you want to use
4. **Billing Enabled**: Vertex AI requires an active billing account

### Service Account Permissions

Your service account needs these IAM roles:

- `Vertex AI User` or `Vertex AI Admin`
- `Service Account Token Creator` (if using impersonation)

## Google AI Studio Configuration {#google-ai}

Google AI Studio provides direct access to Google's Gemini models with a simple API key authentication.

### Basic Setup

```bash
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"
```

### Optional Configuration

```bash
export GOOGLE_AI_MODEL="gemini-2.5-pro"  # Default model to use
```

### Supported Models

- `gemini-2.5-pro` - Comprehensive, detailed responses for complex tasks
- `gemini-2.5-flash` (recommended) - Fast, efficient responses for most tasks

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain the future of AI" },
  provider: "google-ai",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 1000,
  timeout: "30s", // Optional: Override default 30s timeout
});
```

### Timeout Configuration

- **Default Timeout**: 30 seconds
- **Supported Formats**: Milliseconds (`30000`), human-readable (`'30s'`, `'1m'`, `'5m'`)
- **Environment Variable**: `GOOGLE_AI_TIMEOUT='45s'` (optional)

### How to Get Google AI Studio API Key

1. **Visit Google AI Studio**: Go to [aistudio.google.com](https://aistudio.google.com)
2. **Sign In**: Use your Google account credentials
3. **Create API Key**:
   - Navigate to the **API Keys** section
   - Click **Create API Key**
   - Copy the generated key (starts with `AIza`)
4. **Set Environment**: Add to your `.env` file or export directly

### Google AI Studio vs Vertex AI

| Feature                 | Google AI Studio            | Google Vertex AI             |
| ----------------------- | --------------------------- | ---------------------------- |
| **Setup Complexity**    | 🟢 Simple (API key only)    | 🟡 Complex (Service account) |
| **Authentication**      | API key                     | Service account JSON         |
| **Free Tier**           | ✅ Generous free limits     | ❌ Pay-per-use only          |
| **Enterprise Features** | ❌ Limited                  | ✅ Full enterprise support   |
| **Model Selection**     | 🎯 Latest Gemini models     | 🔄 Broader model catalog     |
| **Best For**            | Prototyping, small projects | Production, enterprise apps  |

### Complete Google AI Studio Configuration

```bash
# Required: API key from Google AI Studio (choose one)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"
# OR
export GOOGLE_GENERATIVE_AI_API_KEY="AIza-your-google-ai-api-key"

# Optional: Default model selection
export GOOGLE_AI_MODEL="gemini-2.5-pro"
```

### Rate Limits and Quotas

Google AI Studio includes generous free tier limits:

- **Free Tier**: 15 requests per minute, 1,500 requests per day
- **Paid Usage**: Higher limits available with billing enabled
- **Model-Specific**: Different models may have different rate limits

### Error Handling for Google AI Studio

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

try {
  const result = await neurolink.generate({
    input: { text: "Generate a creative story" },
    provider: "google-ai",
    temperature: 0.8,
    maxTokens: 500,
  });
  console.log(result.content);
} catch (error) {
  if (error.message.includes("API_KEY_INVALID")) {
    console.error(
      "Invalid Google AI API key. Check your GOOGLE_AI_API_KEY environment variable.",
    );
  } else if (error.message.includes("QUOTA_EXCEEDED")) {
    console.error("Rate limit exceeded. Wait before making more requests.");
  } else {
    console.error("Google AI Studio error:", error.message);
  }
}
```

### Security Considerations

- **API Key Security**: Treat API keys as sensitive credentials
- **Environment Variables**: Never commit API keys to version control
- **Rate Limiting**: Implement client-side rate limiting for production apps
- **Monitoring**: Monitor usage to avoid unexpected charges

## LiteLLM Configuration

LiteLLM provides access to 100+ models through a unified proxy server, allowing you to use any AI provider through a single interface.

### Prerequisites

1. Install LiteLLM:

```bash
pip install litellm
```

2. Start LiteLLM proxy server:

```bash
# Basic usage
litellm --port 4000

# With configuration file (recommended)
litellm --config litellm_config.yaml --port 4000
```

### Basic Setup

```bash
export LITELLM_BASE_URL="http://localhost:4000"
export LITELLM_API_KEY="sk-anything"  # Optional, any value works
```

### Optional Configuration

```bash
export LITELLM_MODEL="openai/gpt-4o-mini"  # Default model to use
```

### Supported Model Formats

LiteLLM uses the `provider/model` format:

```bash
# OpenAI models
openai/gpt-4o
openai/gpt-4o-mini
openai/gpt-4

# Anthropic models
anthropic/claude-3-5-sonnet
anthropic/claude-3-haiku

# Google models
google/gemini-2.0-flash
vertex_ai/gemini-pro

# Mistral models
mistral/mistral-large
mistral/mixtral-8x7b

# And many more...
```

### LiteLLM Configuration File (Optional)

Create `litellm_config.yaml` for advanced configuration:

```yaml
model_list:
  - model_name: openai/gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY

  - model_name: anthropic/claude-3-5-sonnet
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: google/gemini-2.0-flash
    litellm_params:
      model: gemini-2.0-flash
      api_key: os.environ/GOOGLE_AI_API_KEY
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Use LiteLLM provider with specific model
const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "litellm",
  model: "openai/gpt-4o",
  temperature: 0.7,
});

console.log(result.content);
```

### Advanced Features

- **Cost Tracking**: Built-in usage and cost monitoring
- **Load Balancing**: Automatic failover between providers
- **Rate Limiting**: Built-in rate limiting and retry logic
- **Caching**: Optional response caching for efficiency

### Production Considerations

- **Deployment**: Run LiteLLM proxy as a separate service
- **Security**: Configure authentication for production environments
- **Scaling**: Use Docker/Kubernetes for high-availability deployments
- **Monitoring**: Enable logging and metrics collection

## Hugging Face Configuration {#huggingface}

### Basic Setup

```bash
export HUGGINGFACE_API_KEY="hf_your_token_here"
```

### Optional Configuration

```bash
export HUGGINGFACE_MODEL="microsoft/DialoGPT-medium"  # Default model
```

### Model Selection Strategy

Hugging Face hosts 100,000+ models. Choose based on:

- **Task**: text-generation, conversational, code
- **Size**: Larger models = better quality but slower
- **License**: Check model licenses for commercial use

### Rate Limiting

- Free tier: Limited requests
- PRO tier: Higher limits
- Handle 503 errors (model loading) with retry logic

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "huggingface",
  model: "gpt2",
  temperature: 0.8,
  maxTokens: 200,
  timeout: "45s", // Optional: Override default 30s timeout
});
```

### Timeout Configuration

- **Default Timeout**: 30 seconds
- **Supported Formats**: Milliseconds (`30000`), human-readable (`'30s'`, `'1m'`, `'5m'`)
- **Environment Variable**: `HUGGINGFACE_TIMEOUT='45s'` (optional)
- **Note**: Model loading may take additional time on first request

### Popular Models

- `microsoft/DialoGPT-medium` (default) - Conversational AI
- `gpt2` - Classic GPT-2
- `distilgpt2` - Lightweight GPT-2
- `EleutherAI/gpt-neo-2.7B` - Large open model
- `bigscience/bloom-560m` - Multilingual model

### Getting Started with Hugging Face

1. **Create Account**: Visit [huggingface.co](https://huggingface.co)
2. **Generate Token**: Go to Settings → Access Tokens
3. **Create Token**: Click "New token" with "read" scope
4. **Set Environment**: Export token as `HUGGINGFACE_API_KEY`

## Ollama Configuration {#ollama}

### Local Installation Required

Ollama must be installed and running locally.

### Installation Steps

1. **macOS**:

   ```bash
   brew install ollama
   # or
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Linux**:

   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

3. **Windows**:
   Download from [ollama.ai](https://ollama.ai)

### Model Management

```bash
# List models
ollama list

# Pull new model
ollama pull llama2

# Remove model
ollama rm llama2
```

### Privacy Benefits

- **100% Local**: No data leaves your machine
- **No API Keys**: No authentication required
- **Offline Capable**: Works without internet

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write a poem about privacy" },
  provider: "ollama",
  model: "llama2",
  temperature: 0.7,
  maxTokens: 300,
  timeout: "10m", // Optional: Override default 5m timeout
});
```

### Timeout Configuration

- **Default Timeout**: 5 minutes (longer for local model processing)
- **Supported Formats**: Milliseconds (`300000`), human-readable (`'5m'`, `'10m'`, `'30m'`)
- **Environment Variable**: `OLLAMA_TIMEOUT='10m'` (optional)
- **Note**: Local models may need longer timeouts for complex prompts

### Popular Models

- `llama2` (default) - Meta's Llama 2
- `codellama` - Code-specialized Llama
- `mistral` - Mistral 7B
- `vicuna` - Fine-tuned Llama
- `phi` - Microsoft's small model

### Environment Variables

```bash
# Optional: Custom Ollama server URL
export OLLAMA_BASE_URL="http://localhost:11434"

# Optional: Default model
export OLLAMA_MODEL="llama2"
```

### Performance Optimization

```bash
# Set memory limit
OLLAMA_MAX_MEMORY=8GB ollama serve

# Use specific GPU
OLLAMA_CUDA_DEVICE=0 ollama serve
```

## OpenRouter Configuration {#openrouter}

OpenRouter provides access to 300+ AI models from 60+ providers through a single unified API with automatic failover and cost optimization.

### Basic Setup

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-api-key"
```

### Optional Configuration

```bash
# Attribution for OpenRouter dashboard
export OPENROUTER_REFERER="https://yourapp.com"
export OPENROUTER_APP_NAME="Your App Name"

# Default model
export OPENROUTER_MODEL="anthropic/claude-3-5-sonnet"
```

### Supported Models

OpenRouter supports 300+ models including:

- `anthropic/claude-3-5-sonnet` (default) - Best overall quality
- `openai/gpt-4o` - Excellent code generation
- `google/gemini-2.0-flash` - Fast and cost-effective
- `meta-llama/llama-3.1-70b-instruct` - Best open source

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "openrouter",
  model: "anthropic/claude-3-5-sonnet",
  temperature: 0.7,
  maxTokens: 500,
});
```

### Complete Guide

For comprehensive OpenRouter setup including model selection, cost optimization, and best practices, see the [OpenRouter Provider Guide](./providers/openrouter.md).

## Mistral AI Configuration {#mistral}

### Basic Setup

```bash
export MISTRAL_API_KEY="your_mistral_api_key"
```

### European Compliance

- GDPR compliant
- Data processed in Europe
- No training on user data

### Model Selection

- **mistral-tiny**: Fast responses, basic tasks
- **mistral-small**: Balanced choice (default)
- **mistral-medium**: Complex reasoning
- **mistral-large**: Maximum capability

### Cost Optimization

Mistral offers competitive pricing:

- Tiny: $0.14 / 1M tokens
- Small: $0.6 / 1M tokens
- Medium: $2.5 / 1M tokens
- Large: $8 / 1M tokens

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Translate to French: Hello world" },
  provider: "mistral",
  model: "mistral-small",
  temperature: 0.3,
  maxTokens: 100,
  timeout: "30s", // Optional: Override default 30s timeout
});
```

### Timeout Configuration

- **Default Timeout**: 30 seconds
- **Supported Formats**: Milliseconds (`30000`), human-readable (`'30s'`, `'1m'`, `'5m'`)
- **Environment Variable**: `MISTRAL_TIMEOUT='45s'` (optional)

### Getting Started with Mistral AI

1. **Create Account**: Visit [mistral.ai](https://mistral.ai)
2. **Get API Key**: Navigate to API Keys section
3. **Generate Key**: Create new API key
4. **Add Billing**: Set up payment method

### Environment Variables

```bash
# Required: API key
export MISTRAL_API_KEY="your_mistral_api_key"

# Optional: Default model
export MISTRAL_MODEL="mistral-small"

# Optional: Custom endpoint
export MISTRAL_ENDPOINT="https://api.mistral.ai"
```

### Multilingual Support

Mistral models excel at multilingual tasks:

- English, French, Spanish, German, Italian
- Code generation in multiple programming languages
- Translation between supported languages

## Anthropic Configuration {#anthropic}

Direct access to Anthropic's Claude models. Supports both API key and OAuth (Claude subscription) authentication.

### Basic Setup

```bash
# Option 1: API key authentication
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Option 2: OAuth authentication (Claude Pro/Max subscribers)
neurolink auth login anthropic
```

### Optional Configuration

```bash
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"  # Default model
```

### Supported Models

- `claude-opus-4-5-20251101` - Claude 4.5 Opus (most capable)
- `claude-sonnet-4-5-20250929` - Claude 4.5 Sonnet
- `claude-haiku-4-5-20251001` - Claude 4.5 Haiku (fastest)
- `claude-opus-4-1-20250805` - Claude 4.1 Opus
- `claude-opus-4-20250514` - Claude 4.0 Opus
- `claude-sonnet-4-20250514` - Claude 4.0 Sonnet
- `claude-3-7-sonnet-20250219` - Claude 3.7 Sonnet

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  temperature: 0.7,
  maxTokens: 1000,
  timeout: "30s",
});
```

### Timeout Configuration

- **Default Timeout**: 30 seconds
- **Supported Formats**: Milliseconds (`30000`), human-readable (`'30s'`, `'1m'`, `'5m'`)
- **Environment Variable**: `ANTHROPIC_TIMEOUT='45s'` (optional)

### Getting Started with Anthropic

1. **API Key**: Visit [console.anthropic.com](https://console.anthropic.com), navigate to API Keys, and export as `ANTHROPIC_API_KEY`
2. **OAuth (Subscription)**: Run `neurolink auth login anthropic` to authenticate with your Claude Pro/Max subscription

### Complete Guide

For comprehensive Anthropic setup including OAuth configuration, subscription tiers, and advanced options, see the [Detailed Anthropic Provider Guide](providers/anthropic.md) and the [Claude Subscription Guide](../features/claude-subscription.md).

## Azure OpenAI Configuration {#azure}

Azure OpenAI provides enterprise-grade access to OpenAI models through Microsoft Azure.

### Basic Setup

```bash
export AZURE_OPENAI_API_KEY="your-azure-openai-key"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_DEPLOYMENT_ID="your-deployment-name"
```

### Optional Configuration

```bash
export AZURE_OPENAI_API_VERSION="2024-02-15-preview"  # API version
```

### Supported Models

Azure OpenAI supports deployment of:

- `gpt-4o` - Latest multimodal model
- `gpt-4` - Advanced reasoning
- `gpt-4-turbo` - Optimized performance
- `gpt-3.5-turbo` - Cost-effective

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "azure",
  temperature: 0.7,
  maxTokens: 500,
  timeout: "30s",
});
```

### Timeout Configuration

- **Default Timeout**: 30 seconds
- **Supported Formats**: Milliseconds (`30000`), human-readable (`'30s'`, `'1m'`, `'5m'`)
- **Environment Variable**: `AZURE_TIMEOUT='45s'` (optional)

### Azure Setup Requirements

1. **Azure Subscription**: Active Azure subscription
2. **Azure OpenAI Resource**: Create Azure OpenAI resource in Azure Portal
3. **Model Deployment**: Deploy a model to get deployment ID
4. **API Key**: Get API key from resource's Keys and Endpoint section

### Environment Variables Reference

| Variable                     | Required | Description                   |
| ---------------------------- | -------- | ----------------------------- |
| `AZURE_OPENAI_API_KEY`       | ✅       | Azure OpenAI API key          |
| `AZURE_OPENAI_ENDPOINT`      | ✅       | Resource endpoint URL         |
| `AZURE_OPENAI_DEPLOYMENT_ID` | ✅       | Model deployment name         |
| `AZURE_OPENAI_API_VERSION`   | ❌       | API version (default: latest) |

## OpenAI Compatible Configuration {#openai-compatible}

Connect to any OpenAI-compatible API endpoint (LocalAI, vLLM, Ollama with OpenAI compatibility, etc.)

### Basic Setup

```bash
export OPENAI_COMPATIBLE_BASE_URL="http://localhost:8080/v1"
export OPENAI_COMPATIBLE_API_KEY="optional-api-key"  # Some servers don't require this
```

### Optional Configuration

```bash
export OPENAI_COMPATIBLE_MODEL="your-model-name"
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Hello from custom endpoint" },
  provider: "openai-compatible",
  model: "your-model",
  temperature: 0.7,
  maxTokens: 500,
});
```

### Compatible Servers

This works with any server implementing the OpenAI API:

- **LocalAI** - Local AI server
- **vLLM** - High-performance inference server
- **Ollama** (with `OLLAMA_OPENAI_COMPAT=1`)
- **Text Generation WebUI**
- **Custom inference servers**

### Environment Variables

```bash
# Required: Base URL of your OpenAI-compatible server
export OPENAI_COMPATIBLE_BASE_URL="http://localhost:8080/v1"

# Optional: API key (if your server requires one)
export OPENAI_COMPATIBLE_API_KEY="your-api-key-if-needed"

# Optional: Default model name
export OPENAI_COMPATIBLE_MODEL="your-model-name"
```

## DeepSeek Configuration {#deepseek}

DeepSeek provides cost-effective access to its own frontier models: the general-purpose V3 chat model and the R1 reasoning model.

### Basic Setup

```bash
export DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
```

### Optional Configuration

```bash
export DEEPSEEK_MODEL="deepseek-chat"               # Default: deepseek-chat
export DEEPSEEK_BASE_URL="https://api.deepseek.com" # Default base URL (override for compatible proxies)
```

### Supported Models

- `deepseek-chat` (default) - DeepSeek V3, high-quality general chat at low cost
- `deepseek-reasoner` - DeepSeek R1, extended chain-of-thought reasoning (thinking mode)

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// General chat with DeepSeek V3
const result = await neurolink.generate({
  input: { text: "Explain transformers in simple terms" },
  provider: "deepseek",
  model: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 1000,
});

// Extended reasoning with DeepSeek R1
const reasoned = await neurolink.generate({
  input: { text: "Solve step by step: ..." },
  provider: "deepseek",
  model: "deepseek-reasoner",
  thinkingLevel: "high",
});
```

### CLI Usage

```bash
# Use DeepSeek V3
npx @juspay/neurolink generate "Explain quantum computing" --provider deepseek

# Use DeepSeek R1 with alias
npx @juspay/neurolink generate "Solve this math problem" --provider ds --model deepseek-reasoner
```

### Getting Started with DeepSeek

1. **Create Account**: Visit [platform.deepseek.com](https://platform.deepseek.com)
2. **Generate Key**: Navigate to **API Keys** and create a new key
3. **Add Billing**: Top up your account balance at [platform.deepseek.com/usage](https://platform.deepseek.com/usage)
4. **Set Environment**: Export `DEEPSEEK_API_KEY`

### Environment Variables Reference

| Variable            | Required | Default                    | Description                                             |
| ------------------- | -------- | -------------------------- | ------------------------------------------------------- |
| `DEEPSEEK_API_KEY`  | ✅       | -                          | DeepSeek API key                                        |
| `DEEPSEEK_MODEL`    | ❌       | `deepseek-chat`            | Model: `deepseek-chat` (V3) or `deepseek-reasoner` (R1) |
| `DEEPSEEK_BASE_URL` | ❌       | `https://api.deepseek.com` | Override for proxies or alternative endpoints           |

### Provider ID and Aliases

- **Provider ID**: `deepseek`
- **Aliases**: `ds`

---

## NVIDIA NIM Configuration {#nvidia-nim}

NVIDIA NIM provides access to 400+ optimized models through NVIDIA's hosted cloud inference API, and also supports self-hosted NIM deployments.

### Basic Setup

```bash
export NVIDIA_NIM_API_KEY="nvapi-your-nvidia-api-key"
```

### Optional Configuration

```bash
export NVIDIA_NIM_MODEL="meta/llama-3.3-70b-instruct"              # Default model
export NVIDIA_NIM_BASE_URL="https://integrate.api.nvidia.com/v1"   # Default; override for self-hosted NIM
```

### NIM-Specific Extras (Advanced)

These environment variables pass NIM-specific request body extensions. Leave them unset unless you have a specific need:

```bash
export NVIDIA_NIM_TOP_K=""                  # Integer; -1 or unset = disabled
export NVIDIA_NIM_MIN_P=""                  # Float; 0 or unset = disabled
export NVIDIA_NIM_REPETITION_PENALTY=""     # Float; 1.0 or unset = disabled
export NVIDIA_NIM_MIN_TOKENS=""             # Integer; 0 or unset = disabled
export NVIDIA_NIM_CHAT_TEMPLATE=""          # Override model chat template (advanced)
```

### Supported Models

- `meta/llama-3.3-70b-instruct` (default) - Meta Llama 3.3 70B Instruct
- Any model from the [NVIDIA NIM catalog](https://build.nvidia.com/models)

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain GPU architecture" },
  provider: "nvidia-nim",
  model: "meta/llama-3.3-70b-instruct",
  temperature: 0.7,
  maxTokens: 1000,
});
```

### CLI Usage

```bash
# Use NVIDIA NIM with default model
npx @juspay/neurolink generate "Explain GPU architecture" --provider nvidia-nim

# Use nim alias
npx @juspay/neurolink generate "Hello" --provider nim --model "mistralai/mistral-7b-instruct-v0.3"
```

### Self-Hosted NIM Endpoints

Override the base URL to point at your own NIM deployment:

```bash
export NVIDIA_NIM_BASE_URL="http://your-nim-server:8000/v1"
```

### Getting Started with NVIDIA NIM

1. **Create Account**: Visit [build.nvidia.com](https://build.nvidia.com/)
2. **Open Settings**: Navigate to **Settings → API Keys**
3. **Generate Key**: Create a new Bearer token API key
4. **Browse Models**: Explore the catalog at [build.nvidia.com/models](https://build.nvidia.com/models)
5. **Set Environment**: Export `NVIDIA_NIM_API_KEY`

### Environment Variables Reference

| Variable                        | Required | Default                               | Description                             |
| ------------------------------- | -------- | ------------------------------------- | --------------------------------------- |
| `NVIDIA_NIM_API_KEY`            | ✅       | -                                     | NVIDIA NIM API key (Bearer token)       |
| `NVIDIA_NIM_MODEL`              | ❌       | `meta/llama-3.3-70b-instruct`         | Default model                           |
| `NVIDIA_NIM_BASE_URL`           | ❌       | `https://integrate.api.nvidia.com/v1` | Override for self-hosted NIM            |
| `NVIDIA_NIM_TOP_K`              | ❌       | -                                     | Top-K sampling parameter                |
| `NVIDIA_NIM_MIN_P`              | ❌       | -                                     | Min-P sampling parameter                |
| `NVIDIA_NIM_REPETITION_PENALTY` | ❌       | -                                     | Repetition penalty                      |
| `NVIDIA_NIM_MIN_TOKENS`         | ❌       | -                                     | Minimum tokens to generate              |
| `NVIDIA_NIM_CHAT_TEMPLATE`      | ❌       | -                                     | Override model chat template (advanced) |

### Provider ID and Aliases

- **Provider ID**: `nvidia-nim`
- **Aliases**: `nim`, `nvidia`

---

## LM Studio Configuration {#lm-studio}

LM Studio is a local AI provider — it runs models entirely on your machine with no data sent to any external service. No API key is required for standard (non-proxied) installations.

### Prerequisites

1. Install LM Studio from [lmstudio.ai](https://lmstudio.ai/)
2. Open LM Studio and download a model from the **Discover** tab
3. Go to **Local Server** and click **Start Server**

The server starts at `http://localhost:1234/v1` by default. NeuroLink auto-discovers the currently loaded model via `/v1/models` — you do not need to specify a model name.

### Optional Configuration

```bash
export LM_STUDIO_BASE_URL="http://localhost:1234/v1"   # Default; override if server is on a different host/port
export LM_STUDIO_MODEL=""                              # Blank = auto-discover; set to force a specific model ID
# export LM_STUDIO_API_KEY="your-key"                 # Only needed behind an auth-proxying reverse-proxy
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Model is auto-discovered from LM Studio
const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "lm-studio",
  temperature: 0.7,
  maxTokens: 500,
});

// Or specify a model explicitly (must be loaded in LM Studio)
const result2 = await neurolink.generate({
  input: { text: "Write a poem" },
  provider: "lm-studio",
  model: "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
});
```

### CLI Usage

```bash
# Auto-discover loaded model
npx @juspay/neurolink generate "Hello from LM Studio" --provider lm-studio

# Use alias
npx @juspay/neurolink generate "Hello" --provider lmstudio
```

### Notes

- **API key**: Not required for vanilla LM Studio installs. Set `LM_STUDIO_API_KEY` only when running LM Studio behind an authenticating reverse-proxy.
- **Model auto-discovery**: If the server is not running or has no model loaded, NeuroLink logs a warning and falls back gracefully. Start LM Studio and load a model, then retry.

### Timeout Configuration

- **Default Timeout**: 5 minutes (longer for local CPU/GPU inference)
- **Environment Variable**: `LM_STUDIO_TIMEOUT='10m'` (optional)

### Environment Variables Reference

| Variable             | Required | Default                    | Description                                           |
| -------------------- | -------- | -------------------------- | ----------------------------------------------------- |
| `LM_STUDIO_BASE_URL` | ❌       | `http://localhost:1234/v1` | LM Studio server URL                                  |
| `LM_STUDIO_MODEL`    | ❌       | _(auto-discovered)_        | Force a specific model ID; blank = use loaded model   |
| `LM_STUDIO_API_KEY`  | ❌       | -                          | API key — only for reverse-proxy authenticated setups |

### Provider ID and Aliases

- **Provider ID**: `lm-studio`
- **Aliases**: `lmstudio`, `lms`

---

## llama.cpp Configuration {#llamacpp}

llama.cpp's `llama-server` is a local AI provider — it runs GGUF models entirely on your machine. No API key is required for standard (non-proxied) installations.

### Prerequisites

1. Build llama.cpp: follow the [build instructions](https://github.com/ggerganov/llama.cpp#build)
2. Download a GGUF model file (e.g., from [Hugging Face](https://huggingface.co/models?library=gguf))
3. Start the server:

   ```bash
   # Basic usage
   ./llama-server -m model.gguf --port 8080

   # With tool/function-call support (required for MCP tools)
   ./llama-server -m model.gguf --port 8080 --jinja
   ```

The server starts at `http://localhost:8080/v1` by default. NeuroLink auto-discovers the loaded model via `/v1/models`.

### Optional Configuration

```bash
export LLAMACPP_BASE_URL="http://localhost:8080/v1"    # Default; override if server is on a different host/port
export LLAMACPP_MODEL=""                               # Blank = auto-discover; set to force a specific model ID
# export LLAMACPP_API_KEY="your-key"                  # Only needed behind an auth-proxying reverse-proxy
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Model is auto-discovered from llama-server
const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "llamacpp",
  temperature: 0.7,
  maxTokens: 500,
});
```

### CLI Usage

```bash
# Auto-discover loaded model
npx @juspay/neurolink generate "Hello from llama.cpp" --provider llamacpp

# Use alias
npx @juspay/neurolink generate "Hello" --provider "llama.cpp"
```

### Notes

- **API key**: Not required for vanilla llama-server installs. Set `LLAMACPP_API_KEY` only when running behind an authenticating reverse-proxy.
- **Tool support**: llama-server must be started with the `--jinja` flag to enable tool/function-call support. Without it, tool calls return a 400 error.
- **Model auto-discovery**: llama-server hosts one model at a time. NeuroLink reads it from `/v1/models` automatically.
- **Health check**: NeuroLink validates connectivity via the `/health` endpoint with up to 3 retries.

### Timeout Configuration

- **Default Timeout**: 5 minutes (longer for local CPU/GPU inference)
- **Environment Variable**: `LLAMACPP_TIMEOUT='10m'` (optional)

### Environment Variables Reference

| Variable            | Required | Default                    | Description                                           |
| ------------------- | -------- | -------------------------- | ----------------------------------------------------- |
| `LLAMACPP_BASE_URL` | ❌       | `http://localhost:8080/v1` | llama-server URL                                      |
| `LLAMACPP_MODEL`    | ❌       | _(auto-discovered)_        | Force a specific model ID; blank = use loaded model   |
| `LLAMACPP_API_KEY`  | ❌       | -                          | API key — only for reverse-proxy authenticated setups |

### Provider ID and Aliases

- **Provider ID**: `llamacpp`
- **Aliases**: `llama.cpp`

---

## Redis Configuration {#redis}

Redis integration for distributed conversation memory and session state.

### Basic Setup

```bash
export REDIS_URL="redis://localhost:6379"
```

### Optional Configuration

```bash
export REDIS_PASSWORD="your-redis-password"  # If authentication enabled
export REDIS_DB="0"  # Database number (default: 0)
export REDIS_KEY_PREFIX="neurolink:"  # Key prefix for namespacing
```

### Advanced Configuration

```bash
# Connection settings
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_TLS="false"  # Set to "true" for TLS connections

# Pool settings
export REDIS_MAX_RETRIES="3"
export REDIS_RETRY_DELAY="1000"  # milliseconds
export REDIS_CONNECTION_TIMEOUT="5000"  # milliseconds
```

### Usage Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  memory: {
    type: "redis",
    url: process.env.REDIS_URL,
  },
});

const result = await neurolink.generate({
  input: { text: "Remember this conversation" },
  sessionId: "user-123", // Session stored in Redis
});
```

### Redis Cloud Setup

For managed Redis (Redis Cloud, AWS ElastiCache, etc.):

```bash
export REDIS_URL="rediss://username:password@your-redis-host:6380"
```

### Docker Redis (Development)

```bash
# Start Redis in Docker
docker run -d -p 6379:6379 redis:latest

# Set environment
export REDIS_URL="redis://localhost:6379"
```

### Features Enabled by Redis

- **Distributed Memory**: Share conversation state across instances
- **Session Persistence**: Conversations survive application restarts
- **Export/Import**: Export full session history as JSON
- **Multi-tenant**: Isolate conversations by session ID
- **Scalability**: Handle thousands of concurrent conversations

### Environment Variables Reference

| Variable           | Required        | Default    | Description               |
| ------------------ | --------------- | ---------- | ------------------------- |
| `REDIS_URL`        | Recommended     | -          | Full Redis connection URL |
| `REDIS_HOST`       | Alternative     | localhost  | Redis host                |
| `REDIS_PORT`       | Alternative     | 6379       | Redis port                |
| `REDIS_PASSWORD`   | If auth enabled | -          | Redis password            |
| `REDIS_DB`         | ❌              | 0          | Database number           |
| `REDIS_KEY_PREFIX` | ❌              | neurolink: | Key prefix                |

## Environment File Template

Create a `.env` file in your project root:

```bash
# NeuroLink Environment Configuration

# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o

# Amazon Bedrock
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-2
AWS_SESSION_TOKEN=your-session-token  # Optional: for temporary credentials
BEDROCK_MODEL=arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0

# Google Vertex AI (choose one method)
# Method 1: File path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account.json

# Method 2: JSON string (uncomment to use)
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}

# Method 3: Individual variables (uncomment to use)
# GOOGLE_AUTH_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
# GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Required for all Google Vertex AI methods
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-east5
VERTEX_MODEL_ID=claude-sonnet-4@20250514

# Alternative: Gemini 3 models with extended thinking support
# VERTEX_MODEL_ID=gemini-3-flash-preview
# VERTEX_MODEL_ID=gemini-3-pro-preview

# Google AI Studio
GOOGLE_AI_API_KEY=AIza-your-googleAiStudio-key
GOOGLE_AI_MODEL=gemini-2.5-pro

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-your-key

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT_ID=your-deployment-name

# Hugging Face
HUGGINGFACE_API_KEY=hf_your_token_here
HUGGINGFACE_MODEL=microsoft/DialoGPT-medium  # Optional

# Ollama (Local AI)
OLLAMA_BASE_URL=http://localhost:11434  # Optional
OLLAMA_MODEL=llama2  # Optional

# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-small  # Optional

# DeepSeek
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_MODEL=deepseek-chat  # Optional (deepseek-chat or deepseek-reasoner)

# NVIDIA NIM
NVIDIA_NIM_API_KEY=nvapi-your-nvidia-key
NVIDIA_NIM_MODEL=meta/llama-3.3-70b-instruct  # Optional

# LM Studio (local — no API key required)
LM_STUDIO_BASE_URL=http://localhost:1234/v1  # Optional

# llama.cpp (local — no API key required)
LLAMACPP_BASE_URL=http://localhost:8080/v1  # Optional

# Application Settings
DEFAULT_PROVIDER=auto
NEUROLINK_DEBUG=false
```

## Provider Priority and Fallback

### Automatic Provider Selection

NeuroLink automatically selects the best available provider when no provider is specified:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Automatically selects best available provider
const result = await neurolink.generate({
  input: { text: "Hello, world!" },
});
```

### Provider Priority Order

The default priority order (most reliable first):

1. **OpenAI** - Most reliable, fastest setup
2. **Anthropic** - High quality, simple setup
3. **Google AI Studio** - Free tier, easy setup
4. **Azure OpenAI** - Enterprise reliable
5. **Google Vertex AI** - Good performance, multiple auth methods
6. **Mistral AI** - European compliance, competitive pricing
7. **Hugging Face** - Open source variety
8. **Amazon Bedrock** - High quality, requires careful setup
9. **Ollama** - Local only, no fallback

### Specifying Provider and Model

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Explicitly specify provider and model
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "bedrock",
  model: "anthropic.claude-3-sonnet-20240229-v1:0",
});
```

### Environment-Based Selection

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Different providers for different environments
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: process.env.NODE_ENV === "production" ? "bedrock" : "openai",
  model: process.env.NODE_ENV === "production" ? undefined : "gpt-4o-mini",
});
```

## Testing Provider Configuration

### CLI Status Check

```bash
# Test all providers
npx @juspay/neurolink status --verbose

# Expected output:
# 🔍 Checking AI provider status...
# ✅ openai: ✅ Working (234ms)
# ❌ bedrock: ❌ Invalid credentials - The security token included in the request is expired
# ⚪ vertex: ⚪ Not configured - Missing environment variables
```

### Programmatic Testing

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function testProviders() {
  const providers = [
    "openai",
    "bedrock",
    "vertex",
    "anthropic",
    "azure",
    "google-ai",
    "huggingface",
    "ollama",
    "mistral",
  ];

  const neurolink = new NeuroLink();

  for (const providerName of providers) {
    try {
      const start = Date.now();

      const result = await neurolink.generate({
        input: { text: "Test" },
        provider: providerName,
        maxTokens: 10,
      });

      console.log(`✅ ${providerName}: Working (${Date.now() - start}ms)`);
    } catch (error) {
      console.log(`❌ ${providerName}: ${error.message}`);
    }
  }
}

testProviders();
```

## Common Configuration Issues

### OpenAI Issues

```
Error: Cannot find API key for OpenAI provider
```

**Solution**: Set `OPENAI_API_KEY` environment variable

### Bedrock Issues

```
Your account is not authorized to invoke this API operation
```

**Solutions**:

1. Use full inference profile ARN (not simple model name)
2. Check AWS account has Bedrock access
3. Verify IAM permissions include `bedrock:InvokeModel`
4. Ensure model access is enabled in your AWS region

### Vertex AI Issues

```
Cannot find package '@google-cloud/vertexai'
```

**Solution**: Install peer dependency: `npm install @google-cloud/vertexai`

```
Authentication failed
```

**Solutions**:

1. Verify service account JSON is valid
2. Check project ID is correct
3. Ensure Vertex AI API is enabled
4. Verify service account has proper permissions

## Security Best Practices

### Environment Variables

- Never commit API keys to version control
- Use different keys for development/staging/production
- Rotate keys regularly
- Use minimal permissions for service accounts

### AWS Security

- Use IAM roles instead of access keys when possible
- Enable CloudTrail for audit logging
- Use VPC endpoints for additional security
- Implement resource-based policies

### Google Cloud Security

- Use service account keys with minimal permissions
- Enable audit logging
- Use VPC Service Controls for additional isolation
- Rotate service account keys regularly

### General Security

- Use environment-specific configurations
- Implement rate limiting in your applications
- Monitor usage and costs
- Use HTTPS for all API communications

---

[← Back to Main README](../index.md) | [Next: API Reference →](./api-reference.md)
