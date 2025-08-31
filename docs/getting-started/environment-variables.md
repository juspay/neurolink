# 🔧 Environment Variables Configuration Guide

This guide provides comprehensive setup instructions for all AI providers supported by NeuroLink. The CLI automatically loads environment variables from `.env` files, making configuration seamless.

## 🚀 Quick Setup

### Automatic .env Loading ✨ NEW!

NeuroLink CLI automatically loads environment variables from `.env` files in your project directory:

```bash
# Create .env file (automatically loaded)
echo 'OPENAI_API_KEY="sk-your-key"' > .env
echo 'AWS_ACCESS_KEY_ID="your-key"' >> .env

# Test configuration
npx @juspay/neurolink status
```

### Manual Export (Also Supported)

```bash
export OPENAI_API_KEY="sk-your-key"
export AWS_ACCESS_KEY_ID="your-key"
npx @juspay/neurolink status
```

## 🏗️ Enterprise Configuration Management

### **✨ NEW: Automatic Backup System**

```bash
# Configure backup settings
NEUROLINK_BACKUP_ENABLED=true              # Enable automatic backups (default: true)
NEUROLINK_BACKUP_RETENTION=30              # Days to keep backups (default: 30)
NEUROLINK_BACKUP_DIRECTORY=.neurolink.backups  # Backup directory (default: .neurolink.backups)

# Config validation settings
NEUROLINK_VALIDATION_STRICT=false          # Strict validation mode (default: false)
NEUROLINK_VALIDATION_WARNINGS=true         # Show validation warnings (default: true)

# Provider status monitoring
NEUROLINK_PROVIDER_STATUS_CHECK=true       # Monitor provider availability (default: true)
NEUROLINK_PROVIDER_TIMEOUT=30000           # Provider timeout in ms (default: 30000)
```

### **Interface Configuration**

```bash
# MCP Registry settings
NEUROLINK_REGISTRY_CACHE_TTL=300           # Cache TTL in seconds (default: 300)
NEUROLINK_REGISTRY_AUTO_DISCOVERY=true     # Auto-discover MCP servers (default: true)
NEUROLINK_REGISTRY_STATS_ENABLED=true      # Enable registry statistics (default: true)

# Execution context settings
NEUROLINK_DEFAULT_TIMEOUT=30000            # Default execution timeout (default: 30000)
NEUROLINK_DEFAULT_RETRIES=3                # Default retry count (default: 3)
NEUROLINK_CONTEXT_LOGGING=info             # Context logging level (default: info)
```

### **Performance & Optimization**

```bash
# Tool execution settings
NEUROLINK_TOOL_EXECUTION_TIMEOUT=1000      # Tool execution timeout in ms (default: 1000)
NEUROLINK_PIPELINE_TIMEOUT=22000           # Pipeline execution timeout (default: 22000)
NEUROLINK_CACHE_ENABLED=true               # Enable execution caching (default: true)

# Error handling
NEUROLINK_AUTO_RESTORE_ENABLED=true        # Enable auto-restore on config failures (default: true)
NEUROLINK_ERROR_RECOVERY_ATTEMPTS=3        # Error recovery attempts (default: 3)
NEUROLINK_GRACEFUL_DEGRADATION=true        # Enable graceful degradation (default: true)
```

## 🆕 AI Enhancement Features

### Basic Enhancement Configuration

```bash
# AI response quality evaluation model (optional)
NEUROLINK_EVALUATION_MODEL="gemini-2.5-flash"
```

**Description**: Configures the AI model used for response quality evaluation when `--enable-evaluation` flag is used. Uses Google AI's fast Gemini 2.5 Flash model for quick quality assessment.

**Supported Models**:

- `gemini-2.5-flash` (default) - Fast evaluation processing
- `gemini-2.5-pro` - More detailed evaluation (slower)

**Usage**:

```bash
# Enable evaluation with default model
npx @juspay/neurolink generate "prompt" --enable-evaluation

# Enable both analytics and evaluation
npx @juspay/neurolink generate "prompt" --enable-analytics --enable-evaluation
```

## 🌐 Universal Evaluation System (Advanced)

### Primary Configuration

```bash
# Primary evaluation provider
NEUROLINK_EVALUATION_PROVIDER="google-ai"        # Default: google-ai

# Evaluation performance mode
NEUROLINK_EVALUATION_MODE="fast"                 # Options: fast, balanced, quality
```

