# 🖥️ NeuroLink CLI Guide

## Command-Line Philosophy

The NeuroLink CLI is designed with the developer experience in mind. Our goal is to provide a tool that is not only powerful and flexible but also a pleasure to use. Here are the core principles that guide our design:

- **Clear and Consistent Commands:** We use a clear and consistent command structure to make the CLI easy to learn and use. All commands follow a logical `verb-noun` structure (e.g., `neurolink generate`, `neurolink models list`).

- **Human-Readable and Machine-Readable Output:** The CLI provides both human-readable text output and machine-readable JSON output. This makes it easy to use the CLI both interactively and in automated scripts.

- **Smart Defaults:** We provide smart defaults for all commands, so you can get started quickly without having to configure everything upfront.

- **Great Developer Experience:** We use animated spinners, colorized output, and helpful error messages to provide a great developer experience.

The NeuroLink CLI provides all SDK functionality through an elegant command-line interface with professional UX features.

## Installation & Usage

### Option 1: NPX (No Installation Required)

```bash
# Use directly without installation
npx @juspay/neurolink --help
npx @juspay/neurolink generate "Hello, AI!"
npx @juspay/neurolink status
```

### Option 2: Global Installation

```bash
# Install globally for convenient access
npm install -g @juspay/neurolink

# Then use anywhere
neurolink --help
neurolink generate "Write a haiku about programming"
neurolink status --verbose
```

### Option 3: Local Project Usage

```bash
# Add to project and use via npm scripts
npm install @juspay/neurolink
npx neurolink generate "Explain TypeScript"
```

## Commands Reference

### `generate <prompt>` - Core Text Generation (Recommended)

Generate AI content with customizable parameters. Prepared for multimodal support.

```bash
# Basic text generation
npx @juspay/neurolink generate "Explain quantum computing"

# With provider and model selection
npx @juspay/neurolink generate "what is deepest you can think?" --provider google-ai --model gemini-2.5-flash

# With different model for detailed responses
npx @juspay/neurolink generate "Write a comprehensive analysis" --provider google-ai --model gemini-2.5-pro

# With temperature control
npx @juspay/neurolink generate "Creative writing" --temperature 0.9

# With system prompt
npx @juspay/neurolink generate "Write code" --system "You are a senior developer"

# JSON output for scripting and automation
npx @juspay/neurolink generate "Summary of AI" --format json
npx @juspay/neurolink gen "Create product specification" --format json --provider google-ai

# JSON Output Example:
{
  "content": "AI (Artificial Intelligence) represents a transformative technology...",
  "provider": "google-ai",
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 12,
    "completionTokens": 156,
    "totalTokens": 168
  },
  "responseTime": 987
}

# Parse JSON in shell scripts
response=$(npx @juspay/neurolink gen "Generate greeting" --format json)
content=$(echo "$response" | jq -r '.content')
echo "AI says: $content"

# Debug mode with detailed metadata
npx @juspay/neurolink generate "Hello AI" --debug
```

### `gen <prompt>` - Shortest Form

Quick command alias for fast usage.

```bash
# Basic generation (shortest)
npx @juspay/neurolink gen "Explain quantum computing"

# With provider and model
npx @juspay/neurolink gen "what is deepest you can think?" --provider google-ai --model gemini-2.5-flash

# With different model for comprehensive responses
npx @juspay/neurolink gen "Analyze this problem" --provider google-ai --model gemini-2.5-pro
```

**Available Options:**

- `--provider <name>` - Choose specific provider or 'auto' (default: auto)
- `--temperature <number>` - Creativity level 0.0-1.0 (default: 0.7)
- `--maxTokens <number>` - Maximum tokens to generate (default: 1000)
- `--system <text>` - System prompt to guide AI behavior
- `--format <type>` - Output format: 'text', 'json', or 'table' (default: text)
- `--debug` - Enable debug mode with verbose output and metadata
- `--timeout <number>` - Request timeout in seconds (default: 120)
- `--quiet` - Suppress spinners and progress indicators
- `--enableAnalytics` - Enable usage analytics collection (Phase 3 feature)
- `--enableEvaluation` - Enable AI response quality evaluation (Phase 3 feature)
- `--evaluationDomain <text>` - Domain expertise for evaluation context (e.g., "Senior Software Architect")
- `--context <json>` - JSON context object for custom data (e.g., '{"userId":"123","project":"api-design"}')
- `--disableTools` - Disable MCP tool integration (tools enabled by default)

**Output Example:**

```
🤖 Generating text...
✅ Text generated successfully!
Quantum computing represents a revolutionary approach to information processing...
ℹ️  127 tokens used
```

**Debug Mode Output:**

