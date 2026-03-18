# NeuroLink Troubleshooting Guide

**Version**: v9.26.1
**Last Updated**: March 2026

---

## Overview

This guide helps diagnose and resolve common issues with NeuroLink, including AI provider connectivity, MCP integration, CLI usage problems, streaming issues, and the generate function migration.

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

# 4. System status
npx @juspay/neurolink status --verbose

# 5. MCP status
npx @juspay/neurolink mcp discover --format table

# 6. Enable debug logging
export NEUROLINK_DEBUG=true
npx @juspay/neurolink generate "Test" --debug
```

---

## Quick Fixes

| Symptom                                | Resolution                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Image not found` when using `--image` | Provide an absolute path or run the command from the directory containing the asset. URLs must be HTTPS.                       |
| `Evaluation model not configured`      | Set `NEUROLINK_EVALUATION_PROVIDER`/`NEUROLINK_EVALUATION_MODEL`, or disable `--enableEvaluation` until credentials are added. |
| `Redis connection failed` in loop mode | Export `REDIS_URL` before running `neurolink loop` or start the session with `--no-auto-redis`.                                |
| `Model not available in region`        | Confirm the model supports the requested region and update `AWS_REGION` / `GOOGLE_VERTEX_LOCATION` accordingly.                |
| CLI exits after error inside loop      | Upgrade to latest `@juspay/neurolink` and restart the loop; new builds catch errors without exiting.                           |

---

## Q4 2025 Features -- Common Issues

### Human-in-the-Loop (HITL)