**NEUROLINK_EVALUATION_PROVIDER**: Primary AI provider for evaluation

- **Options**: `google-ai`, `openai`, `anthropic`, `vertex`, `bedrock`, `azure`, `ollama`, `huggingface`, `mistral`
- **Default**: `google-ai`
- **Usage**: Determines which AI provider performs the quality evaluation

**NEUROLINK_EVALUATION_MODE**: Performance vs quality trade-off

- **Options**: `fast` (cost-effective), `balanced` (optimal), `quality` (highest accuracy)
- **Default**: `fast`
- **Usage**: Selects appropriate model for the provider (e.g., gemini-2.5-flash vs gemini-2.5-pro)

### Fallback Configuration

```bash
# Enable automatic fallback when primary provider fails
NEUROLINK_EVALUATION_FALLBACK_ENABLED="true"     # Default: true

# Fallback provider order (comma-separated)
NEUROLINK_EVALUATION_FALLBACK_PROVIDERS="openai,anthropic,vertex,bedrock"
```

**NEUROLINK_EVALUATION_FALLBACK_ENABLED**: Enable intelligent fallback system

- **Options**: `true`, `false`
- **Default**: `true`
- **Usage**: When enabled, automatically tries backup providers if primary fails

**NEUROLINK_EVALUATION_FALLBACK_PROVIDERS**: Backup provider order

- **Format**: Comma-separated provider names
- **Default**: `openai,anthropic,vertex,bedrock`
- **Usage**: Defines the order of providers to try if primary fails

### Performance Tuning

```bash
# Evaluation timeout (milliseconds)
NEUROLINK_EVALUATION_TIMEOUT="10000"             # Default: 10000 (10 seconds)

# Maximum tokens for evaluation response
NEUROLINK_EVALUATION_MAX_TOKENS="500"            # Default: 500

# Temperature for consistent evaluation
NEUROLINK_EVALUATION_TEMPERATURE="0.1"           # Default: 0.1 (low for consistency)

# Retry attempts for failed evaluations
NEUROLINK_EVALUATION_RETRY_ATTEMPTS="2"          # Default: 2
```

**Performance Variables**:

- **TIMEOUT**: Maximum time to wait for evaluation (prevents hanging)
- **MAX_TOKENS**: Limits evaluation response length (controls cost)
- **TEMPERATURE**: Lower values = more consistent scoring
- **RETRY_ATTEMPTS**: Number of retry attempts for transient failures

### Cost Optimization

```bash
# Prefer cost-effective models and providers
NEUROLINK_EVALUATION_PREFER_CHEAP="true"         # Default: true

# Maximum cost per evaluation (USD)
NEUROLINK_EVALUATION_MAX_COST_PER_EVAL="0.01"    # Default: $0.01
```

**NEUROLINK_EVALUATION_PREFER_CHEAP**: Cost optimization preference

- **Options**: `true`, `false`
- **Default**: `true`
- **Usage**: When enabled, prioritizes cheaper providers and models

**NEUROLINK_EVALUATION_MAX_COST_PER_EVAL**: Cost limit per evaluation

- **Format**: Decimal number (USD)
- **Default**: `0.01` ($0.01)
- **Usage**: Prevents expensive evaluations, switches to cheaper providers if needed

### Complete Universal Evaluation Example

```bash
# Comprehensive evaluation configuration
NEUROLINK_EVALUATION_PROVIDER="google-ai"
NEUROLINK_EVALUATION_MODEL="gemini-2.5-flash"
NEUROLINK_EVALUATION_MODE="balanced"
NEUROLINK_EVALUATION_FALLBACK_ENABLED="true"
NEUROLINK_EVALUATION_FALLBACK_PROVIDERS="openai,anthropic,vertex"
NEUROLINK_EVALUATION_TIMEOUT="15000"
NEUROLINK_EVALUATION_MAX_TOKENS="750"
NEUROLINK_EVALUATION_TEMPERATURE="0.2"
NEUROLINK_EVALUATION_PREFER_CHEAP="false"
NEUROLINK_EVALUATION_MAX_COST_PER_EVAL="0.05"
NEUROLINK_EVALUATION_RETRY_ATTEMPTS="3"
```

### Testing Universal Evaluation