```
🤖 Generating text...
✅ Text generated successfully!

Quantum computing represents a revolutionary approach to information processing...

{
  "provider": "openai",
  "usage": {
    "promptTokens": 15,
    "completionTokens": 127,
    "totalTokens": 142
  },
  "responseTime": 1234
}
ℹ️  142 tokens used
```

### 🆕 Phase 3 Enhanced Features Examples

```bash
# Analytics Collection (Phase 3.1 Complete)
npx @juspay/neurolink generate "Explain machine learning" --enableAnalytics --debug

# Response Quality Evaluation (Phase 3.1 Complete)
npx @juspay/neurolink generate "Write Python code for prime numbers" --enableEvaluation --debug

# Combined Analytics + Evaluation
npx @juspay/neurolink generate "Design a REST API" --enableAnalytics --enableEvaluation --debug

# Domain-specific Evaluation Context
npx @juspay/neurolink generate "Debug this code issue" --enableEvaluation --evaluationDomain "Senior Software Engineer" --debug

# Custom Context for Analytics
npx @juspay/neurolink generate "Help with project" --context '{"userId":"123","project":"AI-platform"}' --enableAnalytics --debug
```

**Phase 3 Analytics Output Example:**

```
📊 Analytics:
   Provider: google-ai
   Tokens: 434 input + 127 output = 561 total
   Cost: $0.00042
   Time: 1.2s
   Tools: getCurrentTime, writeFile

📊 Response Evaluation:
   Relevance: 10/10
   Accuracy: 9/10
   Completeness: 9/10
   Overall: 9/10
   Reasoning: Response directly addresses the request with accurate code implementation.
             Includes comprehensive examples and error handling. Minor improvement
             could be adding more edge case documentation.
```

### `stream <prompt>` - Real-time Streaming

Stream AI generation in real-time with optional agent support.

```bash
# Basic streaming
npx @juspay/neurolink stream "Tell me a story"

# With specific provider
npx @juspay/neurolink stream "Tell me a story" --provider openai

# With agent tool support (default - AI can use tools)
npx @juspay/neurolink stream "What time is it?" --provider google-ai

# Without tools (traditional text-only mode)
npx @juspay/neurolink stream "Tell me a story" --disableTools

# Debug mode with tool execution logging
npx @juspay/neurolink stream "What time is it?" --debug

# Temperature control for creative streaming
npx @juspay/neurolink stream "Write a poem" --temperature 0.9

# Real Streaming with Analytics (Phase 3.2B Complete)
npx @juspay/neurolink stream "Explain quantum computing" --enableAnalytics --enableEvaluation --debug

# With custom timeout for long streaming operations
npx @juspay/neurolink stream "Write a long story" --timeout 120

# Quiet mode with timeout
npx @juspay/neurolink stream "Hello world" --quiet --timeout 10s
```

**Available Options:**

- `--provider <name>` - Choose specific provider or 'auto' (default: auto)
- `--temperature <number>` - Creativity level 0.0-1.0 (default: 0.7)
- `--debug` - Enable debug mode with interleaved logging
- `--quiet` - Suppress progress messages and status updates
- `--timeout <duration>` - Request timeout (default: 2m for streaming). Accepts: '30s', '2m', '5000' (ms), '1h'
- `--disable-tools` - Disable agent tool support for text-only mode

**Output Example:**

```
🔄 Streaming from auto provider...

Once upon a time, in a world where technology had advanced beyond...
[text streams in real-time as it's generated]
```

**Debug Mode Output:**

```
🔄 Streaming from openai provider with debug logging...

Once upon a time[DEBUG: chunk received, 15 chars]
, in a world where technology[DEBUG: chunk received, 25 chars]
...
[text streams with interleaved debug information]
```

### `batch <file>` - Process Multiple Prompts

Process multiple prompts from a file efficiently with progress tracking.

```bash
# Create a file with prompts (one per line)
echo -e "Write a haiku\nExplain gravity\nDescribe the ocean" > prompts.txt

# Process all prompts
neurolink batch prompts.txt

# Save results to JSON file
neurolink batch prompts.txt --output results.json

# Add delay between requests (rate limiting)
neurolink batch prompts.txt --delay 2000

# With custom timeout per request
neurolink batch prompts.txt --timeout 45s

# Process with specific provider and timeout
neurolink batch prompts.txt --provider openai --timeout 1m --output results.json
```

**Output Example:**

```
📦 Processing 3 prompts...

✅ 1/3 completed
✅ 2/3 completed
✅ 3/3 completed
✅ Results saved to results.json
```

### `models` - Dynamic Model Management

The dynamic model system provides intelligent model selection and cost optimization.

