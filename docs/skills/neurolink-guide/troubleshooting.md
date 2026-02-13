# NeuroLink Troubleshooting

Common issues and solutions.

## Provider Issues

### "Provider not configured"

**Error:** `PROVIDER_NOT_CONFIGURED`

**Cause:** Missing API key or credentials.

**Solution:**

```bash
# Check environment variables
echo $OPENAI_API_KEY

# Set in .env file
OPENAI_API_KEY=sk-...

# Or export directly
export OPENAI_API_KEY=sk-...
```

Verify with:

```bash
neurolink setup --status
neurolink status
```

### "Authentication failed"

**Error:** `AUTHENTICATION_ERROR`

**Cause:** Invalid API key or expired credentials.

**Solution:**

1. Verify API key is correct
2. Check key hasn't expired
3. Ensure key has required permissions

```typescript
// Check provider status
const status = await neurolink.getProviderStatus();
console.log(status);
```

### "Rate limited"

**Error:** `RATE_LIMITED`

**Cause:** Too many requests to provider.

**Solution:**

```typescript
// Add delay between requests
await new Promise((resolve) => setTimeout(resolve, 1000));

// Or use fallback provider
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic", // Try different provider
});
```

### Vertex AI not working

**Cause:** GCP authentication not configured.

**Solution:**

```bash
# Set project ID
export VERTEX_PROJECT_ID=your-project-id

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Or use gcloud auth
gcloud auth application-default login
```

### AWS Bedrock not working

**Cause:** AWS credentials or region not configured.

**Solution:**

```bash
# Set credentials
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

# Or use AWS profile
export AWS_PROFILE=your-profile
```

## Import Errors

### "Cannot find module '@juspay/neurolink'"

**Cause:** Package not installed.

**Solution:**

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
```

### "Module not found: Error: Can't resolve"

**Cause:** ESM/CommonJS mismatch or bundler issue.

**Solution:**

For ESM projects:

```json
// package.json
{
  "type": "module"
}
```

For TypeScript:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Type errors with imports

**Cause:** Missing types or wrong import path.

**Solution:**

```typescript
// Correct import
import { NeuroLink } from "@juspay/neurolink";
import type { GenerateOptions } from "@juspay/neurolink";

// Not
import { NeuroLink } from "@juspay/neurolink/dist/...";
```

## Tool Errors

### "Tool not found"

**Error:** `TOOL_NOT_FOUND`

**Cause:** Tool not registered or MCP server not connected.

**Solution:**

```typescript
// List available tools
const tools = await neurolink.getAllAvailableTools();
console.log(tools.map((t) => t.name));

// Check MCP status
const status = await neurolink.getMCPStatus();
console.log(status);
```

### "MCP server failed to start"

**Cause:** MCP server command failed or missing dependencies.

**Solution:**

```bash
# Test MCP server manually
npx -y @modelcontextprotocol/server-github

# Check npm is working
npm --version
npx --version
```

```typescript
// Add with error handling
try {
  await neurolink.addExternalMCPServer("github", {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    transport: "stdio",
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
  });
} catch (error) {
  console.error("MCP server failed:", error.message);
}
```

### Tool execution timeout

**Cause:** Tool taking too long to execute.

**Solution:**

```typescript
const result = await neurolink.executeTool("slowTool", params, {
  timeout: 30000, // Increase timeout
});
```

## Memory Issues

### "Redis connection failed"

**Cause:** Redis server not running or wrong URL.

**Solution:**

```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server
```

```typescript
// Verify Redis URL
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    redisConfig: {
      url: "redis://localhost:6379", // Correct URL
    },
  },
});
```

### "Session not found"

**Cause:** Session ID doesn't exist or expired.

**Solution:**

```typescript
// List sessions first
const stats = await neurolink.getConversationStats();

// Use correct session ID
const history = await neurolink.getConversationHistory("correct-session-id");
```

## Streaming Issues

### Stream hangs or doesn't complete

**Cause:** Connection issue or provider error.

**Solution:**

```typescript
// Add timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

try {
  const result = await neurolink.stream({
    input: { text: "Hello" },
    abortSignal: controller.signal,
  });

  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      process.stdout.write(chunk.content);
    }
  }
} finally {
  clearTimeout(timeout);
}
```

### Empty stream response

**Cause:** Model returned empty or error in processing.

**Solution:**

```typescript
const result = await neurolink.stream({
  input: { text: "Hello" },
});

