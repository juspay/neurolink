# Frequently Asked Questions

Common questions and answers about NeuroLink usage, configuration, and troubleshooting.

## 🚀 Getting Started

### Q: What is NeuroLink?

**A:** NeuroLink is an enterprise AI development platform that provides unified access to multiple AI providers (OpenAI, Google AI, Anthropic, AWS Bedrock, etc.) through a single SDK and CLI. It includes built-in tools, analytics, evaluation capabilities, and supports the Model Context Protocol (MCP) for extended functionality.

### Q: Which AI providers does NeuroLink support?

**A:** NeuroLink supports 9+ AI providers:

- **OpenAI** (GPT-4, GPT-4o, GPT-3.5-turbo)
- **Google AI Studio** (Gemini models)
- **Google Vertex AI** (Gemini, Claude via Vertex)
- **Anthropic** (Claude 3.5 Sonnet, Haiku, Opus)
- **AWS Bedrock** (Claude, Titan models)
- **Azure OpenAI** (GPT models)
- **Hugging Face** (Open source models)
- **Ollama** (Local AI models)
- **Mistral AI** (Mistral models)

### Q: Do I need to install anything?

**A:** No installation required! You can use NeuroLink directly with `npx`:

```bash
npx @juspay/neurolink generate "Hello, AI!"
npx @juspay/neurolink status
```

For frequent use, you can install globally: `npm install -g @juspay/neurolink`

## 🔧 Configuration

### Q: How do I set up API keys?

**A:** Create a `.env` file in your project directory:

```bash
# .env file
OPENAI_API_KEY="sk-your-openai-key"
GOOGLE_AI_API_KEY="AIza-your-google-ai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
# ... other providers
```

NeuroLink automatically loads these environment variables.

### Q: Can I use NeuroLink behind a corporate proxy?

**A:** Yes! NeuroLink automatically detects and uses corporate proxy settings:

```bash
export HTTPS_PROXY="http://proxy.company.com:8080"
export HTTP_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,.company.com"
```

No additional configuration needed.

### Q: How do I configure multiple environments (dev/staging/prod)?

**A:** Use environment-specific `.env` files:

```bash
# .env.development
NEUROLINK_LOG_LEVEL="debug"
NEUROLINK_CACHE_ENABLED="false"

# .env.production
NEUROLINK_LOG_LEVEL="warn"
NEUROLINK_CACHE_ENABLED="true"
NEUROLINK_ANALYTICS_ENABLED="true"
```

## 🎯 Usage

### Q: What's the difference between CLI and SDK?

**A:**

| Feature              | CLI                          | SDK                       |
| -------------------- | ---------------------------- | ------------------------- |
| **Best for**         | Scripts, automation, testing | Applications, integration |
| **Installation**     | None required (npx)          | npm install required      |
| **Output**           | Text, JSON                   | Native JavaScript objects |
| **Batch processing** | Built-in `batch` command     | Manual implementation     |
| **Learning curve**   | Low                          | Medium                    |

### Q: How do I choose the best provider for my use case?

**A:** NeuroLink can auto-select the best provider, or you can choose based on:

- **Speed**: Google AI (fastest responses)
- **Coding**: Anthropic Claude (best for code analysis)
- **Creative**: OpenAI (best for creative content)
- **Cost**: Google AI Studio (free tier available)
- **Enterprise**: AWS Bedrock or Azure OpenAI

```bash
# Auto-selection
npx @juspay/neurolink gen "Your prompt" --provider auto

# Specific provider
npx @juspay/neurolink gen "Your prompt" --provider google-ai
```

### Q: Can I use multiple providers in the same application?

**A:** Yes! You can specify different providers for different requests:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Use different providers for different tasks
const code = await neurolink.generate({
  input: { text: "Write a Python function" },
  provider: "anthropic",
});