```bash
# List all available models with pricing
neurolink models list

# Search models by capability
neurolink models search --capability functionCalling
neurolink models search --capability vision --max-price 0.001

# Get best model for specific use case
neurolink models best --use-case coding
neurolink models best --use-case vision
neurolink models best --use-case cheapest

# Resolve model aliases
neurolink models resolve anthropic claude-latest
neurolink models resolve google fastest

# Show model configuration server status
neurolink models server-status

# Test model parameter support
node dist/cli/index.js generate "what is deepest you can think?" --provider google-ai --model gemini-2.5-flash
node dist/cli/index.js generate "Analyze this complex problem" --provider google-ai --model gemini-2.5-pro
```

**Available Options:**

- `--capability <feature>` - Filter by capability (functionCalling, vision, code-execution)
- `--max-price <amount>` - Maximum price per 1K input tokens
- `--provider <name>` - Filter by specific provider
- `--exclude-deprecated` - Exclude deprecated models
- `--format <type>` - Output format: 'table', 'json', 'csv' (default: table)
- `--optimize-cost` - Automatically select cheapest suitable model
- `--use-case <type>` - Find best model for: coding, analysis, vision, fastest, cheapest

**Example Output:**

```
📊 Dynamic Model Inventory (Auto-Updated)

┌─────────────┬──────────────────────┬────────────┬─────────────────────────────────┬──────────────┐
│ Provider    │ Model                │ Input Cost │ Capabilities                    │ Status       │
├─────────────┼──────────────────────┼────────────┼─────────────────────────────────┼──────────────┤
│ google      │ gemini-2.0-flash     │ $0.000075  │ functionCalling, vision, code  │ ✅ Active    │
│ openai      │ gpt-4o-mini          │ $0.000150  │ functionCalling, json-mode     │ ✅ Active    │
│ anthropic   │ claude-3-haiku       │ $0.000250  │ functionCalling                │ ✅ Active    │
│ anthropic   │ claude-3-sonnet      │ $0.003000  │ functionCalling, vision        │ ✅ Active    │
│ openai      │ gpt-4o               │ $0.005000  │ functionCalling, vision        │ ✅ Active    │
│ anthropic   │ claude-3-opus        │ $0.015000  │ functionCalling, vision, analysis │ ✅ Active │
│ openai      │ gpt-4-turbo          │ $0.010000  │ functionCalling, vision        │ ❌ Deprecated │
└─────────────┴──────────────────────┴────────────┴─────────────────────────────────┴──────────────┘

💰 Cost Range: $0.000075 - $0.015000 per 1K tokens (200x difference)
🔍 Capabilities: 9 functionCalling, 7 vision, 1 code-execution
⚡ Cheapest: google/gemini-2.0-flash
🏆 Most Capable: anthropic/claude-3-opus
```

### `status` - Provider Diagnostics

Check the health and connectivity of all configured AI providers. This now includes authentication and model availability checks.

```bash
# Check all provider connectivity
neurolink status

# Verbose output with detailed information
neurolink status --verbose
```

**Output Example:**

```
🔍 Checking AI provider status...

✅ openai: ✅ Working (234ms)
✅ bedrock: ✅ Working (456ms)
❌ vertex: ❌ Authentication failed

📊 Summary: 2/3 providers working
```

### `get-best-provider` - Auto-selection Testing

Test which provider would be automatically selected.

```bash
# Test which provider would be auto-selected
neurolink get-best-provider

# Debug mode with selection reasoning
neurolink get-best-provider --debug
```

**Available Options:**

- `--debug` - Show selection logic and reasoning

**Output Example:**

```
🎯 Finding best provider...
✅ Best provider: bedrock
```

**Debug Mode Output:**

```
🎯 Finding best provider...
✅ Best provider selected: openai

Best available provider: openai
Selection based on: availability, performance, and configuration
```

### `provider` - Provider Management Commands

Comprehensive provider management and diagnostics.

#### `provider status` - Detailed Provider Status

```bash
# Check all provider connectivity
neurolink provider status

# Verbose output with detailed information
neurolink provider status --verbose
```

#### `provider list` - List Available Providers

```bash
# List all supported providers
neurolink provider list
```

**Output Example:**

```
Available providers: openai, bedrock, vertex, anthropic, azure, google-ai, huggingface, ollama, mistral
```

#### `provider configure <provider>` - Configuration Help

```bash
# Get configuration guidance for specific provider
neurolink provider configure openai
neurolink provider configure bedrock
neurolink provider configure vertex
neurolink provider configure google-ai
```

**For detailed setup instructions** → See [Provider Configuration Guide](./getting-started/provider-setup.md)

**Output Example:**

