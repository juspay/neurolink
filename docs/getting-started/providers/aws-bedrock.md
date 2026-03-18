---
title: AWS Bedrock Provider Guide
description: Serverless AI on AWS with Claude, Nova, Llama, Mistral, DeepSeek, Qwen, and 110+ foundation models
keywords: aws bedrock, claude, nova, llama, mistral, deepseek, qwen, serverless AI, aws
---

# AWS Bedrock Provider Guide

**Enterprise AI with Claude, Nova, Llama, Mistral, DeepSeek, Qwen, and 110+ foundation models on AWS infrastructure**

---

## Overview

Amazon Bedrock provides serverless access to 110+ foundation models from leading AI companies including Anthropic, Amazon, Meta, Mistral, DeepSeek, Qwen, Cohere, AI21 Labs, Google, NVIDIA, Writer, and more. Perfect for enterprise deployments requiring AWS integration, scalability, and compliance.

:::danger[Inference Profile ARN Required]
For Anthropic Claude models, you MUST use the full inference profile ARN, not simple model names. For Claude 4+ models, use cross-region inference profile IDs (e.g., `us.anthropic.claude-sonnet-4-6`) or full ARNs for on-demand access. See configuration examples below for the correct format.
:::

### Key Benefits

- **🤖 110+ Models**: Claude, Nova, Llama 4, Mistral, DeepSeek, Qwen, Cohere, and more
- **🏢 AWS Integration**: IAM, VPC, CloudWatch, S3
- **🌍 Global Regions**: 10+ AWS regions
- **🔒 Enterprise Security**: PrivateLink, KMS encryption
- **💰 Pay-per-use**: No infrastructure costs
- **📊 Serverless**: Automatic scaling
- **🛡️ Compliance**: SOC 2, HIPAA, ISO 27001

### Available Model Providers

| Provider       | Key Models (count)                                                       | Best For                                 |
| -------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| **Anthropic**  | Claude 4.6 Opus/Sonnet, 4.5, 4.1, 4, 3.7, 3.5, 3 (12)                    | Complex reasoning, coding, 1M context    |
| **Amazon**     | Nova Premier/Pro/Lite/Micro, Nova 2, Sonic, Canvas, Reel (11)            | AWS-native, multimodal, media generation |
| **Meta**       | Llama 4 Scout/Maverick, 3.3, 3.2, 3.1, 3 (12)                            | Open source, long context (10M)          |
| **Mistral AI** | Large 3, Magistral, Ministral, Pixtral, Voxtral, Devstral (14)           | European compliance, coding, multimodal  |
| **DeepSeek**   | R1, V3 (2)                                                               | Deep reasoning, cost-effective           |
| **Qwen**       | Qwen 3, Qwen 3 Coder, Qwen 3 VL, Qwen 3 Next (6)                         | Coding, vision, multilingual             |
| **Cohere**     | Command R/R+, Embed v3/v4, Rerank v3.5 (6)                               | Enterprise search, RAG, reranking        |
| **AI21 Labs**  | Jamba 1.5 Large/Mini (2)                                                 | Long context                             |
| **Google**     | Gemma 3 (27B, 12B, 4B) (3)                                               | Lightweight open models                  |
| **Other**      | NVIDIA Nemotron, Writer Palmyra, MiniMax, Kimi, OpenAI gpt-oss, Z.AI GLM | Specialized workloads                    |

---

## Quick Start

### 1. Enable Model Access

```bash
# Via AWS CLI
aws bedrock list-foundation-models --region us-east-1

# Request model access (one-time)
# Go to: https://console.aws.amazon.com/bedrock
# → Model access → Manage model access
# → Select models → Request access
```

Or via AWS Console:

1. Open [Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Select region (us-east-1 recommended)
3. Click "Model access"
4. Enable desired models (instant for most, approval needed for some)

### 2. Setup IAM Permissions

```bash
# Create IAM policy
cat > bedrock-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name BedrockInvokePolicy \
  --policy-document file://bedrock-policy.json

# Attach to user/role
aws iam attach-user-policy \
  --user-name my-user \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/BedrockInvokePolicy
```

### 3. Configure AWS Credentials

```bash
# Option A: AWS CLI credentials
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1

# Option B: Environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

### 4. Configure NeuroLink

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "bedrock",
      config: {
        region: "us-east-1",
        // Credentials automatically loaded from:
        // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
        // 2. ~/.aws/credentials
        // 3. EC2 instance metadata
      },
    },
  ],
});

const result = await ai.generate({
  input: { text: "Hello from AWS Bedrock!" },
  provider: "bedrock",
  model: "anthropic.claude-sonnet-4-5-20250929-v1:0", // or use cross-region profile: "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
});

console.log(result.content);
```

---

## Regional Deployment

### Available Regions

| Region             | Location      | Models Available | Data Residency |
| ------------------ | ------------- | ---------------- | -------------- |
| **us-east-1**      | N. Virginia   | All models       | USA            |
| **us-west-2**      | Oregon        | All models       | USA            |
| **us-gov-west-1**  | GovCloud West | Select models    | USA Gov        |
| **ca-central-1**   | Canada        | Most models      | Canada         |
| **eu-west-1**      | Ireland       | All models       | EU             |
| **eu-west-2**      | London        | Most models      | UK             |
| **eu-west-3**      | Paris         | Most models      | EU             |
| **eu-central-1**   | Frankfurt     | All models       | EU             |
| **ap-southeast-1** | Singapore     | Most models      | Asia           |
| **ap-northeast-1** | Tokyo         | Most models      | Asia           |
| **ap-south-1**     | Mumbai        | Select models    | India          |

### Multi-Region Setup

```typescript
const ai = new NeuroLink({
  providers: [
    // US East (primary)
    {
      name: "bedrock-us-east",
      priority: 1,
      config: {
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      },
      condition: (req) => req.userRegion === "us",
    },

    // EU West (GDPR)
    {
      name: "bedrock-eu",
      priority: 1,
      config: {
        region: "eu-west-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      },
      condition: (req) => req.userRegion === "eu",
    },

    // Asia Pacific
    {
      name: "bedrock-asia",
      priority: 1,
      config: {
        region: "ap-southeast-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      },
      condition: (req) => req.userRegion === "asia",
    },
  ],
  failoverConfig: { enabled: true },
});
```

---

## Model Selection Guide

:::warning[Default Model Updated]
The SDK default fallback is now `anthropic.claude-sonnet-4-6`. The previous default (`anthropic.claude-3-sonnet-20240229-v1:0`) is deprecated. You can still override the model by setting `BEDROCK_MODEL` in your environment or passing the `model` parameter in code.
:::

### Anthropic Claude Models

```typescript
// Claude 4.6 Opus - Latest, most capable (1M context)
const opus46 = await ai.generate({
  input: { text: "Most difficult reasoning task" },
  provider: "bedrock",
  model: "anthropic.claude-opus-4-6-v1:0",
});

// Claude 4.5 Sonnet - Balanced performance (recommended)
const sonnet45 = await ai.generate({
  input: { text: "Complex analysis task" },
  provider: "bedrock",
  model: "anthropic.claude-sonnet-4-5-20250929-v1:0",
});

// Claude 3.5 Haiku - Fast and affordable
const haiku35 = await ai.generate({
  input: { text: "Quick simple query" },
  provider: "bedrock",
  model: "anthropic.claude-3-5-haiku-20241022-v1:0",
});
```

**Claude Model IDs:**

| Model ID                                    | Series                  | Context |
| ------------------------------------------- | ----------------------- | ------- |
| `anthropic.claude-opus-4-6-v1:0`            | Claude 4.6 Opus         | 1M      |
| `anthropic.claude-sonnet-4-6`               | Claude 4.6 Sonnet       | 1M      |
| `anthropic.claude-opus-4-5-20251124-v1:0`   | Claude 4.5 Opus         | 200K    |
| `anthropic.claude-sonnet-4-5-20250929-v1:0` | Claude 4.5 Sonnet       | 200K    |
| `anthropic.claude-haiku-4-5-20251001-v1:0`  | Claude 4.5 Haiku        | 200K    |
| `anthropic.claude-opus-4-1-20250805-v1:0`   | Claude 4.1 Opus         | 200K    |
| `anthropic.claude-sonnet-4-20250514-v1:0`   | Claude 4 Sonnet         | 200K    |
| `anthropic.claude-3-7-sonnet-20250219-v1:0` | Claude 3.7 Sonnet       | 200K    |
| `anthropic.claude-3-5-sonnet-20241022-v1:0` | Claude 3.5 Sonnet       | 200K    |
| `anthropic.claude-3-5-haiku-20241022-v1:0`  | Claude 3.5 Haiku        | 200K    |
| `anthropic.claude-3-opus-20240229-v1:0`     | Claude 3 Opus (legacy)  | 200K    |
| `anthropic.claude-3-haiku-20240307-v1:0`    | Claude 3 Haiku (legacy) | 200K    |

> **Tip:** For Claude 4+ models, AWS recommends cross-region inference profile IDs (e.g., `us.anthropic.claude-sonnet-4-6`) instead of bare model IDs. Cross-region profiles enable automatic routing across regions for better availability. See the [Bedrock cross-region inference docs](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) for details.

### Amazon Nova Models

Amazon Nova is the first-party model family from AWS, spanning text, multimodal, media generation, speech, and embeddings.

```typescript
// Nova Pro - Multimodal, balanced (300K context)
const novaPro = await ai.generate({
  input: { text: "Analyze this data" },
  provider: "bedrock",
  model: "amazon.nova-pro-v1:0",
});

// Nova Micro - Text only, fastest (128K context)
const novaMicro = await ai.generate({
  input: { text: "Quick classification" },
  provider: "bedrock",
  model: "amazon.nova-micro-v1:0",
});

// Nova 2 Lite - Next-gen multimodal (1M context)
const nova2Lite = await ai.generate({
  input: { text: "Long document analysis" },
  provider: "bedrock",
  model: "amazon.nova-2-lite-v1:0",
});
```

**Nova Model IDs:**

| Model ID                                   | Type              | Context | Notes                   |
| ------------------------------------------ | ----------------- | ------- | ----------------------- |
| `amazon.nova-premier-v1:0`                 | Text + Multimodal | 1M+     | Most capable Nova       |
| `amazon.nova-pro-v1:0`                     | Text + Multimodal | 300K    | Balanced                |
| `amazon.nova-lite-v1:0`                    | Text + Multimodal | 300K    | Cost-effective          |
| `amazon.nova-micro-v1:0`                   | Text only         | 128K    | Fastest, cheapest       |
| `amazon.nova-2-lite-v1:0`                  | Text + Multimodal | 1M      | Gen 2, extended context |
| `amazon.nova-2-sonic-v1:0`                 | Speech-to-speech  | --      | Gen 2 voice             |
| `amazon.nova-sonic-v1:0`                   | Speech-to-speech  | --      | Real-time voice         |
| `amazon.nova-canvas-v1:0`                  | Image generation  | --      | Text-to-image           |
| `amazon.nova-reel-v1:0`                    | Video generation  | --      | Text-to-video           |
| `amazon.nova-reel-v1:1`                    | Video generation  | --      | Improved v1.1           |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Embeddings        | --      | Multimodal embeddings   |

### Meta Llama Models

```typescript
// Llama 4 Scout - Massive 10M context window
const scout = await ai.generate({
  input: { text: "Analyze this very long document" },
  provider: "bedrock",
  model: "meta.llama4-scout-17b-instruct-v1:0",
});

// Llama 4 Maverick - 1M context, higher quality
const maverick = await ai.generate({
  input: { text: "Complex reasoning task" },
  provider: "bedrock",
  model: "meta.llama4-maverick-17b-instruct-v1:0",
});

// Llama 3.3 70B - Strong general-purpose
const llama33 = await ai.generate({
  input: { text: "General task" },
  provider: "bedrock",
  model: "meta.llama3-3-70b-instruct-v1:0",
});
```

**Llama Model IDs:**

| Model ID                                 | Series           | Context | Notes                             |
| ---------------------------------------- | ---------------- | ------- | --------------------------------- |
| `meta.llama4-scout-17b-instruct-v1:0`    | Llama 4 Scout    | 10M     | Largest context window on Bedrock |
| `meta.llama4-maverick-17b-instruct-v1:0` | Llama 4 Maverick | 1M      | Higher quality                    |
| `meta.llama3-3-70b-instruct-v1:0`        | Llama 3.3        | 128K    | Strong general-purpose            |
| `meta.llama3-2-90b-instruct-v1:0`        | Llama 3.2        | 128K    | Multimodal (vision)               |
| `meta.llama3-2-11b-instruct-v1:0`        | Llama 3.2        | 128K    | Multimodal (vision)               |
| `meta.llama3-2-3b-instruct-v1:0`         | Llama 3.2        | 128K    | Lightweight                       |
| `meta.llama3-2-1b-instruct-v1:0`         | Llama 3.2        | 128K    | Edge / mobile                     |
| `meta.llama3-1-405b-instruct-v1:0`       | Llama 3.1        | 128K    | Largest open model                |
| `meta.llama3-1-70b-instruct-v1:0`        | Llama 3.1        | 128K    | Balanced                          |
| `meta.llama3-1-8b-instruct-v1:0`         | Llama 3.1        | 128K    | Fast, cheap                       |
| `meta.llama3-70b-instruct-v1:0`          | Llama 3 (legacy) | 8K      | --                                |
| `meta.llama3-8b-instruct-v1:0`           | Llama 3 (legacy) | 8K      | --                                |

### Mistral AI Models

```typescript
// Mistral Large 3 (675B) - Most capable
const mistralLarge3 = await ai.generate({
  input: { text: "Complex reasoning" },
  provider: "bedrock",
  model: "mistral.mistral-large-3-675b-instruct",
});

// Pixtral Large - Vision + text
const pixtral = await ai.generate({
  input: { text: "Describe this image" },
  provider: "bedrock",
  model: "mistral.pixtral-large-2502-v1:0",
});
```

**Mistral Model IDs:**

| Model ID                                | Type                  | Notes               |
| --------------------------------------- | --------------------- | ------------------- |
| `mistral.mistral-large-3-675b-instruct` | Large 3 (675B)        | Most capable        |
| `mistral.mistral-large-2407-v1:0`       | Large 2               | Previous gen        |
| `mistral.mistral-large-2402-v1:0`       | Large (legacy)        | --                  |
| `mistral.magistral-small-2509`          | Magistral Small       | Reasoning-focused   |
| `mistral.ministral-3-14b-instruct`      | Ministral 14B         | Mid-size            |
| `mistral.ministral-3-8b-instruct`       | Ministral 8B          | Lightweight         |
| `mistral.ministral-3-3b-instruct`       | Ministral 3B          | Edge / mobile       |
| `mistral.pixtral-large-2502-v1:0`       | Pixtral Large         | Vision + text       |
| `mistral.voxtral-small-24b-2507`        | Voxtral Small 24B     | Audio + text        |
| `mistral.voxtral-mini-3b-2507`          | Voxtral Mini 3B       | Audio (lightweight) |
| `mistral.devstral-2-123b`               | Devstral 2 (123B)     | Coding-focused      |
| `mistral.mistral-7b-instruct-v0:2`      | Mistral 7B (legacy)   | --                  |
| `mistral.mixtral-8x7b-instruct-v0:1`    | Mixtral 8x7B (legacy) | --                  |

### DeepSeek, Qwen, and Other Models

```typescript
// DeepSeek R1 - Deep reasoning
const deepseek = await ai.generate({
  input: { text: "Solve this step by step" },
  provider: "bedrock",
  model: "deepseek.r1-v1:0",
});

// Qwen 3 (235B) - Multilingual, coding
const qwen = await ai.generate({
  input: { text: "Write a Python function" },
  provider: "bedrock",
  model: "qwen.qwen3-235b-a22b-2507-v1:0",
});
```

**Additional Model IDs:**

| Model ID                          | Provider             | Notes                            |
| --------------------------------- | -------------------- | -------------------------------- |
| `deepseek.r1-v1:0`                | DeepSeek             | Deep reasoning (R1)              |
| `deepseek.v3-v1:0`                | DeepSeek             | General-purpose (V3)             |
| `qwen.qwen3-235b-a22b-2507-v1:0`  | Qwen                 | Flagship (235B MoE)              |
| `qwen.qwen3-coder-480b-a35b-v1:0` | Qwen                 | Coding (480B MoE)                |
| `qwen.qwen3-coder-30b-a3b-v1:0`   | Qwen                 | Coding (lightweight)             |
| `qwen.qwen3-32b-v1:0`             | Qwen                 | Dense 32B                        |
| `qwen.qwen3-next-80b-a3b`         | Qwen                 | Next-gen MoE                     |
| `qwen.qwen3-vl-235b-a22b`         | Qwen                 | Vision-language                  |
| `ai21.jamba-1-5-large-v1:0`       | AI21 Labs            | Jamba 1.5 Large (256K context)   |
| `ai21.jamba-1-5-mini-v1:0`        | AI21 Labs            | Jamba 1.5 Mini                   |
| `google.gemma-3-27b-it`           | Google               | Gemma 3 27B                      |
| `google.gemma-3-12b-it`           | Google               | Gemma 3 12B                      |
| `google.gemma-3-4b-it`            | Google               | Gemma 3 4B                       |
| `nvidia.nemotron-nano-3-30b`      | NVIDIA               | Nemotron Nano 30B (256K context) |
| `writer.palmyra-x5-v1:0`          | Writer               | Palmyra X5 (1M context)          |
| `openai.gpt-oss-120b-1:0`         | OpenAI (open source) | GPT-OSS 120B                     |

### Embedding and Reranking Models

```typescript
// Nova 2 Multimodal Embeddings (text + image)
const novaEmbed = await ai.embed({
  texts: ["Document 1", "Document 2"],
  provider: "bedrock",
  model: "amazon.nova-2-multimodal-embeddings-v1:0",
});

// Cohere Embed v4 - Latest embeddings
const cohereEmbed = await ai.embed({
  texts: ["Query text"],
  provider: "bedrock",
  model: "cohere.embed-v4:0",
});

// Titan Embeddings v2 (legacy)
const titanEmbed = await ai.embed({
  texts: ["Document"],
  provider: "bedrock",
  model: "amazon.titan-embed-text-v2:0",
});
```

**Embedding & Reranking Model IDs:**

| Model ID                                   | Type      | Notes                     |
| ------------------------------------------ | --------- | ------------------------- |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Embedding | Multimodal (text + image) |
| `cohere.embed-v4:0`                        | Embedding | Latest Cohere embeddings  |
| `cohere.embed-english-v3`                  | Embedding | English-optimized         |
| `cohere.embed-multilingual-v3`             | Embedding | 100+ languages            |
| `amazon.titan-embed-text-v2:0`             | Embedding | 1024 dimensions           |
| `amazon.titan-embed-text-v1`               | Embedding | 1536 dimensions           |
| `amazon.titan-embed-image-v1`              | Embedding | Multimodal (legacy)       |
| `cohere.rerank-v3-5:0`                     | Reranking | Relevance scoring for RAG |
| `amazon.rerank-v1:0`                       | Reranking | AWS-native reranking      |

### Cohere Generation Models

```typescript
// Command R+ - RAG optimized
const commandRPlus = await ai.generate({
  input: { text: "Search and summarize documents" },
  provider: "bedrock",
  model: "cohere.command-r-plus-v1:0",
});
```

**Cohere Generation Model IDs:**

- `cohere.command-r-plus-v1:0` - Command R+ (best for RAG)
- `cohere.command-r-v1:0` - Command R (lighter)

---

## IAM Roles & Permissions

### EC2 Instance Role

```bash
# Create trust policy
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

# Create role
aws iam create-role \
  --role-name BedrockEC2Role \
  --assume-role-policy-document file://trust-policy.json

# Attach Bedrock policy
aws iam attach-role-policy \
  --role-name BedrockEC2Role \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/BedrockInvokePolicy

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name BedrockEC2Profile

# Add role to profile
aws iam add-role-to-instance-profile \
  --instance-profile-name BedrockEC2Profile \
  --role-name BedrockEC2Role
```

### Lambda Execution Role

```bash
# Lambda trust policy
cat > lambda-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create Lambda role
aws iam create-role \
  --role-name BedrockLambdaRole \
  --assume-role-policy-document file://lambda-trust.json

# Attach policies
aws iam attach-role-policy \
  --role-name BedrockLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name BedrockLambdaRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/BedrockInvokePolicy
```

### EKS Service Account

```yaml
# eks-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bedrock-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/BedrockEKSRole
```

```bash
# Create IRSA (IAM Roles for Service Accounts)
eksctl create iamserviceaccount \
  --name bedrock-sa \
  --namespace default \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/BedrockInvokePolicy \
  --approve
```

---

## VPC & Private Connectivity

### VPC Endpoint (PrivateLink)

```bash
# Create VPC endpoint for Bedrock
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.bedrock-runtime \
  --route-table-ids rtb-12345678 \
  --subnet-ids subnet-12345678 subnet-87654321 \
  --security-group-ids sg-12345678
```

### Security Group Configuration

```bash
# Create security group
aws ec2 create-security-group \
  --group-name bedrock-endpoint-sg \
  --description "Security group for Bedrock VPC endpoint" \
  --vpc-id vpc-12345678

# Allow HTTPS inbound from VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/16
```

### Private Endpoint Usage

```typescript
// Use VPC endpoint URL
const ai = new NeuroLink({
  providers: [
    {
      name: "bedrock",
      config: {
        region: "us-east-1",
        endpoint:
          "https://vpce-12345678.bedrock-runtime.us-east-1.vpce.amazonaws.com",
      },
    },
  ],
});
```

---

## Monitoring & Logging

### CloudWatch Metrics

```typescript
import { CloudWatch } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatch({ region: "us-east-1" });

async function logMetric(tokens: number, cost: number) {
  await cloudwatch.putMetricData({
    Namespace: "Bedrock/Usage",
    MetricData: [
      {
        MetricName: "TokensUsed",
        Value: tokens,
        Unit: "Count",
        Timestamp: new Date(),
      },
      {
        MetricName: "Cost",
        Value: cost,
        Unit: "None",
        Timestamp: new Date(),
      },
    ],
  });
}

const ai = new NeuroLink({
  providers: [{ name: "bedrock", config: { region: "us-east-1" } }],
  onSuccess: async (result) => {
    await logMetric(result.usage.totalTokens, result.cost);
  },
});
```

### CloudWatch Logs

```typescript
import { CloudWatchLogs } from "@aws-sdk/client-cloudwatch-logs";

const logs = new CloudWatchLogs({ region: "us-east-1" });

async function logRequest(data: any) {
  await logs.putLogEvents({
    logGroupName: "/aws/bedrock/requests",
    logStreamName: "production",
    logEvents: [
      {
        timestamp: Date.now(),
        message: JSON.stringify(data),
      },
    ],
  });
}

const ai = new NeuroLink({
  providers: [{ name: "bedrock", config: { region: "us-east-1" } }],
  onSuccess: async (result) => {
    await logRequest({
      model: result.model,
      tokens: result.usage.totalTokens,
      latency: result.latency,
      cost: result.cost,
    });
  },
});
```

---

## Cost Management

### Pricing Overview

Pricing varies by model and changes frequently. Check the [Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) for current rates. Representative examples:

```
Claude 4.5 Sonnet:
- Input:  $3.00 per 1M tokens
- Output: $15.00 per 1M tokens

Claude 3.5 Haiku:
- Input:  $0.80 per 1M tokens
- Output: $4.00 per 1M tokens

Nova Pro:
- Input:  $0.80 per 1M tokens
- Output: $3.20 per 1M tokens

Nova Micro:
- Input:  $0.035 per 1M tokens
- Output: $0.14 per 1M tokens

Llama 4 Scout:
- Input:  $0.17 per 1M tokens
- Output: $0.17 per 1M tokens

Llama 3.1 405B:
- Input:  $2.65 per 1M tokens
- Output: $3.50 per 1M tokens

Mistral Large 3:
- Input:  $2.00 per 1M tokens
- Output: $6.00 per 1M tokens

DeepSeek R1:
- Input:  $1.35 per 1M tokens
- Output: $5.40 per 1M tokens
```

### Cost Budgets

```bash
# Create budget for Bedrock
aws budgets create-budget \
  --account-id ACCOUNT_ID \
  --budget file://budget.json

# budget.json
cat > budget.json <<EOF
{
  "BudgetName": "BedrockMonthlyBudget",
  "BudgetLimit": {
    "Amount": "1000",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "Service": ["Amazon Bedrock"]
  }
}
EOF
```

### Cost Tracking

```typescript
class BedrockCostTracker {
  private monthlyCost = 0;

  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const pricing: Record<string, { input: number; output: number }> = {
      "anthropic.claude-sonnet-4-5-20250929-v1:0": { input: 3.0, output: 15.0 },
      "anthropic.claude-3-5-haiku-20241022-v1:0": { input: 0.8, output: 4.0 },
      "amazon.nova-pro-v1:0": { input: 0.8, output: 3.2 },
      "amazon.nova-micro-v1:0": { input: 0.035, output: 0.14 },
      "meta.llama4-scout-17b-instruct-v1:0": { input: 0.17, output: 0.17 },
    };

    const rates = pricing[model] || { input: 1.0, output: 1.0 };
    const cost =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    this.monthlyCost += cost;
    return cost;
  }

  getMonthlyTotal(): number {
    return this.monthlyCost;
  }
}
```

---

## Production Patterns

### Pattern 1: Multi-Model Strategy

```typescript
const ai = new NeuroLink({
  providers: [
    // Cheap for simple tasks (Nova Micro - $0.035/1M input)
    {
      name: "bedrock-nova-micro",
      config: { region: "us-east-1" },
      model: "amazon.nova-micro-v1:0",
      condition: (req) => req.complexity === "low",
    },

    // Balanced for medium tasks
    {
      name: "bedrock-sonnet",
      config: { region: "us-east-1" },
      model: "anthropic.claude-sonnet-4-5-20250929-v1:0",
      condition: (req) => req.complexity === "medium",
    },

    // Premium for complex tasks (1M context)
    {
      name: "bedrock-opus",
      config: { region: "us-east-1" },
      model: "anthropic.claude-opus-4-6-v1:0",
      condition: (req) => req.complexity === "high",
    },
  ],
});
```

### Pattern 2: Guardrails

```typescript
// Enable Bedrock Guardrails
const ai = new NeuroLink({
  providers: [
    {
      name: "bedrock",
      config: {
        region: "us-east-1",
        guardrailId: "abc123xyz", // Created in Bedrock console
        guardrailVersion: "1",
      },
    },
  ],
});

const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "bedrock",
  model: "anthropic.claude-sonnet-4-5-20250929-v1:0",
});
// Content filtered by guardrails
```

### Pattern 3: Knowledge Base Integration

```bash
# Create Knowledge Base in Bedrock
aws bedrock-agent create-knowledge-base \
  --name my-kb \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/BedrockKBRole \
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }' \
  --storage-configuration '{
    "type": "OPENSEARCH_SERVERLESS",
    "opensearchServerlessConfiguration": {
      "collectionArn": "arn:aws:aoss:us-east-1:ACCOUNT_ID:collection/abc",
      "vectorIndexName": "my-index",
      "fieldMapping": {
        "vectorField": "embedding",
        "textField": "text",
        "metadataField": "metadata"
      }
    }
  }'
```

---

## Best Practices

### 1. ✅ Use IAM Roles Instead of Keys

```typescript
// ✅ Good: EC2 instance role (no keys)
const ai = new NeuroLink({
  providers: [
    {
      name: "bedrock",
      config: { region: "us-east-1" },
      // Credentials from instance metadata
    },
  ],
});
```

### 2. ✅ Enable VPC Endpoints

```bash
# ✅ Good: Private connectivity
aws ec2 create-vpc-endpoint \
  --service-name com.amazonaws.us-east-1.bedrock-runtime
```

### 3. ✅ Monitor Costs

```typescript
// ✅ Good: Track every request
const cost = costTracker.calculateCost(model, inputTokens, outputTokens);
```

### 4. ✅ Use Appropriate Model for Task

```typescript
// ✅ Good: Match model to complexity
const model = complexity === "low" ? "claude-haiku" : "claude-sonnet";
```

### 5. ✅ Enable CloudWatch Logging

```typescript
// ✅ Good: Comprehensive logging
await logs.putLogEvents({
  /* ... */
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Model Access Denied"

**Problem**: Model not enabled in your account.

**Solution**:

```bash
# Enable via console
# https://console.aws.amazon.com/bedrock → Model access

# Or check status
aws bedrock list-foundation-models --region us-east-1
```

#### 2. "Throttling Exception"

**Problem**: Exceeded rate limits.

**Solution**:

```bash
# Request quota increase
aws service-quotas request-service-quota-increase \
  --service-code bedrock \
  --quota-code L-12345678 \
  --desired-value 1000
```

#### 3. "Invalid Model ID"

**Problem**: Wrong model identifier.

**Solution**:

```bash
# List available models
aws bedrock list-foundation-models --region us-east-1

# Use exact model ID
model: 'anthropic.claude-sonnet-4-5-20250929-v1:0'  # ✅ Correct
```

---

## Related Documentation

- **[Provider Setup](../provider-setup.md)** - General configuration
- **[Multi-Region](../../guides/enterprise/multi-region.md)** - Geographic distribution
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce costs
- **[Compliance](../../guides/enterprise/compliance.md)** - Security

---

## Additional Resources

- **[AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)** - Official documentation
- **[Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)** - Pricing details
- **[Bedrock Console](https://console.aws.amazon.com/bedrock)** - Manage models
- **[AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/bedrock/)** - CLI commands

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
