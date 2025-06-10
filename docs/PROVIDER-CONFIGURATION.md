# ⚙️ Provider Configuration Guide

NeuroLink supports multiple AI providers with flexible authentication methods. This guide covers complete setup for all supported providers.

## Supported Providers

- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-4-turbo
- **Amazon Bedrock** - Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3 Haiku
- **Google Vertex AI** - Gemini 2.5 Flash, Claude 4.0 Sonnet
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Azure OpenAI** - GPT-4, GPT-3.5-Turbo

## OpenAI Configuration

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
import { AIProviderFactory } from '@juspay/neurolink';

const openai = AIProviderFactory.createProvider('openai', 'gpt-4o');
const result = await openai.generateText({
  prompt: "Explain machine learning",
  temperature: 0.7,
  maxTokens: 500
});
```

## Amazon Bedrock Configuration

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
import { AIProviderFactory } from '@juspay/neurolink';

const bedrock = AIProviderFactory.createProvider('bedrock');
const result = await bedrock.generateText({
  prompt: "Write a haiku about AI",
  temperature: 0.8,
  maxTokens: 100
});
```

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
      "Resource": [
        "arn:aws:bedrock:*:*:inference-profile/us.anthropic.*"
      ]
    }
  ]
}
```

## Google Vertex AI Configuration

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
import { AIProviderFactory } from '@juspay/neurolink';

const vertex = AIProviderFactory.createProvider('vertex', 'gemini-2.5-flash');
const result = await vertex.generateText({
  prompt: "Explain quantum computing",
  temperature: 0.6,
  maxTokens: 800
});
```

### Supported Models
- `gemini-2.5-flash` (default) - Fast, efficient model
- `claude-sonnet-4@20250514` - High-quality reasoning

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

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-your-key

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT_ID=your-deployment-name

# Application Settings
DEFAULT_PROVIDER=auto
ENABLE_STREAMING=true
ENABLE_FALLBACK=true
NEUROLINK_DEBUG=false
```

## Provider Priority and Fallback

### Automatic Provider Selection

NeuroLink automatically selects the best available provider:

```typescript
import { createBestAIProvider } from '@juspay/neurolink';

// Automatically selects best available provider
const provider = createBestAIProvider();
```

### Provider Priority Order

The default priority order (most reliable first):
1. **OpenAI** - Most reliable, fastest setup
2. **Google Vertex AI** - Good performance, multiple auth methods
3. **Amazon Bedrock** - High quality, requires careful setup

### Custom Priority
```typescript
import { AIProviderFactory } from '@juspay/neurolink';

// Custom provider with fallback
const { primary, fallback } = AIProviderFactory.createProviderWithFallback(
  'bedrock',   // Prefer Bedrock
  'openai'     // Fall back to OpenAI
);

try {
  const result = await primary.generateText({ prompt: "Hello" });
} catch (error) {
  console.log('Primary failed, trying fallback...');
  const result = await fallback.generateText({ prompt: "Hello" });
}
```

### Environment-Based Selection
```typescript
// Different providers for different environments
const provider = process.env.NODE_ENV === 'production'
  ? AIProviderFactory.createProvider('bedrock')      // Production: Bedrock
  : AIProviderFactory.createProvider('openai', 'gpt-4o-mini'); // Dev: Cheaper model
```

## Testing Provider Configuration

### CLI Status Check
```bash
# Test all providers
npx @juspay/neurolink status --verbose

# Expected output:
# 🔍 Checking AI provider status...
# ✅ openai: ✅ Working (234ms)
# ✅ bedrock: ✅ Working (456ms)
# ✅ vertex: ✅ Working (123ms)
```

### Programmatic Testing
```typescript
import { AIProviderFactory } from '@juspay/neurolink';

async function testProviders() {
  const providers = ['openai', 'bedrock', 'vertex'];

  for (const providerName of providers) {
    try {
      const provider = AIProviderFactory.createProvider(providerName);
      const start = Date.now();

      const result = await provider.generateText({
        prompt: 'Test',
        maxTokens: 10
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

[← Back to Main README](../README.md) | [Next: API Reference →](./API-REFERENCE.md)