```
🔧 Configuration guidance for openai:
💡 Set relevant environment variables for API keys and other settings.
   Refer to the documentation for details: https://github.com/juspay/neurolink#configuration
```

### `config` - Configuration Management Commands

Manage NeuroLink configuration settings and preferences.

#### `config setup` - Interactive Setup

```bash
# Run interactive configuration setup
neurolink config setup

# Alias for setup
neurolink config init
```

#### `config show` - Display Current Configuration

```bash
# Show current NeuroLink configuration
neurolink config show
```

#### `config set <key> <value>` - Set Configuration Values

```bash
# Set configuration key-value pairs
neurolink config set provider openai
neurolink config set temperature 0.8
neurolink config set max-tokens 1000
```

#### `config import <file>` - Import Configuration

```bash
# Import configuration from JSON file
neurolink config import my-config.json
```

#### `config export <file>` - Export Configuration

```bash
# Export current configuration to file
neurolink config export backup-config.json
```

#### `config validate` - Validate Configuration

```bash
# Validate current configuration settings
neurolink config validate
```

#### `config reset` - Reset to Defaults

```bash
# Reset configuration to default values
neurolink config reset
```

**Available Options:**

- `--format <type>` - Output format: `table` (default), `json`, `yaml`, `summary`
- `--include-inactive` - Include servers that may not be currently active
- `--preferred-tools <tools>` - Prioritize specific tools (comma-separated)
- `--workspace-only` - Search only workspace/project configurations
- `--global-only` - Search only global configurations

**Output Example:**

```
🔍 NeuroLink MCP Server Discovery
✔ Discovery completed!

📋 Found 29 MCP servers:
────────────────────────────────────────

1. 🤖 kite
   Title: kite
   Source: Claude Desktop (global)
   Command: bash -c source ~/.nvm/nvm.sh && nvm exec 20 npx mcp-remote https://mcp.kite.trade/sse

2. 🔧 github.com/modelcontextprotocol/servers/tree/main/src/puppeteer
   Title: github.com/modelcontextprotocol/servers/tree/main/src/puppeteer
   Source: Cline AI Coder (global)
   Command: npx -y @modelcontextprotocol/server-puppeteer

📊 Discovery Statistics:
   Execution time: 15ms
   Config files found: 5
   Servers discovered: 29
   Duplicates removed: 0

🎯 Search Sources:
   🤖 Claude Desktop: 1 location(s)
   🏄 Windsurf: 1 location(s)
   📝 VS Code: 1 location(s)
   🔧 Cline AI Coder: 1 location(s)
   ⚙️ Generic: 1 location(s)
```

**Supported Tools & Platforms:**

✅ **Claude Desktop** - Global configuration discovery
✅ **VS Code** - Global and workspace configurations
✅ **Cursor** - Global and project configurations
✅ **Windsurf (Codeium)** - Global configuration discovery
✅ **Cline AI Coder** - Extension globalStorage discovery
✅ **Continue Dev** - Global configuration discovery
✅ **Aider** - Global configuration discovery
✅ **Generic Configs** - Project-level MCP configurations

**Resilient JSON Parser:**

The discovery system includes a sophisticated JSON parser that handles common configuration file issues:

✅ **Trailing Commas** - Automatically removes trailing commas
✅ **JavaScript Comments** - Strips `//` and `/* */` comments
✅ **Control Characters** - Fixes unescaped control characters
✅ **Unquoted Keys** - Adds missing quotes to object keys
✅ **Non-printable Characters** - Sanitizes problematic characters
✅ **Multiple Repair Strategies** - Three-stage repair with graceful fallback

### `discover` - Auto-Discover MCP Servers

Automatically discover MCP server configurations from all major AI development tools on your system.

```bash
# Basic discovery with table output
neurolink discover

# Different output formats
neurolink discover --format table
neurolink discover --format json
neurolink discover --format yaml
neurolink discover --format summary
```

**Options:**

- `--format <type>` - Output format: table, json, yaml, summary (default: table)
- `--include-inactive` - Include servers that may not be currently active
- `--preferred-tools <tools>` - Prioritize specific tools (comma-separated)
- `--workspace-only` - Search only workspace/project configurations
- `--global-only` - Search only global configurations

**Output Example:**

```
🔍 NeuroLink MCP Server Discovery
✔ Discovery completed!

📋 Found 29 MCP servers:
────────────────────────────────────────
1. 🤖 kite
   Title: kite
   Source: Claude Desktop (global)
   Command: bash -c source ~/.nvm/nvm.sh && nvm exec 20 npx mcp-remote https://mcp.kite.trade/sse

2. 🔧 github.com/modelcontextprotocol/servers/tree/main/src/puppeteer
   Title: github.com/modelcontextprotocol/servers/tree/main/src/puppeteer
   Source: Cline AI Coder (global)
   Command: npx -y @modelcontextprotocol/server-puppeteer

📊 Discovery Statistics:
   Execution time: 15ms
   Config files found: 5
   Servers discovered: 29
   Duplicates removed: 0
```

