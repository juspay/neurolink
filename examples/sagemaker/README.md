# SageMaker Provider Examples

This directory contains comprehensive examples demonstrating how to use the Amazon SageMaker provider with NeuroLink.

## Quick Start

1. **Setup Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials and SageMaker endpoint
   ```

2. **Install Dependencies**

   ```bash
   npm install @juspay/neurolink
   ```

3. **Run Examples**

   ```bash
   # Basic usage
   npx tsx basic-usage.ts

   # Advanced features
   npx tsx advanced-features.ts

   # Configuration examples
   npx tsx configuration-examples.ts
   ```

## Examples Overview

### 📚 [basic-usage.ts](./basic-usage.ts)

Demonstrates fundamental SageMaker provider usage including:

- Provider initialization
- Basic text generation
- Multi-turn conversations
- Error handling
- Model information retrieval

**Run**: `npx tsx basic-usage.ts`

### 🚀 [advanced-features.ts](./advanced-features.ts)

Showcases advanced capabilities:

- **Tool Calling**: Function calling with weather API example
- **Structured Output**: JSON schema-based data extraction
- **Batch Processing**: Efficient multiple prompt processing
- **Streaming**: Real-time response streaming
- **Model Capabilities**: Feature detection and limits

**Run**: `npx tsx advanced-features.ts`

### ⚙️ [configuration-examples.ts](./configuration-examples.ts)

Comprehensive configuration patterns:

- Environment variable configuration
- Explicit configuration objects
- Development vs production setups
- Multi-region configurations
- Model type specifications
- Configuration validation and testing
- File-based configuration
- Dynamic environment selection
- Best practices and security guidelines

**Run**: `npx tsx configuration-examples.ts`

## Prerequisites

### AWS Setup

1. **AWS Account**: Active AWS account with SageMaker access
2. **IAM Permissions**: User/role with required SageMaker permissions
3. **SageMaker Endpoint**: Deployed model endpoint

### Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:InvokeEndpoint",
        "sagemaker:ListEndpoints",
        "sagemaker:DescribeEndpoint"
      ],
      "Resource": "*"
    }
  ]
}
```

### SageMaker Endpoint

Deploy a model to SageMaker and note the endpoint name:

```bash
# List your endpoints
aws sagemaker list-endpoints

# Get endpoint details
aws sagemaker describe-endpoint --endpoint-name your-endpoint-name
```

## Environment Configuration

### Required Variables

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
SAGEMAKER_DEFAULT_ENDPOINT=your-endpoint-name
```

### Optional Variables

```bash
# Performance tuning
SAGEMAKER_TIMEOUT=30000
SAGEMAKER_MAX_RETRIES=3

# Model configuration
SAGEMAKER_MODEL_TYPE=custom
SAGEMAKER_MODEL_NAME=your-model

# Development/testing
SAGEMAKER_TEST_ENDPOINT=test-endpoint
NODE_ENV=development
```

## CLI Usage

The examples work alongside the CLI commands:

```bash
# Setup configuration interactively
npx neurolink sagemaker setup

# Test your endpoint
npx neurolink sagemaker test your-endpoint-name

# Check configuration status
npx neurolink sagemaker status

# List available endpoints
npx neurolink sagemaker list-endpoints

# Run performance benchmark
npx neurolink sagemaker benchmark your-endpoint-name --requests 10
```

## Common Model Types

### LLaMA Models

```typescript
import { AIProviderFactory } from "@juspay/neurolink";

const provider = await AIProviderFactory.createProvider("sagemaker", {
  endpointName: "llama-2-7b-chat",
  config: { modelType: "llama" },
});
```

### Mistral Models

```typescript
const provider = await AIProviderFactory.createProvider("sagemaker", {
  endpointName: "mistral-7b-instruct",
  config: { modelType: "mistral" },
});
```

### HuggingFace Models

```typescript
const provider = await AIProviderFactory.createProvider("sagemaker", {
  endpointName: "huggingface-text-generation",
  config: {
    modelType: "huggingface",
    inputFormat: "huggingface",
    outputFormat: "huggingface",
  },
});
```

### Custom Models

```typescript
const provider = await AIProviderFactory.createProvider("sagemaker", {
  endpointName: "my-custom-model",
  config: {
    modelType: "custom",
    contentType: "application/json",
    accept: "application/json",
  },
});
```

## Error Handling

Common error scenarios and solutions:

### Authentication Errors

```bash
# Check credentials
aws sts get-caller-identity

# Verify environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_REGION
```

### Endpoint Issues

```bash
# List endpoints
aws sagemaker list-endpoints

# Check endpoint status
aws sagemaker describe-endpoint --endpoint-name your-endpoint
```

### Network Problems

```typescript
// Increase timeout for slow endpoints
const provider = await AIProviderFactory.createProvider("sagemaker", {
  config: {
    timeout: 60000, // 60 seconds
    maxRetries: 5,
  },
});
```

## Performance Tips

1. **Connection Reuse**: The provider automatically reuses HTTP connections
2. **Batch Processing**: Use `doBatchGenerate()` for multiple prompts
3. **Regional Optimization**: Use the nearest AWS region
4. **Timeout Tuning**: Adjust timeouts based on model response times
5. **Retry Configuration**: Balance reliability vs speed with retry settings

## Debugging

Enable debug logging:

```bash
export NODE_ENV=development
export DEBUG=neurolink:sagemaker:*
```

Or in code:

```typescript
import { logger } from "@juspay/neurolink/lib/utils/logger";
logger.level = "debug";
```

## Integration Examples

### Next.js API Route

```typescript
// pages/api/chat.ts
import { AIProviderFactory } from "@juspay/neurolink";

export default async function handler(req, res) {
  const provider = await AIProviderFactory.createProvider("sagemaker");
  const model = await provider.getAISDKModel();

  const result = await model.doGenerate({
    messages: req.body.messages,
    maxTokens: 500,
  });

  res.json({ text: result.text });
}
```

### Express.js Middleware

```typescript
import express from "express";
import { AIProviderFactory } from "@juspay/neurolink";

const app = express();
// Initialize provider once at startup
let provider: any;

async function initializeProvider() {
  provider = await AIProviderFactory.createProvider("sagemaker");
}

initializeProvider();

app.post("/generate", async (req, res) => {
  try {
    const model = await provider.getAISDKModel();
    const result = await model.doGenerate(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

### Common Issues

1. **"Endpoint not found"**

   - Verify endpoint name spelling
   - Check if endpoint is in the correct region
   - Ensure endpoint is deployed and in service

2. **"Access denied"**

   - Verify IAM permissions
   - Check AWS credentials
   - Ensure endpoint allows access from your account

3. **"Model not ready"**

   - Wait for endpoint to finish deploying
   - Check endpoint status in AWS Console
   - Some models need warm-up time

4. **Timeout errors**
   - Increase timeout setting
   - Check network connectivity
   - Verify endpoint performance

### Getting Help

- Check the [main documentation](../../docs/providers/sagemaker.md)
- Review [AWS SageMaker documentation](https://docs.aws.amazon.com/sagemaker/)
- Open an issue on [GitHub](https://github.com/juspay/neurolink/issues)

## License

These examples are part of the NeuroLink project and are licensed under the MIT License.
