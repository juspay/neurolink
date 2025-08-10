# Provider Behavior Guide

This guide documents provider-specific behaviors, quirks, and recommended usage patterns for optimal results with NeuroLink AI providers.

## Quick Navigation

- [Provider-Specific Behaviors](#provider-specific-input-handling)
- [Testing Recommendations](#testing-recommendations)
- [Factory Pattern Integration](#factory-pattern-integration)
- [Troubleshooting](#troubleshooting-common-issues)
- [Best Practices](#best-practices)

## Related Documentation

- [API Reference](API-REFERENCE.md) - Complete API documentation
- [CLI Guide](CLI-GUIDE.md) - Command-line interface usage
- [Factory Pattern Migration](FACTORY-PATTERN-MIGRATION.md) - Factory pattern implementation
- [Streaming Guide](advanced/streaming.md) - Advanced streaming features

## Provider-Specific Input Handling

### Google AI Studio & Vertex AI

**Behavior**: Exhibits inconsistent behavior with certain input patterns containing domain keywords.

**Affected Inputs**:

- Inputs containing keywords like "analytics", "healthcare", "streaming" may return empty responses
- Domain-specific terminology can trigger unexpected filtering
- This affects both basic streaming AND factory-enhanced streaming equally

**Recommended Inputs**:

- ✅ "Hello world", "Count from 1 to 5", "Say hello", "Tell me a joke"
- ✅ "Write a story", "Explain concepts", "Generate code"
- ✅ Generic prompts without domain-specific keywords

**Avoid**:

- ⚠️ "Test analytics", "healthcare data", "streaming analysis"
- ⚠️ Industry-specific jargon in simple test cases
- ⚠️ Technical domain terms in basic functionality tests

**Workaround**: Use provider-friendly inputs for testing, or switch to alternative providers (OpenAI, Anthropic) for domain-specific content.

### OpenAI (GPT-4, GPT-3.5)

**Behavior**: Generally reliable with consistent responses across all input types.

**Strengths**:

- Handles domain-specific content well
- Consistent streaming performance
- Good with technical terminology

**Considerations**:

- Rate limiting may apply based on plan
- Longer response times for complex prompts
- Higher cost per token compared to some alternatives

### Anthropic Claude

**Behavior**: Excellent reasoning capabilities with consistent responses.

**Strengths**:

- Superior handling of complex, domain-specific content
- Reliable streaming with consistent chunk sizes
- Good with analytical and healthcare content

**Considerations**:

- May be more verbose than other providers
- Higher token usage for equivalent outputs
- Strong safety filtering for sensitive content

### Amazon Bedrock

**Behavior**: Enterprise-grade reliability with consistent performance.

**Strengths**:

- Excellent for production workloads
- Consistent behavior across model versions
- Good integration with AWS ecosystem

**Considerations**:

- Requires AWS credentials and proper IAM setup
- May have higher latency due to enterprise security layers
- Regional availability varies

### Azure OpenAI

**Behavior**: Similar to OpenAI with enterprise features.

**Strengths**:

- Enterprise compliance and security
- Consistent with OpenAI behavior patterns
- Good integration with Microsoft ecosystem

**Considerations**:

- Requires Azure setup and endpoint configuration
- May have different rate limits than direct OpenAI
- Additional latency due to Azure proxy layer

### Ollama (Local Models)

**Behavior**: Varies significantly by model, generally more limited tool support.

**Strengths**:

- Complete privacy (local processing)
- No API costs or rate limits
- Full control over model versions

**Considerations**:

- Limited tool execution capabilities
- Performance depends on local hardware
- Model selection affects behavior significantly
- May require specific models (e.g., gemma3n) for tool support

### Hugging Face

**Behavior**: Highly variable depending on model selection.

**Strengths**:

- Access to thousands of open-source models
- Free tier available
- Good for experimentation

**Considerations**:

- Model quality varies significantly
- Tools may be visible but not execute properly
- Response format inconsistencies
- Cold start delays for less popular models

### Mistral AI

**Behavior**: Good balance of performance and European compliance.

**Strengths**:

- GDPR compliant (European provider)
- Good reasoning capabilities
- Consistent tool execution

**Considerations**:

- Smaller context windows than some competitors
- Limited model variety compared to OpenAI/Anthropic
- Newer provider with evolving capabilities

## Testing Recommendations

### For Automated Tests

1. **Use Provider-Neutral Inputs**: Choose prompts that work consistently across all providers
   - See [CLI Guide](CLI-GUIDE.md#basic-usage) for example commands
2. **Avoid Domain Keywords**: Use generic prompts for functionality testing
   - Reference [Factory Pattern Migration](FACTORY-PATTERN-MIGRATION.md) for domain-specific usage
3. **Test Provider-Specific Features**: Separate tests for provider-specific capabilities
   - Check [API Reference](API-REFERENCE.md#provider-configuration) for provider options
4. **Implement Fallback Strategies**: Design tests to handle provider variations gracefully
   - See [Streaming Guide](advanced/streaming.md#error-handling) for robust patterns

### For Development

1. **Provider Selection**: Choose appropriate provider based on use case requirements
   - Reference [Provider Selection Guidelines](#provider-selection-guidelines) below
2. **Input Validation**: Pre-validate inputs for provider compatibility
   - Use patterns from [Factory Pattern Integration](#factory-pattern-integration) section
3. **Error Handling**: Implement robust error handling for provider-specific failures
   - See [Troubleshooting](#troubleshooting-common-issues) section for common patterns
4. **Performance Monitoring**: Track provider performance and adjust accordingly
   - Reference [API Reference](API-REFERENCE.md#analytics-integration) for monitoring setup

## Provider Selection Guidelines

### For Production Applications

- **High Reliability**: OpenAI, Anthropic, Azure OpenAI
- **Enterprise Compliance**: Amazon Bedrock, Azure OpenAI
- **Cost Optimization**: Google AI Studio, Mistral AI
- **Privacy Requirements**: Ollama (local)
- **European Compliance**: Mistral AI

### For Development & Testing

- **General Development**: OpenAI, Google AI Studio
- **Domain-Specific Testing**: Anthropic, OpenAI
- **Tool Integration Testing**: OpenAI, Anthropic, Google AI Studio
- **Streaming Testing**: Any provider except Ollama (limited)

## Troubleshooting Common Issues

### Empty Responses

**Symptoms**: Provider returns empty or minimal content
**Likely Causes**: Input contains filtered keywords, provider-specific limitations
**Solutions**:

- Try alternative provider from [Provider Selection Guidelines](#provider-selection-guidelines)
- Rephrase input using [Testing Recommendations](#testing-recommendations) patterns
- Check provider status using [CLI Guide](CLI-GUIDE.md#provider-testing)

### Inconsistent Tool Execution

**Symptoms**: Tools work sometimes but not others
**Likely Causes**: Provider-specific tool support limitations
**Solutions**:

- Use providers with full tool support (OpenAI, Anthropic, Google AI)
- Configure tools using [CLI Guide](CLI-GUIDE.md#mcp-tools)
- Debug with [API Reference](API-REFERENCE.md#tool-configuration)

### Streaming Interruptions

**Symptoms**: Streaming stops mid-response
**Likely Causes**: Provider rate limits, network issues, input filtering
**Solutions**:

- Implement retry logic from [Streaming Guide](advanced/streaming.md#retry-strategies)
- Check provider status and validate inputs
- Use error handling patterns from [Streaming Guide](advanced/streaming.md#error-handling)

### Performance Variations

**Symptoms**: Significant response time differences
**Likely Causes**: Provider load, geographic location, model selection
**Solutions**:

- Implement provider rotation using [API Reference](API-REFERENCE.md#provider-fallback)
- Monitor performance metrics with [Analytics Integration](API-REFERENCE.md#analytics-integration)
- Optimize based on [Provider Selection Guidelines](#provider-selection-guidelines)

## Factory Pattern Integration

When using NeuroLink's factory patterns with specific providers:

### Domain Configuration

- **Provider Sensitivity**: Some providers may filter domain-specific keywords
- **Configuration Guide**: See [Factory Pattern Migration](FACTORY-PATTERN-MIGRATION.md#domain-configuration) for setup
- **Testing Strategies**: Reference [Testing Recommendations](#testing-recommendations) above

### Context Processing

- **Validation**: Ensure context data compatibility across providers
- **Implementation**: Follow patterns in [Factory Pattern Migration](FACTORY-PATTERN-MIGRATION.md#context-integration)
- **Debugging**: Use [API Reference](API-REFERENCE.md#context-validation) for validation tools

### Evaluation Integration

- **Provider Variation**: Different providers may have varying evaluation accuracy
- **Setup Guide**: See [API Reference](API-REFERENCE.md#evaluation-configuration) for configuration
- **Best Practices**: Reference [Factory Pattern Migration](FACTORY-PATTERN-MIGRATION.md#evaluation-setup)

### Tool Integration

- **Compatibility Testing**: Test tool execution with each target provider
- **Configuration**: Use [CLI Guide](CLI-GUIDE.md#mcp-tools) for MCP tool setup
- **Advanced Usage**: See [Streaming Guide](advanced/streaming.md#tool-streaming) for streaming with tools

## Best Practices

### General Guidelines

1. **Provider Rotation**: Use multiple providers for resilience
   - Implementation guide: [API Reference](API-REFERENCE.md#provider-fallback)
2. **Input Validation**: Validate inputs for provider compatibility
   - See provider-specific sections above for validation patterns
3. **Error Handling**: Implement graceful fallbacks
   - Follow [Streaming Guide](advanced/streaming.md#error-handling) patterns
4. **Performance Monitoring**: Track provider metrics
   - Setup: [API Reference](API-REFERENCE.md#analytics-integration)
5. **Cost Management**: Monitor token usage across providers
   - Tools: [CLI Guide](CLI-GUIDE.md#cost-tracking)
6. **Testing Strategy**: Use provider-appropriate test cases
   - Reference [Testing Recommendations](#testing-recommendations) above

### Performance Optimization

- **Caching**: Implement response caching for repeated requests
- **Batch Processing**: Use batch operations where supported
- **Provider Selection**: Choose optimal providers per use case
- **Input Optimization**: Format inputs for best provider performance

## See Also

- [API Reference](API-REFERENCE.md) - Complete API documentation and configuration
- [CLI Guide](CLI-GUIDE.md) - Command-line interface and provider testing
- [Factory Pattern Migration](FACTORY-PATTERN-MIGRATION.md) - Advanced factory pattern usage
- [Streaming Guide](advanced/streaming.md) - Streaming functionality and error handling
- [Main Documentation](index.md) - Getting started guide and overview

---

_This guide is maintained as part of the NeuroLink provider ecosystem. For updates or provider-specific issues, please refer to the individual provider documentation or submit an issue in the [project repository](https://github.com/juspay/neurolink)._
