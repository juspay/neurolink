# 🧪 MCP Foundation Testing Guide

**NeuroLink v1.3.0 MCP Foundation** - Comprehensive guide for testing MCP functionality and adding custom MCP servers.

---

## 🎯 **Current MCP Implementation Status**

### **✅ What's Already Working**

- **🏭 MCP Server Factory**: `createMCPServer()` with full validation
- **🧠 Context Management**: Rich context system with 15+ fields
- **📋 Tool Registry**: Complete registration and execution system
- **🎼 Tool Orchestration**: Pipeline execution with error handling
- **🤖 AI Core Server**: 3 production-ready AI tools

### **🔄 What Needs CLI Integration**

The MCP Foundation is complete but not yet exposed via CLI commands. This guide shows both:

1. **Programmatic Testing** (works now)
2. **CLI Integration** (how to add it)

---

## 🧪 **Testing MCP Foundation Programmatically**

### **1. Basic MCP Server Creation**

Create a test file to explore MCP functionality:

```typescript
// test-mcp.ts (TypeScript; run with ts-node or compile first)
import { createMCPServer } from "@juspay/neurolink/mcp";
import {
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
} from "@juspay/neurolink/mcp";

// Create a custom MCP server
const testServer = createMCPServer({
  id: "my-test-server",
  title: "My Test Server",
  description: "Testing custom MCP tools",
  category: "custom",
  visibility: "private",
});

// Add a simple tool
testServer.registerTool({
  name: "hello-world",
  description: "Simple hello world tool for testing",
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    console.log("Hello World tool executed!");
    console.log("Context:", context.sessionId);

    return {
      success: true,
      data: { message: `Hello, ${params.name || "World"}!` },
      metadata: {
        toolName: "hello-world",
        timestamp: Date.now(),
      },
    };
  },
});

console.log("Test server created:", testServer.id);
console.log("Available tools:", Object.keys(testServer.tools));
```

### **2. Testing with AI Core Server**

```typescript
// test-ai-core.ts
import { aiCoreServer } from "@juspay/neurolink/mcp/servers/aiProviders/aiCoreServer";
import { ContextManager } from "@juspay/neurolink/mcp";

async function testAICoreServer() {
  // Create execution context
  const context = ContextManager.createExecutionContext({
    sessionId: "test-session-123",
    userId: "test-user",
    aiProvider: "openai",
    environmentType: "development",
  });

  console.log("🧪 Testing AI Core Server...");

  // Test text generation tool
  try {
    const result = await aiCoreServer.tools["generate"].execute(
      {
        prompt: "Write a haiku about AI",
        temperature: 0.7,
        maxTokens: 100,
      },
      context,
    );

    console.log("✅ Text Generation Result:", result);
  } catch (error) {
    console.error("❌ Text Generation Error:", error);
  }

  // Test provider selection tool
  try {
    const providerResult = await aiCoreServer.tools["select-provider"].execute(
      {
        preferred: "openai",
        requirements: {
          streaming: true,
          costEfficient: true,
        },
      },
      context,
    );

    console.log("✅ Provider Selection Result:", providerResult);
  } catch (error) {
    console.error("❌ Provider Selection Error:", error);
  }

  // Test provider status tool
  try {
    const statusResult = await aiCoreServer.tools[
      "check-provider-status"
    ].execute(
      {
        includeCapabilities: true,
      },
      context,
    );

    console.log("✅ Provider Status Result:", statusResult);
  } catch (error) {
    console.error("❌ Provider Status Error:", error);
  }
}

testAICoreServer();
```

### **3. Testing Tool Registry and Orchestration**

