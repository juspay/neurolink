# 🚀 SageMaker Integration - Deploy Your Custom AI Models

> **✅ FULLY IMPLEMENTED**: NeuroLink now supports Amazon SageMaker, enabling you to deploy and use your own custom trained models through NeuroLink's unified interface. All features documented below are complete and production-ready.

## 🌟 **What is SageMaker Integration?**

SageMaker integration transforms NeuroLink into a platform for custom AI model deployment, offering:

- **🏗️ Custom Model Hosting** - Deploy your fine-tuned models on AWS infrastructure
- **💰 Cost Control** - Pay only for inference usage with auto-scaling capabilities
- **🔒 Enterprise Security** - Full control over model infrastructure and data privacy
- **⚡ Performance** - Dedicated compute resources with predictable latency
- **🌍 Global Deployment** - Available in all major AWS regions
- **📊 Monitoring** - Built-in CloudWatch metrics and logging

## 🚀 **Quick Start**

### **1. Deploy Your Model to SageMaker**

First, you need a model deployed to a SageMaker endpoint:

```python
# Example: Deploy a Hugging Face model to SageMaker
from sagemaker.huggingface import HuggingFaceModel

# Create model
huggingface_model = HuggingFaceModel(
    model_data="s3://your-bucket/model.tar.gz",
    role=role,
    transformers_version="4.21",
    pytorch_version="1.12",
    py_version="py39",
)

# Deploy to endpoint
predictor = huggingface_model.deploy(
    initial_instance_count=1,
    instance_type="ml.m5.large",
    endpoint_name="my-custom-model-endpoint"
)
```

### **2. Configure NeuroLink**

```bash
# Set AWS credentials and SageMaker configuration
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export SAGEMAKER_DEFAULT_ENDPOINT="my-custom-model-endpoint"
```

### **3. Use with CLI**

```bash
# Test SageMaker endpoint connectivity
npx @juspay/neurolink sagemaker status

# Generate content with your custom model
npx @juspay/neurolink generate "Analyze this business scenario" --provider sagemaker

# Use specific endpoint
npx @juspay/neurolink generate "Domain-specific task" --provider sagemaker --model my-domain-model

# Performance benchmark
npx @juspay/neurolink sagemaker benchmark my-custom-model-endpoint
```

### **4. Use with SDK**

```typescript
import { AIProviderFactory } from "@juspay/neurolink";

// Create SageMaker provider
const provider = await AIProviderFactory.createProvider("sagemaker");

// Generate with default endpoint
const result = await provider.generate({
  input: { text: "Analyze customer feedback for sentiment and themes" },
});

// Use specific endpoint
const domainProvider = await AIProviderFactory.createProvider(
  "sagemaker",
  "domain-expert-model-endpoint",
);

const domainResult = await domainProvider.generate({
  input: { text: "Industry-specific analysis request" },
});
```

## 🎯 **Key Benefits**

### **🏗️ Custom Model Deployment**

Deploy any model you've trained or fine-tuned:

```typescript
// Example: Using different specialized models
const models = {
  sentiment: "sentiment-analysis-model",
  translation: "multilingual-translation-model",
  summarization: "document-summarizer-model",
  domain: "healthcare-specialist-model",
};

async function analyzeWithSpecializedModel(text: string, task: string) {
  const endpoint = models[task] || models.sentiment;

  const provider = await AIProviderFactory.createProvider(
    "sagemaker",
    endpoint,
  );

  const result = await provider.generate({
    input: { text: `${task}: ${text}` },
    temperature: 0.3, // Lower for specialized tasks
    timeout: "45s",
  });

  return {
    analysis: result.content,
    model: endpoint,
    task: task,
  };
}

// Usage
const sentimentResult = await analyzeWithSpecializedModel(
  "The product quality has really improved recently!",
  "sentiment",
);

const summaryResult = await analyzeWithSpecializedModel(
  "Long document content here...",
  "summarization",
);
```

### **💰 Cost Optimization**

SageMaker enables precise cost control through multiple deployment options:

```typescript
class CostOptimizedSageMaker {
  private endpoints: {
    cheap: string; // Small instance, basic model
    balanced: string; // Medium instance, good model
    premium: string; // Large instance, best model
  };

  constructor() {
    this.endpoints = {
      cheap: "cost-effective-model",
      balanced: "production-model",
      premium: "high-performance-model",
    };
  }

  async generateOptimized(
    prompt: string,
    priority: "cost" | "balanced" | "quality" = "balanced",
  ) {
    const endpoint = this.endpoints[priority];

    const provider = await AIProviderFactory.createProvider(
      "sagemaker",
      endpoint,
    );

    const startTime = Date.now();
    const result = await provider.generate({
      input: { text: prompt },
      timeout: priority === "cost" ? "15s" : "45s", // Faster timeout for cost model
    });
    const responseTime = Date.now() - startTime;

    return {
      content: result.content,
      endpoint: endpoint,
      priority: priority,
      responseTime: responseTime,
      estimatedCost: this.calculateCost(responseTime, priority),
    };
  }

  private calculateCost(responseTime: number, priority: string): number {
    const rates = {
      cost: 0.0001, // $0.0001 per second
      balanced: 0.0005, // $0.0005 per second
      quality: 0.002, // $0.002 per second
    };

    return (responseTime / 1000) * rates[priority];
  }
}

// Usage
const optimizer = new CostOptimizedSageMaker();

// Cost-effective for simple tasks
const cheapResult = await optimizer.generateOptimized(
  "Simple classification task",
  "cost",
);

// High-quality for complex analysis
const premiumResult = await optimizer.generateOptimized(
  "Complex business strategy analysis",
  "quality",
);

console.log(
  `Cost difference: $${premiumResult.estimatedCost - cheapResult.estimatedCost}`,
);
```

### **🔒 Enterprise Security & Compliance**

Full control over your model infrastructure:

```typescript
class SecureSageMakerProvider {
  private region: string;
  private vpcConfig?: {
    securityGroups: string[];
    subnets: string[];
  };

  constructor(region: string, vpcConfig?: any) {
    this.region = region;
    this.vpcConfig = vpcConfig;
  }

  async secureGenerate(
    prompt: string,
    endpoint: string,
    securityContext: {
      userId: string;
      department: string;
      clearanceLevel: "public" | "internal" | "confidential";
    },
  ) {
    // Audit logging
    console.log(
      `[AUDIT] User ${securityContext.userId} from ${securityContext.department} requesting ${securityContext.clearanceLevel} generation`,
    );

    const provider = await AIProviderFactory.createProvider(
      "sagemaker",
      endpoint,
    );

    const result = await provider.generate({
      input: { text: prompt },
      timeout: "30s",
      // Custom metadata for tracking
      context: {
        user: securityContext.userId,
        department: securityContext.department,
        classification: securityContext.clearanceLevel,
        timestamp: new Date().toISOString(),
      },
    });

    // Log successful completion
    console.log(
      `[AUDIT] Generation completed for user ${securityContext.userId}`,
    );

    return {
      ...result,
      securityContext,
      complianceInfo: {
        dataResidency: this.region,
        encryptionAtRest: true,
        encryptionInTransit: true,
        auditLogged: true,
      },
    };
  }
}

// Usage
const secureProvider = new SecureSageMakerProvider("us-east-1", {
  securityGroups: ["sg-12345"],
  subnets: ["subnet-abc123"],
});

const secureResult = await secureProvider.secureGenerate(
  "Analyze sensitive customer data",
  "hipaa-compliant-model",
  {
    userId: "john.doe@company.com",
    department: "healthcare",
    clearanceLevel: "confidential",
  },
);
```

## 📊 **Advanced Model Management**

### **Multi-Model Endpoints**

Manage multiple models through a single endpoint:

```typescript
class MultiModelSageMaker {
  private multiModelEndpoint: string;
  private models: Map<string, string>;

  constructor(endpoint: string) {
    this.multiModelEndpoint = endpoint;
    this.models = new Map([
      ["sentiment", "sentiment-v2.tar.gz"],
      ["translation", "translate-v1.tar.gz"],
      ["summarization", "summary-v3.tar.gz"],
    ]);
  }

  async generateWithModel(
    prompt: string,
    modelType: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {},
  ) {
    const modelPath = this.models.get(modelType);
    if (!modelPath) {
      throw new Error(`Model type '${modelType}' not available`);
    }

    const provider = await AIProviderFactory.createProvider(
      "sagemaker",
      this.multiModelEndpoint,
    );

    const result = await provider.generate({
      input: { text: prompt },
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 500,
      // SageMaker-specific: target model for multi-model endpoint
      targetModel: modelPath,
    });

    return {
      ...result,
      modelType: modelType,
      modelPath: modelPath,
    };
  }

  async compareModels(prompt: string, modelTypes: string[]) {
    const comparisons = await Promise.all(
      modelTypes.map(async (modelType) => {
        try {
          const result = await this.generateWithModel(prompt, modelType);
          return {
            modelType,
            success: true,
            response: result.content,
            responseTime: result.responseTime,
          };
        } catch (error) {
          return {
            modelType,
            success: false,
            error: error.message,
          };
        }
      }),
    );

    return comparisons;
  }
}

// Usage
const multiModel = new MultiModelSageMaker("multi-model-endpoint");

// Use specific model
const sentimentResult = await multiModel.generateWithModel(
  "I love this new feature!",
  "sentiment",
);

// Compare multiple models
const comparison = await multiModel.compareModels(
  "Analyze this text for insights",
  ["sentiment", "summarization"],
);
```

### **Health Monitoring & Auto-Recovery**

```typescript
class SageMakerHealthMonitor {
  private endpoints: string[];
  private healthStatus: Map<string, boolean>;
  private failureCount: Map<string, number>;

  constructor(endpoints: string[]) {
    this.endpoints = endpoints;
    this.healthStatus = new Map();
    this.failureCount = new Map();
  }

  async checkHealth(endpoint: string): Promise<boolean> {
    try {
      const provider = await AIProviderFactory.createProvider(
        "sagemaker",
        endpoint,
      );

      const result = await provider.generate({
        input: { text: "health check" },
        timeout: "10s",
        maxTokens: 10,
      });

      this.healthStatus.set(endpoint, true);
      this.failureCount.set(endpoint, 0);
      return true;
    } catch (error) {
      this.healthStatus.set(endpoint, false);
      const failures = this.failureCount.get(endpoint) || 0;
      this.failureCount.set(endpoint, failures + 1);
      return false;
    }
  }

  async generateWithFailover(prompt: string) {
    for (const endpoint of this.endpoints) {
      const isHealthy = await this.checkHealth(endpoint);

      if (isHealthy) {
        try {
          const provider = await AIProviderFactory.createProvider(
            "sagemaker",
            endpoint,
          );

          const result = await provider.generate({
            input: { text: prompt },
            timeout: "30s",
          });

          return {
            ...result,
            endpoint: endpoint,
            failoverUsed: this.endpoints.indexOf(endpoint) > 0,
          };
        } catch (error) {
          console.warn(`Endpoint ${endpoint} failed, trying next...`);
          continue;
        }
      }
    }

    throw new Error("All SageMaker endpoints are unavailable");
  }

  getHealthReport() {
    return {
      endpoints: this.endpoints,
      health: Object.fromEntries(this.healthStatus),
      failures: Object.fromEntries(this.failureCount),
      healthyCount: Array.from(this.healthStatus.values()).filter(Boolean)
        .length,
      totalEndpoints: this.endpoints.length,
    };
  }
}

// Usage
const monitor = new SageMakerHealthMonitor([
  "primary-model-endpoint",
  "backup-model-endpoint",
  "fallback-model-endpoint",
]);

// Generate with automatic failover
const result = await monitor.generateWithFailover(
  "Important business analysis request",
);

// Get health status
const healthReport = monitor.getHealthReport();
console.log("Endpoint Health:", healthReport);
```

## 🔧 **Advanced Configuration**

### **Serverless Inference**

Configure SageMaker for serverless inference:

```typescript
class ServerlessSageMaker {
  private serverlessEndpoint: string;

  constructor(endpoint: string) {
    this.serverlessEndpoint = endpoint;
  }

  async generateServerless(
    prompt: string,
    options: {
      coldStartTimeout?: string;
      maxConcurrency?: number;
      memorySize?: number;
    } = {},
  ) {
    const {
      coldStartTimeout = "2m", // Longer timeout for cold starts
      maxConcurrency = 10,
      memorySize = 4096,
    } = options;

    const provider = await AIProviderFactory.createProvider(
      "sagemaker",
      this.serverlessEndpoint,
    );

    const startTime = Date.now();
    const result = await provider.generate({
      input: { text: prompt },
      timeout: coldStartTimeout,
      // Serverless-specific metadata
      context: {
        deployment: "serverless",
        maxConcurrency,
        memorySize,
      },
    });
    const totalTime = Date.now() - startTime;

    return {
      ...result,
      serverlessMetrics: {
        totalTime,
        coldStart: totalTime > 10000, // Assume cold start if > 10s
        configuration: {
          maxConcurrency,
          memorySize,
        },
      },
    };
  }

  async batchServerless(prompts: string[], batchSize: number = 5) {
    const results = [];

    // Process in batches to respect concurrency limits
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((prompt) => this.generateServerless(prompt)),
      );

      results.push(...batchResults);

      // Brief pause between batches
      if (i + batchSize < prompts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Usage
const serverless = new ServerlessSageMaker("serverless-model-endpoint");

// Single serverless generation
const result = await serverless.generateServerless(
  "Analyze market trends for Q4 2024",
  {
    coldStartTimeout: "3m",
    maxConcurrency: 20,
    memorySize: 8192,
  },
);

// Batch serverless processing
const prompts = [
  "Summarize customer feedback",
  "Analyze competitor pricing",
  "Generate product recommendations",
];

const batchResults = await serverless.batchServerless(prompts, 3);
```

## 🧪 **Testing and Validation**

### **Model Performance Testing**

```typescript
class SageMakerPerformanceTester {
  private endpoint: string;
  private baseline: {
    latency: number;
    accuracy: number;
    throughput: number;
  };

  constructor(endpoint: string, baseline: any) {
    this.endpoint = endpoint;
    this.baseline = baseline;
  }

  async loadTest(
    prompts: string[],
    concurrency: number = 5,
    duration: number = 60000, // 1 minute
  ) {
    const results = [];
    const startTime = Date.now();
    let requestCount = 0;
    let errorCount = 0;

    while (Date.now() - startTime < duration) {
      const batchPromises = Array(concurrency)
        .fill(null)
        .map(async (_, index) => {
          const prompt = prompts[requestCount % prompts.length];
          requestCount++;

          try {
            const provider = await AIProviderFactory.createProvider(
              "sagemaker",
              this.endpoint,
            );

            const requestStart = Date.now();
            const result = await provider.generate({
              input: { text: prompt },
              timeout: "30s",
            });
            const latency = Date.now() - requestStart;

            return {
              success: true,
              latency,
              responseLength: result.content.length,
              requestId: requestCount,
            };
          } catch (error) {
            errorCount++;
            return {
              success: false,
              error: error.message,
              requestId: requestCount,
            };
          }
        });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Brief pause between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return this.analyzeResults(results, requestCount, errorCount);
  }

  private analyzeResults(
    results: any[],
    totalRequests: number,
    errors: number,
  ) {
    const successfulResults = results.filter((r) => r.success);
    const latencies = successfulResults.map((r) => r.latency);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Latency = latencies.sort((a, b) => a - b)[
      Math.floor(latencies.length * 0.95)
    ];
    const throughput = totalRequests / 60; // requests per second
    const errorRate = (errors / totalRequests) * 100;

    return {
      performance: {
        averageLatency: avgLatency,
        p95Latency: p95Latency,
        throughput: throughput,
        errorRate: errorRate,
        totalRequests: totalRequests,
      },
      comparison: {
        latencyChange:
          ((avgLatency - this.baseline.latency) / this.baseline.latency) * 100,
        throughputChange:
          ((throughput - this.baseline.throughput) / this.baseline.throughput) *
          100,
      },
      status: this.getPerformanceStatus(avgLatency, throughput, errorRate),
    };
  }

  private getPerformanceStatus(
    latency: number,
    throughput: number,
    errorRate: number,
  ) {
    if (errorRate > 5) return "POOR";
    if (latency > this.baseline.latency * 1.5) return "DEGRADED";
    if (throughput < this.baseline.throughput * 0.8) return "DEGRADED";
    return "GOOD";
  }
}

// Usage
const tester = new SageMakerPerformanceTester("performance-test-endpoint", {
  latency: 2000, // 2 seconds baseline
  accuracy: 0.95, // 95% accuracy baseline
  throughput: 10, // 10 requests/second baseline
});

const testPrompts = [
  "Analyze customer sentiment",
  "Generate product description",
  "Summarize business report",
  "Classify support ticket",
];

const performanceReport = await tester.loadTest(testPrompts, 10, 120000); // 2 minutes
console.log("Performance Report:", performanceReport);
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. "Endpoint not found" Error**

```bash
# Check if endpoint exists
aws sagemaker describe-endpoint --endpoint-name your-endpoint-name

