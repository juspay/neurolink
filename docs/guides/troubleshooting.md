# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when working with NeuroLink. For detailed troubleshooting of specific features, see the main [Troubleshooting documentation](../troubleshooting.md).

## Quick Diagnostics

Before diving into specific issues, try these quick diagnostics:

```bash
# 1. Check NeuroLink version
npx @juspay/neurolink --version

# 2. Verify environment variables
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
echo $REDIS_URL

# 3. Test basic connectivity
npx @juspay/neurolink generate "test" --provider openai

# 4. Enable debug logging
DEBUG=neurolink:* node your-app.js
```

---

## Connection Issues

### Provider Connection Failures

**Symptoms:**

- `ECONNREFUSED` or `ECONNRESET` errors
- `Network timeout` errors
- `Failed to connect to provider` messages

**Common Causes & Solutions:**

#### 1. Network/Firewall Issues

```bash
# Test direct connectivity
curl -I https://api.openai.com
curl -I https://api.anthropic.com

# If behind corporate proxy, set proxy:
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

**Solution**: Configure proxy in your application:

```typescript
const neurolink = new NeuroLink({
  provider: "openai",
  httpProxy: process.env.HTTP_PROXY,
  httpsProxy: process.env.HTTPS_PROXY,
});
```

#### 2. DNS Resolution Issues

```bash
# Test DNS resolution
nslookup api.openai.com
nslookup api.anthropic.com
```

**Solution**: Use alternative DNS or add to `/etc/hosts`

#### 3. SSL/TLS Errors

```bash
# Test SSL certificate
openssl s_client -connect api.openai.com:443
```

**Solution**: Update Node.js or disable SSL verification (not recommended for production):

```typescript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // DANGER: Dev only!
```

### Redis Connection Issues

**Symptoms:**

- `Redis connection failed`
- `ECONNREFUSED` to Redis
- `Authentication failed` for Redis

**Solutions:**

#### 1. Redis Not Running

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
docker run -d --name neurolink-redis -p 6379:6379 redis:7-alpine

# Or with Homebrew (macOS)
brew services start redis
```

#### 2. Wrong Connection String

```bash
# Check format
export REDIS_URL=redis://localhost:6379
# With password:
export REDIS_URL=redis://:password@localhost:6379
# With TLS:
export REDIS_URL=rediss://redis.example.com:6380
```

#### 3. Authentication Issues

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redis: {
      host: "localhost",
      port: 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },
});
```

### Timeout Errors

**Symptoms:**

- Request hangs indefinitely
- `Request timeout` errors
- No response after long wait

**Solutions:**

#### 1. Increase Timeout

```typescript
const result = await neurolink.generate({
  input: { text: prompt },
  timeout: 60000, // 60 seconds
});
```

#### 2. Check Provider Status

Visit provider status pages:

- OpenAI: https://status.openai.com
- Anthropic: https://status.anthropic.com
- Google: https://status.cloud.google.com

#### 3. Use Shorter Prompts

Long prompts increase processing time. Try reducing context size:

```typescript
// Instead of 10,000 word context
const longPrompt = generateLongPrompt();

// Use summary
const summary = await summarizeContext(longPrompt);
const result = await neurolink.generate({ input: { text: summary } });
```

---

## Authentication Issues

### API Key Errors

**Symptoms:**

- `Invalid API key`
- `401 Unauthorized`
- `Authentication failed`

**Solutions:**

#### 1. Verify API Key Format

```bash
# OpenAI keys start with sk-
echo $OPENAI_API_KEY | grep "^sk-"

# Anthropic keys start with sk-ant-
echo $ANTHROPIC_API_KEY | grep "^sk-ant-"

# Google AI Studio keys are alphanumeric
echo $GOOGLE_AI_API_KEY
```

#### 2. Check Key Scope/Permissions

Some keys have limited permissions:

- OpenAI: Check key permissions in dashboard
- Anthropic: Verify key hasn't expired
- Google: Ensure API is enabled in Cloud Console

#### 3. Environment Variable Loading

```typescript
// Verify env vars are loaded
console.log("OpenAI key:", process.env.OPENAI_API_KEY?.slice(0, 8) + "...");

// Use dotenv explicitly
require("dotenv").config();
```

#### 4. Key in Wrong Environment

```bash
# Production vs Development keys
# Check .env.production vs .env.development

# List all env files
ls -la .env*
```

### OAuth/Service Account Issues

**Symptoms:**

- `Service account authentication failed`
- `Invalid credentials` for GCP/Azure
- `Token expired` errors

**Solutions:**

#### 1. Google Cloud (Vertex AI)

```bash
# Verify service account
gcloud auth application-default print-access-token

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Or in code:
const neurolink = new NeuroLink({
  provider: "vertex",
  googleApplicationCredentials: "./service-account.json",
});
```

#### 2. Azure OpenAI

```typescript
const neurolink = new NeuroLink({
  provider: "azure",
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureApiKey: process.env.AZURE_OPENAI_KEY,
  azureDeployment: "gpt-4",
});
```

#### 3. AWS Bedrock

```bash
# Configure AWS credentials
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