const creative = await neurolink.generate({
  input: { text: "Write a poem" },
  provider: "openai",
});
```

## 🔍 Troubleshooting

### Q: Why am I getting "API key not found" errors?

**A:** Common solutions:

1. **Check .env file exists** and is in the correct directory
2. **Verify file format**: No spaces around `=` signs

   ```bash
   # Correct
   OPENAI_API_KEY="sk-your-key"

   # Incorrect
   OPENAI_API_KEY = "sk-your-key"
   ```

3. **Check file permissions**: `.env` file should be readable
4. **Verify key format**: Keys should start with provider-specific prefixes

### Q: Provider status shows "Authentication failed" - what should I do?

**A:**

1. **Verify API key is correct** and hasn't expired
2. **Check account status** - ensure billing is set up if required
3. **Test API key manually**:
   ```bash
   # Test OpenAI key
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```
4. **Check regional restrictions** - some providers have geographic limitations

### Q: AWS Bedrock shows "Not Authorized" - how do I fix this?

**A:** AWS Bedrock requires additional setup:

1. **Request model access** in AWS Bedrock console
2. **Use full inference profile ARN** for Anthropic models:
   ```bash
   BEDROCK_MODEL="arn:aws:bedrock:us-east-1:123456789:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"
   ```
3. **Verify IAM permissions** include `AmazonBedrockFullAccess`
4. **Check AWS region** - Bedrock isn't available in all regions

### Q: Google Vertex AI authentication issues?

**A:** Vertex AI supports multiple authentication methods:

```bash
# Method 1: Service account file
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Method 2: Individual environment variables
GOOGLE_AUTH_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Required for both methods
GOOGLE_VERTEX_PROJECT="your-gcp-project-id"
GOOGLE_VERTEX_LOCATION="us-central1"
```

### Q: Why are my requests timing out?

**A:** Try these solutions:

1. **Increase timeout**:
   ```bash
   npx @juspay/neurolink gen "prompt" --timeout 60000
   ```
2. **Check network connectivity**
3. **Reduce max tokens** for faster responses
4. **Switch to faster provider** (Google AI is typically fastest)

### Q: How do I handle rate limits?

**A:**

1. **Use batch processing** with delays:
   ```bash
   npx @juspay/neurolink batch prompts.txt --delay 3000
   ```
2. **Switch providers** when rate limited
3. **Implement exponential backoff** in your applications
4. **Upgrade API plan** for higher limits

## 🚀 Advanced Features

### Q: What are analytics and evaluation features?

**A:**

- **Analytics**: Track usage metrics, costs, and performance
- **Evaluation**: AI-powered quality scoring of responses

```bash
# Enable analytics
npx @juspay/neurolink gen "prompt" --enable-analytics

# Enable evaluation
npx @juspay/neurolink gen "prompt" --enable-evaluation

# Both together
npx @juspay/neurolink gen "prompt" --enable-analytics --enable-evaluation
```

### Q: What is MCP integration?

**A:** Model Context Protocol (MCP) allows NeuroLink to use external tools like file systems, databases, and APIs. NeuroLink includes built-in tools and can discover MCP servers from other AI applications.

```bash
# List discovered MCP servers
npx @juspay/neurolink mcp list

# Test built-in tools
npx @juspay/neurolink gen "What time is it?" --debug
```

### Q: How do I use streaming responses?

**A:**

```bash
# CLI streaming
npx @juspay/neurolink stream "Tell me a story"

# SDK streaming
const stream = await neurolink.stream({
  input: { text: "Tell me a story" }
});

for await (const chunk of stream) {
  console.log(chunk.content);
}
```

## 🏢 Enterprise Usage

### Q: Is NeuroLink suitable for enterprise use?

**A:** Yes! NeuroLink is designed for enterprise use with:

- **Corporate proxy support**
- **Multiple authentication methods**
- **Audit logging and analytics**
- **Provider fallback and reliability**
- **Comprehensive error handling**
- **Security best practices**

### Q: How do I deploy NeuroLink in production?

**A:** Best practices:

1. **Use environment variables** for configuration
2. **Implement secret management** (AWS Secrets Manager, Azure Key Vault)
3. **Enable analytics** for monitoring
4. **Set up provider fallbacks**
5. **Configure appropriate timeouts**
6. **Monitor provider health**

### Q: Can I use NeuroLink in CI/CD pipelines?

**A:** Absolutely! Common use cases:

```bash
# Generate documentation
npx @juspay/neurolink gen "Create API docs" > docs/api.md

# Code review
npx @juspay/neurolink gen "Review this code for issues" --provider anthropic

# Release notes
npx @juspay/neurolink gen "Generate release notes from git log"
```

### Q: How do I track costs across teams?

**A:** Use analytics with context:

```bash
npx @juspay/neurolink gen "prompt" \
  --enable-analytics \
  --context '{"team":"backend","project":"api","user":"dev123"}'
