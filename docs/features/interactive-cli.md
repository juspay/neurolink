---
title: Interactive CLI - Your AI Development Environment
description: Persistent interactive mode with conversation memory, session state, and MCP tool integration for rapid AI development
keywords: cli, interactive, loop mode, session state, conversation memory, repl, development environment
---

# Interactive CLI: Your AI Development Environment

> **Since**: v7.0.0 | **Status**: Production Ready | **Availability**: CLI

## Why Interactive Mode?

NeuroLink's Interactive CLI transforms traditional command-line usage into a persistent development environment optimized for AI workflow iteration. Unlike standard CLIs where each command is isolated, Interactive Mode maintains session state, conversation memory, and configuration across all operations - enabling rapid experimentation, debugging, and production runbook execution.

### Traditional CLI vs Interactive Mode

| Feature             | Traditional CLI                | NeuroLink Interactive                 | Productivity Impact              |
| ------------------- | ------------------------------ | ------------------------------------- | -------------------------------- |
| **Session State**   | None - lost after each command | Full persistence across session       | 10x faster parameter tuning      |
| **Memory**          | No context between commands    | Conversation-aware with history       | 5x reduction in repeated context |
| **Configuration**   | Flags required per command     | `/set` persists across entire session | 80% fewer keystrokes             |
| **Tool Testing**    | Manual per-tool invocation     | Live discovery & testing with `/mcp`  | 3x faster integration testing    |
| **Streaming**       | Optional per command           | Real-time default with progress bars  | Immediate feedback               |
| **Error Recovery**  | Start over from scratch        | Session preserved, fix and retry      | 90% time saved on errors         |
| **Workflow Replay** | Copy-paste commands            | Export/import full sessions           | Reproducible workflows           |

**Measured productivity gains:**

- 80% faster onboarding for new users
- 60% fewer configuration errors
- 3-5x faster prompt engineering iteration
- Universal accessibility from beginner to expert

---

## Getting Started

### Starting a Session

Basic session with auto-detected Redis memory:

```bash
npx @juspay/neurolink loop

🚀 NeuroLink Interactive Loop Mode
💬 Conversation Memory: Redis auto-detected
📍 Session ID: sess_abc123def456

Ready! Use /help to see available commands.

neurolink >
```

With explicit configuration:

```bash
# Enable conversation memory with Redis
npx @juspay/neurolink loop --enable-conversation-memory

# Disable memory entirely (prompt-by-prompt mode)
npx @juspay/neurolink loop --enable-conversation-memory=false

# Custom retention limits
npx @juspay/neurolink loop --max-sessions 100 --max-turns-per-session 50

# Start with specific provider
npx @juspay/neurolink loop --provider anthropic --model claude-3-sonnet

# Disable Redis auto-detection (in-memory only)
npx @juspay/neurolink loop --no-auto-redis
```

### Your First Interactive Session

Step-by-step walkthrough:

```bash
$ npx @juspay/neurolink loop --enable-conversation-memory

╔══════════════════════════════════════════════════════════╗
║         NeuroLink Interactive Loop Mode v8.26.1          ║
║  Universal AI Platform - 13 Providers | 58+ MCP Tools    ║
╚══════════════════════════════════════════════════════════╝

💬 Conversation Memory: Enabled (Redis)
📍 Session ID: sess_2026_01_01_143052
🔧 Provider: auto (will select best provider)
📊 Temperature: 0.7 (balanced creativity)

💡 Quick Start:
   • Type your prompt or question directly
   • Use /set to configure (e.g., /set provider anthropic)
   • Use /help to see all commands
   • Use /mcp discover to see available tools

Ready! What would you like to do?

neurolink > Set the provider to Google AI Studio

 Setting session variable...
✅ provider set to google-ai

neurolink > What capabilities do you have?

🤖 Generating response...

I'm an AI assistant powered by Google Gemini 3 Flash through NeuroLink. I have access to:

1. **Text Generation**: Complex reasoning, creative writing, coding
2. **Vision**: Image analysis and description
3. **Tool Usage**: 58+ MCP tools including:
   - Filesystem operations (read, write, list files)
   - Web search and browsing
   - GitHub integration
   - Database queries (PostgreSQL, SQLite, MongoDB)
   - And many more...

4. **Extended Thinking**: Deep reasoning for complex problems
5. **Structured Output**: JSON schema-based responses

Would you like me to demonstrate any of these capabilities?

neurolink > Yes, list the files in the current directory

🤖 Using tool: listDirectory
📁 Path: .

Files in current directory:
├── src/
├── docs/
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE

neurolink > /mcp discover

🔍 Discovering MCP tools...

📋 Available MCP Servers (5):
╔═══════════════╦═════════════╦══════════════╗
║ Server        ║ Status      ║ Tools        ║
╠═══════════════╬═════════════╬══════════════╣
║ filesystem    ║ ✅ Active   ║ 9 tools      ║
║ github        ║ ✅ Active   ║ 15 tools     ║
║ postgres      ║ ✅ Active   ║ 8 tools      ║
║ brave-search  ║ ✅ Active   ║ 3 tools      ║
║ memory        ║ ✅ Active   ║ 4 tools      ║
╚═══════════════╩═════════════╩══════════════╝

Total: 39 tools available

💡 Use /mcp test <server> to test a specific server
💡 AI can use these tools automatically in conversations

neurolink > /export json session.json

💾 Exporting conversation...

✅ Exported 4 messages to session.json

Session Summary:
├── Provider: google-ai
├── Model: gemini-3-flash-preview
├── Messages: 4 (2 user, 2 assistant)
├── Tools Used: listDirectory (1x)
└── Duration: 3 minutes

neurolink > exit

👋 Goodbye! Session saved.

💡 Resume this session:
   npx @juspay/neurolink loop --session session.json
```

---

## Loop Mode Deep Dive

### Session Variables

Configure once, use throughout your session:

#### Setting Variables

```bash
neurolink > /set provider anthropic
✅ provider set to anthropic

neurolink > /set model claude-3-opus
✅ model set to claude-3-opus

neurolink > /set temperature 0.3
✅ temperature set to 0.3

neurolink > /set thinking-level high
✅ thinking-level set to high

neurolink > /set max-tokens 4000
✅ max-tokens set to 4000
```

#### Getting Current Values

```bash
neurolink > /get provider
📊 provider: anthropic

neurolink > /get all
📊 Current Session Configuration:
├── provider: anthropic
├── model: claude-3-opus
├── temperature: 0.3
├── thinking-level: high
├── max-tokens: 4000
└── conversation-memory: enabled
```

#### Unsetting Variables

```bash
neurolink > /unset temperature
✅ temperature unset (reverting to default: 0.7)

neurolink > /clear
⚠️  Clear all session variables? (y/n): y
✅ All session variables cleared
```

### Conversation Memory

#### How Memory Works

Interactive mode maintains conversation context automatically:

```bash
neurolink > My name is Alice and I work on the backend team

🤖 Nice to meet you, Alice! As a backend developer, you might be interested in...

neurolink > What's my name?

🤖 Your name is Alice, and you mentioned you work on the backend team.

neurolink > /history

📜 Conversation History (4 messages):

1. USER: My name is Alice and I work on the backend team
2. ASSISTANT: Nice to meet you, Alice! As a backend developer...
3. USER: What's my name?
4. ASSISTANT: Your name is Alice, and you mentioned you work on the backend team.

neurolink > /clear

⚠️  This will clear conversation history but preserve session variables.
   Continue? (y/n): y

✅ Conversation history cleared
💡 Session variables (provider, model, etc.) preserved
```

#### Memory Persistence (Redis)

With Redis enabled, conversations persist across sessions:

```bash
# Session 1
neurolink > I'm debugging the authentication service

🤖 I can help with that. What specific issue are you seeing?

neurolink > exit
💾 Session saved to Redis

# Later - Session 2 (same session ID)
npx @juspay/neurolink loop --session sess_abc123

neurolink > What was I working on?

🤖 You were debugging the authentication service. Have you made progress?
```

### Provider Switching

Switch providers mid-session to compare responses:

```bash
neurolink > /set provider openai
✅ provider set to openai

neurolink > Explain quantum computing

🤖 [OpenAI GPT-4 response]

neurolink > /set provider anthropic
✅ provider set to anthropic

neurolink > Explain quantum computing

🤖 [Anthropic Claude response]

neurolink > /set provider google-ai
✅ provider set to google-ai

neurolink > Explain quantum computing

🤖 [Google Gemini response]
```

### Model Experimentation

A/B test different models in the same session:

```bash
# Test different models on same prompt
neurolink > /set provider anthropic

neurolink > /set model claude-3-haiku
neurolink > Write a haiku about coding
🤖 [Haiku response - fast, concise]

neurolink > /set model claude-3-sonnet
neurolink > Write a haiku about coding
🤖 [Sonnet response - balanced]

neurolink > /set model claude-3-opus
neurolink > Write a haiku about coding
🤖 [Opus response - creative, detailed]

# Compare thinking levels
neurolink > /set thinking-level minimal
neurolink > Solve this logic puzzle: ...
🤖 [Quick response]

neurolink > /set thinking-level high
neurolink > Solve this logic puzzle: ...
🤖 [Deep reasoning response with extended thinking]
```

---

## Command Reference

### Session Management

| Command                   | Description                                     | Example                     |
| ------------------------- | ----------------------------------------------- | --------------------------- |
| `/set <key> <value>`      | Set session variable (persists across commands) | `/set provider anthropic`   |
| `/get <key>`              | Get current value of variable                   | `/get temperature`          |
| `/get all`                | Show all session variables                      | `/get all`                  |
| `/unset <key>`            | Remove session variable (revert to default)     | `/unset temperature`        |
| `/show`                   | Alias for `/get all`                            | `/show`                     |
| `/clear`                  | Clear conversation history (keeps variables)    | `/clear`                    |
| `/reset`                  | Reset everything (history + variables)          | `/reset`                    |
| `/history`                | View conversation history                       | `/history`                  |
| `/history <n>`            | View last N messages                            | `/history 10`               |
| `/export <format> <file>` | Export session (json, markdown, text)           | `/export json session.json` |
| `/import <file>`          | Import previous session                         | `/import session.json`      |
| `exit` / `quit` / `:q`    | Exit loop mode                                  | `exit`                      |

#### Available Session Variables

| Variable         | Type    | Example         | Description                |
| ---------------- | ------- | --------------- | -------------------------- |
| `provider`       | string  | `anthropic`     | AI provider to use         |
| `model`          | string  | `claude-3-opus` | Specific model             |
| `temperature`    | number  | `0.7`           | Creativity level (0-1)     |
| `max-tokens`     | number  | `4000`          | Maximum response length    |
| `thinking-level` | string  | `high`          | Extended thinking mode     |
| `streaming`      | boolean | `true`          | Enable streaming responses |
| `tools`          | boolean | `true`          | Enable MCP tool usage      |

### MCP Tools Commands

| Command                     | Description                              | Example                                                    |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `/mcp discover`             | List all available MCP servers and tools | `/mcp discover`                                            |
| `/mcp list`                 | Alias for discover                       | `/mcp list`                                                |
| `/mcp test <server>`        | Test connectivity to MCP server          | `/mcp test github`                                         |
| `/mcp add <name> <command>` | Add MCP server to session                | `/mcp add myserver "npx my-mcp-server"`                    |
| `/mcp remove <name>`        | Remove MCP server                        | `/mcp remove myserver`                                     |
| `/mcp status`               | Show status of all servers               | `/mcp status`                                              |
| `/mcp exec <tool> <args>`   | Manually execute a tool                  | `/mcp exec github create_issue --params '{"title":"Bug"}'` |

