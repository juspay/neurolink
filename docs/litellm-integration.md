# 🔗 LiteLLM Integration - Access 100+ AI Models

> **🎉 NEW FEATURE**: NeuroLink now supports LiteLLM, providing unified access to 100+ AI models from all major providers through a single interface.

## 🌟 **What is LiteLLM Integration?**

LiteLLM integration transforms NeuroLink into the most comprehensive AI provider abstraction library available, offering:

- **🔄 Universal Access**: 100+ models from OpenAI, Anthropic, Google, Mistral, Meta, and more
- **🎯 Unified Interface**: OpenAI-compatible API for all models
- **💰 Cost Optimization**: Automatic routing to cost-effective models
- **⚡ Load Balancing**: Automatic failover and load distribution
- **📊 Analytics**: Built-in usage tracking and monitoring

## 🚀 **Quick Start**

### **1. Install and Start LiteLLM Proxy**

```bash
# Install LiteLLM
pip install litellm

# Start proxy server
litellm --port 4000

# Server will be available at http://localhost:4000
```

### **2. Configure NeuroLink**

```bash
# Set environment variables
export LITELLM_BASE_URL="http://localhost:4000"
export LITELLM_API_KEY="sk-anything"  # Any value works for local proxy
```

### **3. Use with CLI**

```bash
# Access OpenAI models via LiteLLM
npx @juspay/neurolink generate "Hello from OpenAI" --provider litellm --model "openai/gpt-4o"

# Access Anthropic models via LiteLLM
npx @juspay/neurolink generate "Hello from Claude" --provider litellm --model "anthropic/claude-3-5-sonnet"

# Access Google models via LiteLLM
npx @juspay/neurolink generate "Hello from Gemini" --provider litellm --model "google/gemini-2.0-flash"

# Auto-select from all available models
npx @juspay/neurolink generate "Write a haiku about AI" --provider litellm
```

### **4. Use with SDK**

```typescript
import { AIProviderFactory } from "@juspay/neurolink";

// Create LiteLLM provider
const provider = await AIProviderFactory.createProvider("litellm");

// Generate with auto-selected model
const result = await provider.generate({
  input: { text: "Explain quantum computing" },
});

// Use specific models
const openaiProvider = await AIProviderFactory.createProvider(
  "litellm",
  "openai/gpt-4o",
);
const claudeProvider = await AIProviderFactory.createProvider(
  "litellm",
  "anthropic/claude-3-5-sonnet",
);
const geminiProvider = await AIProviderFactory.createProvider(
  "litellm",
  "google/gemini-2.0-flash",
);
```

## 🎯 **Key Benefits**

### **🔄 Universal Model Access**

Access models from all major providers through one interface:

```typescript
// Compare responses from multiple providers
async function compareModels(prompt: string) {
  const models = [
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet",
    "google/gemini-2.0-flash",
    "mistral/mistral-large",
  ];

  const comparisons = await Promise.all(
    models.map(async (model) => {
      const provider = await AIProviderFactory.createProvider("litellm", model);
      const result = await provider.generate({ input: { text: prompt } });

      return {
        model: model,
        response: result.content,
        provider: result.provider,
        usage: result.usage,
      };
    }),
  );

  return comparisons;
}

// Usage
const results = await compareModels("Explain the benefits of renewable energy");
results.forEach(({ model, response }) => {
  console.log(`\n${model}:`);
  console.log(response);
});
```

### **💰 Cost Optimization**

LiteLLM enables intelligent cost optimization:

```typescript
// Use cost-effective models for simple tasks
const cheapProvider = await AIProviderFactory.createProvider(
  "litellm",
  "openai/gpt-4o-mini",
);

// Use premium models for complex reasoning
const premiumProvider = await AIProviderFactory.createProvider(
  "litellm",
  "anthropic/claude-3-5-sonnet",
);

// Let LiteLLM choose optimal model based on configuration
const autoProvider = await AIProviderFactory.createProvider("litellm");
```

### **⚡ Load Balancing & Failover**

Automatic failover across providers:

```bash
# LiteLLM configuration with failover
# litellm_config.yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: os.environ/OPENAI_API_KEY

  - model_name: gpt-4  # Fallback to Anthropic
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY
```