### `mcp` - Model Context Protocol Integration

Manage external MCP servers for extended functionality. Connect to filesystem operations, GitHub integration, database access, and more through the growing MCP ecosystem.

> **Status Update (v1.7.1):** Built-in tools are fully functional! External MCP server discovery is working (58+ servers found), with activation currently in development.

#### ✅ Working Now: Built-in Tool Testing

```bash
# Test built-in time tool
neurolink generate "What time is it?"

# Test tool discovery
neurolink generate "What tools do you have access to? List and categorize them."

# Multi-tool integration test
neurolink generate "Can you help me refactor some code? And what time is it right now?"
```

#### `mcp list` - List Configured Servers

```bash
# List all discovered MCP servers (58+ found from all AI tools)
neurolink mcp list

# List with live connectivity status (external activation in development)
neurolink mcp list --status
```

**Current Output Example:**

```
📋 Discovered MCP servers (58+ found):

🔧 filesystem
   Command: npx -y @modelcontextprotocol/server-filesystem /
   Transport: stdio
🔍 filesystem: Discovered (activation in development)

🔧 github
   Command: npx @modelcontextprotocol/server-github
   Transport: stdio
🔍 github: Discovered (activation in development)

... (56+ more servers discovered)
```

#### `mcp install` - Install Popular Servers (Discovery Phase)

> **Note:** Installation commands are available but servers are currently in discovery/placeholder mode. Full activation coming soon!

```bash
# Install filesystem server for file operations (discovered but not yet activated)
neurolink mcp install filesystem

# Install GitHub server for repository management (discovered but not yet activated)
neurolink mcp install github

# Install PostgreSQL server for database operations (discovered but not yet activated)
neurolink mcp install postgres

# Install browser automation server (discovered but not yet activated)
neurolink mcp install puppeteer

# Install web search server (discovered but not yet activated)
neurolink mcp install brave-search
```

**Current Output Example:**

```
📦 Installing MCP server: filesystem
🔍 Server discovered and configured
💡 Note: Server activation in development - use built-in tools for now
💡 Test built-in tools with: neurolink generate "What time is it?" --debug
```

#### `mcp add` - Add Custom Servers

```bash
# Add custom server with basic command
neurolink mcp add myserver "python /path/to/server.py"

# Add server with arguments
neurolink mcp add myserver "npx my-mcp-server" --args "arg1,arg2"

# Add SSE-based server
neurolink mcp add webserver "http://localhost:8080" --transport sse

# Add server with environment variables
neurolink mcp add dbserver "npx db-server" --env '{"DB_URL": "postgresql://..."}'

# Add server with custom working directory
neurolink mcp add localserver "python server.py" --cwd "/project/directory"
```

#### `mcp test` - Test Server Connectivity (Development Phase)

> **Current Status:** Built-in tools are fully testable! External server connectivity testing is under development.

```bash
# ✅ Working: Test built-in tools
neurolink generate "What time is it?" --debug

# 🔧 In Development: Test external server connectivity
neurolink mcp test filesystem

# 🔍 Working: List discovered servers
neurolink mcp list --status
```

**Current Output Example (Built-in Tools):**

```
✅ Built-in tool execution via AI:
🕐 The current time is Friday, December 13, 2024 at 10:30:45 AM PST
📋 Available tools: 5 built-in tools discovered
🔧 External servers: 58+ discovered, activation in development
```

**Future Output Example (External Servers):**

```
🔧 Testing MCP server: filesystem (Coming Soon)

⠋ Connecting...⠙ Getting capabilities...⠹ Listing tools...
✔ ✅ Connection successful!

📋 Server Capabilities:
   Protocol Version: 2024-11-05
   Tools: ✅ Supported

🛠️  Available Tools:
   • read_file: Read file contents from filesystem
   • write_file: Create/overwrite files
   • edit_file: Make line-based edits
   // ...existing tools...
```

#### `mcp remove` - Remove Servers

```bash
# Remove configured server
neurolink mcp remove old-server

# Remove multiple servers
neurolink mcp remove server1 server2 server3
```

#### `mcp exec` - Execute Tools (Development Phase)

> **Current Status:** Built-in tools work via AI generation! Direct external tool execution is under development.

