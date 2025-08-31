# 🚨 NeuroLink Troubleshooting Guide

## ✅ IMPLEMENTATION STATUS: COMPLETE (2025-01-07)

**Generate Function Migration completed - Updated troubleshooting for new primary method**

- ✅ Added troubleshooting for `generate()` function
- ✅ Migration guidance for common issues
- ✅ Legacy `generate()` troubleshooting preserved
- ✅ Factory pattern error handling documented

> **Migration Note**: Most issues apply to both the new `generate()` API and the legacy `generate()` API.
> Use the new `generate()` examples for troubleshooting.

---

**Version**: v1.7.1
**Last Updated**: January 7, 2025

---

## 📖 **Overview**

This guide helps diagnose and resolve common issues with NeuroLink, including AI provider connectivity, MCP integration, CLI usage problems, and the new generate function migration.

## 🎯 **Generate Function Migration Issues**

### **Migration Questions**

**Q: Should I update my existing code to use the new `generate()` API?**
A: Optional. Your existing legacy `generate()` code continues working unchanged. Prefer the new `generate()` API for new projects.

**Q: What's the difference between the new `generate()` and the legacy `generate()`?**
A: The new `generate()` has a more extensible interface for future multi‑modal features. Both produce identical results for text generation today.

**Q: I see deprecation warnings with the legacy `generate()`**
A: These are informational only. The legacy API remains supported. To remove warnings, migrate to the new `generate()` API.

### **Migration Examples**

```typescript
// ✅ NEW: Recommended usage
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  provider: "google-ai",
});

// 📜 LEGACY: Still fully supported
const result = await neurolink.generate({
  prompt: "Your prompt",
  provider: "google-ai",
});
```

### **CLI Migration**

```bash
# ✅ NEW: Options-based API
npx @juspay/neurolink generate --prompt "Your prompt" --provider openai

# 📜 LEGACY: Positional arguments (still works, shows deprecation warning)
npx @juspay/neurolink generate "Your prompt" --provider openai
```

---

## 🔧 **MCP Integration Issues**

### **✅ Built-in Tools Not Working**

**Status**: ✅ **RESOLVED in v1.7.1**

**Previous Issue**: Time tool and other built-in tools were not loading due to circular dependencies.

**Solution Applied**:

```bash
# Fixed in v1.7.1 - built-in tools now work
node dist/cli/index.js generate "What time is it?" --debug
# Should return: "The current time is [current date and time]"
```

**If still having issues**:

---

## 🏗️ **Configuration Management Issues** (NEW v3.0)

### **Config Update Failures**

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

### **Backup System Issues**

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

### **Provider Configuration Issues**

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

## 🔧 **TypeScript Compilation Issues** (NEW v3.0)

### **Build Failures**

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

### **Interface Compatibility Issues**

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

## ⚡ **Performance Issues** (NEW v3.0)

### **Slow Tool Execution**

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

### **Pipeline Performance**

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

## 🔄 **Interface Migration Issues** (NEW v3.0)

### **Property Name Errors**

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

### **Method Call Issues**

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

### **Generic Type Issues**

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

## 🛡️ **Error Recovery** (NEW v3.0)

### **Automatic Recovery**

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

### **Manual Recovery**

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

1. Ensure you're using v1.7.1 or later: `npm list @juspay/neurolink`
2. Clear node modules and reinstall: `rm -rf node_modules && npm install`
3. Rebuild the project: `npm run build`

### **🔍 External MCP Server Discovery Issues**

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

### **🔧 External MCP Server Activation Issues**

**Status**: 🔧 **In Development** - External servers are discovered but not yet activated

**Current Behavior**: Servers show as discovered but cannot be executed directly

**Expected in Next Version (v1.8.0)**:

```bash
# Coming Soon: Direct tool execution
npx @juspay/neurolink mcp exec filesystem read_file --params '{"path": "index.md"}'
```

**Current Workaround**: Use built-in tools while external activation is developed

---