## 📊 **Available Models**

### **Popular Models by Provider**

| Provider      | Model ID                      | Use Case            | Cost Level |
| ------------- | ----------------------------- | ------------------- | ---------- |
| **OpenAI**    | `openai/gpt-4o`               | General purpose     | Medium     |
|               | `openai/gpt-4o-mini`          | Cost-effective      | Low        |
| **Anthropic** | `anthropic/claude-3-5-sonnet` | Complex reasoning   | High       |
|               | `anthropic/claude-3-haiku`    | Fast responses      | Low        |
| **Google**    | `google/gemini-2.0-flash`     | Multimodal          | Medium     |
|               | `vertex_ai/gemini-pro`        | Enterprise          | High       |
| **Mistral**   | `mistral/mistral-large`       | European compliance | Medium     |
|               | `mistral/mixtral-8x7b`        | Open source         | Low        |

### **Model Selection Examples**

```bash
# Cost-effective text generation
npx @juspay/neurolink generate "Simple question" --provider litellm --model "openai/gpt-4o-mini"

# Complex reasoning tasks
npx @juspay/neurolink generate "Complex analysis" --provider litellm --model "anthropic/claude-3-5-sonnet"

# Multimodal tasks
npx @juspay/neurolink generate "Describe this image" --provider litellm --model "google/gemini-2.0-flash"

# European data compliance
npx @juspay/neurolink generate "GDPR compliant task" --provider litellm --model "mistral/mistral-large"
```

## 🔧 **Advanced Configuration**

### **LiteLLM Configuration File**

Create `litellm_config.yaml` for advanced setup:

```yaml
model_list:
  # OpenAI Models
  - model_name: openai/gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY

  # Anthropic Models
  - model_name: anthropic/claude-3-5-sonnet
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  # Google Models
  - model_name: google/gemini-2.0-flash
    litellm_params:
      model: gemini-2.0-flash
      api_key: os.environ/GOOGLE_AI_API_KEY

  # Mistral Models
  - model_name: mistral/mistral-large
    litellm_params:
      model: mistral-large-latest
      api_key: os.environ/MISTRAL_API_KEY

# General settings
general_settings:
  master_key: your-master-key
  database_url: postgresql://user:password@localhost/litellm
```

### **Start LiteLLM with Configuration**

```bash
# Start with configuration file
litellm --config litellm_config.yaml --port 4000

# With additional options
litellm --config litellm_config.yaml --port 4000 --num_workers 4 --debug
```

### **Environment Variables**

```bash
# Core LiteLLM configuration
LITELLM_BASE_URL="http://localhost:4000"         # Proxy server URL
LITELLM_API_KEY="sk-anything"                    # API key for proxy
LITELLM_MODEL="openai/gpt-4o-mini"               # Default model
LITELLM_TIMEOUT="60000"                          # Request timeout (ms)

# Provider API keys (set these before starting LiteLLM)
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
GOOGLE_AI_API_KEY="AIza-your-google-key"
MISTRAL_API_KEY="your-mistral-key"
```

## 🧪 **Testing and Validation**

### **Test LiteLLM Integration**

```bash
# 1. Verify LiteLLM proxy is running
curl http://localhost:4000/health

# 2. Check available models
curl http://localhost:4000/models

# 3. Test with NeuroLink CLI
npx @juspay/neurolink status --provider litellm

# 4. Test generation
npx @juspay/neurolink generate "Test LiteLLM integration" --provider litellm --debug
```

### **SDK Testing**