```bash
# Test primary provider
npx @juspay/neurolink generate "What is AI?" --enable-evaluation --debug

# Test with custom domain
npx @juspay/neurolink generate "Fix this Python code" --enable-evaluation --evaluation-domain "Python expert"

# Test Lighthouse-style evaluation
npx @juspay/neurolink generate "Business analysis" --lighthouse-style --evaluation-domain "Business consultant"
```

---

## 🏢 Enterprise Proxy Configuration

### Proxy Environment Variables

```bash
# Corporate proxy support (automatic detection)
HTTPS_PROXY="http://proxy.company.com:8080"
HTTP_PROXY="http://proxy.company.com:8080"
NO_PROXY="localhost,127.0.0.1,.company.com"
```

| Variable      | Description                     | Example                            |
| ------------- | ------------------------------- | ---------------------------------- |
| `HTTPS_PROXY` | Proxy server for HTTPS requests | `http://proxy.company.com:8080`    |
| `HTTP_PROXY`  | Proxy server for HTTP requests  | `http://proxy.company.com:8080`    |
| `NO_PROXY`    | Domains to bypass proxy         | `localhost,127.0.0.1,.company.com` |

### Authenticated Proxy

```bash
# Proxy with username/password authentication
HTTPS_PROXY="http://username:password@proxy.company.com:8080"
HTTP_PROXY="http://username:password@proxy.company.com:8080"
```

**All NeuroLink providers automatically use proxy settings when configured.**

**For detailed proxy setup** → See [Enterprise & Proxy Setup Guide](ENTERPRISE-PROXY-SETUP.md)

## 🤖 Provider Configuration

### 1. OpenAI

#### Required Variables

```bash
OPENAI_API_KEY="sk-proj-your-openai-api-key"
```

#### Optional Variables

```bash
OPENAI_MODEL="gpt-4o"                    # Default: gpt-4o
OPENAI_BASE_URL="https://api.openai.com" # Default: OpenAI API
```

#### How to Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-proj-` or `sk-`)
6. Add billing information if required

#### Supported Models

- `gpt-4o` (default) - Latest GPT-4 Optimized
- `gpt-4o-mini` - Faster, cost-effective option
- `gpt-4-turbo` - High-performance model
- `gpt-3.5-turbo` - Legacy cost-effective option

---

### 2. Amazon Bedrock

#### Required Variables

```bash
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
```

#### Model Configuration (⚠️ Critical)

```bash
# Use full inference profile ARN for Anthropic models
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# OR use simple model names for non-Anthropic models
BEDROCK_MODEL="amazon.titan-text-express-v1"
```

#### Optional Variables

```bash
AWS_SESSION_TOKEN="IQoJb3..."           # For temporary credentials
```

#### How to Get AWS Credentials

1. Sign up for [AWS Account](https://aws.amazon.com)
2. Navigate to **IAM Console**
3. Create new user with programmatic access
4. Attach policy: `AmazonBedrockFullAccess`
5. Download access key and secret key
6. **Important**: Request model access in Bedrock console

#### Bedrock Model Access Setup

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Navigate to **Model access**
3. Click **Request model access**
4. Select desired models (Claude, Titan, etc.)
5. Submit request and wait for approval

#### Supported Models

- **Anthropic Claude**:
  - `arn:aws:bedrock:<region>:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0`
  - `arn:aws:bedrock:<region>:<account_id>:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Amazon Titan**:
  - `amazon.titan-text-express-v1`
  - `amazon.titan-text-lite-v1`

---

### 3. Google Vertex AI

Google Vertex AI supports **three authentication methods**. Choose the one that fits your deployment:

#### Method 1: Service Account File (Recommended)

```bash
GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
GOOGLE_VERTEX_PROJECT="your-gcp-project-id"
GOOGLE_VERTEX_LOCATION="us-central1"
```

#### Method 2: Service Account JSON String

```bash
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
GOOGLE_VERTEX_PROJECT="your-gcp-project-id"
GOOGLE_VERTEX_LOCATION="us-central1"
```

#### Method 3: Individual Environment Variables

```bash
GOOGLE_AUTH_CLIENT_EMAIL="service-account@your-project.iam.gserviceaccount.com"
GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0B..."
GOOGLE_VERTEX_PROJECT="your-gcp-project-id"
GOOGLE_VERTEX_LOCATION="us-central1"
```

#### Optional Variables

```bash
VERTEX_MODEL="gemini-2.5-pro"           # Default: gemini-2.5-pro
```

#### How to Set Up Google Vertex AI

1. Create [Google Cloud Project](https://console.cloud.google.com)
2. Enable **Vertex AI API**
3. Create **Service Account**:
   - Go to **IAM & Admin > Service Accounts**
   - Click **Create Service Account**
   - Grant **Vertex AI User** role
   - Generate and download JSON key file
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON file path

#### Supported Models

- `gemini-2.5-pro` (default) - Most capable model
- `gemini-2.5-flash` - Faster responses
- `claude-3-5-sonnet@20241022` - Claude via Vertex AI

---

### 4. Anthropic (Direct)

#### Required Variables

```bash
ANTHROPIC_API_KEY="sk-ant-api03-your-anthropic-key"
```

#### Optional Variables

```bash
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"  # Default model
ANTHROPIC_BASE_URL="https://api.anthropic.com" # Default endpoint
```

#### How to Get Anthropic API Key

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-api03-`)
6. Add billing information for usage

