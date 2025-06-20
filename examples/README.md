# 📚 NeuroLink Examples

This directory contains practical examples demonstrating NeuroLink's capabilities.

## 🚀 **Quick Start Examples**

### **Basic Usage**

- `basic-usage.js` - Simple text generation and provider selection
- `environment-setup.js` - Setting up API keys and configuration

### **MCP Integration (v1.7.1)**

- `mcp-built-in-tools.js` - Using built-in tools (time, utilities)
- `mcp-discovery.js` - Discovering external MCP servers
- `mcp-testing.js` - Testing and validation examples

### **CLI Examples**

- `cli-examples.sh` - Common CLI usage patterns
- `cli-batch-processing.sh` - Batch processing examples

### **SDK Integration**

- `sdk-basic.ts` - TypeScript SDK usage
- `sdk-advanced.ts` - Advanced provider configuration
- `sdk-streaming.ts` - Streaming responses

## 🛠️ **Running Examples**

### **Prerequisites**

```bash
# Install NeuroLink
npm install @juspay/neurolink

# Set up environment (choose one)
export GOOGLE_AI_API_KEY="AIza-your-key"  # Recommended for free tier
export OPENAI_API_KEY="sk-your-key"
```

### **Run Examples**

```bash
# CLI examples
bash examples/cli-examples.sh

# Node.js examples
node examples/basic-usage.js
node examples/mcp-built-in-tools.js

# TypeScript examples (after building)
npm run build
node dist/examples/sdk-basic.js
```

## ✅ **Current Working Features (v1.7.1)**

### **✅ Built-in Tools**

- Time tool - Returns current time in human-readable format
- System utilities - Built-in calculations and formatting
- Tool discovery - Lists available tools

### **✅ External Discovery**

- 58+ external MCP servers discovered
- Cross-platform discovery (macOS, Linux, Windows)
- All major AI tools supported (VS Code, Claude, Cursor, etc.)

### **🔧 In Development**

- External server activation
- Direct external tool execution
- Advanced tool workflows

## 🎯 **Example Categories**

| Category           | Status     | Description                               |
| ------------------ | ---------- | ----------------------------------------- |
| Basic Usage        | ✅ Ready   | Simple text generation and provider setup |
| Built-in Tools     | ✅ Working | MCP built-in tool examples                |
| External Discovery | ✅ Working | MCP server discovery examples             |
| CLI Usage          | ✅ Ready   | Command-line interface examples           |
| SDK Integration    | ✅ Ready   | TypeScript/JavaScript SDK examples        |
| External Tools     | 🔧 Coming  | Direct external tool execution (v1.8.0)   |

---

**🚀 Start with `basic-usage.js` and `mcp-built-in-tools.js` to see NeuroLink in action!**
