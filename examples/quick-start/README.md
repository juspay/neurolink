# Quick Start Examples - Small Team Optimized

Focused examples to get your team productive with NeuroLink quickly.

## 🚀 Run All Examples

```bash
# Run comprehensive demo (covers all features)
node examples/comprehensive-demo.js

# Run specific feature demos
node examples/quick-start/configuration-patterns.js
node examples/quick-start/evaluation-demo.js
node examples/quick-start/analytics-demo.js
node examples/quick-start/testing-demo.js
```

## 📁 Available Examples

### Core Features

- **`configuration-patterns.js`** - NeuroLink configuration, provider switching, fallbacks
- **`evaluation-demo.js`** - Unified evaluation system
- **`analytics-demo.js`** - Usage tracking and performance metrics
- **`testing-demo.js`** - Testing strategies for small teams

### Advanced Features

- **`mcp-integration.js`** - MCP tool integration (includes HTTP transport examples)
- **`batch-processing.js`** - Efficient batch operations
- **`error-handling.js`** - Robust error handling patterns

### HTTP Transport for Remote MCP Servers

Connect to remote MCP APIs (like GitHub Copilot) using HTTP transport:

```json
{
  "mcpServers": {
    "remote-api": {
      "name": "remote-api",
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "httpOptions": {
        "connectionTimeout": 30000,
        "requestTimeout": 60000
      },
      "retryConfig": {
        "maxAttempts": 3,
        "initialDelay": 1000
      }
    }
  }
}
```

See `../http-transport-mcp.ts` for complete examples.

## ⚡ 30-Second Setup

1. **Set API Key**: `echo "GOOGLE_AI_API_KEY=your_key" >> .env`
2. **Test Setup**: `node examples/quick-start/configuration-patterns.js`
3. **Full Demo**: `node examples/comprehensive-demo.js`

## 🎯 Small Team Best Practices

- Use `gemini-2.5-flash` for development (fast & cheap)
- Enable analytics in development, disable in production
- Implement fallback providers for reliability
- Use simple evaluation mode for quick feedback
- Batch similar requests for efficiency

## 🔧 Troubleshooting

- **No providers available**: Check API keys in `.env`
- **Slow responses**: Use faster models (`gemini-2.5-flash`)
- **Rate limits**: Implement request batching
- **Evaluation fails**: Check evaluation model configuration

See `docs/TROUBLESHOOTING.md` for detailed solutions.