# Check endpoint status
npx @juspay/neurolink sagemaker status
```

#### **2. "Access denied" Error**

```bash
# Verify IAM permissions
aws sts get-caller-identity

# Test IAM policy
aws sagemaker invoke-endpoint --endpoint-name your-endpoint --body '{"inputs": "test"}' --content-type application/json /tmp/output.json
```

#### **3. "Model not loading" Error**

```bash
# Check endpoint health
npx @juspay/neurolink sagemaker test your-endpoint

# Monitor CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix /aws/sagemaker/Endpoints
```

### **Debug Mode**

```bash
# Enable debug output
export NEUROLINK_DEBUG=true
npx @juspay/neurolink generate "test" --provider sagemaker --debug

# Enable SageMaker-specific debugging
export SAGEMAKER_DEBUG=true
npx @juspay/neurolink sagemaker status --verbose
```

## 📚 **Related Documentation**

- **[Provider Setup Guide](./getting-started/provider-setup.md#amazon-sagemaker-configuration)** - Complete SageMaker setup
- **[Environment Variables](./getting-started/environment-variables.md)** - Configuration options
- **[API Reference](./getting-started/API-REFERENCE.md)** - SDK usage examples
- **[Basic Usage Examples](./examples/basic-usage.md#custom-model-access-with-sagemaker)** - Code examples
- **[CLI Reference](./CLI-GUIDE.md)** - Command-line usage

### **🔗 Other Provider Integrations**

- **[🔄 LiteLLM Integration](./LITELLM-INTEGRATION.md)** - Access 100+ models through unified interface
- **[🔧 MCP Integration](./MCP-INTEGRATION.md)** - Model Context Protocol support
- **[🏗️ Framework Integration](./FRAMEWORK-INTEGRATION.md)** - Next.js, React, and more

## 🌟 **Why Choose SageMaker Integration?**

### **🎯 For AI/ML Teams**

- **Custom Models**: Deploy your own fine-tuned models
- **Experimentation**: A/B test different model versions
- **Performance Control**: Dedicated compute resources
- **Cost Transparency**: Clear pricing per inference request

### **🏢 For Enterprises**

- **Data Privacy**: Models run in your AWS account
- **Compliance**: Meet industry-specific requirements
- **Scalability**: Auto-scaling from zero to thousands of requests
- **Integration**: Seamless fit with existing AWS infrastructure

### **📊 For Production**

- **Reliability**: Multi-AZ deployment options
- **Monitoring**: CloudWatch integration for metrics and logs
- **Security**: VPC, encryption, and IAM controls
- **Performance**: Predictable latency and throughput

---

**🚀 Ready to deploy your custom models?** Follow the [Quick Start](#quick-start) guide above to begin using your own AI models through NeuroLink's SageMaker integration today!