#### Supported Models

- `claude-3-5-sonnet-20241022` (default) - Latest Claude
- `claude-3-haiku-20240307` - Fast, cost-effective
- `claude-3-opus-20240229` - Most capable (if available)

---

### 5. Google AI Studio

#### Required Variables

```bash
GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"
```

#### Optional Variables

```bash
GOOGLE_AI_MODEL="gemini-2.5-pro"      # Default model
```

#### How to Get Google AI Studio API Key

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `AIza`)
6. Note: Google AI Studio provides free tier with generous limits

#### Supported Models

- `gemini-2.5-pro` (default) - Latest Gemini Pro
- `gemini-2.0-flash` - Fast, efficient responses

---

### 6. Azure OpenAI

#### Required Variables

```bash
AZURE_OPENAI_API_KEY="your-azureOpenai-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT_ID="your-deployment-name"
```

#### Optional Variables

```bash
AZURE_MODEL="gpt-4o"                    # Default: gpt-4o
AZURE_API_VERSION="2024-02-15-preview"  # Default API version
```

#### How to Set Up Azure OpenAI

1. Create [Azure Account](https://azure.microsoft.com)
2. Apply for **Azure OpenAI Service** access
3. Create **Azure OpenAI Resource**:
   - Go to Azure Portal
   - Search "OpenAI"
   - Create new OpenAI resource
4. **Deploy Model**:
   - Go to Azure OpenAI Studio
   - Navigate to **Deployments**
   - Create deployment with desired model
5. Get credentials from **Keys and Endpoint** section

#### Supported Models

- `gpt-4o` (default) - Latest GPT-4 Optimized
- `gpt-4` - Standard GPT-4
- `gpt-35-turbo` - Cost-effective option

---

### 7. Hugging Face

#### Required Variables

```bash
HUGGINGFACE_API_KEY="hf_your_huggingface_token"
```

#### Optional Variables

```bash
HUGGINGFACE_MODEL="microsoft/DialoGPT-medium"    # Default model
HUGGINGFACE_ENDPOINT="https://api-inference.huggingface.co"  # Default endpoint
```

#### How to Get Hugging Face API Token

1. Visit [Hugging Face](https://huggingface.co)
2. Sign up or log in
3. Go to Settings → Access Tokens
4. Create new token with "read" scope
5. Copy token (starts with `hf_`)

#### Supported Models

- **Open Source**: Access to 100,000+ community models
- `microsoft/DialoGPT-medium` (default) - Conversational AI
- `gpt2` - Classic GPT-2
- `EleutherAI/gpt-neo-2.7B` - Large open model
- Any model from [Hugging Face Hub](https://huggingface.co/models)

---

### 8. Ollama (Local AI)

#### Required Variables

None! Ollama runs locally.

#### Optional Variables

```bash
OLLAMA_BASE_URL="http://localhost:11434"    # Default local server
OLLAMA_MODEL="llama2"                        # Default model
```

#### How to Set Up Ollama

1. **Install Ollama**:

   - macOS: `brew install ollama` or download from [ollama.ai](https://ollama.ai)
   - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`
   - Windows: Download installer from [ollama.ai](https://ollama.ai)

2. **Start Ollama Service**:

   ```bash
   ollama serve  # Usually auto-starts
   ```

   **Tip: To keep Ollama running in the background:**

   - macOS: `brew services start ollama`
   - Linux (user): `systemctl --user enable --now ollama`
   - Linux (system): `sudo systemctl enable --now ollama`

3. **Pull Models**:
   ```bash
   ollama pull llama2
   ollama pull codellama
   ollama pull mistral
   ```

#### Supported Models

- `llama2` (default) - Meta's Llama 2
- `codellama` - Code-specialized Llama
- `mistral` - Mistral 7B
- `vicuna` - Fine-tuned Llama
- Any model from [Ollama Library](https://ollama.ai/library)

---

### 9. Mistral AI

#### Required Variables

```bash
MISTRAL_API_KEY="your_mistral_api_key"
```

#### Optional Variables

```bash
MISTRAL_MODEL="mistral-small"               # Default model
MISTRAL_ENDPOINT="https://api.mistral.ai"   # Default endpoint
```

#### How to Get Mistral AI API Key

1. Visit [Mistral AI Platform](https://mistral.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Generate new API key
5. Add billing information

#### Supported Models

- `mistral-tiny` - Fastest, most cost-effective
- `mistral-small` (default) - Balanced performance
- `mistral-medium` - Enhanced capabilities
- `mistral-large` - Most capable model

---

### 10. LiteLLM 🆕

#### Required Variables

```bash
LITELLM_BASE_URL="http://localhost:4000"         # Local LiteLLM proxy (default)
LITELLM_API_KEY="sk-anything"                    # API key for local proxy (any value works)
```

#### Optional Variables

```bash
LITELLM_MODEL="gemini-2.5-pro"                   # Default model
LITELLM_TIMEOUT="60000"                          # Request timeout (ms)
```

#### How to Use LiteLLM

LiteLLM provides access to 100+ AI models through a unified proxy interface:

1. **Local Setup**: Run LiteLLM locally with your API keys (recommended)
2. **Self-Hosted**: Deploy your own LiteLLM proxy server
3. **Cloud Deployment**: Use cloud-hosted LiteLLM instances

#### Available Models (Example Configuration)

- `openai/gpt-4o` - OpenAI GPT-4 Optimized
- `anthropic/claude-3-5-sonnet` - Anthropic Claude Sonnet
- `google/gemini-2.0-flash` - Google Gemini Flash
- `mistral/mistral-large` - Mistral Large model
- Many more via [LiteLLM Providers](https://docs.litellm.ai/docs/providers)

#### Benefits

- **100+ Models**: Access to all major AI providers through one interface
- **Cost Optimization**: Automatic routing to cost-effective models
- **Unified API**: OpenAI-compatible API for all models
- **Load Balancing**: Automatic failover and load distribution
- **Analytics**: Built-in usage tracking and monitoring

---

### 11. Amazon SageMaker 🆕

#### Required Variables

```bash
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
SAGEMAKER_DEFAULT_ENDPOINT="your-endpoint-name"
```

#### Optional Variables

```bash
SAGEMAKER_MODEL="custom-model-name"         # Model identifier (default: sagemaker-model)
SAGEMAKER_TIMEOUT="30000"                   # Request timeout in ms (default: 30000)
SAGEMAKER_MAX_RETRIES="3"                   # Retry attempts (default: 3)
AWS_SESSION_TOKEN="IQoJb3..."               # For temporary credentials
SAGEMAKER_CONTENT_TYPE="application/json"   # Request content type (default: application/json)
SAGEMAKER_ACCEPT="application/json"         # Response accept type (default: application/json)
```

#### How to Set Up Amazon SageMaker

Amazon SageMaker allows you to deploy and use your own custom trained models:

1. **Deploy Your Model to SageMaker**:

   - Train your model using SageMaker Training Jobs
   - Deploy model to a SageMaker Real-time Endpoint
   - Note the endpoint name for configuration

2. **Set Up AWS Credentials**:

   - Use IAM user with `sagemaker:InvokeEndpoint` permission
   - Or use IAM role for EC2/Lambda/ECS deployments
   - Configure AWS CLI: `aws configure`

3. **Configure NeuroLink**:

   ```bash
   export AWS_ACCESS_KEY_ID="your-access-key"
   export AWS_SECRET_ACCESS_KEY="your-secret-key"
   export AWS_REGION="us-east-1"
   export SAGEMAKER_DEFAULT_ENDPOINT="my-model-endpoint"
   ```

4. **Test Connection**:
   ```bash
   npx @juspay/neurolink sagemaker status
   npx @juspay/neurolink sagemaker test my-endpoint
   ```

#### How to Get AWS Credentials for SageMaker

1. **Create IAM User**:

   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam)
   - Create new user with **Programmatic access**
   - Attach the following policy:

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

2. **Download Credentials**:
   - Save Access Key ID and Secret Access Key
   - Set as environment variables

#### Supported Models

SageMaker supports **any custom model** you deploy:

- **Custom Fine-tuned Models** - Your domain-specific models
- **Foundation Model Endpoints** - Large language models deployed via SageMaker
- **Multi-model Endpoints** - Multiple models behind single endpoint
- **Serverless Endpoints** - Auto-scaling model deployments

#### Model Deployment Types

- **Real-time Inference** - Low-latency model serving (recommended)
- **Batch Transform** - Batch processing (not supported by NeuroLink)
- **Serverless Inference** - Pay-per-request model serving
- **Multi-model Endpoints** - Host multiple models efficiently

#### Benefits

- **🏗️ Custom Models** - Deploy and use your own trained models
- **💰 Cost Control** - Pay only for inference usage, auto-scaling available
- **🔒 Enterprise Security** - Full control over model infrastructure and data
- **⚡ Performance** - Dedicated compute resources with predictable latency
- **🌍 Global Deployment** - Available in all major AWS regions
- **📊 Monitoring** - Built-in CloudWatch metrics and logging

#### CLI Commands

```bash
# Check SageMaker configuration and endpoint status
npx @juspay/neurolink sagemaker status

# Validate connection to specific endpoint
npx @juspay/neurolink sagemaker validate

# Test inference with specific endpoint
npx @juspay/neurolink sagemaker test my-endpoint

# Show current configuration
npx @juspay/neurolink sagemaker config

# Performance benchmark
npx @juspay/neurolink sagemaker benchmark my-endpoint

# List available endpoints (requires AWS CLI)
npx @juspay/neurolink sagemaker list-endpoints

# Interactive setup wizard
npx @juspay/neurolink sagemaker setup
```

#### Environment Variables Reference

| Variable                     | Required | Default          | Description                                  |
| ---------------------------- | -------- | ---------------- | -------------------------------------------- |
| `AWS_ACCESS_KEY_ID`          | ✅       | -                | AWS access key for authentication            |
| `AWS_SECRET_ACCESS_KEY`      | ✅       | -                | AWS secret key for authentication            |
| `AWS_REGION`                 | ✅       | us-east-1        | AWS region where endpoint is deployed        |
| `SAGEMAKER_DEFAULT_ENDPOINT` | ✅       | -                | SageMaker endpoint name                      |
| `SAGEMAKER_TIMEOUT`          | ❌       | 30000            | Request timeout in milliseconds              |
| `SAGEMAKER_MAX_RETRIES`      | ❌       | 3                | Number of retry attempts for failed requests |
| `AWS_SESSION_TOKEN`          | ❌       | -                | Session token for temporary credentials      |
| `SAGEMAKER_MODEL`            | ❌       | sagemaker-model  | Model identifier for logging                 |
| `SAGEMAKER_CONTENT_TYPE`     | ❌       | application/json | Request content type                         |
| `SAGEMAKER_ACCEPT`           | ❌       | application/json | Response accept type                         |

#### Production Considerations

- **🔒 Security**: Use IAM roles instead of access keys when possible
- **📊 Monitoring**: Enable CloudWatch logging for your endpoints
- **💰 Cost Optimization**: Use auto-scaling and serverless options
- **🌍 Multi-Region**: Deploy endpoints in multiple regions for redundancy
- **⚡ Performance**: Choose appropriate instance types for your workload

---

## 🔧 Configuration Examples

### Complete .env File Example

```bash
# NeuroLink Environment Configuration - All 11 Providers

# OpenAI Configuration
OPENAI_API_KEY="sk-proj-your-openai-key"
OPENAI_MODEL="gpt-4o"

# Amazon Bedrock Configuration
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
BEDROCK_MODEL="arn:aws:bedrock:us-east-1:<account_id>:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"

# Amazon SageMaker Configuration
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
SAGEMAKER_DEFAULT_ENDPOINT="my-model-endpoint"
SAGEMAKER_TIMEOUT="30000"
SAGEMAKER_MAX_RETRIES="3"

# Google Vertex AI Configuration
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
GOOGLE_VERTEX_PROJECT="your-gcp-project"
GOOGLE_VERTEX_LOCATION="us-central1"
VERTEX_MODEL="gemini-2.5-pro"

# Anthropic Configuration
ANTHROPIC_API_KEY="sk-ant-api03-your-key"

# Google AI Studio Configuration
GOOGLE_AI_API_KEY="AIza-your-google-ai-key"
GOOGLE_AI_MODEL="gemini-2.5-pro"

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY="your-azure-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT_ID="gpt-4o-deployment"
AZURE_MODEL="gpt-4o"

# Hugging Face Configuration
HUGGINGFACE_API_KEY="hf_your_huggingface_token"
HUGGINGFACE_MODEL="microsoft/DialoGPT-medium"

# Ollama Configuration (Local AI - No API Key Required)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama2"

# Mistral AI Configuration
MISTRAL_API_KEY="your_mistral_api_key"
MISTRAL_MODEL="mistral-small"

# LiteLLM Configuration
LITELLM_BASE_URL="http://localhost:4000"
LITELLM_API_KEY="sk-anything"
LITELLM_MODEL="openai/gpt-4o-mini"
```

### Docker/Container Configuration

```bash
# Use environment variables in containers
docker run -e OPENAI_API_KEY="sk-..." \
           -e AWS_ACCESS_KEY_ID="AKIA..." \
           -e AWS_SECRET_ACCESS_KEY="..." \
           your-app
```

### CI/CD Configuration

```yaml
# GitHub Actions example
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 🧪 Testing Configuration

### Test All Providers

```bash
# Check provider status
npx @juspay/neurolink status --verbose

# Test specific provider
npx @juspay/neurolink generate "Hello" --provider openai

# Get best available provider
npx @juspay/neurolink get-best-provider
```

### Expected Output

```bash
✅ openai: Working (1245ms)
✅ bedrock: Working (2103ms)
✅ vertex: Working (1876ms)
✅ anthropic: Working (1654ms)
✅ azure: Working (987ms)
📊 Summary: 5/5 providers working
```

---

## 🔒 Security Best Practices

### API Key Management

- ✅ **Use .env files** for local development
- ✅ **Use environment variables** in production
- ✅ **Rotate keys regularly** (every 90 days)
- ❌ **Never commit keys** to version control
- ❌ **Never hardcode keys** in source code

### .gitignore Configuration

```bash
# Add to .gitignore
.env
.env.local
.env.production
*.pem
service-account*.json
```

### Production Deployment

- Use **secret management systems** (AWS Secrets Manager, Azure Key Vault)
- Implement **key rotation** policies
- Monitor **API usage** and **rate limits**
- Use **least privilege** access policies

---

## 🚨 Troubleshooting

### Common Issues

#### 1. "Missing API Key" Error

```bash
# Check if environment is loaded
npx @juspay/neurolink status

# Verify .env file exists and has correct format
cat .env
```

#### 2. AWS Bedrock "Not Authorized" Error

- ✅ Verify account has **model access** in Bedrock console
- ✅ Use **full inference profile ARN** for Anthropic models
- ✅ Check **IAM permissions** include Bedrock access

#### 3. Google Vertex AI Import Issues

- ✅ Ensure **Vertex AI API** is enabled
- ✅ Verify **service account** has correct permissions
- ✅ Check **JSON file path** is absolute and accessible

#### 4. CLI Not Loading .env

- ✅ Ensure `.env` file is in **current directory**
- ✅ Check file has **correct format** (no spaces around =)
- ✅ Verify CLI version supports **automatic loading**

### Debug Commands

```bash
# Verbose status check
npx @juspay/neurolink status --verbose

# Test specific provider
npx @juspay/neurolink generate "test" --provider openai --verbose

# Check environment loading
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY)"
```

---

## 📖 Related Documentation

- **[Provider Configuration Guide](./provider-setup.md)** - Detailed provider setup
- **[CLI Guide](../CLI-GUIDE.md)** - Complete CLI command reference
- **[API Reference](./API-REFERENCE.md)** - Programmatic usage examples
- **[Framework Integration](../FRAMEWORK-INTEGRATION.md)** - Next.js, SvelteKit, React

---

## 🤝 Need Help?

- 📖 **Check the troubleshooting section** above
- 🐛 **Report issues** in our GitHub repository
- 💬 **Join our Discord** for community support
- 📧 **Contact us** for enterprise support

**Next Steps**: Once configured, test your setup with `npx @juspay/neurolink status` and start generating AI content!