```typescript
// test-litellm.js
import { AIProviderFactory } from "@juspay/neurolink";

async function testLiteLLM() {
  try {
    // Test provider creation
    console.log("🧪 Testing LiteLLM provider creation...");
    const provider = await AIProviderFactory.createProvider("litellm");
    console.log("✅ Provider created successfully");

    // Test basic generation
    console.log("🧪 Testing text generation...");
    const result = await provider.generate({
      input: { text: "Hello from LiteLLM!" },
      maxTokens: 50,
    });
    console.log("✅ Generation successful:");
    console.log(`Response: ${result.content}`);
    console.log(`Provider: ${result.provider}`);
    console.log(`Model: ${result.model}`);

    // Test different models
    console.log("🧪 Testing multiple models...");

    const models = ["openai/gpt-4o-mini", "anthropic/claude-3-haiku"];
    for (const modelId of models) {
      const modelProvider = await AIProviderFactory.createProvider(
        "litellm",
        modelId,
      );
      const modelResult = await modelProvider.generate({
        input: { text: `Hello from ${modelId}` },
      });
      console.log(`✅ ${modelId}: ${modelResult.content.substring(0, 100)}...`);
    }

    console.log("🎉 All LiteLLM tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testLiteLLM();
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. "LiteLLM proxy server not available"**

```bash
# Check if proxy is running
ps aux | grep litellm

# Start proxy if not running
litellm --port 4000

# Verify connectivity
curl http://localhost:4000/health
```

#### **2. "Model not found"**

```bash
# Check available models
curl http://localhost:4000/models | jq '.data[].id'

# Use correct model format: provider/model-name
npx @juspay/neurolink generate "test" --provider litellm --model "openai/gpt-4o-mini"
```

#### **3. Authentication errors**

```bash
# Ensure underlying provider API keys are set
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"

# Restart LiteLLM proxy after setting keys
litellm --port 4000
```

### **Debug Mode**

```bash
# Enable debug output
export NEUROLINK_DEBUG=true
npx @juspay/neurolink generate "test" --provider litellm --debug

# Enable LiteLLM proxy debug mode
litellm --port 4000 --debug
```

## 🔄 **Migration from Other Providers**

### **From Direct Provider Usage**

```typescript
// Before: Direct OpenAI usage
const openaiProvider = await AIProviderFactory.createProvider(
  "openai",
  "gpt-4o",
);

// After: OpenAI via LiteLLM (same functionality + more options)
const litellmProvider = await AIProviderFactory.createProvider(
  "litellm",
  "openai/gpt-4o",
);
```

### **Benefits of Migration**

- **🔄 Unified Interface**: Same code works with 100+ models
- **💰 Cost Optimization**: Easy switching to cheaper alternatives
- **⚡ Reliability**: Built-in failover and load balancing
- **📊 Analytics**: Centralized usage tracking across all providers
- **🔧 Flexibility**: Add new models without code changes

## 📚 **Related Documentation**

- **[Provider Setup Guide](getting-started/provider-setup.md#litellm-configuration)** - Complete LiteLLM setup
- **[Environment Variables](getting-started/environment-variables.md)** - Configuration options
- **[API Reference](sdk/api-reference.md)** - SDK usage examples
- **[Troubleshooting](troubleshooting.md#litellm-provider-issues)** - Problem solving guide
- **[Basic Usage Examples](examples/basic-usage.md#multi-model-access-with-litellm)** - Code examples

### **🔗 Other Provider Integrations**

- **[🚀 SageMaker Integration](sagemaker-integration.md)** - Deploy your custom AI models
- **[🔧 MCP Integration](mcp-integration.md)** - Model Context Protocol support
- **[🏗️ Framework Integration](./framework-integration.md)** - Next.js, React, and more

## 🌟 **Why Choose LiteLLM Integration?**

### **🎯 For Developers**

- **Single API**: Learn one interface, use 100+ models
- **Easy Switching**: Change models with just parameter updates
- **Cost Control**: Built-in cost tracking and optimization
- **Future-Proof**: New models added automatically

### **🏢 For Enterprises**

- **Vendor Independence**: Avoid vendor lock-in
- **Risk Mitigation**: Automatic failover between providers
- **Cost Management**: Centralized usage tracking and optimization
- **Compliance**: Support for European (Mistral) and local (Ollama) options

### **📊 For Teams**

- **Standardization**: Unified development workflow
- **Experimentation**: Easy A/B testing between models
- **Monitoring**: Centralized analytics and performance tracking
- **Scaling**: Load balancing across multiple providers

---

**🚀 Ready to get started?** Follow the [Quick Start](#quick-start) guide above to begin using 100+ AI models through NeuroLink's LiteLLM integration today!
