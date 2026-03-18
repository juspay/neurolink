---
title: Amazon SageMaker Provider Guide
description: Custom model endpoints on AWS SageMaker with Llama, Mistral, Hugging Face, and JumpStart models
keywords: aws sagemaker, custom endpoints, llama, mistral, huggingface, jumpstart, aws
---

# Amazon SageMaker Provider Guide

**Custom model endpoints on AWS SageMaker infrastructure**

> **Version:** 9.26.x | **Status:** General Availability | **Streaming:** Not Available (see warning below)

---

## Overview

Amazon SageMaker provides managed infrastructure for deploying custom AI model endpoints. Unlike AWS Bedrock (which offers serverless access to foundation models), SageMaker gives you full control over the hosting environment, letting you deploy fine-tuned models, Hugging Face models, JumpStart pre-built models, or entirely custom inference containers.

:::danger[Streaming Is NOT Implemented]
The SageMaker provider does **not** support streaming via `neurolink.stream()`. Calling `stream()` will throw a `SageMakerError` with status code 501. Use `generate()` for all SageMaker requests. Streaming support is planned for a future release.
:::

### Key Benefits

- **Custom Models**: Deploy any model you train or fine-tune
- **Hugging Face Hub**: One-click deployment of thousands of open-source models
- **JumpStart**: Pre-built solutions for Llama, Mistral, Falcon, and more
- **Full Control**: Choose instance types, autoscaling policies, and networking
- **AWS Integration**: IAM, VPC, CloudWatch, S3
- **Enterprise Security**: PrivateLink, KMS encryption, VPC isolation
- **Batch Inference**: Built-in support for processing multiple prompts in parallel

### Supported Model Types

| Model Type       | Value         | Description                                         | Example Use Case                   |
| ---------------- | ------------- | --------------------------------------------------- | ---------------------------------- |
| **Llama**        | `llama`       | Meta Llama models deployed via JumpStart or custom  | General-purpose, cost-effective    |
| **Mistral**      | `mistral`     | Mistral AI models on SageMaker                      | Coding, European compliance        |
| **Claude**       | `claude`      | Anthropic Claude models via custom containers       | Complex reasoning                  |
| **Hugging Face** | `huggingface` | Any Hugging Face Hub model via SageMaker containers | NLP, classification, summarization |
| **JumpStart**    | `jumpstart`   | AWS JumpStart pre-built model packages              | Quick deployment, managed updates  |
| **Custom**       | `custom`      | Any custom inference container or algorithm         | Proprietary models, specialized    |

---

## Quick Start

### 1. Deploy a Model Endpoint

Before using the SageMaker provider, you need a running SageMaker endpoint. You can create one through the AWS Console, AWS CLI, or SageMaker SDK.

```bash
# Example: Deploy a JumpStart Llama model via AWS CLI
aws sagemaker create-endpoint \
  --endpoint-name my-llama-endpoint \
  --endpoint-config-name my-llama-config \
  --region us-east-1
```

Or via the AWS Console:

1. Open [SageMaker Console](https://console.aws.amazon.com/sagemaker)
2. Navigate to **Inference** > **Endpoints**
3. Create a new endpoint with your model
4. Wait for the endpoint status to become **InService**

### 2. Configure Environment Variables

```bash
# Required: AWS credentials
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# Required: SageMaker endpoint name
export SAGEMAKER_DEFAULT_ENDPOINT=my-llama-endpoint

# Optional: Region (defaults to us-east-1)
export SAGEMAKER_REGION=us-east-1

# Optional: Model identifier
export SAGEMAKER_MODEL=my-custom-llama

# Optional: Model type for request formatting
export SAGEMAKER_MODEL_TYPE=llama
```

### 3. Use with NeuroLink SDK

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  input: { text: "Explain quantum computing in simple terms." },
  provider: "sagemaker",
});

console.log(result.content);
```

### 4. Use with NeuroLink CLI

```bash
# Basic generation
neurolink generate "Explain quantum computing" --provider sagemaker