```bash
# ✅ Working Now: Built-in tools via AI generation
neurolink generate "What time is it?" --debug
neurolink generate "What tools do you have access to?" --debug

# 🔧 Coming Soon: Direct external tool execution
neurolink mcp exec filesystem read_file --params '{"path": "index.md"}'
neurolink mcp exec github create_issue --params '{"owner": "juspay", "repo": "neurolink", "title": "Bug report", "body": "Description"}'
neurolink mcp exec postgres execute_query --params '{"query": "SELECT * FROM users LIMIT 10"}'
neurolink mcp exec filesystem list_directory --params '{"path": "."}'
neurolink mcp exec puppeteer navigate --params '{"url": "https://example.com"}'
neurolink mcp exec puppeteer screenshot --params '{"name": "homepage"}'
```

**Current Working Output (Built-in Tools):**

```
✅ Built-in tool execution via AI:
🕐 The current time is Friday, December 13, 2024 at 10:30:45 AM PST
📋 Available tools: 5 built-in tools discovered
🔧 External servers: 58+ discovered, activation in development
```

### MCP Command Options

#### Global MCP Options

- `--help, -h` - Show MCP command help
- `--status` - Include live connectivity status (for `list` command)

#### Server Management Options

- `--args <args>` - Comma-separated command arguments
- `--transport <type>` - Transport type: `stdio` (default) or `sse`
- `--url <url>` - Server URL (for SSE transport)
- `--env <json>` - Environment variables as JSON string
- `--cwd <path>` - Working directory for server process

#### Tool Execution Options

- `--params <json>` - Tool parameters as JSON string
- `--timeout <ms>` - Execution timeout in milliseconds

### MCP Integration Examples

#### File Operations Workflow

```bash
# Install and test filesystem server
neurolink mcp install filesystem
neurolink mcp test filesystem

# (Future) Execute file operations
neurolink mcp exec filesystem read_file --params '{"path": "package.json"}'
neurolink mcp exec filesystem list_directory --params '{"path": "src"}'
neurolink mcp exec filesystem search_files --params '{"path": ".", "pattern": "*.ts"}'
```

#### GitHub Integration Workflow

```bash
# Install GitHub server
neurolink mcp install github
neurolink mcp test github

# (Future) GitHub operations
neurolink mcp exec github search_repositories --params '{"query": "neurolink"}'
neurolink mcp exec github create_issue --params '{"title": "Feature request", "body": "Add new feature"}''
```

#### Database Operations Workflow

```bash
# Install PostgreSQL server
neurolink mcp install postgres
neurolink mcp test postgres

# (Future) Database operations
neurolink mcp exec postgres query --params '{"sql": "SELECT version()"}'
neurolink mcp exec postgres list-tables --params '{}'
```

#### Custom Server Development

```bash
# Add your custom MCP server
neurolink mcp add myapp "python /path/to/my-mcp-server.py" \
  --env '{"API_KEY": "secret", "DEBUG": "true"}' \
  --cwd "/my/project"

# Test your server
neurolink mcp test myapp

# Use your custom tools
neurolink mcp exec myapp my_custom_tool --params '{"input": "data"}'
```

### `ollama` - Local Model Management

Manage Ollama local models directly from NeuroLink CLI.

#### `ollama list-models` - List Installed Models

```bash
neurolink ollama list-models
```

#### `ollama pull <model>` - Download Model

```bash
neurolink ollama pull llama2
neurolink ollama pull codellama
```

#### `ollama remove <model>` - Remove Model

```bash
neurolink ollama remove llama2
```

#### `ollama status` - Check Ollama Service

```bash
neurolink ollama status
```

#### `ollama start` - Start Ollama Service

```bash
neurolink ollama start
```

#### `ollama stop` - Stop Ollama Service

```bash
neurolink ollama stop
```

#### `ollama setup` - Interactive Setup

```bash
neurolink ollama setup
```

### MCP Configuration Management

MCP servers are automatically configured in `.mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "transport": "stdio"
    },
    "github": {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "transport": "stdio"
    }
  }
}
```

## Command Options

### Global Options

- `--help, -h` - Show help information
- `--version, -v` - Show version number

### Generation Options

- `--provider <name>` - Choose provider: `auto` (default), `openai`, `bedrock`, `vertex`, `anthropic`, `azure`, `google-ai`, `huggingface`, `ollama`, `mistral`
- `--temperature <number>` - Creativity level: `0.0` (focused) to `1.0` (creative), default: `0.7`
- `--max-tokens <number>` - Maximum tokens to generate, default: `1000`
- `--format <type>` - Output format: `text` (default) or `json`

### Batch Processing Options

- `--output <file>` - Save results to JSON file
- `--delay <ms>` - Delay between requests in milliseconds, default: `1000`
- `--timeout <duration>` - Request timeout per prompt (default: 30s). Accepts: '30s', '2m', '5000' (ms), '1h'