---

## Runtime Errors

### Token Limit Exceeded

**Symptoms:**

- `This model's maximum context length is X tokens`
- `Request too large`
- Truncated responses

**Solutions:**

#### 1. Check Token Count

```typescript
// Rough estimate: 4 characters ≈ 1 token
const estimatedTokens = prompt.length / 4;

if (estimatedTokens > 4000) {
  console.warn("Prompt may exceed token limit");
}
```

#### 2. Reduce Context

See [Context Window Management](../cookbook/context-window-management.md) for detailed strategies:

```typescript
// Summarize old messages
await contextManager.summarizeOldMessages();

// Or limit max tokens
const result = await neurolink.generate({
  input: { text: prompt },
  maxTokens: 1000, // Limit response size
});
```

#### 3. Switch to Larger Context Model

| Model          | Context Window |
| -------------- | -------------- |
| GPT-3.5 Turbo  | 16K tokens     |
| GPT-4          | 128K tokens    |
| Claude 3       | 200K tokens    |
| Gemini 1.5 Pro | 1M tokens      |

```typescript
const result = await neurolink.generate({
  input: { text: longPrompt },
  provider: "google-ai",
  model: "gemini-1.5-pro", // 1M token context
});
```

### Rate Limiting

**Symptoms:**

- `429 Too Many Requests`
- `Rate limit exceeded`
- `Quota exceeded` errors

**Solutions:**

#### 1. Implement Rate Limiting

See [Rate Limit Handling](../cookbook/rate-limit-handling.md):

```typescript
import { RateLimiter } from "./rate-limiter";

const limiter = new RateLimiter({ requestsPerMinute: 50 });

await limiter.execute(async () => {
  return neurolink.generate({ input: { text: prompt } });
});
```

#### 2. Check Current Limits

```bash
# OpenAI: View limits in dashboard
# Anthropic: Check tier limits
# Google: View quotas in Cloud Console
```

#### 3. Upgrade Tier or Add Payment Method

Most rate limits increase with:

- Paid accounts
- Higher tiers
- Usage history

### Memory Issues

**Symptoms:**

- `JavaScript heap out of memory`
- Process crashes
- Slow performance

**Solutions:**

#### 1. Increase Node.js Memory

```bash
# Increase heap size to 4GB
node --max-old-space-size=4096 your-app.js

# Or in package.json
{
  "scripts": {
    "start": "node --max-old-space-size=4096 index.js"
  }
}
```

#### 2. Clear Conversation Memory

```typescript
// Clear periodically
await neurolink.clearConversationMemory();

// Or limit history
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxMessages: 50, // Keep only last 50 messages
  },
});
```

#### 3. Stream Instead of Buffer

```typescript
// Instead of buffering entire response
const result = await neurolink.generate({ input: { text: prompt } });
console.log(result.content); // Large string in memory

// Stream to reduce memory
const stream = await neurolink.stream({ input: { text: prompt } });

for await (const chunk of stream) {
  if (chunk.type === "content-delta") {
    process.stdout.write(chunk.delta); // Write immediately
  }
}
```

---

## Streaming Issues

### Stream Interruption

**Symptoms:**

- Stream stops mid-response
- Incomplete responses
- `Stream ended unexpectedly`

**Solutions:**

#### 1. Implement Retry

See [Streaming with Retry](../cookbook/streaming-with-retry.md):

```typescript
async function streamWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const stream = await neurolink.stream({ input: { text: prompt } });
      return stream;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

#### 2. Handle Stream Errors

```typescript
try {
  const stream = await neurolink.stream({ input: { text: prompt } });

  for await (const chunk of stream) {
    if (chunk.type === "content-delta") {
      process.stdout.write(chunk.delta);
    }
  }
} catch (error) {
  console.error("Stream failed:", error);
  // Fallback to non-streaming
  const fallback = await neurolink.generate({ input: { text: prompt } });
  console.log(fallback.content);
}
```

### Incomplete Responses

**Symptoms:**

- Response cuts off mid-sentence
- Missing conclusion
- Shorter than expected

**Solutions:**

#### 1. Check Max Tokens

```typescript
const result = await neurolink.generate({
  input: { text: prompt },
  maxTokens: 2000, // Increase if needed
});
```

#### 2. Verify Stream Completion

```typescript
let complete = false;

for await (const chunk of stream) {
  if (chunk.type === "content-delta") {
    process.stdout.write(chunk.delta);
  }
  if (chunk.type === "done") {
    complete = true;
  }
}