# With specific model name
neurolink generate "Write a haiku" --provider sagemaker --model my-custom-model
```

---

## Environment Variables

### AWS Credentials (Required)

| Variable                | Required | Description                                   |
| ----------------------- | -------- | --------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | Yes      | AWS access key ID for authentication          |
| `AWS_SECRET_ACCESS_KEY` | Yes      | AWS secret access key for authentication      |
| `AWS_SESSION_TOKEN`     | No       | Session token for temporary credentials (STS) |

### Region Configuration

Region is resolved in priority order:

1. Constructor `region` parameter (highest priority)
2. `SAGEMAKER_REGION` environment variable
3. `AWS_REGION` environment variable
4. `"us-east-1"` (default)

| Variable           | Default       | Description                        |
| ------------------ | ------------- | ---------------------------------- |
| `SAGEMAKER_REGION` | -             | SageMaker-specific region override |
| `AWS_REGION`       | `"us-east-1"` | General AWS region                 |

### Endpoint Configuration

Endpoint name is resolved in priority order:

1. `SAGEMAKER_DEFAULT_ENDPOINT`
2. `SAGEMAKER_ENDPOINT_NAME`
3. `"default-endpoint"` (fallback; will fail connectivity checks)

| Variable                     | Default | Description                                           |
| ---------------------------- | ------- | ----------------------------------------------------- |
| `SAGEMAKER_DEFAULT_ENDPOINT` | -       | Primary endpoint name (recommended)                   |
| `SAGEMAKER_ENDPOINT_NAME`    | -       | Alternate endpoint name variable                      |
| `SAGEMAKER_ENDPOINT`         | -       | Custom AWS service endpoint URL (for VPC/PrivateLink) |

:::note[SAGEMAKER_ENDPOINT vs SAGEMAKER_DEFAULT_ENDPOINT]
`SAGEMAKER_ENDPOINT` sets a custom AWS service URL (e.g., a VPC endpoint), while `SAGEMAKER_DEFAULT_ENDPOINT` and `SAGEMAKER_ENDPOINT_NAME` set the name of your deployed SageMaker model endpoint.
:::

### Model Configuration

Model name is resolved in priority order:

1. `SAGEMAKER_MODEL`
2. `SAGEMAKER_MODEL_NAME`
3. `"sagemaker-model"` (default)

| Variable               | Default             | Description                                                                    |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `SAGEMAKER_MODEL`      | `"sagemaker-model"` | Model identifier                                                               |
| `SAGEMAKER_MODEL_NAME` | -                   | Alternate model name variable                                                  |
| `SAGEMAKER_MODEL_TYPE` | `"custom"`          | Model type: `llama`, `mistral`, `claude`, `huggingface`, `jumpstart`, `custom` |

### Request Configuration

| Variable                      | Default              | Description                                         |
| ----------------------------- | -------------------- | --------------------------------------------------- |
| `SAGEMAKER_CONTENT_TYPE`      | `"application/json"` | Content-Type header for requests                    |
| `SAGEMAKER_ACCEPT`            | `"application/json"` | Accept header for responses                         |
| `SAGEMAKER_CUSTOM_ATTRIBUTES` | -                    | Custom attributes passed to the endpoint            |
| `SAGEMAKER_INPUT_FORMAT`      | `"custom"`           | Input format: `huggingface`, `jumpstart`, `custom`  |
| `SAGEMAKER_OUTPUT_FORMAT`     | `"custom"`           | Output format: `huggingface`, `jumpstart`, `custom` |

### Generation Defaults

| Variable                   | Default | Description                                         |
| -------------------------- | ------- | --------------------------------------------------- |
| `SAGEMAKER_MAX_TOKENS`     | -       | Maximum tokens to generate (model default if unset) |
| `SAGEMAKER_TEMPERATURE`    | -       | Temperature for sampling (0.0 - 2.0)                |
| `SAGEMAKER_TOP_P`          | -       | Top-p (nucleus) sampling (0.0 - 1.0)                |
| `SAGEMAKER_STOP_SEQUENCES` | -       | Comma-separated stop sequences                      |

### Client Configuration

| Variable                | Default | Description                                   |
| ----------------------- | ------- | --------------------------------------------- |
| `SAGEMAKER_TIMEOUT`     | `30000` | Request timeout in milliseconds (1000-300000) |
| `SAGEMAKER_MAX_RETRIES` | `3`     | Maximum retry attempts (0-10)                 |

---

## SDK Usage

### Basic Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  input: { text: "Summarize the benefits of serverless architecture." },
  provider: "sagemaker",
});

console.log(result.content);
```

### With Configuration Options