### Status Options

- `--verbose, -v` - Show detailed diagnostic information

## CLI Features

### ✨ Professional UX

- **Animated Spinners**: Beautiful animations during AI generation
- **Colorized Output**: Green ✅ for success, red ❌ for errors, blue ℹ️ for info
- **Progress Tracking**: Real-time progress for batch operations
- **Smart Error Messages**: Helpful hints for common issues

### 🛠️ Developer-Friendly

- **Multiple Output Formats**: Text for humans, JSON for scripts
- **Provider Selection**: Test specific providers or use auto-selection
- **Batch Processing**: Handle multiple prompts efficiently
- **Status Monitoring**: Check provider health and connectivity

### 🔧 Automation Ready

- **Exit Codes**: Standard exit codes for scripting
- **JSON Output**: Structured data for automated workflows
- **Environment Variables**: All SDK environment variables work with CLI
- **Scriptable**: Perfect for CI/CD pipelines and automation

## Usage Examples

### Creative Writing Workflow

```bash
# Generate creative content with high temperature
neurolink generate "Write a sci-fi story opening" \
  --provider openai \
  --temperature 0.9 \
  --max-tokens 1000 \
  --format json > story.json

# Check what was generated
cat story.json | jq '.content'

# Extract specific fields from JSON response
cat story.json | jq -r '.provider, .usage.totalTokens, .responseTime'

# Automated workflow with JSON parsing
story_response=$(neurolink gen "Write a mystery story" --format json)
title=$(echo "$story_response" | jq -r '.content' | head -1)
tokens=$(echo "$story_response" | jq -r '.usage.totalTokens')
echo "Generated story: $title (${tokens} tokens)"
```

### Batch Content Processing

```bash
# Create prompts file
cat > content-prompts.txt << EOF
Write a product description for AI software
Create a social media post about technology
Draft an email about our new features
Write a blog post title about machine learning
EOF

# Process all prompts and save results
neurolink batch content-prompts.txt \
  --output content-results.json \
  --provider bedrock \
  --delay 2000

# Extract just the content
cat content-results.json | jq -r '.[].response'
```

### Provider Health Monitoring

```bash
# Check provider status (useful for monitoring scripts)
neurolink status --format json > status.json

# Parse results in scripts
working_providers=$(cat status.json | jq '[.[] | select(.status == "working")] | length')
echo "Working providers: $working_providers"
```

### Integration with Shell Scripts

```bash
#!/bin/bash
# AI-powered commit message generator

# Get git diff
diff=$(git diff --cached --name-only)

if [ -z "$diff" ]; then
  echo "No staged changes found"
  exit 1
fi

# Generate commit message
commit_msg=$(neurolink generate \
  "Generate a concise git commit message for these changes: $diff" \
  --max-tokens 50 \
  --temperature 0.3)

echo "Suggested commit message:"
echo "$commit_msg"

# Optionally auto-commit
read -p "Use this commit message? (y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git commit -m "$commit_msg"
fi
```

## Environment Setup

The CLI uses the same environment variables as the SDK:

```bash
# Set up your providers (same as SDK)
export OPENAI_API_KEY="sk-your-key"
export AWS_ACCESS_KEY_ID="your-aws-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Corporate proxy support (automatic detection)
export HTTPS_PROXY="http://your-corporate-proxy:port"
export HTTP_PROXY="http://your-corporate-proxy:port"

# Test configuration
neurolink status
```

### 🏢 Enterprise Proxy Support

The CLI automatically works behind corporate proxies:

```bash
# Set proxy environment variables
export HTTPS_PROXY=http://proxy.company.com:8080
export HTTP_PROXY=http://proxy.company.com:8080

# CLI commands work automatically through proxy
npx @juspay/neurolink generate "Hello from corporate network"
npx @juspay/neurolink status
```

**No additional configuration required** - proxy detection is automatic.

**For detailed proxy setup** → See [Enterprise & Proxy Setup Guide](ENTERPRISE-PROXY-SETUP.md)

## CLI vs SDK Comparison

| Feature                | CLI                    | SDK                      |
| ---------------------- | ---------------------- | ------------------------ |
| **Text Generation**    | ✅ `generate`          | ✅ `generate()`          |
| **Streaming**          | ✅ `stream`            | ✅ `stream()`            |
| **Provider Selection** | ✅ `--provider` flag   | ✅ `createProvider()`    |
| **Batch Processing**   | ✅ `batch` command     | ✅ Manual implementation |
| **Status Monitoring**  | ✅ `status` command    | ✅ Manual testing        |
| **JSON Output**        | ✅ `--format json`     | ✅ Native objects        |
| **Automation**         | ✅ Perfect for scripts | ✅ Perfect for apps      |
| **Learning Curve**     | 🟢 Low                 | 🟡 Medium                |