```

## 🔧 Development

### Q: How do I integrate NeuroLink with React?

**A:**

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { useState } from "react";

function AIComponent() {
  const [response, setResponse] = useState("");
  const neurolink = new NeuroLink();

  const generate = async () => {
    const result = await neurolink.generate({
      input: { text: "Hello AI" }
    });
    setResponse(result.content);
  };

  return (
    <div>
      <button onClick={generate}>Generate</button>
      <p>{response}</p>
    </div>
  );
}
```

### Q: How do I handle errors properly?

**A:**

```typescript
try {
  const result = await neurolink.generate({
    input: { text: "Your prompt" },
  });
  console.log(result.content);
} catch (error) {
  if (error.code === "RATE_LIMIT_EXCEEDED") {
    // Handle rate limiting
  } else if (error.code === "AUTHENTICATION_FAILED") {
    // Handle auth issues
  } else {
    // Handle other errors
  }
}
```

### Q: Can I create custom tools?

**A:** Yes! NeuroLink supports custom MCP servers:

```bash
# Add custom MCP server
npx @juspay/neurolink mcp add myserver "python /path/to/server.py"

# Test custom server
npx @juspay/neurolink mcp test myserver
```

## 💰 Pricing and Costs

### Q: How much does NeuroLink cost?

**A:** NeuroLink itself is free! You only pay for the AI provider usage (OpenAI, Google AI, etc.). NeuroLink helps optimize costs by:

- **Auto-selecting cheapest suitable providers**
- **Analytics to track spending**
- **Batch processing for efficiency**
- **Built-in rate limiting**

### Q: Which provider is most cost-effective?

**A:** Generally:

1. **Google AI Studio** - Free tier available
2. **Google Vertex AI** - Competitive pricing
3. **OpenAI GPT-4o-mini** - Good balance of cost/performance
4. **Anthropic Claude Haiku** - Fast and affordable

Use `npx @juspay/neurolink models best --use-case cheapest` to find the most cost-effective option.

### Q: How can I monitor and control costs?

**A:**

1. **Enable analytics** to track usage and costs
2. **Set provider limits** in your AI provider dashboards
3. **Use cheaper models** for non-critical tasks
4. **Implement caching** for repeated requests
5. **Monitor with evaluation** to ensure quality

## 🆘 Getting Help

### Q: Where can I get help?

**A:**

1. **Documentation**: Comprehensive guides and API reference
2. **GitHub Issues**: Report bugs and request features
3. **Troubleshooting Guide**: Common issues and solutions
4. **Examples**: Practical usage patterns

### Q: How do I report a bug?

**A:**

1. **Check existing issues** on GitHub
2. **Include reproduction steps**
3. **Provide environment details**:
   - Node.js version
   - NeuroLink version
   - Operating system
   - Error messages
4. **Share configuration** (without API keys!)

### Q: How do I request a new feature?

**A:**

1. **Search existing feature requests**
2. **Open GitHub issue** with "enhancement" label
3. **Describe use case** and expected behavior
4. **Provide examples** of how the feature would be used

### Q: Can I contribute to NeuroLink?

**A:** Yes! We welcome contributions:

1. **Read the contributing guide**
2. **Start with good first issues**
3. **Follow code style guidelines**
4. **Include tests and documentation**
5. **Submit pull request**

## 🔄 Migration and Updates

### Q: How do I update NeuroLink?

**A:**

```bash
# For global installation
npm update -g @juspay/neurolink

# For project installation
npm update @juspay/neurolink

# Check version
npx @juspay/neurolink --version
```

### Q: Are there breaking changes between versions?

**A:** NeuroLink follows semantic versioning:

- **Patch updates** (1.0.1): Bug fixes, no breaking changes
- **Minor updates** (1.1.0): New features, backward compatible
- **Major updates** (2.0.0): Breaking changes, migration guide provided

### Q: How do I migrate from other AI libraries?

**A:** NeuroLink provides simple migration paths:

```typescript
// From OpenAI SDK
import OpenAI from "openai";
const openai = new OpenAI();

// To NeuroLink
import { NeuroLink } from "@juspay/neurolink";
const neurolink = new NeuroLink();

// Similar API, enhanced features
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  provider: "openai", // Optional, can use any provider
});
```

---

## 📚 Related Documentation

- [Quick Start Guide](../getting-started/quick-start.md) - Get started in 2 minutes
- [Installation Guide](../getting-started/installation.md) - Detailed setup instructions
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions
- [CLI Commands](../cli/commands.md) - Complete CLI reference
- [API Reference](../sdk/api-reference.md) - SDK documentation