| Issue                                   | Solution                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Tool executes without asking permission | Add `requiresConfirmation: true` to tool definition. See [HITL Guide](../features/hitl.md#configuration)    |
| Confirmation dialog doesn't appear      | Handle `USER_CONFIRMATION_REQUIRED` error in your UI. See [HITL Guide](../features/hitl.md#troubleshooting) |
| Permission flag not resetting           | Call `setUserConfirmation(false)` after tool execution. See [HITL Guide](../features/hitl.md#how-it-works)  |

### Guardrails Middleware

| Issue                      | Solution                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Content not being filtered | Ensure `preset: "security"` is set in middleware config. See [Guardrails Guide](../features/guardrails.md#quick-start) |
| Too many false positives   | Review bad word list, remove common words. See [Guardrails Guide](../features/guardrails.md#best-practices)            |
| Model-based filter is slow | Switch to `gpt-4o-mini` for faster filtering. See [Guardrails Guide](../features/guardrails.md#troubleshooting)        |

### Redis Conversation Export

| Issue                                        | Solution                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Export returns empty history                 | Verify Redis connection and session ID exists. See [Conversation History Guide](../features/conversation-history.md#troubleshooting)         |
| `getConversationHistory` returns empty array | Ensure `conversationMemory.enabled: true` is configured. See [Conversation History Guide](../features/conversation-history.md#configuration) |
| Missing metadata in export                   | Set `includeMetadata: true` in export options. See [Conversation History Guide](../features/conversation-history.md#advanced-usage)          |

### Video Generation (Veo 3.1)

| Issue                                  | Solution                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROVIDER_NOT_CONFIGURED` error        | Set `GOOGLE_APPLICATION_CREDENTIALS` to your service account JSON path. See [Video Generation Guide](../features/video-generation.md#prerequisites)             |
| `VIDEO_POLL_TIMEOUT` after 3 minutes   | Video generation can take 1-2 minutes; increase timeout or check Vertex AI quota. See [Video Generation Guide](../features/video-generation.md#troubleshooting) |
| `VIDEO_INVALID_INPUT` for image format | Ensure image is PNG, JPEG, or WebP under 20MB; check aspect ratio compatibility. See [Video Generation Guide](../features/video-generation.md#limitations)      |
| Video generation uses wrong provider   | Video gen only supports Vertex AI; provider auto-switches to `vertex` when `output.mode: "video"`                                                               |
| `Project not found` error              | Set `GOOGLE_VERTEX_PROJECT` or `GOOGLE_CLOUD_PROJECT` environment variable                                                                                      |
| Audio missing from generated video     | Set `output.video.audio: true` (enabled by default) and ensure Veo 3.1 model is used                                                                            |

### PPT Generation (PowerPoint Presentations)

- `PPT_PLANNING_FAILED` -- Check AI provider connection and ensure valid prompt. See [PPT Generation Guide](../features/ppt-generation.md#troubleshooting)
- `PPT_INVALID_AI_RESPONSE` during generation -- Simplify prompt/topic and retry. See [PPT Generation Guide](../features/ppt-generation.md#error-handling)
- `PPT_FILE_WRITE_FAILED` -- Check write permissions for output directory and disk space. See [PPT Generation Guide](../features/ppt-generation.md#file-output)
- Empty slides in presentation -- Ensure content plan has enough detail; try more specific prompts
- Images not generating -- Set `generateAIImages: true` in `output.ppt` (SDK) or avoid `--pptNoImages` (CLI), and configure `VERTEX_IMAGE_MODEL`. See [PPT Generation Guide](../features/ppt-generation.md#ai-image-generation)
- Theme not applying correctly -- Verify theme name: `modern`, `corporate`, `creative`, `minimal`, or `dark`

---

## Generate Function Migration Issues

### Migration Questions

**Q: Should I update my existing code to use the new `generate()` API?**
A: Optional. Your existing legacy `generate()` code continues working unchanged. Prefer the new `stream()` API for new projects.

**Q: I see deprecation warnings with the legacy `generate()` call style**
A: These are informational only. The legacy API remains supported. To remove warnings, use the newer options-based `generate()` call style (pass `input: { text: "..." }` instead of `prompt: "..."`).

### Migration Examples

```typescript
// NEW: Recommended usage
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  provider: "google-ai",
});

// LEGACY: Still fully supported
const result = await neurolink.generate({
  prompt: "Your prompt",
  provider: "google-ai",
});
```

### CLI Migration

```bash
# NEW: Options-based API
npx @juspay/neurolink generate --prompt "Your prompt" --provider openai

# LEGACY: Positional arguments (still works, shows deprecation warning)
npx @juspay/neurolink generate "Your prompt" --provider openai
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

## MCP Integration Issues

### Built-in Tools Not Working

**Previous Issue**: Time tool and other built-in tools were not loading due to circular dependencies. This was resolved in earlier versions.

**If still having issues**:

1. Ensure you're using the latest version: `npm list @juspay/neurolink`
2. Clear node modules and reinstall: `rm -rf node_modules && npm install`
3. Rebuild the project: `npm run build`

### External MCP Server Discovery Issues

**Symptom**: No external MCP servers found during discovery

**Diagnosis**:

```bash
# Check if discovery is working
npx @juspay/neurolink mcp discover --format table
# Should show 58+ discovered servers

# Check discovery with debug info
npx @juspay/neurolink mcp discover --format json | jq '.servers | length'
# Should return a number > 50
```

**Solutions**:

1. **No Servers Found**:

   ```bash
   # Check if you have AI tools installed (VS Code, Claude, Cursor, etc.)
   ls -la ~/Library/Application\ Support/Claude/
   ls -la ~/.config/Code/User/
   ls -la ~/.cursor/
   ```

2. **Partial Discovery**:

   ```bash
   # Check for configuration file issues
   npx @juspay/neurolink mcp discover --format json > discovery.json
   # Review discovery.json for parsing errors
   ```

3. **Discovery Errors**:

   ```bash
   # Enable debug mode
   export NEUROLINK_DEBUG=true
   npx @juspay/neurolink mcp discover --format table
   ```

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

### HTTP Transport Issues (Remote MCP Servers)

#### Connection Timeout

**Symptom**: `ETIMEDOUT` or `Connection timeout` when connecting to remote MCP servers

**Diagnosis**:

```bash
# Test remote endpoint directly
curl -v https://api.example.com/mcp

# Check with custom timeout
curl --max-time 30 https://api.example.com/mcp
```

**Solutions**:

1. **Increase Connection Timeout**:

   ```json
   {
     "mcpServers": {
       "remote-api": {
         "transport": "http",
         "url": "https://api.example.com/mcp",
         "httpOptions": {
           "connectionTimeout": 60000,
           "requestTimeout": 120000
         }
       }
     }
   }
   ```

2. **Check Network/Firewall**:
   - Verify the remote endpoint is accessible
   - Check corporate firewall allows outbound connections
   - Verify proxy settings if behind corporate network

#### Authentication Errors

**Symptom**: `401 Unauthorized` or `403 Forbidden` errors

**Diagnosis**:

```bash
# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/mcp
```

**Solutions**:

1. **Check Bearer Token**:

   ```json
   {
     "mcpServers": {
       "remote-api": {
         "transport": "http",
         "url": "https://api.example.com/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_VALID_TOKEN"
         }
       }
     }
   }
   ```

2. **Check API Key**:

   ```json
   {
     "headers": {
       "X-API-Key": "your-valid-api-key"
     }
   }
   ```

3. **Refresh OAuth Token**:
   - OAuth tokens may expire; check token validity
   - Verify OAuth configuration has correct scopes

#### Rate Limiting Errors

**Symptom**: `429 Too Many Requests` errors

**Solutions**:

1. **Configure Rate Limiting**:

   ```json
   {
     "mcpServers": {
       "remote-api": {
         "transport": "http",
         "url": "https://api.example.com/mcp",
         "rateLimiting": {
           "requestsPerMinute": 30,
           "maxBurst": 5,
           "useTokenBucket": true
         }
       }
     }
   }
   ```

2. **Add Retry Configuration**:

   ```json
   {
     "retryConfig": {
       "maxAttempts": 5,
       "initialDelay": 2000,
       "maxDelay": 60000,
       "backoffMultiplier": 2
     }
   }
   ```

#### SSL/TLS Errors

**Symptom**: `CERT_HAS_EXPIRED` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

**Solutions**:

1. **Check Certificate**:

   ```bash
   openssl s_client -connect api.example.com:443 -servername api.example.com
   ```

2. **For Development Only** (not recommended for production):

   ```bash
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

#### HTTP Transport Debug Mode

```bash
# Enable debug logging for HTTP transport
export NEUROLINK_DEBUG=true

# Test with verbose output
npx @juspay/neurolink mcp test remote-api --debug
```

See [MCP HTTP Transport Guide](../mcp-http-transport.md) for complete configuration options.

---

## AI Provider Issues

### Provider Authentication Errors

**Symptom**: "Authentication failed" or "Invalid API key" errors

**Diagnosis**:

```bash
# Check provider status
npx @juspay/neurolink status --verbose
```

**Solutions**:

1. **OpenAI Issues**:

   ```bash
   # Set API key
   export OPENAI_API_KEY="sk-your-openai-api-key"

   # Test connection
   npx @juspay/neurolink generate "Hello" --provider openai
   ```

2. **Google AI Studio Issues**:

   ```bash
   # Set API key (recommended for free tier)
   export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"

   # Test connection
   npx @juspay/neurolink generate "Hello" --provider google-ai
   ```

3. **Google Vertex AI Issues**:

   ```bash
   # Complete Vertex AI setup
   export GOOGLE_VERTEX_PROJECT="your-project-id"
   export GOOGLE_VERTEX_LOCATION="us-east5"
   export GOOGLE_AUTH_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
   export GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

   # Test Claude Sonnet 4 (recommended model)
   npx @juspay/neurolink generate "test" --provider vertex --model claude-sonnet-4@20250514
   ```

   **Common Vertex AI Issues**:
   - **"Not configured" despite valid credentials**:
     Use `GOOGLE_VERTEX_PROJECT` instead of `GOOGLE_CLOUD_PROJECT_ID`
   - **Authentication failed**:
     Ensure both `GOOGLE_AUTH_CLIENT_EMAIL` and `GOOGLE_AUTH_PRIVATE_KEY` are set
   - **Model not found**:
     Use `claude-sonnet-4@20250514` format for Anthropic models via Vertex AI

   **Debugging Commands**:

   ```bash
   # Check provider status
   npx @juspay/neurolink status

   # Test basic connectivity
   npx @juspay/neurolink generate "hello" --provider vertex --model claude-sonnet-4@20250514

   # Debug with verbose output
   npx @juspay/neurolink generate "test" --provider vertex --debug
   ```

4. **Multiple Provider Setup**:

   ```bash
   # Create .env file
   cat > .env << EOF
   OPENAI_API_KEY=sk-your-openai-key
   GOOGLE_AI_API_KEY=AIza-your-google-key
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
   EOF

   # Test auto-selection
   npx @juspay/neurolink generate "Hello"
   ```

### API Key Verification

```bash
# OpenAI keys start with sk-
echo $OPENAI_API_KEY | grep "^sk-"

# Anthropic keys start with sk-ant-
echo $ANTHROPIC_API_KEY | grep "^sk-ant-"

# Google AI Studio keys are alphanumeric
echo $GOOGLE_AI_API_KEY
```

### OAuth/Service Account Issues

**Symptoms:**

- `Service account authentication failed`
- `Invalid credentials` for GCP/Azure
- `Token expired` errors

**Solutions:**

#### Google Cloud (Vertex AI)

```bash
# Verify service account
gcloud auth application-default print-access-token

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Azure OpenAI

```typescript
const neurolink = new NeuroLink({
  provider: "azure",
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureApiKey: process.env.AZURE_OPENAI_KEY,
  azureDeployment: "gpt-4",
});
```

#### AWS Bedrock

```bash
# Configure AWS credentials
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### Provider Selection Issues

**Symptom**: Wrong provider selected or fallback not working

**Diagnosis**:

```bash
# Check available providers
npx @juspay/neurolink status

# Test specific provider
npx @juspay/neurolink generate "Hello" --provider google-ai --debug
```

**Solutions**:

1. **Force Specific Provider**:

   ```bash
   npx @juspay/neurolink generate "Hello" --provider openai
   ```

2. **Check Fallback Logic**:

   ```bash
   # This should automatically select best available provider
   npx @juspay/neurolink generate "Hello" --debug
   ```

---

## LiteLLM Provider Issues {#litellm-provider-issues}

### LiteLLM Proxy Server Not Available

**Symptom**: `LiteLLM proxy server not available. Please start the LiteLLM proxy server at http://localhost:4000`

**Diagnosis**:

```bash
# Check if LiteLLM proxy is running
curl http://localhost:4000/health

# Check if process is running
ps aux | grep litellm
```

**Solutions**:

1. **Start LiteLLM Proxy Server**:

   ```bash
   # Install LiteLLM
   pip install litellm

   # Start proxy server
   litellm --port 4000

   # Server should start and show available models
   ```

2. **Verify Environment Variables**:

   ```bash
   # Check configuration
   echo $LITELLM_BASE_URL    # Should be http://localhost:4000
   echo $LITELLM_API_KEY     # Should be sk-anything or configured value
   echo $LITELLM_MODEL       # Optional default model
   ```

3. **Test Proxy Connectivity**:

   ```bash
   # Test health endpoint
   curl http://localhost:4000/health

   # Check available models
   curl http://localhost:4000/models

   # Test basic completion
   curl -X POST http://localhost:4000/v1/completions \
     -H "Content-Type: application/json" \
     -d '{"model": "openai/gpt-4o-mini", "prompt": "Hello", "max_tokens": 5}'
   ```

### LiteLLM Model Format Issues

**Symptom**: `Model not found` or `Invalid model format` errors

**Diagnosis**:

```bash
# Check available models through proxy
curl http://localhost:4000/models | jq '.data[].id'
```

**Solutions**:

1. **Use Correct Model Format**:

   ```bash
   # Correct format: provider/model-name
   npx @juspay/neurolink generate "Hello" --provider litellm --model "openai/gpt-4o-mini"
   npx @juspay/neurolink generate "Hello" --provider litellm --model "anthropic/claude-3-5-sonnet"
   npx @juspay/neurolink generate "Hello" --provider litellm --model "google/gemini-2.0-flash"
   ```

2. **Popular Model Formats**:

   ```typescript
   // OpenAI models
   "openai/gpt-4o";
   "openai/gpt-4o-mini";
   "openai/gpt-4";

   // Anthropic models
   "anthropic/claude-3-5-sonnet";
   "anthropic/claude-3-haiku";

   // Google models
   "google/gemini-2.0-flash";
   "vertex_ai/gemini-pro";

   // Mistral models
   "mistral/mistral-large";
   "mistral/mixtral-8x7b";
   ```

3. **Check LiteLLM Configuration**:

   ```yaml
   # litellm_config.yaml
   model_list:
     - model_name: openai/gpt-4o
       litellm_params:
         model: gpt-4o
         api_key: os.environ/OPENAI_API_KEY

     - model_name: anthropic/claude-3-5-sonnet
       litellm_params:
         model: claude-3-5-sonnet-20241022
         api_key: os.environ/ANTHROPIC_API_KEY
   ```

### LiteLLM API Key Configuration Issues

**Symptom**: Authentication errors when using specific models through LiteLLM

**Solutions**:

1. **Configure Provider API Keys for LiteLLM**:

   ```bash
   # Set underlying provider API keys that LiteLLM will use
   export OPENAI_API_KEY="sk-your-openai-key"
   export ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
   export GOOGLE_AI_API_KEY="AIza-your-google-key"

   # Then start LiteLLM proxy
   litellm --port 4000
   ```

2. **Use LiteLLM Configuration File**:

   ```bash
   # Create litellm_config.yaml with API keys
   litellm --config litellm_config.yaml --port 4000
   ```

3. **Set NeuroLink LiteLLM Variables**:

   ```bash
   # NeuroLink LiteLLM configuration
   export LITELLM_BASE_URL="http://localhost:4000"
   export LITELLM_API_KEY="sk-anything"  # Can be any value for local proxy
   ```

### LiteLLM Connection Timeout Issues

**Symptom**: Requests to LiteLLM proxy timing out

**Solutions**:

1. **Increase Timeout Values**:

   ```bash
   # Set longer timeout for LiteLLM requests
   export LITELLM_TIMEOUT=60000  # 60 seconds

   # Test with longer timeout
   npx @juspay/neurolink generate "Complex reasoning task" \
     --provider litellm \
     --timeout 60s
   ```

2. **Optimize LiteLLM Configuration**:

   ```bash
   # Start LiteLLM with performance optimizations
   litellm --port 4000 --num_workers 4 --timeout 60
   ```

### LiteLLM Debugging

**Enable Debug Mode**:

```bash
# Enable NeuroLink debug output
export NEUROLINK_DEBUG=true

# Test LiteLLM with debug info
npx @juspay/neurolink generate "Hello" --provider litellm --debug

# Enable LiteLLM proxy debug mode
litellm --port 4000 --debug
```

**Common LiteLLM Error Messages**:

- `ECONNREFUSED`: LiteLLM proxy not running
- `Model not found`: Invalid model format or model not configured
- `Authentication failed`: Underlying provider API keys not set
- `Timeout`: Proxy taking too long to respond

---

## SageMaker Provider Issues

### Common SageMaker Errors

#### "Endpoint not found" Error

```bash
# Symptoms
Error: The endpoint 'my-endpoint' was not found.

# Solutions
1. Check endpoint exists in SageMaker console
2. Verify endpoint is in 'InService' status
3. Check AWS region matches endpoint region
```

#### "Access denied" Error

```bash
# Symptoms
AccessDeniedException: User: arn:aws:iam::123456789012:user/myuser is not authorized

# Solutions
1. Add SageMaker invoke permissions:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sagemaker:InvokeEndpoint"],
      "Resource": "arn:aws:sagemaker:*:*:endpoint/*"
    }
  ]
}

2. Check AWS credentials are valid:
aws sts get-caller-identity
```

#### "Model not loading" Error

```bash
# Symptoms
ModelError: The model is not ready to serve requests

# Solutions
1. Check endpoint status:
npx @juspay/neurolink sagemaker status

2. Monitor CloudWatch logs:
aws logs describe-log-groups --log-group-name-prefix /aws/sagemaker/Endpoints

3. Wait for endpoint to be in 'InService' status
```

### SageMaker Configuration Issues

#### Invalid AWS Credentials

```bash
# Check configuration
npx @juspay/neurolink sagemaker config

# Set required variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export SAGEMAKER_DEFAULT_ENDPOINT="your-endpoint-name"
```

#### Timeout Issues

```bash
# Increase timeout for large models
export SAGEMAKER_TIMEOUT="60000"  # 60 seconds

# Use in CLI
npx @juspay/neurolink generate "complex task" --provider sagemaker --timeout 60s
```

### SageMaker Debug Mode

```bash
# Enable debug output
export NEUROLINK_DEBUG=true
npx @juspay/neurolink generate "test" --provider sagemaker --debug
npx @juspay/neurolink sagemaker status --verbose
```

### SageMaker CLI Commands

```bash
# Check endpoint health
npx @juspay/neurolink sagemaker status

# Validate configuration
npx @juspay/neurolink sagemaker validate

# Test specific endpoint
npx @juspay/neurolink sagemaker test my-endpoint

# Performance benchmark
npx @juspay/neurolink sagemaker benchmark my-endpoint

# List available endpoints (requires AWS CLI)
npx @juspay/neurolink sagemaker list-endpoints
```

---

## Structured Output Issues

### Google Gemini: Function Calling + Schema Conflict

**Symptom**: Error when using schema with Google Vertex AI or Google AI Studio

```
Error: Function calling with a response mime type: 'application/json' is unsupported
```

**Root Cause**: Google's Gemini API **fundamentally cannot combine function calling (tools) with structured output (JSON schema)**. This is a documented Google API limitation, not a NeuroLink bug.

**Solutions**:

1. **Disable Tools (Recommended)**:

   ```typescript
   const result = await neurolink.generate({
     input: { text: "Your prompt" },
     schema: YourSchema,
     output: { format: "json" },
     provider: "vertex", // or "google-ai"
     disableTools: true, // Required for Google with schemas
   });
   ```

2. **Use Different Provider**:

   ```typescript
   // OpenAI, Anthropic, and others support both simultaneously
   const result = await neurolink.generate({
     input: { text: "Your prompt" },
     schema: YourSchema,
     output: { format: "json" },
     provider: "openai", // Supports tools + schemas together
   });
   ```

3. **Use Future Gemini Versions**:
   - Future Gemini versions may support both -- check official documentation for updates

**This is Industry Standard**: All frameworks (LangChain, Vercel AI SDK, Agno, Instructor) use the same workaround.

**Historical Context**:

- Gemini 2.0 and earlier: Cannot combine tools + schemas
- Gemini 2.5: **Worsened** -- even fails with tool calls in conversation history
- Gemini 3: Still cannot combine tools + schemas (same limitation applies)

### Google Gemini: "Too many states for serving" Error {#google-gemini-too-many-states-for-serving-error}

**Symptom**: Error with complex Zod schemas on Google providers

```
Error: 9 FAILED_PRECONDITION: Too many states for serving
```

**Root Cause**: Google Gemini has internal state limits. Complex schemas + many tools exceed these limits.

**Solutions**:

1. **Simplify Schema**:

   ```typescript
   // Too complex
   const ComplexSchema = z.object({
     level1: z.object({
       level2: z.object({
         level3: z.object({
           level4: z.object({
             level5: z.string()
           })
         })
       })
     }),
     largeArray: z.array(z.object({...})).max(1000)
   });

   // Simplified
   const SimpleSchema = z.object({
     summary: z.string(),
     details: z.object({
       key1: z.string(),
       key2: z.number()
     })
   });
   ```

2. **Disable Tools** (reduces state complexity):

   ```typescript
   const result = await neurolink.generate({
     schema: YourSchema,
     disableTools: true, // Significantly reduces state count
   });
   ```

3. **Use Different Provider**:
   - OpenAI: No known schema complexity limits
   - Anthropic: Handles deep nested schemas well

---

## CLI Issues

### Command Not Found

**Symptom**: `neurolink: command not found`

**Solutions**:

1. **Using NPX (Recommended)**:

   ```bash
   npx @juspay/neurolink --help
   ```

2. **Global Installation**:

   ```bash
   npm install -g @juspay/neurolink
   neurolink --help
   ```

3. **Local Project Usage**:

   ```bash
   npm install @juspay/neurolink
   npx @juspay/neurolink --help
   ```

### Model Parameter Not Working

**Symptom**: CLI `--model` parameter is ignored, always uses default model

**Example Issue**:

```bash
# Command specifies model but output shows default model being used
node dist/cli/index.js generate "test" --provider google-ai --model gemini-2.5-flash
# Output shows: modelName: 'gemini-2.5-pro' (default instead of specified)
```

**Status**: Fixed in latest version.

**Verification**:

```bash
# Test that model parameter works correctly
node dist/cli/index.js generate "what is deepest you can think?" --provider google-ai --model gemini-2.5-flash --debug
# Should show: modelName: 'gemini-2.5-flash' in debug output
```

### Build Issues

**Symptom**: CLI commands failing or TypeScript errors

**Diagnosis**:

```bash
# Check build status
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

**Solutions**:

1. **Clean Build**:

   ```bash
   rm -rf dist node_modules
   npm install
   npm run build
   ```

2. **Dependencies Issues**:

   ```bash
   # Update dependencies
   npm update
   npm run build
   ```

---

## Runtime Errors

### Token Limit Exceeded

**Symptoms:**

- `This model's maximum context length is X tokens`
- `Request too large`
- Truncated responses

**Solutions:**

#### 1. Reduce Context

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

#### 2. Switch to Larger Context Model

| Model          | Context Window |
| -------------- | -------------- |
| GPT-4          | 128K tokens    |
| Claude 3       | 200K tokens    |
| Gemini 2.5 Pro | 1M tokens      |

```typescript
const result = await neurolink.generate({
  input: { text: longPrompt },
  provider: "google-ai",
  model: "gemini-2.5-pro", // 1M token context
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

#### 2. Upgrade Tier or Add Payment Method

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

## Configuration Management Issues

### Config Update Failures

**Symptoms**: Config updates fail with validation errors or backup issues

**Solutions**:

```bash
# Check config validation
npx @juspay/neurolink config validate

# Check backup system
ls -la .neurolink.backups/

# Manual backup creation
npx @juspay/neurolink config backup --reason "manual-backup"

# Restore from backup
npx @juspay/neurolink config restore --backup latest
```

### Backup System Issues

**Symptoms**: Backups not created or corrupted

**Solutions**:

```bash
# Verify backup directory permissions
ls -la .neurolink.backups/

# Check backup integrity
npx @juspay/neurolink config verify-backups

# Cleanup corrupted backups
npx @juspay/neurolink config cleanup --verify

# Reset backup system
rm -rf .neurolink.backups/
mkdir .neurolink.backups/
```

### Provider Configuration Issues

**Symptoms**: Providers not loading or failing validation

**Solutions**:

```bash
# Test individual provider
npx @juspay/neurolink test-provider google

# Check provider status
npx @juspay/neurolink status

# Reset provider configuration
npx @juspay/neurolink config reset-provider google

# Validate environment variables
npx @juspay/neurolink env check
```

---

## TypeScript Compilation Issues

### Build Failures

**Symptoms**: `pnpm run build:cli` fails with TypeScript errors

**Common Errors & Solutions**:

```typescript
// ERROR: Argument of type 'unknown' is not assignable to parameter of type 'string'
// SOLUTION: Use type casting
const value = String(unknownValue || "default");

// ERROR: Property 'success' does not exist on type 'unknown'
// SOLUTION: Cast to expected type
const result = response as ToolResult;
if (result.success) {
  /* ... */
}

// ERROR: Interface compatibility issues
// SOLUTION: Use optional methods
if (registry.executeTool) {
  const result = await registry.executeTool("tool", args, context);
}
```

**Build Validation**:

```bash
# Check TypeScript compilation
npx tsc --noEmit --project tsconfig.cli.json

# Full CLI build
pnpm run build:cli

# Check for type errors
npx tsc --listFiles --project tsconfig.cli.json
```

### Interface Compatibility Issues

**Symptoms**: Type errors when using new interfaces

**Solutions**:

```typescript
// Use optional chaining for new methods
registry.registerServer?.("server", config, context);

// Type casting for unknown returns
const result = (await registry.executeTool("tool", args)) as ToolResult;

// Handle both legacy and new interfaces
if ("registerServer" in registry) {
  await registry.registerServer("server", config, context);
} else {
  registry.register_server("server", config);
}
```

---

## Performance Issues

### Slow Tool Execution

**Symptoms**: Tool execution taking longer than expected (>1ms target)

**Solutions**:

```bash
# Enable performance monitoring
NEUROLINK_PERFORMANCE_MONITORING=true

# Check execution statistics
npx @juspay/neurolink stats

# Optimize cache settings
NEUROLINK_CACHE_ENABLED=true
NEUROLINK_CACHE_TTL=300

# Reduce timeout for faster failures
NEUROLINK_DEFAULT_TIMEOUT=10000
```

### Pipeline Performance

**Symptoms**: Sequential pipeline execution slower than ~22ms target

**Solutions**:

```typescript
// Use parallel execution where possible
const results = await Promise.all([
  registry.executeTool("tool1", args1, context),
  registry.executeTool("tool2", args2, context),
]);

// Enable caching for repeated operations
const context: ExecutionContext = {
  cacheOptions: {
    enabled: true,
    ttl: 300,
    key: "operation-cache",
  },
};

// Use fallback options for reliability
const context: ExecutionContext = {
  fallbackOptions: {
    enabled: true,
    maxRetries: 2,
    providers: ["openai", "anthropic"],
  },
};
```

---

## Interface Migration Issues

### Property Name Errors

**Symptoms**: `Property 'session_id' does not exist` type errors

**Solutions**:

```typescript
// OLD (snake_case) - causes errors
const context = {
  session_id: "session123",
  user_id: "user456",
  ai_provider: "google",
};

// NEW (camelCase) - correct
const context: ExecutionContext = {
  sessionId: "session123",
  userId: "user456",
  aiProvider: "google",
};
```

### Method Call Issues

**Symptoms**: `Cannot call undefined method` runtime errors

**Solutions**:

```typescript
// WRONG: Direct call may fail
registry.executeTool("tool", args);

// CORRECT: Use optional chaining
registry.executeTool?.("tool", args, context);

// ALTERNATIVE: Check method exists
if (registry.executeTool) {
  const result = await registry.executeTool("tool", args, context);
}
```

### Generic Type Issues

**Symptoms**: `Type 'unknown' is not assignable` errors

**Solutions**:

```typescript
// WRONG: Unknown return type
const result = await registry.executeTool("tool", args);

// CORRECT: Use generics
const result = await registry.executeTool<MyResultType>("tool", args, context);

// ALTERNATIVE: Type assertion
const result = (await registry.executeTool("tool", args)) as MyResultType;
```

---

## Error Recovery

### Automatic Recovery

**Config Auto-Restore**:

```bash
# Check if auto-restore triggered
grep "Config restored" ~/.neurolink/logs/config.log

# Verify restored config
npx @juspay/neurolink config validate

# Manual recovery if needed
npx @juspay/neurolink config restore --backup latest
```

**Provider Fallback**:

```typescript
// Configure automatic fallback
const context: ExecutionContext = {
  fallbackOptions: {
    enabled: true,
    providers: ["google-ai", "openai", "anthropic"],
    maxRetries: 3,
    retryDelay: 1000,
  },
};
```

### Manual Recovery

**Reset to Defaults**:

```bash
# Reset all configuration
npx @juspay/neurolink config reset --confirm

# Reset specific provider
npx @juspay/neurolink config reset-provider google

# Restore from specific backup
npx @juspay/neurolink config restore --backup neurolink-config-2025-01-07T10-30-00.js
```

**If still having issues**:

1. Ensure you're using the latest version: `npm list @juspay/neurolink`
2. Clear node modules and reinstall: `rm -rf node_modules && npm install`
3. Rebuild the project: `npm run build`

---

## Enterprise Proxy Issues

### Proxy Not Working

**Symptoms**: Connection errors when `HTTPS_PROXY` is set

**Diagnosis**:

```bash
# Check proxy environment variables
echo $HTTPS_PROXY
echo $HTTP_PROXY

# Test proxy connectivity
curl -I --proxy $HTTPS_PROXY https://api.openai.com
```

**Solutions**:

1. **Verify proxy format**:

   ```bash
   # Correct format
   export HTTPS_PROXY="http://proxy.company.com:8080"

   # Not: https:// (use http:// even for HTTPS_PROXY)
   ```

2. **Check authentication**:

   ```bash
   # URL encode special characters
   export HTTPS_PROXY="http://user%40domain.com:pass%3Aword@proxy:8080"
   ```

3. **Test bypass**:

   ```bash
   # Temporarily unset proxy
   unset HTTPS_PROXY HTTP_PROXY
   npx @juspay/neurolink generate "test direct connection"
   ```

### Corporate Firewall Blocking

**Symptoms**: Network timeouts or SSL certificate errors

**Solutions**:

1. **Contact IT team** for allowlist:
   - `generativelanguage.googleapis.com` (Google AI)
   - `api.anthropic.com` (Anthropic)
   - `api.openai.com` (OpenAI)
   - `bedrock.amazonaws.com` (Bedrock)
   - `aiplatform.googleapis.com` (Vertex AI)

2. **Check SSL verification**:

   ```bash
   # Disable SSL verification (not recommended for production)
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

### Debug Proxy Connection

```bash
# Enable detailed proxy logging
export DEBUG=neurolink:proxy
npx @juspay/neurolink generate "test proxy" --debug
```

**For detailed proxy setup**, see [Enterprise & Proxy Setup Guide](../enterprise-proxy-setup.md).

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

## Testing and Validation

### Comprehensive System Test

Run this test suite to validate everything is working:

```bash
# 1. Build the system
npm run build

# 2. Test built-in tools
echo "Testing built-in tools..."
node dist/cli/index.js generate "What time is it?" --debug

# 3. Test tool discovery
echo "Testing tool discovery..."
node dist/cli/index.js generate "What tools do you have access to?" --debug

# 4. Test external server discovery
echo "Testing external server discovery..."
npx @juspay/neurolink mcp discover --format table

# 5. Test AI provider
echo "Testing AI provider..."
npx @juspay/neurolink status --verbose

# 6. Run comprehensive tests
echo "Running comprehensive tests..."
npm run test:run -- test/mcp-comprehensive.test.ts
```

**Expected Results**:

- Build: Successful compilation
- Built-in tools: Time tool returns current time
- Tool discovery: Lists 5+ built-in tools
- External discovery: Shows 58+ discovered servers
- AI provider: At least one provider available
- Tests: All MCP foundation tests pass

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug mode
export NEUROLINK_DEBUG=true

# Run commands with debug output
npx @juspay/neurolink generate "Hello" --debug
npx @juspay/neurolink mcp discover --format table
npx @juspay/neurolink status --verbose
```

---

## System Requirements

### Minimum Requirements

- **Node.js**: v18+ (recommended: v20+)
- **NPM**: v8+
- **TypeScript**: v5+ (for development)
- **Operating System**: macOS, Linux, Windows

### Recommended Setup

```bash
# Check versions
node --version    # Should be v18+
npm --version     # Should be v8+

# For development
npx tsc --version # Should be v5+
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

### Report Issues

When reporting issues, please include:

1. **System Information**:

   ```bash
   node --version
   npm --version
   npm list @juspay/neurolink
   ```

2. **Debug Output**:

   ```bash
   export NEUROLINK_DEBUG=true
   npx @juspay/neurolink status --verbose
   ```

3. **Error Logs**: Full error messages and stack traces

4. **Steps to Reproduce**: Exact commands that cause the issue

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

### Community Resources

- **GitHub Issues**: [Report bugs](https://github.com/juspay/neurolink/issues)
- **Documentation**: [Full docs](https://github.com/juspay/neurolink/docs)

---

## Additional Resources

- **[MCP Integration Guide](../mcp-integration.md)** - Complete MCP setup and usage
- **[CLI Guide](../cli-guide.md)** - Comprehensive CLI documentation
- **[API Reference](../api-reference.md)** - Complete API documentation
- **[Configuration Guide](../configuration.md)** - Environment and setup guide
- **[Cookbook Recipes](../cookbook/index.md)** - Practical solutions
- **[Error Recovery Patterns](../cookbook/error-recovery.md)** - Error handling strategies
- **[Provider Comparison](provider-comparison.md)** - Provider-specific guidance

---

**Most issues are resolved by ensuring you're using the latest version and running `npm run build` after installation.**