## 🔗 **LiteLLM Provider Issues**

### **LiteLLM Proxy Server Not Available**

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

### **LiteLLM Model Format Issues**

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

### **LiteLLM API Key Configuration Issues**

**Symptom**: Authentication errors when using specific models through LiteLLM

**Diagnosis**:

```bash
# Check if LiteLLM proxy has access to underlying provider API keys
curl -X POST http://localhost:4000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-4o-mini", "prompt": "test", "max_tokens": 5}'
```

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

### **LiteLLM Connection Timeout Issues**

**Symptom**: Requests to LiteLLM proxy timing out

**Diagnosis**:

```bash
# Test proxy response time
time curl http://localhost:4000/health

# Check proxy logs for performance issues
```

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

3. **Check System Resources**:

   ```bash
   # Monitor system resources during LiteLLM usage
   htop

   # Check available memory
   free -h
   ```

### **LiteLLM Provider Selection Issues**

**Symptom**: LiteLLM not included in auto-provider selection

**Diagnosis**:

```bash
# Check if LiteLLM is available
npx @juspay/neurolink status --verbose | grep litellm

# Test LiteLLM specific generation
npx @juspay/neurolink generate "Hello" --provider litellm --debug
```

**Solutions**:

1. **Ensure LiteLLM Service is Running**:

   ```bash
   # Check proxy health before using auto-selection
   curl http://localhost:4000/health

   # If healthy, LiteLLM should be included in auto-selection
   npx @juspay/neurolink generate "Hello" --debug
   ```

2. **Force LiteLLM Provider**:

   ```bash
   # Explicitly use LiteLLM when auto-selection fails
   npx @juspay/neurolink generate "Hello" --provider litellm
   ```

3. **Check Provider Priority**:

   ```typescript
   // In your code, you can set provider preferences
   const provider = await AIProviderFactory.createProvider("litellm");

   // Or use with fallback
   const { primary, fallback } = AIProviderFactory.createProviderWithFallback(
     "litellm",
     "openai",
   );
   ```

### **LiteLLM Debugging**

**Enable Debug Mode**:

```bash
# Enable NeuroLink debug output
export NEUROLINK_DEBUG=true

# Test LiteLLM with debug info
npx @juspay/neurolink generate "Hello" --provider litellm --debug

# Enable LiteLLM proxy debug mode
litellm --port 4000 --debug
```

**Check LiteLLM Logs**:

```bash
# LiteLLM proxy shows request/response logs
# Monitor the terminal where you started `litellm --port 4000`

# Check curl responses for detailed error info
curl -v http://localhost:4000/health
```

**Common LiteLLM Error Messages**:

- `ECONNREFUSED`: LiteLLM proxy not running
- `Model not found`: Invalid model format or model not configured
- `Authentication failed`: Underlying provider API keys not set
- `Timeout`: Proxy taking too long to respond

---

## 🤖 **AI Provider Issues**

### **Provider Authentication Errors**

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

3. **Multiple Provider Setup**:

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

### **Provider Selection Issues**

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

## 🖥️ **CLI Issues**

### **Command Not Found**

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

### **Build Issues**

**Symptom**: CLI commands failing or TypeScript errors

**Diagnosis**:

```bash
# Check build status
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

**Solutions**:

### **Model Parameter Not Working**

**Symptom**: CLI `--model` parameter is ignored, always uses default model

**Example Issue**:

```bash
# Command specifies model but output shows default model being used
node dist/cli/index.js generate "test" --provider google-ai --model gemini-2.5-flash
# Output shows: modelName: 'gemini-2.5-pro' (default instead of specified)
```

**Status**: ✅ **FIXED in latest version**

**Solution**: Update to latest version where model parameter fix has been applied.

**Verification**:

```bash
# Test that model parameter works correctly
node dist/cli/index.js generate "what is deepest you can think?" --provider google-ai --model gemini-2.5-flash --debug
# Should show: modelName: 'gemini-2.5-flash' in debug output
```

**Available Models for Google AI**:

- `gemini-2.5-flash` - Fast, efficient responses
- `gemini-2.5-pro` - Comprehensive, detailed responses

**Build Issue Solutions**:

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

## 🧪 **Testing and Validation**

### **Comprehensive System Test**

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

- ✅ Build: Successful compilation
- ✅ Built-in tools: Time tool returns current time
- ✅ Tool discovery: Lists 5+ built-in tools
- ✅ External discovery: Shows 58+ discovered servers
- ✅ AI provider: At least one provider available
- ✅ Tests: All MCP foundation tests pass

### **Debug Mode**

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

## 📊 **System Requirements**

### **Minimum Requirements**

- **Node.js**: v18+ (recommended: v20+)
- **NPM**: v8+
- **TypeScript**: v5+ (for development)
- **Operating System**: macOS, Linux, Windows

### **Recommended Setup**

```bash
# Check versions
node --version    # Should be v18+
npm --version     # Should be v8+

# For development
npx tsc --version # Should be v5+
```

---

## 🆘 **Getting Help**

### **Quick Diagnostics**

```bash
# System status
npx @juspay/neurolink status --verbose

# MCP status
npx @juspay/neurolink mcp discover --format table

# Debug output
export NEUROLINK_DEBUG=true
npx @juspay/neurolink generate "Test" --debug
```

### **Report Issues**

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

### **Community Support**

- **GitHub Issues**: [https://github.com/juspay/neurolink/issues](https://github.com/juspay/neurolink/issues)
- **Documentation**: [https://github.com/juspay/neurolink/docs](https://github.com/juspay/neurolink/docs)

---

## 🏢 **Enterprise Proxy Issues**

### **Proxy Not Working**

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

### **Corporate Firewall Blocking**

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

### **Debug Proxy Connection**

```bash
# Enable detailed proxy logging
export DEBUG=neurolink:proxy
npx @juspay/neurolink generate "test proxy" --debug
```

**For detailed proxy setup** → See [Enterprise & Proxy Setup Guide](ENTERPRISE-PROXY-SETUP.md)

---

## 🚀 **SageMaker Provider Issues**

### **Common SageMaker Errors**

#### **"Endpoint not found" Error**

```bash
# Symptoms
Error: The endpoint 'my-endpoint' was not found.

# Solutions
1. Check endpoint exists in SageMaker console
2. Verify endpoint is in 'InService' status
3. Check AWS region matches endpoint region
```

#### **"Access denied" Error**

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

#### **"Model not loading" Error**

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

### **SageMaker Configuration Issues**

#### **Invalid AWS Credentials**

```bash
# Check configuration
npx @juspay/neurolink sagemaker config

# Set required variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export SAGEMAKER_DEFAULT_ENDPOINT="your-endpoint-name"
```

#### **Timeout Issues**

```bash
# Increase timeout for large models
export SAGEMAKER_TIMEOUT="60000"  # 60 seconds

# Use in CLI
npx @juspay/neurolink generate "complex task" --provider sagemaker --timeout 60s
```

### **SageMaker Debug Mode**

```bash
# Enable debug output
export NEUROLINK_DEBUG=true
npx @juspay/neurolink generate "test" --provider sagemaker --debug

# SageMaker-specific debugging
export SAGEMAKER_DEBUG=true
npx @juspay/neurolink sagemaker status --verbose
```

### **SageMaker CLI Commands**

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

## 📚 **Additional Resources**

- **[MCP Integration Guide](./MCP-INTEGRATION.md)** - Complete MCP setup and usage
- **[CLI Guide](./CLI-GUIDE.md)** - Comprehensive CLI documentation
- **[API Reference](./API-REFERENCE.md)** - Complete API documentation
- **[Configuration Guide](./CONFIGURATION.md)** - Environment and setup guide

---

**💡 Most issues are resolved by ensuring you're using v1.7.1+ and running `npm run build` after installation.**
