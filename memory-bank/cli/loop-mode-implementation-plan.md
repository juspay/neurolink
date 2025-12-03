# NeuroLink Loop Mode Implementation Plan

## Table of Contents

### 🎯 **Core Understanding**
1. [Summary](#summary)
2. [Key Features](#key-features)
3. [Core Concept](#core-concept)
4. [User Experience Flow](#user-experience-flow)

### 🏗️ **Architecture & Design**
5. [Architecture Overview](#architecture-overview)
6. [Complete Architecture Diagram](#complete-architecture-diagram)
7. [Data Flow Analysis](#data-flow-analysis)

### ⚙️ **System Components**
8. [Session Variable System](#session-variable-system)
9. [Enhanced Command Integration](#enhanced-command-integration)

### 💡 **Benefits & Implementation**
10. [Benefits](#benefits)
11. [Implementation Strategy](#implementation-strategy)
12. [Usage Examples](#usage-examples)
13. [Future Commands Example](#future-commands-example-getallAvailabletools)
14. [Testing Strategy](#testing-strategy)

### 🔧 **Implementation Details**
15. [Implementation Tasks](#implementation-tasks)

---

## Summary

NeuroLink Loop Mode transforms the CLI from a single-command execution tool into a persistent, stateful session where users can set preferences once and execute multiple commands that automatically inherit those settings along with conversation memory context.

## Key Features

- **💬 Conversation Memory**: Persistent context across all commands in the session
- **🚀 Rapid Iteration**: No repetitive flags, single persistent session with zero restart overhead
- **🔄 Session Variables**: Set preferences once (`set provider openai`) and automatically apply to all commands
- **⚙️ Interactive Commands**: Built-in session management (`set/get/unset/show/clear`)
- **✅ Zero Breaking Changes**: Regular CLI works exactly as before when not in Loop Mode
- **�️ Graceful Error Handling**: Errors don't terminate the session, preserving state

## Core Concept

**Session State Variables + Automatic Application**: Users configure their environment once using session variables, then execute commands that automatically apply these preferences plus conversation memory context without requiring repetitive flag specification.

### User Experience Flow
```bash
neurolink loop --enable-conversation-memory

neurolink> set provider googleVertex
neurolink> set temperature 0.7  
neurolink> generate "tell me about React hooks"
# ↑ Internally applies: provider=googleVertex, temperature=0.7, conversation context

neurolink> stream "explain useState in detail"  
# ↑ Automatically uses same settings + builds on previous conversation

neurolink> set model gemini-2.0-flash
neurolink> generate "now explain useEffect"
# ↑ Uses updated model but keeps other settings + conversation history
```

## Architecture Overview

### Core Components

1. **Global Session Manager**: Singleton managing persistent NeuroLink instance and session variables
2. **Loop Session Manager**: Interactive prompt loop with inquirer and yargs integration  
3. **Enhanced Command Handlers**: Existing CLI commands automatically enhanced with session state and automatic variable application
4. **Session Variable System**: Built-in commands for managing user preferences (set/get/unset/show/clear)

### Session State Architecture

```typescript
interface LoopSessionState {
  // Core session management
  neurolinkInstance: NeuroLink;
  sessionId: string;
  isActive: boolean;
  conversationMemoryConfig?: ConversationMemoryConfig;
  
  // Session variables that auto-apply to all commands
  sessionVariables: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    enableAnalytics?: boolean;
    enableEvaluation?: boolean;
    // Any CLI flag can be stored as session variable
  };
}
```

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 USER INTERACTION                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  neurolink loop --enable-conversation-memory --max-sessions 20                     │
│  neurolink> set provider googleVertex                                              │
│  neurolink> set temperature 0.7                                                    │
│  neurolink> generate "tell me about hooks"                                         │
└─────────────────────────────────┬───────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           LOOP SESSION MANAGER                                     │
│  src/cli/loopSession.ts                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─ inquirer.prompt('neurolink> ')                                                 │
│  ├─ Parse input with string-argv                                                   │
│  ├─ Route to command handler via yargs                                             │
│  └─ Error handling with graceful recovery                                          │
└─────────────────────────────────┬───────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL SESSION MANAGER                                     │
│  src/lib/session/globalSessionState.ts                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Persistent NeuroLink Instance                                                  │
│  │  └─ Created once with conversation memory config                               │
│  │  └─ Reused across all commands in session                                      │
│  │                                                                                 │
│  ├─ Session Variables Store                                                        │
│  │  └─ provider: "googleVertex"                                                   │
│  │  └─ temperature: 0.7                                                           │
│  │  └─ maxTokens: 2000                                                            │
│  │  └─ enableAnalytics: true                                                      │
│  │                                                                                 │
│  └─ Session ID: "loop-session-1704067200000"                                      │
└─────────────────────────────────┬───────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        COMMAND DETECTION & ROUTING                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─ Session Variable Commands ─────────┐  ┌─ CLI Commands ─────────────────────┐   │
│  │  • set provider googleVertex        │  │  • generate "prompt"               │   │
│  │  • get temperature                  │  │  • stream "prompt"                 │   │
│  │  • unset maxTokens                  │  │  • batch file.txt                  │   │
│  │  • show (all variables)             │  │  • status                          │   │
│  │  • clear (all variables)            │  │  • (all existing CLI commands)     │   │
│  └──────────────────────────────────────┘  └─────────────────────────────────────┘   │
│           │                                           │                             │
│           ▼                                           ▼                             │
│  ┌─ Direct Execution ─────────────────┐  ┌─ Enhanced Command Handler ──────────┐   │
│  │  Update session state              │  │  src/cli/factories/commandFactory.ts│   │
│  │  Show confirmation                 │  │                                     │   │
│  └─────────────────────────────────────┘  │  ┌─ Automatic Application ──────┐  │   │
│                                           │  │                              │  │   │
│                                           │  │ Input: generate "tell me     │  │   │
│                                           │  │        about hooks"          │  │   │
│                                           │  │                              │  │   │
│                                           │  │ Step 1: Get Session Variables│  │   │
│                                           │  │   provider: "googleVertex"   │  │   │
│                                           │  │   temperature: 0.7           │  │   │
│                                           │  │   enableAnalytics: true      │  │   │
│                                           │  │                              │  │   │
│                                           │  │ Step 2: Merge Arguments      │  │   │
│                                           │  │   Original: { prompt: "..." }│  │   │
│                                           │  │   Enhanced: { prompt: "...", │  │   │
│                                           │  │     provider: "googleVertex",│  │   │
│                                           │  │     temperature: 0.7,        │  │   │
│                                           │  │     enableAnalytics: true }  │  │   │
│                                           │  │                              │  │   │
│                                           │  │ Step 3: Add Context          │  │   │
│                                           │  │   context = { sessionId }    │  │   │
│                                           │  │                              │  │   │
│                                           │  │ Step 4: Get NeuroLink        │  │   │
│                                           │  │   sdk = getOrCreateNeuroLink │  │   │
│                                           │  └──────────────────────────────┘  │   │
│                                           └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┬───────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            COMMAND EXECUTION                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─ Execute Command ───────────────────────────────────────────────────────────┐   │
│  │  const result = await sdk.generate(enhancedOptions, context);              │   │
│  │                                                                             │   │
│  │  // sdk = persistent NeuroLink instance                                    │   │
│  │  // enhancedOptions = user input + session variables                       │   │
│  │  // context = conversation memory context                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌─ Result Processing ─────────────────────────────────────────────────────────┐   │
│  │  IF success:                                                                │   │
│  │    • Display formatted result                                              │   │
│  │    • Show analytics if enabled                                             │   │
│  │    • Return to loop prompt                                                 │   │
│  │                                                                             │   │
│  │  IF error:                                                                  │   │
│  │    • Display error message                                                 │   │
│  │    • Preserve session state                                                │   │
│  │    • Continue loop (don't exit)                                            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Analysis

### 1. Session Initialization Flow
```
User Command: neurolink loop --enable-conversation-memory
           ↓
Loop Session Manager creates Global Session State
           ↓
Global Session Manager creates NeuroLink instance with conversation memory
           ↓
Session ID generated: "loop-session-1704067200000"
           ↓
Interactive prompt displayed: "neurolink>"
```

### 2. Session Variable Management Flow
```
User Input: set provider googleVertex
         ↓
Loop Session Manager detects session variable command
         ↓
Global Session Manager updates sessionVariables.provider = "googleVertex"
         ↓
Confirmation displayed: "✓ provider set to googleVertex"
         ↓
Return to prompt
```

### 3. Enhanced Command Execution Flow
```
User Input: generate "tell me about hooks"
         ↓
Loop Session Manager parses with yargs → routes to generate command
         ↓
Enhanced Command Handler (executeGenerate):
  1. Get persistent NeuroLink: globalSession.getOrCreateNeuroLink()
  2. Get session variables: globalSession.getSessionVariables()
  3. Merge: userArgs + sessionVariables
  4. Add conversation context: globalSession.getCurrentSessionId()
         ↓
Execute: sdk.generate(enhancedOptions, conversationContext)
         ↓
Display result and return to prompt
```

### 4. Error Handling Flow
```
Command execution error occurs
         ↓
Enhanced Command Handler catches error
         ↓
Display formatted error message
         ↓
Session state preserved (no cleanup)
         ↓
Return to prompt (continue loop)
```

### 5. Session Cleanup Flow
```
User Input: exit (or Ctrl+C)
         ↓
Loop Session Manager cleanup:
  1. Clear conversation session if memory enabled
  2. Clear global session state
  3. Cleanup NeuroLink instance
         ↓
Session terminated gracefully
```

## Session Variable System

### Built-in Session Commands

| Command | Description | Example |
|---------|-------------|---------|
| `set <key> <value>` | Store session variable | `set provider openai` |
| `get <key>` | Show session variable value | `get temperature` |
| `unset <key>` | Remove session variable | `unset maxTokens` |
| `show` | Display all session variables | `show` |
| `clear` | Remove all session variables | `clear` |

### Supported Session Variables

All CLI flags from existing commands can be stored as session variables:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `provider` | string | AI provider to use | `googleVertex`, `openai`, `anthropic` |
| `model` | string | Specific model name | `gemini-2.0-flash`, `gpt-4` |
| `temperature` | number | Response creativity (0-1) | `0.7` |
| `maxTokens` | number | Maximum response length | `2000` |
| `timeout` | number | Request timeout (ms) | `30000` |
| `enableAnalytics` | boolean | Show usage analytics | `true`, `false` |
| `enableEvaluation` | boolean | Show response evaluation | `true`, `false` |

## Enhanced Command Integration

### Current CLI Commands Enhancement

All existing CLI commands automatically get enhanced with session variable application:

- **generate**: Text generation with auto-applied preferences
- **stream**: Streaming generation with session variables + conversation context  
- **batch**: Batch processing with consistent session settings
- **status**: Provider status checking (timeout from session variables)
- **Future commands**: Any new CLI command automatically inherits session variable system

### Enhancement Pattern & Implementation Requirements

**EVERY CLI command handler MUST follow this pattern for Loop Mode compatibility:**

```typescript
private static async executeYourCommand(argv: CommandArgs) {
  try {
    // ✅ STEP 1: Get persistent session (backward compatible)
    const sdk = globalSession.getOrCreateNeuroLink();
    // When NOT in Loop Mode: returns new NeuroLink() (no change)
    // When IN Loop Mode: returns persistent instance (enhanced)
    
    // ✅ STEP 2: Apply session variables (Loop Mode only)
    const sessionVariables = globalSession.getSessionVariables();
    const enhancedOptions = { ...argv, ...sessionVariables };
    // When NOT in Loop Mode: sessionVariables = {} (no change)
    // When IN Loop Mode: applies stored preferences automatically
    
    // ✅ STEP 3: Add conversation context (Loop Mode only)
    const sessionId = globalSession.getCurrentSessionId();
    const context = sessionId ? { sessionId } : undefined;
    // When NOT in Loop Mode: context = undefined (no change)
    // When IN Loop Mode: includes conversation context
    
    // ✅ STEP 4: Execute with enhanced options
    const result = await sdk.yourMethod(enhancedOptions, context);
    
    // ✅ STEP 5: Display results (existing logic unchanged)
    this.handleOutput(result, enhancedOptions);
    
  } catch (error) {
    // ✅ STEP 6: Throw error (don't process.exit in Loop Mode)
    throw error;
  }
}
```

**Key Benefits:**
- ✅ **Zero Breaking Changes**: Regular CLI works exactly as before
- ✅ **Loop Mode Enhancement**: Automatic session variables + conversation memory
- ✅ **Single Pattern**: Works seamlessly in both regular CLI and Loop Mode
- ✅ **Backward Compatible**: `getOrCreateNeuroLink()` returns `new NeuroLink()` when not in Loop Mode

**Commands Requiring This Pattern:**
- ✅ `generate` - Update to use getOrCreateNeuroLink()
- ✅ `stream` - Update to use getOrCreateNeuroLink()  
- ✅ `batch` - Update to use getOrCreateNeuroLink()
- ✅ `provider status` - Update to use getOrCreateNeuroLink()
- ✅ All MCP commands - Update to use getOrCreateNeuroLink()

**New Commands Implementing This Pattern:**
- ✅ `tools` (getAllAvailableTools) - Example implementation above
- ✅ `executeTool` - Execute individual MCP tools
- ✅ `registerTool` - Register new MCP tools
- ✅ `getMCPStatus` - Check MCP server connectivity  
- ✅ Any future SDK method exposed as CLI command

## Benefits

### User Experience
- **Set Once, Use Everywhere**: Configure preferences once, automatically applied
- **Conversation Continuity**: Persistent context across all commands in session
- **Rapid Iteration**: No process restart overhead, no repetitive flag specification
- **Familiar Interface**: Same CLI commands, enhanced behavior

### Technical Benefits
- **Zero Breaking Changes**: All existing CLI functionality unchanged
- **Persistent Session**: Same NeuroLink instance throughout loop
- **Automatic Context**: Session variables + conversation memory applied transparently
- **Graceful Error Handling**: Errors don't terminate session

### Developer Experience  
- **Clean Architecture**: Global session state with automatic detection
- **Extensible**: Easy to add new session variables or enhance existing commands
- **Testable**: Clear separation of concerns with modular components

## Implementation Strategy

### Phase 1: Core Infrastructure
- Create Global Session Manager with session variable storage
- Implement Loop Session Manager with inquirer prompt loop
- Add session variable commands (set/get/unset/show/clear)

### Phase 2: Command Enhancement
- Modify existing command handlers to use global session state
- Implement automatic session variable application
- Add conversation memory context integration

### Phase 3: Error Handling & Polish
- Enhance error handling for graceful loop continuation
- Add session cleanup on exit
- Implement comprehensive testing

### Phase 4: Documentation & Examples
- Create usage examples and best practices
- Document session variable system
- Add testing strategy validation

## Usage Examples

### Basic Loop Session
```bash
neurolink loop

neurolink> generate "Hello world"
neurolink> set provider openai
neurolink> generate "Hello from OpenAI"
neurolink> exit
```

### Loop with Conversation Memory
```bash
neurolink loop --enable-conversation-memory

neurolink> set provider googleVertex
neurolink> set temperature 0.8
neurolink> generate "I'm building a React app"
neurolink> generate "What state management should I use?"
# ↑ AI knows about React app from previous conversation
neurolink> set temperature 0.2
neurolink> generate "Give me specific code examples"  
# ↑ More focused response, still knows conversation context
neurolink> exit
```

### Session Variable Management
```bash
neurolink loop

neurolink> set provider anthropic
neurolink> set model claude-3-sonnet
neurolink> set maxTokens 1000
neurolink> show
# Displays:
# provider: anthropic
# model: claude-3-sonnet  
# maxTokens: 1000

neurolink> generate "Explain async/await"
# Uses all session variables automatically

neurolink> unset maxTokens
neurolink> get provider
# Displays: anthropic

neurolink> clear
neurolink> show
# Displays: No session variables set

neurolink> exit
```

## Future Commands Example: getAllAvailableTools

As part of the Loop Mode implementation, we'll add new CLI commands that showcase the power of persistent sessions and session variables. Here's a complete example:

### Command: `neurolink tools` (or `neurolink mcp tools`)

**Purpose**: Discover all available MCP tools across servers with filtering and search capabilities.

#### CLI Command Implementation
```typescript
// Add to CLI command factory
static createToolsListCommand(): CommandModule {
  return {
    command: ["tools", "list-tools"],
    describe: "Discover all available MCP tools across servers",
    builder: (yargs) => {
      return this.buildOptions(yargs
        .option("server", {
          type: "string",
          description: "Filter by specific MCP server",
          alias: "s"
        })
        .option("category", {
          type: "string", 
          description: "Filter by tool category",
          alias: "c"
        })
        .option("search", {
          type: "string",
          description: "Search tool names/descriptions", 
          alias: "q"
        })
        .option("detailed", {
          type: "boolean",
          default: false,
          description: "Show detailed tool information",
          alias: "d"
        }));
    },
    handler: async (argv) => await this.executeGetAllTools(argv)
  };
}

// ✅ CRITICAL: Use getOrCreateNeuroLink() pattern
private static async executeGetAllTools(argv: ToolsCommandArgs) {
  const options = this.processOptions(argv);
  const spinner = argv.quiet ? null : ora("🔍 Discovering available tools...").start();

  try {
    // ✅ CRITICAL: Get persistent NeuroLink instance (not new NeuroLink())
    const sdk = globalSession.getOrCreateNeuroLink();
    
    // Apply session variables automatically
    const sessionVariables = globalSession.getSessionVariables();
    const enhancedOptions = { ...options, ...sessionVariables };
    
    // Execute with enhanced options
    const tools = await sdk.getAllAvailableTools({
      serverFilter: enhancedOptions.server,
      categoryFilter: enhancedOptions.category,
      searchQuery: enhancedOptions.search,
      includeDetails: enhancedOptions.detailed
    });

    if (spinner) {
      spinner.succeed(`✅ Found ${tools.length} available tools`);
    }

    // Format and display tools
    this.displayToolsList(tools, enhancedOptions);
    
  } catch (error) {
    if (spinner) spinner.fail();
    throw error; // Don't process.exit(1) in Loop Mode
  }
}
```

#### Loop Mode Usage Example
```bash
neurolink loop --enable-conversation-memory

neurolink> set server filesystem
neurolink> set detailed true
neurolink> tools
# ↑ Uses server=filesystem, detailed=true automatically

📦 MCP Tool Details (8 tools found):

🗂️  filesystem (github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
   Status: ✅ Connected
   Tools: 8 available
   
   📁 read_file
      Description: Read the complete contents of a file
      Parameters: path (required), encoding (optional)
      Example: read_file("/path/to/file.txt")
   
   📁 write_file
      Description: Write content to a file
      Parameters: path (required), content (required)
      Example: write_file("/path/to/file.txt", "Hello World")

neurolink> set server github
neurolink> tools --search repo
# ↑ Now searches GitHub server tools for "repo"

neurolink> unset server
neurolink> tools
# ↑ Shows all tools from all servers (detailed=true still applied)
```

#### Benefits in Loop Mode
1. **Session Variable Integration**: Store preferred filters (server, detailed mode)
2. **Tool Chain Discovery**: Discover tools → use them in same session
3. **Interactive Workflow**: `tools` → `mcp exec tool_name` → continue working
4. **Context Building**: Tool discovery builds context for subsequent commands


## Testing Strategy

### Unit Tests
- Global Session Manager state management and variable storage
- Loop Session Manager command parsing and routing
- Session variable commands (set/get/unset/show/clear)
- Automatic application engine variable merging
- **NEW**: getOrCreateNeuroLink() pattern validation
- **NEW**: getAllAvailableTools command functionality

### Integration Tests  
- Complete loop session workflows with multiple commands
- Session variable persistence across different command types
- Conversation memory integration with session variables
- Error handling that preserves session state
- **NEW**: getAllAvailableTools with session variable filtering
- **NEW**: SDK session persistence across command executions

### End-to-End Tests
- Full user workflows with session configuration and command execution
- Conversation memory behavior with session variable changes
- Session cleanup and graceful termination
- Performance with extended loop sessions
- **NEW**: Tool discovery → tool execution → conversation flow
- **NEW**: Session variable changes affecting tool discovery results

---

## Implementation Tasks

### Phase 1: Global Session State Management

#### 1.1 Create Global Session Manager
**File**: `src/lib/session/globalSessionState.ts`

```typescript
interface LoopSessionState {
  neurolinkInstance: NeuroLink;
  sessionId: string;
  isActive: boolean;
  conversationMemoryConfig?: ConversationMemoryConfig;
  sessionVariables: Record<string, any>;
}

class GlobalSessionManager {
  private static instance: GlobalSessionManager;
  private loopSession: LoopSessionState | null = null;

  static getInstance(): GlobalSessionManager {
    if (!GlobalSessionManager.instance) {
      GlobalSessionManager.instance = new GlobalSessionManager();
    }
    return GlobalSessionManager.instance;
  }

  setLoopSession(config?: ConversationMemoryConfig): string {
    const sessionId = `loop-session-${Date.now()}`;
    const neurolinkOptions: any = {};
    
    if (config?.enabled) {
      neurolinkOptions.conversationMemory = {
        enabled: true,
        maxSessions: config.maxSessions,
        maxTurnsPerSession: config.maxTurnsPerSession,
      };
    }
    
    this.loopSession = {
      neurolinkInstance: new NeuroLink(neurolinkOptions),
      sessionId,
      isActive: true,
      conversationMemoryConfig: config,
      sessionVariables: {}
    };
    
    return sessionId;
  }

  getLoopSession(): LoopSessionState | null {
    return this.loopSession?.isActive ? this.loopSession : null;
  }

  clearLoopSession(): void {
    if (this.loopSession) {
      this.loopSession.isActive = false;
      this.loopSession = null;
    }
  }

  getOrCreateNeuroLink(): NeuroLink {
    const session = this.getLoopSession();
    return session ? session.neurolinkInstance : new NeuroLink();
  }

  getCurrentSessionId(): string | undefined {
    return this.getLoopSession()?.sessionId;
  }

  // Session variable management
  setSessionVariable(key: string, value: any): void {
    const session = this.getLoopSession();
    if (session) {
      session.sessionVariables[key] = value;
    }
  }

  getSessionVariable(key: string): any {
    const session = this.getLoopSession();
    return session?.sessionVariables[key];
  }

  getSessionVariables(): Record<string, any> {
    const session = this.getLoopSession();
    return session?.sessionVariables || {};
  }

  unsetSessionVariable(key: string): boolean {
    const session = this.getLoopSession();
    if (session && key in session.sessionVariables) {
      delete session.sessionVariables[key];
      return true;
    }
    return false;
  }

  clearSessionVariables(): void {
    const session = this.getLoopSession();
    if (session) {
      session.sessionVariables = {};
    }
  }
}

export const globalSession = GlobalSessionManager.getInstance();
```

#### 1.2 Create Loop Session Manager
**File**: `src/cli/loopSession.ts`

```typescript
import inquirer from 'inquirer';
import yargs from 'yargs';
import chalk from 'chalk';
import toArgv from 'string-argv';
import { logger } from '../lib/utils/logger.js';
import { globalSession } from '../lib/session/globalSessionState.js';
import { ConversationMemoryConfig } from '../lib/types/index.js';

export class LoopSession {
  private yargsInstance: yargs.Argv;
  private isRunning = false;
  private sessionId?: string;

  constructor(
    cli: yargs.Argv,
    private conversationMemoryConfig?: ConversationMemoryConfig
  ) {
    this.yargsInstance = cli
      .scriptName('')
      .fail((msg, err) => {
        throw err || new Error(msg);
      })
      .exitProcess(false);
  }

  public async start(): Promise<void> {
    // Initialize global session state
    this.sessionId = globalSession.setLoopSession(this.conversationMemoryConfig);
    
    this.isRunning = true;
    logger.always(chalk.bold.green('Welcome to NeuroLink Loop Mode!'));
    
    if (this.conversationMemoryConfig?.enabled) {
      logger.always(chalk.gray(`Session ID: ${this.sessionId}`));
      logger.always(chalk.gray('Conversation memory enabled'));
      logger.always(chalk.gray(`Max sessions: ${this.conversationMemoryConfig.maxSessions}`));
      logger.always(chalk.gray(`Max turns per session: ${this.conversationMemoryConfig.maxTurnsPerSession}`));
    }
    
    logger.always(chalk.gray('Type "exit" or use Ctrl+C to quit.'));
    logger.always(chalk.gray('Use "set <key> <value>" to configure session variables.'));

    while (this.isRunning) {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'command',
            message: chalk.blue.bold('neurolink>'),
          },
        ]);

        const command = answers.command.trim();
        if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
          this.isRunning = false;
          continue;
        }
        if (!command) continue;

        // Handle session variable commands first
        if (await this.handleSessionCommands(command)) {
          continue;
        }

        // Parse and execute CLI commands
        const argv = toArgv(command);
        await this.yargsInstance.parseAsync(argv);

      } catch (error) {
        const { handleError } = await import('./index.js');
        handleError(error as Error, 'Command Failed', false);
      }
    }

    // Cleanup on exit
    globalSession.clearLoopSession();
    logger.always(chalk.yellow('Loop session ended.'));
  }

  private async handleSessionCommands(command: string): Promise<boolean> {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'set':
        if (parts.length >= 3) {
          const key = parts[1];
          const value = this.parseValue(parts.slice(2).join(' '));
          globalSession.setSessionVariable(key, value);
          logger.always(chalk.green(`✓ ${key} set to ${value}`));
        } else {
          logger.always(chalk.red('Usage: set <key> <value>'));
        }
        return true;

      case 'get':
        if (parts.length >= 2) {
          const key = parts[1];
          const value = globalSession.getSessionVariable(key);
          if (value !== undefined) {
            logger.always(chalk.cyan(`${key}: ${value}`));
          } else {
            logger.always(chalk.yellow(`${key} is not set`));
          }
        } else {
          logger.always(chalk.red('Usage: get <key>'));
        }
        return true;

      case 'unset':
        if (parts.length >= 2) {
          const key = parts[1];
          if (globalSession.unsetSessionVariable(key)) {
            logger.always(chalk.green(`✓ ${key} unset`));
          } else {
            logger.always(chalk.yellow(`${key} was not set`));
          }
        } else {
          logger.always(chalk.red('Usage: unset <key>'));
        }
        return true;

      case 'show':
        const variables = globalSession.getSessionVariables();
        if (Object.keys(variables).length > 0) {
          logger.always(chalk.cyan('Session Variables:'));
          for (const [key, value] of Object.entries(variables)) {
            logger.always(chalk.gray(`  ${key}: ${value}`));
          }
        } else {
          logger.always(chalk.yellow('No session variables set'));
        }
        return true;

      case 'clear':
        globalSession.clearSessionVariables();
        logger.always(chalk.green('✓ All session variables cleared'));
        return true;

      default:
        return false;
    }
  }

  private parseValue(value: string): any {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    // Return as string
    return value;
  }
}
```

### Phase 2: CLI Integration

#### 2.1 Add Loop Command
**File**: `src/cli/index.ts` (modifications)

```typescript
// Add loop command with conversation memory flags
.command(
  'loop',
  'Start an interactive loop session',
  (yargs) => {
    return yargs
      .option('enable-conversation-memory', {
        type: 'boolean',
        description: 'Enable conversation memory for the loop session',
        default: false
      })
      .option('max-sessions', {
        type: 'number',
        description: 'Maximum number of conversation sessions to keep',
        default: 10
      })
      .option('max-turns-per-session', {
        type: 'number', 
        description: 'Maximum turns per conversation session',
        default: 50
      });
  },
  async (argv) => {
    try {
      let conversationMemoryConfig: ConversationMemoryConfig | undefined;
      
      if (argv['enable-conversation-memory']) {
        conversationMemoryConfig = {
          enabled: true,
          maxSessions: argv['max-sessions'] || 10,
          maxTurnsPerSession: argv['max-turns-per-session'] || 50
        };
      }
      
      const { LoopSession } = await import('./loopSession.js');
      const session = new LoopSession(cli, conversationMemoryConfig);
      await session.start();
    } catch (error) {
      handleError(error as Error, 'Loop Session', true);
    }
  }
)

// Modify handleError function
export function handleError(_error: Error, context: string, shouldExit = true): void {
  logger.error(chalk.red(`❌ ${context} failed: ${_error.message}`));
  
  // ... existing detailed error logging ...
  
  if (shouldExit) {
    process.exit(1);
  }
}
```

### Phase 3: Enhanced Command Handlers

#### 3.1 Update Command Factory
**File**: `src/cli/factories/commandFactory.ts` (modifications)

```typescript
import { globalSession } from '../../lib/session/globalSessionState.js';

// Enhanced executeGenerate function
async function executeGenerate(argv: GenerateArgv): Promise<void> {
  try {
    // Get persistent NeuroLink instance
    const sdk = globalSession.getOrCreateNeuroLink();
    
    // Get session variables and merge with command arguments
    const sessionVariables = globalSession.getSessionVariables();
    const enhancedOptions = { ...argv, ...sessionVariables };
    
    // Add conversation context if available
    const sessionId = globalSession.getCurrentSessionId();
    const context = sessionId ? { sessionId } : undefined;
    
    // Execute with enhanced options and context
    const result = await sdk.generate(enhancedOptions, context);
    
    // Display result (existing formatting logic)
    logger.always(result.text);
    
    // Show analytics if enabled in session variables
    if (sessionVariables.enableAnalytics && result.analytics) {
      // Display analytics (existing logic)
    }
    
  } catch (error) {
    throw error; // Changed from process.exit(1) to throw
  }
}

// Apply same pattern to executeStream, executeBatch, etc.
async function executeStream(argv: StreamArgv): Promise<void> {
  try {
    const sdk = globalSession.getOrCreateNeuroLink();
    const sessionVariables = globalSession.getSessionVariables();
    const enhancedOptions = { ...argv, ...sessionVariables };
    const sessionId = globalSession.getCurrentSessionId();
    const context = sessionId ? { sessionId } : undefined;
    
    // Execute streaming with enhanced context
    // ... existing streaming logic with sdk.stream(enhancedOptions, context)
    
  } catch (error) {
      throw error; // Changed from process.exit(1) to throw
  }
}
