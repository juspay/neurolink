---
title: AWS Bedrock Provider Guide
description: Serverless AI on AWS with Claude, Llama, Mistral and 13 foundation models
keywords: aws bedrock, claude, llama, mistral, serverless AI, aws
---

# AWS Bedrock Provider Guide

**Enterprise AI with Claude, Llama, Mistral, and more on AWS infrastructure**

---

## Overview

Amazon Bedrock provides serverless access to foundation models from leading AI companies including Anthropic, Meta, Mistral, Cohere, and Amazon. Perfect for enterprise deployments requiring AWS integration, scalability, and compliance.

!!! danger "Inference Profile ARN Required"
For Anthropic Claude models, you MUST use the full inference profile ARN, not simple model names. See configuration examples below for the correct format.

### Key Benefits

- **🤖 Multiple Models**: Claude, Llama 3, Mistral, Titan, Command
- **🏢 AWS Integration**: IAM, VPC, CloudWatch, S3
- **🌍 Global Regions**: 10+ AWS regions
- **🔒 Enterprise Security**: PrivateLink, KMS encryption
- **💰 Pay-per-use**: No infrastructure costs
- **📊 Serverless**: Automatic scaling
- **🛡️ Compliance**: SOC 2, HIPAA, ISO 27001

### Available Model Providers

| Provider         | Models                                 | Best For                    |
| ---------------- | -------------------------------------- | --------------------------- |
| **Anthropic**    | Claude 3.5 Sonnet, Claude 3 Opus/Haiku | Complex reasoning, coding   |
| **Meta**         | Llama 3.1 (8B, 70B, 405B)              | Open source, cost-effective |
| **Mistral AI**   | Mistral Large, Mixtral 8x7B            | European compliance, coding |
| **Cohere**       | Command R+, Embed                      | Enterprise search, RAG      |
| **Amazon**       | Titan Text, Titan Embeddings           | AWS-native, affordable      |
| **AI21 Labs**    | Jamba-Instruct                         | Long context                |
| **Stability AI** | Stable Diffusion XL                    | Image generation            |

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
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
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

### Anthropic Claude Models

```typescript
// Claude 3.5 Sonnet - Balanced performance (recommended)
const sonnet = await ai.generate({
  input: { text: "Complex analysis task" },
  provider: "bedrock",
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
});

// Claude 3 Opus - Highest intelligence
const opus = await ai.generate({
  input: { text: "Most difficult reasoning task" },
  provider: "bedrock",
  model: "anthropic.claude-3-opus-20240229-v1:0",
});

// Claude 3 Haiku - Fast and affordable
const haiku = await ai.generate({
  input: { text: "Quick simple query" },
  provider: "bedrock",
  model: "anthropic.claude-3-haiku-20240307-v1:0",
});
```

**Claude Model IDs:**

- `anthropic.claude-3-5-sonnet-20241022-v2:0` - Latest Sonnet
- `anthropic.claude-3-opus-20240229-v1:0` - Opus
- `anthropic.claude-3-haiku-20240307-v1:0` - Haiku

### Meta Llama Models

```typescript
// Llama 3.1 405B - Largest open model
const llama405b = await ai.generate({
  input: { text: "Complex task" },
  provider: "bedrock",
  model: "meta.llama3-1-405b-instruct-v1:0",
});

// Llama 3.1 70B - Balanced
const llama70b = await ai.generate({
  input: { text: "General task" },
  provider: "bedrock",
  model: "meta.llama3-1-70b-instruct-v1:0",
});

// Llama 3.1 8B - Fast and cheap
const llama8b = await ai.generate({
  input: { text: "Simple task" },
  provider: "bedrock",
  model: "meta.llama3-1-8b-instruct-v1:0",
});
```

**Llama Model IDs:**

- `meta.llama3-1-405b-instruct-v1:0` - 405B (most capable)
- `meta.llama3-1-70b-instruct-v1:0` - 70B (balanced)
- `meta.llama3-1-8b-instruct-v1:0` - 8B (fast)

### Mistral AI Models

