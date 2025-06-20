# 🚨 NeuroLink Troubleshooting Guide

**Version**: v1.7.1
**Last Updated**: December 18, 2024

---

## 📖 **Overview**

This guide helps diagnose and resolve common issues with NeuroLink, including AI provider connectivity, MCP integration, and CLI usage problems.

---

## 🔧 **MCP Integration Issues**

### **✅ Built-in Tools Not Working**

**Status**: ✅ **RESOLVED in v1.7.1**

**Previous Issue**: Time tool and other built-in tools were not loading due to circular dependencies.

**Solution Applied**:

```bash
# Fixed in v1.7.1 - built-in tools now work
node dist/cli/index.js generate-text "What time is it?" --debug
# Should return: "The current time is [current date and time]"
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
npx neurolink mcp discover --format table
# Should show 58+ discovered servers

# Check discovery with debug info
npx neurolink mcp discover --format json | jq '.servers | length'
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
   npx neurolink mcp discover --format json > discovery.json
   # Review discovery.json for parsing errors
   ```

3. **Discovery Errors**:
   ```bash
   # Enable debug mode
   export NEUROLINK_DEBUG=true
   npx neurolink mcp discover --format table
   ```

### **🔧 External MCP Server Activation Issues**

**Status**: 🔧 **In Development** - External servers are discovered but not yet activated

**Current Behavior**: Servers show as discovered but cannot be executed directly

**Expected in Next Version (v1.8.0)**:

```bash
# Coming Soon: Direct tool execution
npx neurolink mcp exec filesystem read_file --params '{"path": "README.md"}'
```

**Current Workaround**: Use built-in tools while external activation is developed

---

## 🤖 **AI Provider Issues**

### **Provider Authentication Errors**

**Symptom**: "Authentication failed" or "Invalid API key" errors

**Diagnosis**:

```bash
# Check provider status
npx neurolink status --verbose
```

**Solutions**:

1. **OpenAI Issues**:

   ```bash
   # Set API key
   export OPENAI_API_KEY="sk-your-openai-api-key"

   # Test connection
   npx neurolink generate-text "Hello" --provider openai
   ```

2. **Google AI Studio Issues**:

   ```bash
   # Set API key (recommended for free tier)
   export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"

   # Test connection
   npx neurolink generate-text "Hello" --provider google-ai
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
   npx neurolink generate-text "Hello"
   ```

### **Provider Selection Issues**

**Symptom**: Wrong provider selected or fallback not working

**Diagnosis**:

```bash
# Check available providers
npx neurolink status

# Test specific provider
npx neurolink generate-text "Hello" --provider google-ai --debug
```

**Solutions**:

1. **Force Specific Provider**:

   ```bash
   npx neurolink generate-text "Hello" --provider openai
   ```

2. **Check Fallback Logic**:
   ```bash
   # This should automatically select best available provider
   npx neurolink generate-text "Hello" --debug
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
   npx neurolink --help
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
node dist/cli/index.js generate-text "What time is it?" --debug

# 3. Test tool discovery
echo "Testing tool discovery..."
node dist/cli/index.js generate-text "What tools do you have access to?" --debug

# 4. Test external server discovery
echo "Testing external server discovery..."
npx neurolink mcp discover --format table

# 5. Test AI provider
echo "Testing AI provider..."
npx neurolink status --verbose

# 6. Run comprehensive tests
echo "Running comprehensive tests..."
npm run test:run -- src/test/mcp-comprehensive.test.ts
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
npx neurolink generate-text "Hello" --debug
npx neurolink mcp discover --format table
npx neurolink status --verbose
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
npx neurolink status --verbose

# MCP status
npx neurolink mcp discover --format table

# Debug output
export NEUROLINK_DEBUG=true
npx neurolink generate-text "Test" --debug
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
   npx neurolink status --verbose
   ```

3. **Error Logs**: Full error messages and stack traces

4. **Steps to Reproduce**: Exact commands that cause the issue

### **Community Support**

- **GitHub Issues**: [https://github.com/juspay/neurolink/issues](https://github.com/juspay/neurolink/issues)
- **Documentation**: [https://github.com/juspay/neurolink/docs](https://github.com/juspay/neurolink/docs)

---

## 📚 **Additional Resources**

- **[MCP Integration Guide](./MCP-INTEGRATION.md)** - Complete MCP setup and usage
- **[CLI Guide](./CLI-GUIDE.md)** - Comprehensive CLI documentation
- **[API Reference](./API-REFERENCE.md)** - Complete API documentation
- **[Configuration Guide](./CONFIGURATION.md)** - Environment and setup guide

---

**💡 Most issues are resolved by ensuring you're using v1.7.1+ and running `npm run build` after installation.**