```typescript
// test-orchestration.ts
import { MCPRegistry } from "@juspay/neurolink/mcp";
import { ToolOrchestrator } from "@juspay/neurolink/mcp";
import { ContextManager } from "@juspay/neurolink/mcp";
import { aiCoreServer } from "@juspay/neurolink/mcp/servers/aiProviders/aiCoreServer";

async function testOrchestration() {
  // Initialize registry and orchestrator
  const registry = new MCPRegistry();
  const orchestrator = new ToolOrchestrator(registry);

  // Register AI Core Server
  registry.registerServer(aiCoreServer);

  // Create execution context
  const context = ContextManager.createExecutionContext({
    sessionId: "orchestration-test",
    environmentType: "development",
  });

  console.log("🎼 Testing Tool Orchestration...");

  // Execute single tool
  try {
    const result = await orchestrator.executeTool(
      "neurolink-ai-core",
      "generate",
      { prompt: "Explain quantum computing in one sentence", maxTokens: 50 },
      context,
    );

    console.log("✅ Single Tool Execution:", result);
  } catch (error) {
    console.error("❌ Single Tool Error:", error);
  }

  // Execute pipeline (sequential tools)
  try {
    const pipelineResult = await orchestrator.executePipeline(
      [
        {
          serverId: "neurolink-ai-core",
          toolName: "select-provider",
          params: { preferred: "openai" },
        },
        {
          serverId: "neurolink-ai-core",
          toolName: "generate",
          params: { prompt: "Write a technical joke", maxTokens: 100 },
        },
      ],
      context,
    );

    console.log("✅ Pipeline Execution:", pipelineResult);
  } catch (error) {
    console.error("❌ Pipeline Error:", error);
  }

  // Get orchestrator statistics
  const stats = orchestrator.getStatistics();
  console.log("📊 Orchestrator Statistics:", stats);
}

testOrchestration();
```

---

## 🔨 **Adding Custom MCP Servers**

### **1. Creating a Development Tools Server**

```typescript
// servers/dev-tools-server.ts
import { createMCPServer } from "@juspay/neurolink/mcp";
import { z } from "zod";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "@juspay/neurolink/mcp";

// Create development tools server
export const devToolsServer = createMCPServer({
  id: "neurolink-dev-tools",
  title: "NeuroLink Development Tools",
  description: "Code generation, testing, and development utilities",
  category: "development",
  version: "1.0.0",
  capabilities: [
    "code-generation",
    "test-creation",
    "documentation",
    "refactoring",
  ],
});

// Code Generation Tool
devToolsServer.registerTool({
  name: "generate-component",
  description: "Generate React/Vue/Svelte components with TypeScript",
  inputSchema: z.object({
    framework: z.enum(["react", "vue", "svelte"]),
    componentName: z.string(),
    props: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean().default(false),
        }),
      )
      .optional(),
    styling: z
      .enum(["css", "scss", "styled-components", "tailwind"])
      .optional(),
  }),
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const { framework, componentName, props = [], styling = "css" } = params;

    // Generate component code based on framework
    let componentCode = "";

    if (framework === "react") {
      const propsInterface =
        props.length > 0
          ? `interface ${componentName}Props {\n${props.map((p) => `  ${p.name}${p.required ? "" : "?"}: ${p.type};`).join("\n")}\n}\n\n`
          : "";

      componentCode = `${propsInterface}export function ${componentName}(${props.length > 0 ? `props: ${componentName}Props` : ""}) {
  return (
    <div className="${componentName.toLowerCase()}">
      <h1>${componentName} Component</h1>
      {/* Add your component logic here */}
    </div>
  );
}`;
    } else if (framework === "svelte") {
      const scriptProps =
        props.length > 0
          ? `<script lang="ts">\n${props.map((p) => `  export let ${p.name}: ${p.type}${p.required ? "" : " | undefined"};`).join("\n")}\n</script>\n\n`
          : "";

      componentCode = `${scriptProps}<div class="${componentName.toLowerCase()}">
  <h1>${componentName} Component</h1>
  <!-- Add your component markup here -->
</div>

<style>
  .${componentName.toLowerCase()} {
    /* Add your styles here */
  }
</style>`;
    }

    return {
      success: true,
      data: {
        code: componentCode,
        framework,
        componentName,
        propsCount: props.length,
        styling,
      },
      metadata: {
        toolName: "generate-component",
        serverId: "neurolink-dev-tools",
        timestamp: Date.now(),
      },
    };
  },
});

// Test Generation Tool
devToolsServer.registerTool({
  name: "generate-tests",
  description: "Generate unit tests for components or functions",
  inputSchema: z.object({
    testFramework: z.enum(["vitest", "jest", "playwright"]),
    targetFile: z.string(),
    functions: z.array(z.string()),
    coverage: z.enum(["basic", "comprehensive"]).default("basic"),
  }),
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const { testFramework, targetFile, functions, coverage } = params;

    const testTemplate = `import { describe, it, expect } from '${testFramework}';
import { ${functions.join(", ")} } from '${targetFile}';