```typescript
const result = await ai.generate({
  input: { text: "Write a technical blog post about MLOps." },
  provider: "sagemaker",
  model: "my-fine-tuned-llama",
  temperature: 0.8,
  maxTokens: 2000,
});
```

### Testing Connectivity

```typescript
import { AmazonSageMakerProvider } from "@juspay/neurolink";

const provider = new AmazonSageMakerProvider(
  "my-model", // model name
  "my-endpoint", // endpoint name
  "us-east-1", // region
);

// Test configuration validity
const connectionTest = await provider.testConnection();
console.log("Connected:", connectionTest.connected);

// Get provider info
const info = provider.getSageMakerInfo();
console.log("Endpoint:", info.endpointName);
console.log("Model type:", info.modelType);
console.log("Region:", info.region);
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with SageMaker
neurolink generate "Your prompt here" --provider sagemaker

# Use provider alias
neurolink generate "Your prompt here" --provider aws-sagemaker

# Specify model name
neurolink generate "Your prompt here" --provider sagemaker --model my-llama-model

# With temperature
neurolink generate "Creative writing task" --provider sagemaker --temperature 0.9
```

### Loop Mode

```bash
# Start interactive session with SageMaker
neurolink loop --provider sagemaker

# Inside loop:
# > set provider sagemaker
# > set model my-fine-tuned-model
# > Explain the transformer architecture
```

---

## Feature Support

### Streaming: NOT Supported

:::danger[Streaming Limitation]
Calling `neurolink.stream()` with the SageMaker provider will throw a `SageMakerError`:

```
SageMaker streaming not yet fully implemented. Coming in next phase.
```

**Error details:** Code `MODEL_ERROR`, HTTP status 501.

**Workaround:** Use `neurolink.generate()` instead. If you need streaming behavior in your application, consider using a different provider (e.g., Bedrock, OpenAI) or implement application-level chunking of the generate response.
:::

### Embeddings: NOT Supported

The SageMaker provider does not implement `embed()` or `embedMany()`. Calling these methods will throw an error from the base provider. For embeddings on AWS, use the [AWS Bedrock provider](./aws-bedrock.md) with Amazon Titan Embeddings or Cohere Embed models.

### Tool Use

The SageMaker provider includes tool calling support at the language model level. Tools are converted to a format compatible with SageMaker endpoints. However, tool calling behavior depends entirely on the model deployed behind your endpoint:

- Models that support function calling (e.g., fine-tuned Llama, Claude) should work with NeuroLink's tool system
- Custom models or older model versions may not understand tool call formats
- Test tool calling with your specific endpoint before relying on it in production

### Structured Output

The provider supports `json_object` and `json_schema` response formats for models that can produce structured JSON. Again, actual support depends on the deployed model's capabilities.

### Batch Inference

The SageMaker language model supports batch processing of multiple prompts with adaptive concurrency control:

- Dynamic concurrency adjustment based on endpoint response times
- Automatic error recovery for individual prompts in a batch
- Configurable concurrency limits

---

## IAM Permissions

### Minimum Required Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:InvokeEndpoint",
        "sagemaker:InvokeEndpointWithResponseStream"
      ],
      "Resource": "arn:aws:sagemaker:*:ACCOUNT_ID:endpoint/*"
    }
  ]
}
```

### Restrictive Policy (Recommended for Production)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:InvokeEndpoint",
        "sagemaker:InvokeEndpointWithResponseStream"
      ],
      "Resource": [
        "arn:aws:sagemaker:us-east-1:ACCOUNT_ID:endpoint/my-llama-endpoint",
        "arn:aws:sagemaker:us-east-1:ACCOUNT_ID:endpoint/my-mistral-endpoint"
      ]
    }
  ]
}
```

### Setup via AWS CLI

```bash
# Create IAM policy
cat > sagemaker-invoke-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:InvokeEndpoint",
        "sagemaker:InvokeEndpointWithResponseStream"
      ],
      "Resource": "arn:aws:sagemaker:*:ACCOUNT_ID:endpoint/*"
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name SageMakerInvokePolicy \
  --policy-document file://sagemaker-invoke-policy.json

# Attach to user or role
aws iam attach-user-policy \
  --user-name my-user \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/SageMakerInvokePolicy
```

### EC2 Instance Role

```bash
# Create trust policy for EC2
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role and attach policy
aws iam create-role \
  --role-name SageMakerEC2Role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name SageMakerEC2Role \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/SageMakerInvokePolicy
```