if (!complete) {
  console.warn("Stream did not complete normally");
}
```

---

## MCP Tool Issues

### Tool Discovery Failures

**Symptoms:**

- `No tools discovered`
- `MCP server not responding`
- `Tool not found`

**Solutions:**

#### 1. Verify MCP Server Configuration

```typescript
const neurolink = new NeuroLink({
  mcpServers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    },
  },
});

// List available tools
const tools = await neurolink.discoverTools();
console.log("Available tools:", tools);
```

#### 2. Check Server Installation

```bash
# Test MCP server directly
npx -y @modelcontextprotocol/server-filesystem .

# Verify permissions
chmod +x node_modules/.bin/mcp-server-*
```

#### 3. Enable Debug Logging

```bash
DEBUG=neurolink:mcp node your-app.js
```

### Tool Execution Errors

**Symptoms:**

- `Tool execution failed`
- `Permission denied`
- `Tool timeout`

**Solutions:**

#### 1. Check Permissions

```typescript
// Filesystem tools need read/write access
const neurolink = new NeuroLink({
  mcpServers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
    },
  },
});
```

#### 2. Increase Timeout

```typescript
const result = await neurolink.generate({
  input: { text: "Use the slow_tool" },
  enableTools: true,
  toolTimeout: 60000, // 60 seconds
});
```

#### 3. Validate Tool Arguments

```typescript
// Tools may fail with invalid arguments
// Check schema first:
const tools = await neurolink.discoverTools();
const tool = tools.find((t) => t.name === "my_tool");
console.log("Tool schema:", tool.inputSchema);
```

---

## Debugging Tips

### Enable Debug Logging

#### SDK Debug Logging

```bash
# All NeuroLink debug output
DEBUG=neurolink:* node your-app.js

# Specific modules
DEBUG=neurolink:provider node your-app.js
DEBUG=neurolink:mcp node your-app.js
DEBUG=neurolink:memory node your-app.js
```

#### Provider-Specific Logging

```typescript
const neurolink = new NeuroLink({
  debug: true, // Enable debug mode
  onLog: (level, message, meta) => {
    console.log(`[${level}] ${message}`, meta);
  },
});
```

### Common Log Messages

| Log Message             | Meaning              | Action            |
| ----------------------- | -------------------- | ----------------- |
| `Provider initialized`  | Provider ready       | Normal            |
| `Rate limit hit`        | Too many requests    | Slow down         |
| `Tool executed`         | Tool call succeeded  | Normal            |
| `Authentication failed` | Bad API key          | Check credentials |
| `Model not found`       | Invalid model name   | Verify model      |
| `Context too large`     | Exceeded token limit | Reduce context    |

### Request/Response Inspection

```typescript
const neurolink = new NeuroLink({
  onRequest: (request) => {
    console.log("Request:", JSON.stringify(request, null, 2));
  },
  onResponse: (response) => {
    console.log("Response:", JSON.stringify(response, null, 2));
  },
});
```

### Network Traffic Inspection

```bash
# Use proxy to inspect HTTP traffic
export HTTP_PROXY=http://localhost:8888
export HTTPS_PROXY=http://localhost:8888

# Then use Burp Suite, Charles, or mitmproxy to view requests
```

---

## Getting Help

### Before Asking for Help

Gather this information:

1. **NeuroLink version**: `npx @juspay/neurolink --version`
2. **Node.js version**: `node --version`
3. **Operating system**: `uname -a` (Unix) or `ver` (Windows)
4. **Error message**: Full error stack trace
5. **Minimal reproduction**: Smallest code that reproduces issue
6. **Debug logs**: Output from `DEBUG=neurolink:* node your-app.js`

### Community Resources

- **Discord**: [Join NeuroLink Discord](https://discord.gg/neurolink)
- **GitHub Issues**: [Report bugs](https://github.com/juspay/neurolink/issues)
- **Stack Overflow**: Tag questions with `neurolink`
- **Documentation**: [Full docs](https://neurolink.dev)

### Creating a Bug Report

Use this template:

```markdown
## Bug Description

[Clear description of the issue]

## Steps to Reproduce

1. [First step]
2. [Second step]
3. [Error occurs]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- NeuroLink version: [version]
- Node.js version: [version]
- OS: [operating system]
- Provider: [OpenAI/Anthropic/etc]

## Code Sample

\`\`\`typescript
[Minimal code that reproduces issue]
\`\`\`

## Error Message

\`\`\`
[Full error stack trace]
\`\`\`

## Debug Logs

\`\`\`
[Output from DEBUG=neurolink:* node your-app.js]
\`\`\`
```

---

## See Also

- [Main Troubleshooting Guide](../troubleshooting.md) - Comprehensive troubleshooting
- [Cookbook Recipes](../cookbook/index.md) - Practical solutions
- [Error Recovery Patterns](../cookbook/error-recovery.md) - Error handling strategies
- [Provider Comparison](../reference/provider-comparison.md) - Provider-specific guidance
- [API Reference](../sdk/api-reference.md) - Complete API documentation