${functions
  .map(
    (fn) => `describe('${fn}', () => {
  it('should ${coverage === "comprehensive" ? "handle all edge cases" : "work correctly"}', () => {
    // Test implementation for ${fn}
    expect(${fn}).toBeDefined();
  });
});`,
  )
  .join("\n\n")}`;

    return {
      success: true,
      data: {
        testCode: testTemplate,
        testFramework,
        functionsCount: functions.length,
        coverage,
      },
      metadata: {
        toolName: "generate-tests",
        serverId: "neurolink-dev-tools",
        timestamp: Date.now(),
      },
    };
  },
});

console.log(
  "[DevTools] Development Tools Server created with tools:",
  Object.keys(devToolsServer.tools),
);
```

### **2. Creating a Content Creation Server**

```typescript
// servers/content-server.ts
import { createMCPServer } from "@juspay/neurolink/mcp";
import { z } from "zod";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "@juspay/neurolink/mcp";

export const contentServer = createMCPServer({
  id: "neurolink-content",
  title: "NeuroLink Content Creation",
  description: "Blog posts, documentation, and marketing content generation",
  category: "content",
  version: "1.0.0",
});

// Blog Post Generation Tool
contentServer.registerTool({
  name: "generate-blog-post",
  description: "Generate blog posts with SEO optimization",
  inputSchema: z.object({
    topic: z.string(),
    audience: z.enum(["technical", "business", "general"]),
    length: z.enum(["short", "medium", "long"]),
    tone: z.enum(["professional", "casual", "educational"]),
    includeSEO: z.boolean().default(true),
  }),
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    // Use AI Core Server for content generation
    const aiResult = (await context.toolChain?.includes("neurolink-ai-core"))
      ? { content: `Generated blog post about ${params.topic}...` }
      : {
          content: `Mock blog post about ${params.topic} for ${params.audience} audience`,
        };

    const metadata = {
      wordCount:
        params.length === "short"
          ? 500
          : params.length === "medium"
            ? 1000
            : 2000,
      readingTime:
        params.length === "short" ? 2 : params.length === "medium" ? 5 : 8,
      seoOptimized: params.includeSEO,
    };

    return {
      success: true,
      data: {
        content: aiResult.content,
        ...metadata,
        topic: params.topic,
        audience: params.audience,
      },
      metadata: {
        toolName: "generate-blog-post",
        serverId: "neurolink-content",
        timestamp: Date.now(),
      },
    };
  },
});

console.log(
  "[Content] Content Creation Server created with tools:",
  Object.keys(contentServer.tools),
);
```

---

## 🖥️ **Adding MCP Commands to CLI**

To integrate MCP functionality into the CLI, add these commands to `src/cli/index.ts`:

### **1. MCP Server Management Commands**

```typescript
// Add to CLI (src/cli/index.ts)

.command('mcp <subcommand>', 'Manage MCP servers and tools',
  (yargsMCP) => {
    yargsMCP
      .usage('Usage: $0 mcp <subcommand> [options]')
      .command('list-servers', 'List all registered MCP servers',
        () => {},
        async (argv) => {
          const registry = new MCPRegistry();
          // Register default servers
          registry.registerServer(aiCoreServer);

          const servers = registry.listServers();
          console.log(chalk.blue('📋 Registered MCP Servers:'));
          servers.forEach(server => {
            console.log(`  • ${chalk.green(server.id)} - ${server.title}`);
            console.log(`    Category: ${server.category}, Tools: ${server.toolCount}`);
          });
        }
      )
      .command('list-tools [serverId]', 'List tools for all servers or specific server',
        (y) => y.positional('serverId', {
          type: 'string',
          description: 'Optional server ID to filter tools'
        }),
        async (argv) => {
          const registry = new MCPRegistry();
          registry.registerServer(aiCoreServer);

          const tools = argv.serverId
            ? registry.getServerTools(argv.serverId)
            : registry.listAllTools();

          console.log(chalk.blue('🔧 Available MCP Tools:'));
          tools.forEach(tool => {
            console.log(`  • ${chalk.green(tool.name)} (${tool.serverId})`);
            console.log(`    ${tool.description}`);
          });
        }
      )
      .command('execute <serverId> <toolName>', 'Execute an MCP tool',
        (y) => y
          .positional('serverId', { type: 'string', demandOption: true })
          .positional('toolName', { type: 'string', demandOption: true })
          .option('params', { type: 'string', description: 'JSON parameters for the tool' })
          .option('session', { type: 'string', default: 'cli-session', description: 'Session ID' }),
        async (argv) => {
          const registry = new MCPRegistry();
          const orchestrator = new ToolOrchestrator(registry);

          // Register servers
          registry.registerServer(aiCoreServer);

          const context = ContextManager.createExecutionContext({
            sessionId: argv.session,
            environmentType: 'development',
            aiProvider: 'auto'
          });

          try {
            const params = argv.params ? JSON.parse(argv.params) : {};
            const result = await orchestrator.executeTool(
              argv.serverId,
              argv.toolName,
              params,
              context
            );

            console.log(chalk.green('✅ Tool execution successful:'));
            console.log(JSON.stringify(result, null, 2));
          } catch (error) {
            console.error(chalk.red('❌ Tool execution failed:'), error);
          }
        }
      )
      .demandCommand(1, 'Please specify an MCP subcommand');
  }
)
```