for await (const chunk of result.stream) {
  if ("content" in chunk && chunk.content) {
    process.stdout.write(chunk.content);
  }
}

// Check if any content
if (!result.content) {
  console.error("No content generated");
}
```

## Multimodal Issues

### "Unsupported file type"

**Cause:** File extension not recognized.

**Solution:**

```typescript
// Check supported types
// Images: PNG, JPEG, WebP, GIF, SVG
// Documents: PDF, DOCX, RTF, ODT
// Data: CSV, XLSX, JSON, YAML, XML
// Code: TS, JS, PY, etc.

// Use correct input field
const result = await neurolink.generate({
  input: {
    text: "Analyze",
    images: ["./photo.jpg"], // For images
    pdfFiles: ["./doc.pdf"], // For PDFs
    csvFiles: ["./data.csv"], // For CSV
    files: ["./anything.xyz"], // Auto-detect
  },
});
```

### "Vision not supported"

**Cause:** Model doesn't support image input.

**Solution:**

```typescript
// Use vision-capable model
const result = await neurolink.generate({
  input: {
    text: "Describe",
    images: ["./photo.jpg"],
  },
  provider: "openai",
  model: "gpt-4o", // Vision-capable
});

// Vision models:
// OpenAI: gpt-4o, gpt-4-turbo
// Anthropic: claude-3-* (all)
// Vertex: gemini-2.5-*, gemini-3-*
```

### File too large

**Cause:** File exceeds size limit.

**Solution:**

```typescript
// Compress images before sending
// Or use smaller files

// For PDFs, extract specific pages
// For CSV, limit rows
const result = await neurolink.generate({
  input: {
    text: "Analyze",
    csvFiles: ["./large.csv"],
  },
  csvOptions: {
    maxRows: 100, // Limit rows
  },
});
```

## RAG Issues

### RAG not finding relevant content

**Cause:** Wrong chunking strategy or parameters.

**Solution:**

```typescript
// Adjust parameters
const result = await neurolink.generate({
  prompt: "Question",
  rag: {
    files: ["./doc.md"],
    strategy: "markdown", // Match content type
    chunkSize: 256, // Smaller chunks
    chunkOverlap: 50, // More overlap
    topK: 10, // More results
  },
});
```

### "No embedding provider"

**Cause:** Embedding provider not configured.

**Solution:**

```typescript
const result = await neurolink.generate({
  prompt: "Question",
  rag: {
    files: ["./doc.md"],
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-small",
  },
});
```

## CLI Issues

### "Command not found: neurolink"

**Cause:** Not installed globally or not in PATH.

**Solution:**

```bash
# Install globally
npm install -g @juspay/neurolink

# Or use npx
npx @juspay/neurolink generate "Hello"

# Or from project
npx neurolink generate "Hello"
```

### CLI hangs

**Cause:** Waiting for input or API timeout.

**Solution:**

```bash
# Use timeout flag
neurolink generate "Hello" --timeout 30

# Check debug output
neurolink generate "Hello" --debug
```

## Performance Issues

### Slow response times

**Solution:**

1. Use faster models (gpt-4o-mini, gemini-2.5-flash)
2. Reduce maxTokens
3. Use streaming for perceived speed
4. Cache results when possible

```typescript
const result = await neurolink.generate({
  input: { text: "Quick task" },
  model: "gpt-4o-mini", // Faster model
  maxTokens: 200, // Limit output
});
```

### High memory usage

**Solution:**

1. Stream large responses
2. Process files in batches
3. Clear conversation history periodically

```typescript
// Stream instead of generate
const result = await neurolink.stream({
  input: { text: "Generate large output" },
});

// Process in chunks
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    processChunk(chunk.content);
  }
}
```

## Debug Mode

Enable verbose logging:

```bash
# CLI
neurolink generate "Hello" --debug

# Environment variable
DEBUG=neurolink:* neurolink generate "Hello"
```

```typescript
// SDK
const neurolink = new NeuroLink();
const emitter = neurolink.getEventEmitter();

emitter.on("generation:start", console.log);
emitter.on("generation:end", console.log);
emitter.on("tool:start", console.log);
emitter.on("tool:end", console.log);
emitter.on("error", console.error);
```

## Getting Help

1. Check this troubleshooting guide
2. Review SDK quickstart
3. Check provider configuration
4. Look at code templates in `templates/`
5. Enable debug mode for more info