## When to Use CLI vs SDK

### Use the CLI when:

- 🔧 **Prototyping**: Quick testing of prompts and providers
- 📜 **Scripting**: Shell scripts and automation workflows
- 🔍 **Debugging**: Checking provider status and testing connectivity
- 📊 **Batch Processing**: Processing multiple prompts from files
- 🎯 **One-off Tasks**: Generating content without writing code

### Use the SDK when:

- 🏗️ **Application Development**: Building web apps, APIs, or services
- 🔄 **Real-time Integration**: Chat interfaces, streaming responses
- ⚙️ **Complex Logic**: Custom provider fallback, error handling
- 🎨 **UI Integration**: React components, Svelte stores
- 📈 **Production Applications**: Full-featured applications

## ⭐ Phase 3 Enhanced Features

### Advanced Analytics and Evaluation

**Multi-Domain Evaluation Strategy:**

```bash
# Technical Documentation Evaluation
npx @juspay/neurolink generate "Explain microservices architecture" \
  --enableEvaluation \
  --evaluationDomain "Senior Software Architect" \
  --debug

# Creative Content Evaluation
npx @juspay/neurolink generate "Write marketing copy for AI product" \
  --enableEvaluation \
  --evaluationDomain "Senior Marketing Manager" \
  --debug
```

**Context-Aware Analytics:**

```bash
# User Session Context
npx @juspay/neurolink generate "Help with API design" \
  --enableAnalytics \
  --context '{"userId":"user123","session":"sess456","project":"ecommerce"}' \
  --debug

# Business Context with Evaluation
npx @juspay/neurolink generate "Market analysis for AI products" \
  --enableAnalytics \
  --enableEvaluation \
  --evaluationDomain "Business Strategy Consultant" \
  --context '{"company":"TechCorp","department":"strategy","quarter":"Q4-2025"}' \
  --debug
```

### Real Streaming with Analytics

**Enterprise streaming with full monitoring:**

```bash
# Production streaming with all features
npx @juspay/neurolink stream "Generate comprehensive project documentation" \
  --provider google-ai \
  --model gemini-2.5-pro \
  --enableAnalytics \
  --enableEvaluation \
  --evaluationDomain "Senior Technical Writer" \
  --context '{"project":"enterprise-api","team":"platform"}' \
  --temperature 0.7 \
  --maxTokens 3000 \
  --timeout 180 \
  --debug
```

### Performance Optimization (68% Faster Provider Checks)

```bash
# Fast provider status (5s instead of 16s)
time npx @juspay/neurolink provider status

# Best provider selection
npx @juspay/neurolink get-best-provider

# Auto-selection with performance priority
npx @juspay/neurolink generate "Performance critical task" --provider auto
```

## 🎬 CLI Video Demonstrations

**See the CLI in action with professional demonstrations:**

### **Command Tutorials**

- **[Help & Overview](visual-content/cli-videos/cli-01-cli-help.mp4)** - Complete command reference and usage examples
- **[Provider Status](visual-content/cli-videos/cli-02-provider-status.mp4)** - Connectivity testing and response time measurement
- **[Text Generation](visual-content/cli-videos/cli-03-text-generation.mp4)** - Real AI content generation with different providers
- **[Auto Selection](visual-content/cli-videos/cli-04-auto-selection.mp4)** - Automatic provider selection algorithm
- **[Streaming](visual-content/cli-videos/cli-05-streaming.mp4)** - Real-time text generation streaming
- **[Advanced Features](visual-content/cli-videos/cli-06-advanced-features.mp4)** - Verbose diagnostics and advanced options

### **MCP Integration Demos**

- **[MCP Help](visual-content/cli-videos/cli-advanced-features/mcp-help.mp4)** - MCP command reference and usage
- **[MCP List](visual-content/cli-videos/cli-advanced-features/mcp-list.mp4)** - MCP server listing and status

### **AI Workflow Tools Demo**

- **[AI Workflow Tools](visual-content/videos/demo/ai-workflow-full-demo.mp4)** - Complete demonstration of AI workflow tools via CLI

**All videos feature:**

- ✅ Real command execution with live AI generation
- ✅ Professional MP4 format for universal compatibility
- ✅ Comprehensive coverage of all CLI features
- ✅ Suitable for documentation, tutorials, and presentations

For complete visual documentation including web interface demos, see the [Visual Demos Guide](./VISUAL-DEMOS.md).

---

[← Back to Main README](./index.md) | [Next: Framework Integration →](./FRAMEWORK-INTEGRATION.md)