---

## Provider Aliases

The SageMaker provider can be referenced by any of these names:

| Alias           | Example                    |
| --------------- | -------------------------- |
| `sagemaker`     | `--provider sagemaker`     |
| `aws-sagemaker` | `--provider aws-sagemaker` |

---

## VPC & Private Connectivity

### Custom AWS Service Endpoint

To route SageMaker API calls through a VPC endpoint (PrivateLink), set the `SAGEMAKER_ENDPOINT` environment variable:

```bash
export SAGEMAKER_ENDPOINT=https://vpce-12345678.sagemaker-runtime.us-east-1.vpce.amazonaws.com
```

### VPC Endpoint Setup

```bash
# Create VPC endpoint for SageMaker Runtime
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.sagemaker.runtime \
  --route-table-ids rtb-12345678 \
  --subnet-ids subnet-12345678 subnet-87654321 \
  --security-group-ids sg-12345678
```

---

## Configuration Validation

The provider validates all configuration at initialization using Zod schemas. If required variables are missing, it throws a descriptive error listing exactly which variables need to be set.

```typescript
import { checkSageMakerConfiguration } from "@juspay/neurolink";

const check = checkSageMakerConfiguration();

console.log("Configured:", check.configured);
console.log("Issues:", check.issues);
console.log("Summary:", check.summary);
```

You can also load configuration from a JSON file instead of environment variables:

```typescript
import { loadConfigurationFromFile } from "@juspay/neurolink";

const config = await loadConfigurationFromFile("./sagemaker-config.json");
```

---

## Troubleshooting

### Common Issues

#### 1. "AWS credentials not configured"

**Problem**: Missing `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`.

**Solution**:

```bash
# Set credentials
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# Or configure via AWS CLI
aws configure
```

#### 2. "SageMaker endpoint not configured"

**Problem**: No endpoint name provided and the default `"default-endpoint"` is being used.

**Solution**:

```bash
# Set your endpoint name
export SAGEMAKER_DEFAULT_ENDPOINT=my-model-endpoint
```

#### 3. "SageMaker streaming not yet fully implemented"

**Problem**: Called `stream()` on the SageMaker provider.

**Solution**: Use `generate()` instead:

```typescript
// Will throw an error
const stream = await ai.stream({ ... provider: "sagemaker" });

// Use this instead
const result = await ai.generate({ ... provider: "sagemaker" });
```

#### 4. "SageMaker request timed out"

**Problem**: Endpoint did not respond within the timeout period.

**Solution**:

```bash
# Increase timeout (default: 30000ms)
export SAGEMAKER_TIMEOUT=60000

# Also check endpoint status in AWS Console
aws sagemaker describe-endpoint --endpoint-name my-endpoint
```

#### 5. "ThrottlingException"

**Problem**: Exceeded SageMaker invocation rate limits.

**Solution**:

- Check your endpoint's autoscaling configuration
- Increase the number of instances behind your endpoint
- The provider automatically retries throttled requests with exponential backoff (up to `SAGEMAKER_MAX_RETRIES` attempts)

#### 6. "Endpoint not found"

**Problem**: The specified endpoint does not exist or is not in the correct region.

**Solution**:

```bash
# List endpoints in your region
aws sagemaker list-endpoints --region us-east-1

# Verify endpoint status
aws sagemaker describe-endpoint \
  --endpoint-name my-endpoint \
  --region us-east-1
```

---

## Related Documentation

- **[AWS Bedrock Provider](./aws-bedrock.md)** - Serverless foundation models on AWS (supports streaming and embeddings)
- **[Provider Setup](../provider-setup.md)** - General provider configuration
- **[Hugging Face Provider](./huggingface.md)** - Direct Hugging Face Inference API access

---

## Additional Resources

- **[SageMaker Docs](https://docs.aws.amazon.com/sagemaker/)** - Official documentation
- **[SageMaker Pricing](https://aws.amazon.com/sagemaker/pricing/)** - Instance and inference pricing
- **[SageMaker Console](https://console.aws.amazon.com/sagemaker)** - Manage endpoints
- **[JumpStart Models](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-jumpstart.html)** - Pre-built model catalog
- **[Hugging Face on SageMaker](https://huggingface.co/docs/sagemaker)** - Deploy HF models to SageMaker

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
