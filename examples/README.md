# 📚 NeuroLink Examples

## ✅ IMPLEMENTATION STATUS: COMPLETE (2025-01-07)

**Generate Function Migration completed - Examples updated with new primary method**

- ✅ All examples now show `generate()` as primary method
- ✅ Legacy examples preserved for compatibility
- ✅ Factory pattern benefits demonstrated
- ✅ Migration guidance included

> **Migration Note**: Examples now demonstrate `generate()` as the primary function.
> Legacy `generate()` examples remain for backward compatibility reference.

---

This directory contains practical examples demonstrating NeuroLink's capabilities.

## 🎯 **Generate Function Examples (NEW PRIMARY)**

### **Basic Generate Usage**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NEW: Primary method (recommended)
const result = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "google-ai",
  temperature: 0.7,
});

// Alternative syntax (also supported)
const alternativeResult = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "google-ai",
  temperature: 0.7,
});

// LiteLLM proxy - Access 100+ models through unified interface
const litellmResult = await neurolink.generate({
  input: { text: "Explain machine learning" },
  provider: "litellm",
  model: "openai/gpt-4o",
  temperature: 0.7,
});

// Access different providers through LiteLLM
const claudeResult = await neurolink.generate({
  input: { text: "Write a technical summary" },
  provider: "litellm",
  model: "anthropic/claude-3-5-sonnet",
  temperature: 0.5,
});
```

## � **Enhanced Examples: Developer Experience 2.0** (June 22, 2025)

**NEW AUTOMATION EXAMPLES**: Complete enterprise automation workflows with 9 systems and 72+ commands!

## �🚀 **Quick Start Examples**

### **Developer Experience Automation (NEW v2.0)**

- `automation-setup.js` - Complete project setup automation
- `adaptive-testing.js` - Intelligent test selection examples
- `environment-automation.js` - Safe .env management and backup
- `build-pipeline.js` - 7-phase enterprise build system
- `health-monitoring.js` - System health and performance monitoring

### **Basic Usage**

- `basic-usage.js` - Simple text generation and provider selection
- `environment-setup.js` - Setting up API keys and configuration
- `timeout-usage.js` - Timeout configuration and error handling (NEW v1.12.0)

### **MCP Integration (v4.0.0)**

- `mcp-built-in-tools.js` - Using built-in tools (time, utilities)
- `mcp-discovery.js` - Discovering external MCP servers
- `mcp-testing.js` - Testing and validation examples
- **`dynamic-mcp-servers.js`** - 🆕 **NEW!** Programmatic MCP server management

### **CLI Examples**

- `cli-examples.sh` - Common CLI usage patterns
- `cli-batch-processing.sh` - Batch processing examples

### **SDK Integration**

- `sdk-basic.ts` - TypeScript SDK usage
- `sdk-advanced.ts` - Advanced provider configuration
- `sdk-streaming.ts` - Streaming responses

## 📊 **Multimodal Analysis Examples**

### **Document Processing**

- `pdf-analysis.ts` - Comprehensive PDF processing and analysis
- `csv-analysis.ts` - CSV data analysis and insights
- `video-analysis.ts` - **🆕 NEW!** Video processing with frame extraction and audio transcription

### **Video Analysis Features**

The `video-analysis.ts` example demonstrates:

- **Frame-based processing** (OpenAI, Anthropic): Extracts frames from video
- **Native video upload** (Gemini): Direct video processing without frame extraction
- **Audio transcription**: Extract and transcribe audio tracks
- **Custom frame extraction**: Control frame count (default: 8) and quality (default: 85%)
- **Multiple video comparison**: Analyze and compare multiple videos
- **Streaming support**: Get faster initial results
- **Best practices**: Optimization tips for different video lengths and use cases

Run with:

```bash
npx tsx examples/video-analysis.ts
```

## 🛠️ **Running Examples**

### **Prerequisites**

```bash
# Install NeuroLink
npm install @juspay/neurolink

# Set up environment (choose one)
export GOOGLE_AI_API_KEY="AIza-your-key"  # Recommended for free tier
export OPENAI_API_KEY="sk-your-key"
export LITELLM_BASE_URL="http://localhost:4000"  # LiteLLM proxy (100+ models)
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

## 🚀 **LiteLLM Setup (100+ Models)**

LiteLLM provides unified access to 100+ AI models through a proxy server:

```bash
# Install LiteLLM
pip install litellm

# Start proxy server
litellm --port 4000

# Set environment variable
export LITELLM_BASE_URL="http://localhost:4000"
```

**Example Usage:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Use any model through LiteLLM proxy
const result = await neurolink.generate({
  input: { text: "Compare GPT-4 vs Claude" },
  provider: "litellm",
  model: "openai/gpt-4o", // or "anthropic/claude-3-5-sonnet"
});
```

## 🎯 **Example Categories**

| Category           | Status     | Description                               |
| ------------------ | ---------- | ----------------------------------------- |
| Basic Usage        | ✅ Ready   | Simple text generation and provider setup |
| Built-in Tools     | ✅ Working | MCP built-in tool examples                |
| External Discovery | ✅ Working | MCP server discovery examples             |
| CLI Usage          | ✅ Ready   | Command-line interface examples           |
| SDK Integration    | ✅ Ready   | TypeScript/JavaScript SDK examples        |
| Multimodal         | ✅ Ready   | PDF, CSV, and Video analysis examples     |
| External Tools     | 🔧 Coming  | Direct external tool execution (v1.8.0)   |

---

**🚀 Start with `basic-usage.js` and `mcp-built-in-tools.js` to see NeuroLink in action!**
