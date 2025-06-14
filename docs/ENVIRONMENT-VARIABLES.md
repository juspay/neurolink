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
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

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
  - `arn:aws:bedrock:region:account:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0`
  - `arn:aws:bedrock:region:account:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0`
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
VERTEX_MODEL="gemini-1.5-pro"           # Default: gemini-1.5-pro
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

- `gemini-1.5-pro` (default) - Most capable model
- `gemini-1.5-flash` - Faster responses
- `gemini-1.0-pro` - Legacy option
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
GOOGLE_AI_MODEL="gemini-1.5-pro-latest"     # Default model
```

#### How to Get Google AI Studio API Key

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `AIza`)
6. Note: Google AI Studio provides free tier with generous limits

#### Supported Models

- `gemini-1.5-pro-latest` (default) - Latest Gemini Pro
- `gemini-2.0-flash-exp` - Experimental model with enhanced capabilities
- `gemini-1.5-flash-latest` - Fast, efficient responses
- `gemini-1.0-pro` - Legacy stable option

---

### 6. Azure OpenAI

#### Required Variables

```bash
AZURE_OPENAI_API_KEY="your-azure-openai-key"
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

## 🔧 Configuration Examples

### Complete .env File Example

```bash
# NeuroLink Environment Configuration - All 9 Providers

# OpenAI Configuration
OPENAI_API_KEY="sk-proj-your-openai-key"
OPENAI_MODEL="gpt-4o"

# Amazon Bedrock Configuration
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
BEDROCK_MODEL="arn:aws:bedrock:us-east-1:123456789:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"

# Google Vertex AI Configuration
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
GOOGLE_VERTEX_PROJECT="your-gcp-project"
GOOGLE_VERTEX_LOCATION="us-central1"
VERTEX_MODEL="gemini-1.5-pro"

# Anthropic Configuration
ANTHROPIC_API_KEY="sk-ant-api03-your-key"

# Google AI Studio Configuration
GOOGLE_AI_API_KEY="AIza-your-google-ai-key"
GOOGLE_AI_MODEL="gemini-1.5-pro-latest"

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
npx @juspay/neurolink generate-text "Hello" --provider openai

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
npx @juspay/neurolink generate-text "test" --provider openai --verbose

# Check environment loading
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY)"
```

---

## 📖 Related Documentation

- **[Provider Configuration Guide](./PROVIDER-CONFIGURATION.md)** - Detailed provider setup
- **[CLI Guide](./CLI-GUIDE.md)** - Complete CLI command reference
- **[API Reference](./API-REFERENCE.md)** - Programmatic usage examples
- **[Framework Integration](./FRAMEWORK-INTEGRATION.md)** - Next.js, SvelteKit, React

---

## 🤝 Need Help?

- 📖 **Check the troubleshooting section** above
- 🐛 **Report issues** in our GitHub repository
- 💬 **Join our Discord** for community support
- 📧 **Contact us** for enterprise support

**Next Steps**: Once configured, test your setup with `npx @juspay/neurolink status` and start generating AI content!