### **2. Quick MCP Testing Commands**

```typescript
// Add convenience commands
.command('mcp-generate <prompt>', 'Quick AI text generation via MCP',
  (y) => y
    .positional('prompt', { type: 'string', demandOption: true })
    .option('provider', { type: 'string', description: 'Preferred AI provider' }),
  async (argv) => {
    const registry = new MCPRegistry();
    const orchestrator = new ToolOrchestrator(registry);
    registry.registerServer(aiCoreServer);

    const context = ContextManager.createExecutionContext({
      sessionId: 'mcp-cli-' + Date.now(),
      aiProvider: argv.provider
    });

    try {
      const result = await orchestrator.executeTool(
        'neurolink-ai-core',
        'generate',
        { prompt: argv.prompt, maxTokens: 200 },
        context
      );

      if (result.success) {
        console.log('\n' + result.data.text + '\n');
        console.log(chalk.blue(`Provider: ${result.data.provider}`));
      } else {
        console.error(chalk.red('Generation failed:'), result.error);
      }
    } catch (error) {
      console.error(chalk.red('MCP execution error:'), error);
    }
  }
)
```

---

## 🧪 **Running MCP Tests**

### **1. Run Existing Test Suite**

```bash
# Run comprehensive MCP tests
pnpm run test:run

# Run specific MCP tests
npx vitest run test/mcp-comprehensive.test.ts
```

### **2. Test Custom MCP Server**

Create and run a test file:

```bash
# Create test file
cat > test-custom-mcp.ts << 'EOF'
import { createMCPServer } from '@juspay/neurolink/mcp';

const myServer = createMCPServer({
  id: 'test-server',
  title: 'Test Server'
});

myServer.registerTool({
  name: 'test-tool',
  description: 'Test tool',
  execute: async () => ({ success: true, data: 'Hello from MCP!' })
});

console.log('Server created:', myServer.id);
console.log('Tools:', Object.keys(myServer.tools));
EOF

# Install ts-node if not available
npm install -g ts-node typescript
# Or use npx for one-time execution without global install

# Run test
npx ts-node test-custom-mcp.ts
```

### **3. Test MCP via Node.js REPL**

```bash
# Start Node.js REPL with NeuroLink
node -r ts-node/register

# In REPL:
> const { createMCPServer } = require('@juspay/neurolink/mcp');
> const server = createMCPServer({ id: 'repl-test', title: 'REPL Test' });
> console.log('Server created:', server.id);
```

---

## 📊 **MCP Development Workflow**

### **1. Development Cycle**

1. **Create MCP Server** - Use `createMCPServer()`
2. **Add Tools** - Register tools with validation
3. **Test Tools** - Use registry and orchestrator
4. **Integrate with CLI** - Add CLI commands
5. **Run Tests** - Validate functionality

### **2. Best Practices**

- **Use TypeScript** for full type safety
- **Validate inputs** with Zod schemas
- **Handle errors** gracefully in tools
- **Log execution** for debugging
- **Test thoroughly** before deployment

### **3. Performance Monitoring**

```typescript
// Monitor tool performance
const stats = orchestrator.getStatistics();
console.log("Tool execution stats:", stats);

// Track context usage
const contextStats = ContextManager.getStatistics();
console.log("Context management stats:", contextStats);
```

---

## 🚀 **Next Steps**

1. **✅ Test Current Implementation** - Use programmatic testing examples
2. **🔧 Add CLI Integration** - Implement MCP CLI commands
3. **🏗️ Create Custom Servers** - Build domain-specific tool servers
4. **📊 Monitor Performance** - Track tool execution and usage
5. **🔄 Iterate and Improve** - Enhance based on real usage

**MCP Foundation is production-ready and waiting for your custom tools!** 🎉