```typescript
// Mistral Large - Most capable
const mistralLarge = await ai.generate({
  input: { text: "Complex reasoning" },
  provider: "bedrock",
  model: "mistral.mistral-large-2402-v1:0",
});

// Mixtral 8x7B - Cost-effective
const mixtral = await ai.generate({
  input: { text: "General task" },
  provider: "bedrock",
  model: "mistral.mixtral-8x7b-instruct-v0:1",
});
```

**Mistral Model IDs:**

- `mistral.mistral-large-2402-v1:0` - Mistral Large
- `mistral.mixtral-8x7b-instruct-v0:1` - Mixtral 8x7B

### Amazon Titan Models

```typescript
// Titan Text Premier - AWS native
const titanPremier = await ai.generate({
  input: { text: "AWS-optimized task" },
  provider: "bedrock",
  model: "amazon.titan-text-premier-v1:0",
});

// Titan Embeddings - Vector search
const embeddings = await ai.generateEmbeddings({
  texts: ["Document 1", "Document 2"],
  provider: "bedrock",
  model: "amazon.titan-embed-text-v2:0",
});
```

**Titan Model IDs:**

- `amazon.titan-text-premier-v1:0` - Text generation
- `amazon.titan-text-express-v1` - Fast text
- `amazon.titan-embed-text-v2:0` - Embeddings (1024 dim)
- `amazon.titan-embed-text-v1` - Embeddings (1536 dim)

### Cohere Models

```typescript
// Command R+ - RAG optimized
const commandRPlus = await ai.generate({
  input: { text: "Search and summarize documents" },
  provider: "bedrock",
  model: "cohere.command-r-plus-v1:0",
});

// Embed English - Embeddings
const cohereEmbed = await ai.generateEmbeddings({
  texts: ["Query text"],
  provider: "bedrock",
  model: "cohere.embed-english-v3",
});
```

**Cohere Model IDs:**

- `cohere.command-r-plus-v1:0` - Command R+
- `cohere.command-r-v1:0` - Command R
- `cohere.embed-english-v3` - Embeddings

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

```
Claude 3.5 Sonnet:
- Input:  $3.00 per 1M tokens
- Output: $15.00 per 1M tokens

Claude 3 Opus:
- Input:  $15.00 per 1M tokens
- Output: $75.00 per 1M tokens

Claude 3 Haiku:
- Input:  $0.25 per 1M tokens
- Output: $1.25 per 1M tokens

Llama 3.1 405B:
- Input:  $2.65 per 1M tokens
- Output: $3.50 per 1M tokens

Llama 3.1 70B:
- Input:  $0.99 per 1M tokens
- Output: $0.99 per 1M tokens

Llama 3.1 8B:
- Input:  $0.22 per 1M tokens
- Output: $0.22 per 1M tokens

Mistral Large:
- Input:  $4.00 per 1M tokens
- Output: $12.00 per 1M tokens

Titan Text Premier:
- Input:  $0.50 per 1M tokens
- Output: $1.50 per 1M tokens
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
      "anthropic.claude-3-5-sonnet-20241022-v2:0": { input: 3.0, output: 15.0 },
      "anthropic.claude-3-haiku-20240307-v1:0": { input: 0.25, output: 1.25 },
      "meta.llama3-1-405b-instruct-v1:0": { input: 2.65, output: 3.5 },
      "meta.llama3-1-8b-instruct-v1:0": { input: 0.22, output: 0.22 },
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
    // Cheap for simple tasks
    {
      name: "bedrock-haiku",
      config: { region: "us-east-1" },
      model: "anthropic.claude-3-haiku-20240307-v1:0",
      condition: (req) => req.complexity === "low",
    },

    // Balanced for medium tasks
    {
      name: "bedrock-sonnet",
      config: { region: "us-east-1" },
      model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      condition: (req) => req.complexity === "medium",
    },

    // Premium for complex tasks
    {
      name: "bedrock-opus",
      config: { region: "us-east-1" },
      model: "anthropic.claude-3-opus-20240229-v1:0",
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
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
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
model: 'anthropic.claude-3-5-sonnet-20241022-v2:0'  # ✅ Correct
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
