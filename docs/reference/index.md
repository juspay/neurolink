# Reference

Complete reference documentation for NeuroLink configuration, troubleshooting, and technical details.

## 🎯 Reference Hub

This section provides comprehensive reference materials for advanced usage, configuration, and problem-solving.

<div class="grid cards" markdown>

- :material-help-circle: **[Troubleshooting](troubleshooting.md)**

  ***

  Common issues, error messages, and solutions for NeuroLink CLI and SDK usage.

- :material-cog: **[Configuration](configuration.md)**

  ***

  Complete configuration reference including environment variables, provider settings, and optimization.

- :material-compare: **[Provider Comparison](provider-comparison.md)**

  ***

  Detailed comparison of all 9 supported AI providers with features, costs, and recommendations.

- :material-frequently-asked-questions: **[FAQ](faq.md)**

  ***

  Frequently asked questions about NeuroLink features, limitations, and best practices.

</div>

## 🔧 Quick Reference

### Environment Variables

```bash
# Core Provider API Keys
OPENAI_API_KEY="sk-your-openai-key"
GOOGLE_AI_API_KEY="AIza-your-google-ai-key"
ANTHROPIC_API_KEY="sk-ant-your-key"

# AWS Bedrock (requires AWS credentials)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"

# Azure OpenAI
AZURE_OPENAI_API_KEY="your-azure-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"

# Google Vertex AI
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Hugging Face
HUGGINGFACE_API_KEY="hf_your-key"

# Mistral AI
MISTRAL_API_KEY="your-mistral-key"
```

### CLI Quick Commands

```bash
# Status and diagnostics
neurolink status                    # Check all providers
neurolink status --verbose         # Detailed diagnostics
neurolink provider status          # Provider-specific status

# Text generation
neurolink generate "prompt"        # Basic generation
neurolink gen "prompt" -p openai   # Specific provider
neurolink stream "prompt"          # Real-time streaming

# Configuration
neurolink config show              # Show current config
neurolink config validate          # Validate setup
neurolink config init              # Interactive setup

# MCP tools
neurolink mcp discover             # Find available servers
neurolink mcp list                 # List installed servers
neurolink mcp install <server>     # Install MCP server
```

### SDK Quick Reference

```typescript
import { NeuroLink, createBestAIProvider } from "@juspay/neurolink";

// Basic usage
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  provider: "auto", // or specific provider
});

// Auto-select best provider
const provider = createBestAIProvider();
const result = await provider.generate({
  input: { text: "Your prompt" },
});

// With advanced options
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  provider: "google-ai",
  model: "gemini-2.5-pro",
  temperature: 0.7,
  maxTokens: 1000,
  enableAnalytics: true,
  enableEvaluation: true,
  timeout: "30s",
});
```

## 📊 Provider Comparison Matrix

| Feature          | OpenAI | Google AI | Anthropic | Bedrock | Azure | Vertex | HuggingFace | Ollama | Mistral |
| ---------------- | ------ | --------- | --------- | ------- | ----- | ------ | ----------- | ------ | ------- |
| **Free Tier**    | ❌     | ✅        | ❌        | ❌      | ❌    | ❌     | ✅          | ✅     | ✅      |
| **Tool Support** | ✅     | ✅        | ✅        | ✅      | ✅    | ✅     | ⚠️          | ⚠️     | ✅      |
| **Streaming**    | ✅     | ✅        | ✅        | ✅      | ✅    | ✅     | ✅          | ✅     | ✅      |
| **Vision**       | ✅     | ✅        | ✅        | ✅      | ✅    | ✅     | ✅          | ⚠️     | ❌      |
| **Local**        | ❌     | ❌        | ❌        | ❌      | ❌    | ❌     | ❌          | ✅     | ❌      |
| **Enterprise**   | ✅     | ✅        | ✅        | ✅      | ✅    | ✅     | ⚠️          | ✅     | ✅      |

## 🔍 Error Code Reference

### Common Error Codes

| Code                   | Description                    | Solution                          |
| ---------------------- | ------------------------------ | --------------------------------- |
| `AUTH_ERROR`           | Invalid API key or credentials | Check environment variables       |
| `RATE_LIMIT`           | API rate limit exceeded        | Implement delays or upgrade plan  |
| `TIMEOUT`              | Request timeout                | Increase timeout or check network |
| `MODEL_NOT_FOUND`      | Invalid model name             | Check available models            |
| `TOOL_ERROR`           | MCP tool execution failed      | Check tool configuration          |
| `PROVIDER_UNAVAILABLE` | Provider service down          | Try different provider            |

### Debugging Tips

```bash
# Enable debug mode
neurolink generate "test" --debug

# Verbose logging
neurolink status --verbose

# Check configuration
neurolink config validate
```

```typescript
// SDK debugging
const neurolink = new NeuroLink({
  debug: true,
  logLevel: "verbose",
});
```

## 📈 Performance Optimization

### Response Time Optimization

- **Provider selection**: Use fastest providers for your region
- **Model selection**: Choose appropriate model size for task
- **Concurrency**: Limit parallel requests to avoid rate limits
- **Caching**: Implement response caching for repeated queries

### Cost Optimization

- **Model selection**: Use cost-effective models when possible
- **Token management**: Optimize prompt length and max tokens
- **Provider comparison**: Compare costs across providers
- **Monitoring**: Track usage with analytics

### Memory Management

- **Streaming**: Use streaming for large responses
- **Batch processing**: Process multiple requests efficiently
- **Cleanup**: Proper resource cleanup in long-running applications

## 🔐 Security Best Practices

### API Key Management

- **Environment variables**: Store keys in `.env` files
- **Never commit**: Keep keys out of version control
- **Rotation**: Regularly rotate API keys
- **Scope limitation**: Use least-privilege access

### Production Deployment

- **Secret management**: Use secure secret management systems
- **Network security**: Implement proper network controls
- **Monitoring**: Log and monitor API usage
- **Error handling**: Don't expose sensitive errors

## 🆘 Getting Help

### Support Channels

1. **[GitHub Issues](https://github.com/juspay/neurolink/issues)** - Bug reports and feature requests
2. **[GitHub Discussions](https://github.com/juspay/neurolink/discussions)** - Community questions
3. **[Documentation](../index.md)** - Comprehensive guides and references
4. **[Examples](../examples/index.md)** - Practical implementation patterns

### Before Asking for Help

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the [FAQ](faq.md)
3. Search existing [GitHub Issues](https://github.com/juspay/neurolink/issues)
4. Try the `--debug` flag for more information

### Reporting Issues

When reporting issues, include:

- **NeuroLink version**: `npm list @juspay/neurolink`
- **Node.js version**: `node --version`
- **Operating system**: OS and version
- **Error message**: Complete error output
- **Reproduction steps**: Minimal example to reproduce
- **Configuration**: Relevant environment variables (without keys)

## 🔗 External Resources

### AI Provider Documentation

- **[OpenAI API](https://platform.openai.com/docs)** - OpenAI official documentation
- **[Google AI Studio](https://aistudio.google.com/docs)** - Google AI platform docs
- **[Anthropic Claude](https://docs.anthropic.com/)** - Anthropic API reference
- **[AWS Bedrock](https://docs.aws.amazon.com/bedrock/)** - Amazon Bedrock guide

### Related Projects

- **[Vercel AI SDK](https://github.com/vercel/ai)** - Underlying provider implementations
- **[Model Context Protocol](https://modelcontextprotocol.io)** - Tool integration standard
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety and development