### HITL Commands

| Command              | Description             | Example                                      |
| -------------------- | ----------------------- | -------------------------------------------- |
| `/hitl status`       | View pending approvals  | `/hitl status`                               |
| `/hitl approve <id>` | Approve pending action  | `/hitl approve 1`                            |
| `/hitl reject <id>`  | Reject with reason      | `/hitl reject 2 --reason "Security concern"` |
| `/hitl history`      | View approval history   | `/hitl history --last 10`                    |
| `/hitl config`       | View HITL configuration | `/hitl config`                               |

### Help Commands

| Command           | Description                 | Example     |
| ----------------- | --------------------------- | ----------- |
| `/help`           | Show all available commands | `/help`     |
| `/help <command>` | Help for specific command   | `/help set` |
| `/?`              | Alias for help              | `/?`        |

---

## Real-World Workflows

### Workflow 1: Development Iteration

Complete session showing code generation, refinement, and testing:

````bash
neurolink > /set provider anthropic
neurolink > /set model claude-3-sonnet
neurolink > /set temperature 0.3  # Lower temp for code

# Initial generation
neurolink > Create a TypeScript function to validate email addresses

🤖 Here's an email validation function:

```typescript
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
````

neurolink > Add support for validating domains

🤖 [AI remembers previous context, extends the function]

```typescript
function validateEmail(email: string, allowedDomains?: string[]): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  if (allowedDomains) {
    const domain = email.split("@")[1];
    return allowedDomains.includes(domain);
  }

  return true;
}
```

neurolink > Add unit tests

🤖 [AI remembers the function, generates tests]

```typescript
import { describe, it, expect } from "vitest";

describe("validateEmail", () => {
  it("should validate correct emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(validateEmail("invalid")).toBe(false);
  });

  it("should validate against allowed domains", () => {
    expect(validateEmail("user@company.com", ["company.com"])).toBe(true);
  });
});
```

neurolink > /export markdown code-session.md
✅ Exported to code-session.md

````

### Workflow 2: Model Experimentation

Comparing responses across providers and models:

```bash
# Test prompt engineering across models
PROMPT="Explain dependency injection in 50 words"

neurolink > /set provider openai
neurolink > /set model gpt-4-turbo

neurolink > $PROMPT
🤖 [GPT-4 Turbo response]
Word count: 48

neurolink > /set provider anthropic
neurolink > /set model claude-3-opus

neurolink > $PROMPT
🤖 [Claude Opus response]
Word count: 52

neurolink > /set provider google-ai
neurolink > /set model gemini-3-flash

neurolink > $PROMPT
🤖 [Gemini 3 Flash response]
Word count: 47

# Compare thinking levels
neurolink > /set thinking-level minimal
neurolink > Solve: What is 15% of 280?
🤖 42 [instant]

neurolink > /set thinking-level high
neurolink > Solve: If a train leaves at 2pm going 60mph...
🤖 [extended thinking visible]
   Thinking... analyzing problem structure
   Thinking... calculating distances
   Thinking... verifying solution
   Answer: [detailed solution with reasoning]

neurolink > /export json model-comparison.json
````

### Workflow 3: MCP Tool Testing

Discovering, testing, and using MCP tools:

```bash
neurolink > /mcp discover

📋 Available MCP Servers (8):
╔═══════════════╦═════════════╦══════════════╗
║ Server        ║ Status      ║ Tools        ║
╠═══════════════╬═════════════╬══════════════╣
║ filesystem    ║ ✅ Active   ║ 9 tools      ║
║ github        ║ ✅ Active   ║ 15 tools     ║
║ postgres      ║ ❌ Inactive ║ 0 tools      ║
...

neurolink > /mcp test postgres

🔍 Testing MCP server: postgres
❌ Connection failed: ECONNREFUSED

💡 Fix: Set POSTGRES_CONNECTION_STRING environment variable
   export POSTGRES_CONNECTION_STRING="postgresql://user:pass@localhost:5432/db"

neurolink > Great, let me fix that [sets env var externally]

neurolink > /mcp test postgres
✅ Connection successful!
📋 8 tools available: query, schema, tables, insert, update...

neurolink > Use the GitHub tool to list my repositories

🤖 Using tool: github_list_repos

Found 23 repositories:
1. neurolink-examples (public)
2. ai-playground (private)
3. docs-site (public)
...

neurolink > Create an issue in neurolink-examples titled "Add HITL example"

🤖 Using tool: github_create_issue
🔔 HITL Approval Required

Action: github_create_issue
Args:
  repo: neurolink-examples
  title: Add HITL example
  body: [AI-generated description]

Approve? (y/n): y

✅ Issue created: neurolink-examples#42
🔗 https://github.com/user/neurolink-examples/issues/42

neurolink > /export json github-workflow.json
```

### Workflow 4: Documentation Generation

Using AI to generate docs with iterative refinement:

````bash
neurolink > /set provider anthropic
neurolink > /set temperature 0.5

neurolink > Read the file src/lib/neurolink.ts

🤖 Using tool: readFile

[File contents displayed]

neurolink > Generate API documentation for the NeuroLink class

🤖 # NeuroLink API Documentation

## Class: NeuroLink

Main SDK class for interacting with AI providers...

[Generated docs]

neurolink > Add examples for each method

🤖 [AI remembers the documentation, adds examples]

## Examples

### generate()
```typescript
const result = await neurolink.generate({
  input: { text: "Hello" }
});
````

...

neurolink > Save this to docs/api/neurolink.md

🤖 Using tool: writeFile
✅ Saved to docs/api/neurolink.md

neurolink > Now generate docs for the MessageBuilder class

🤖 Reading src/lib/utils/messageBuilder.ts...

[Continues documentation generation]

neurolink > /export json doc-generation-session.json

````

---

## Tips & Tricks

### Power User Features

#### Keyboard Shortcuts

- **↑ / ↓** - Navigate command history
- **Tab** - Auto-complete commands and variables
- **Ctrl+C** - Cancel current operation (doesn't exit)
- **Ctrl+D** - Exit loop mode
- **Ctrl+L** - Clear screen
- **Ctrl+R** - Search command history

#### Multi-line Input

Use backslash continuation for multi-line prompts:

```bash
neurolink > Write a function that: \
... 1. Validates user input \
... 2. Sanitizes the data \
... 3. Returns typed result

🤖 [AI processes full multi-line prompt]
````

Or use triple backticks for code blocks:

```bash
neurolink > Review this code:
```

function process(data) {
return data.map(x => x \* 2);
}

```

🤖 [AI reviews the code block]
```

#### Command Aliases

Create shortcuts for common operations:

```bash
# In your shell profile (.bashrc, .zshrc)
alias nlg="npx @juspay/neurolink loop --provider google-ai"
alias nla="npx @juspay/neurolink loop --provider anthropic"
alias nlo="npx @juspay/neurolink loop --provider openai"

# Usage
$ nlg  # Starts loop with Google AI
$ nla  # Starts loop with Anthropic
```

### Session Persistence

#### Saving Sessions

Explicit save to file:

```bash
neurolink > /export json my-session.json
✅ Exported 15 messages to my-session.json

# Session includes:
# - All conversation history
# - Session variables
# - Tool usage logs
# - Timestamps
```

#### Resuming Sessions

```bash
# Resume from file
npx @juspay/neurolink loop --session my-session.json

# Resume from Redis (if enabled)
npx @juspay/neurolink loop --session-id sess_abc123
```

#### Sharing Sessions

Share reproducible workflows with team:

```bash
# Developer 1
neurolink > [Creates workflow]
neurolink > /export json workflow.json

# Developer 2
npx @juspay/neurolink loop --session workflow.json
# Can replay exact same workflow
```

### Integration with Scripts

#### Piping Input

```bash
# Pipe file contents to AI
cat README.md | npx @juspay/neurolink generate "Summarize this:"

# Process output from commands
git diff | npx @juspay/neurolink generate "Review these changes"

# Chain with other tools
curl https://api.example.com/data | \
  npx @juspay/neurolink generate "Analyze this JSON"
```

#### Non-Interactive Mode

```bash
# Run single command and exit
npx @juspay/neurolink generate "Hello" --provider anthropic --exit

# Batch processing
for file in *.md; do
  npx @juspay/neurolink generate "Summarize: $(cat $file)" \
    --provider google-ai \
    --output summary-$file
done
```

#### CI/CD Usage

```bash
# .github/workflows/ai-review.yml
- name: AI Code Review
  run: |
    npx @juspay/neurolink loop --non-interactive <<EOF
    /set provider anthropic
    /set model claude-3-sonnet
    Review the code changes:
    $(git diff)
    EOF
```

---

## Troubleshooting

### Common Issues

#### Issue: Command Not Recognized

**Symptom**:

```bash
neurolink > /set provider anthropic
Unknown command: /set
```

**Solution**: Ensure you're in loop mode:

```bash
# Wrong - regular CLI
npx @juspay/neurolink set provider anthropic

# Right - loop mode
npx @juspay/neurolink loop
neurolink > /set provider anthropic
```

#### Issue: Conversation Memory Not Working

**Symptom**: AI doesn't remember previous context

**Solution**:

```bash
# Check if memory is enabled
neurolink > /get all
...
conversation-memory: disabled  # <-- Problem!

# Enable memory
npx @juspay/neurolink loop --enable-conversation-memory

# Or set Redis URL
export REDIS_URL=redis://localhost:6379
npx @juspay/neurolink loop  # Auto-detects Redis
```

#### Issue: Provider Connection Failed

**Symptom**:

```bash
Error: Failed to connect to provider 'anthropic'
```

**Solution**:

```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Or in .env file
ANTHROPIC_API_KEY=sk-ant-...
```

#### Issue: Session Export Empty

**Symptom**: Exported session has no messages

**Solution**:

```bash
# Check if conversation memory is enabled
neurolink > /get all

# Memory disabled - enable it
npx @juspay/neurolink loop --enable-conversation-memory

# Now messages will be tracked for export
```

#### Issue: MCP Tools Not Showing

**Symptom**:

```bash
neurolink > /mcp discover
No MCP servers found
```

**Solution**:

```bash
# Install MCP servers first
npx @juspay/neurolink mcp install filesystem
npx @juspay/neurolink mcp install github

# Verify in .mcp-config.json or configure manually
```

### Debug Mode

Enable verbose logging:

```bash
# Via environment variable
export NEUROLINK_DEBUG=true
npx @juspay/neurolink loop

# Via flag
npx @juspay/neurolink loop --debug

# Debug output shows:
# - Session initialization
# - Variable changes
# - Provider selections
# - Tool executions
# - Memory operations
```

Example debug output:

```
[DEBUG] Initializing loop session
[DEBUG] Session ID: sess_abc123
[DEBUG] Redis connection: redis://localhost:6379 (connected)
[DEBUG] Conversation memory: enabled
[DEBUG] Loading session variables...
[DEBUG] Variable set: provider=google-ai
[DEBUG] Provider initialized: GoogleAIStudioProvider
[DEBUG] Model: gemini-3-flash-preview
[DEBUG] MCP servers discovered: 5
[DEBUG] Tools available: 39
```

---

## See Also

- [CLI Reference](../cli/commands.md) - Complete CLI command documentation
- [Loop Sessions Quick Guide](cli-loop-sessions.md) - Quick reference for loop mode
- [MCP Integration](../advanced/mcp-integration.md) - Deep dive into MCP tools
- [Enterprise HITL](enterprise-hitl.md) - Using HITL in interactive sessions
- [Conversation Memory](conversation-history.md) - Redis persistence configuration
- [Provider Setup](../getting-started/provider-setup.md) - Configure AI providers
