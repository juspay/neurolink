# Tool Chaining with MCP

## Problem

Complex tasks require multiple MCP tool calls in sequence:

- Search → Read → Analyze → Write
- Query database → Process → Store results
- Fetch data → Transform → Send notification

Manually orchestrating tool calls is:

- Error-prone
- Difficult to manage state
- Hard to handle failures
- Not reusable

## Solution

Implement intelligent tool chaining with:

1. Automatic tool selection
2. State management
3. Error recovery
4. Result validation
5. Chain composition

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type ChainStep = {
  toolName: string;
  args: Record<string, any>;
  validateResult?: (result: any) => boolean;
  onError?: (error: Error) => "retry" | "skip" | "abort";
};

type ChainContext = {
  steps: ChainStep[];
  results: any[];
  currentStep: number;
  metadata: Record<string, any>;
};

class ToolChain {
  private neurolink: NeuroLink;
  private context: ChainContext;

  constructor() {
    this.neurolink = new NeuroLink({
      mcpServers: {
        filesystem: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
        },
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || "",
          },
        },
      },
    });

    this.context = {
      steps: [],
      results: [],
      currentStep: 0,
      metadata: {},
    };
  }

  /**
   * Add step to chain
   */
  addStep(step: ChainStep): this {
    this.context.steps.push(step);
    return this; // Fluent interface
  }

  /**
   * Execute tool chain
   */
  async execute(): Promise<{
    success: boolean;
    results: any[];
    errors: Error[];
  }> {
    const errors: Error[] = [];

    console.log(
      `🔗 Executing chain with ${this.context.steps.length} steps...\n`,
    );

    for (let i = 0; i < this.context.steps.length; i++) {
      this.context.currentStep = i;
      const step = this.context.steps[i];

      console.log(
        `📍 Step ${i + 1}/${this.context.steps.length}: ${step.toolName}`,
      );

      try {
        const result = await this.executeStep(step);

        // Validate result if validator provided
        if (step.validateResult && !step.validateResult(result)) {
          throw new Error("Result validation failed");
        }

        this.context.results[i] = result;
        console.log(`✅ Step ${i + 1} completed\n`);
      } catch (error: any) {
        console.error(`❌ Step ${i + 1} failed:`, error.message);
        errors.push(error);

        // Handle error
        const action = step.onError?.(error) || "abort";

        if (action === "abort") {
          console.log("🛑 Aborting chain");
          return { success: false, results: this.context.results, errors };
        }

        if (action === "retry") {
          console.log("🔄 Retrying step...");
          i--; // Retry current step
          continue;
        }

        if (action === "skip") {
          console.log("⏭️  Skipping step");
          this.context.results[i] = null;
          continue;
        }
      }
    }

    console.log("✅ Chain execution complete");

    return {
      success: errors.length === 0,
      results: this.context.results,
      errors,
    };
  }

  /**
   * Execute single step
   */
  private async executeStep(step: ChainStep): Promise<any> {
    // Replace placeholders in args with previous results
    const processedArgs = this.processArgs(step.args);

    // Use AI to execute tool
    const result = await this.neurolink.generate({
      input: {
        text: `Execute the tool "${step.toolName}" with these arguments: ${JSON.stringify(processedArgs)}`,
      },
      enableTools: true,
    });

    return this.extractToolResult(result);
  }

  /**
   * Process args to replace placeholders with previous results
   */
  private processArgs(args: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string" && value.startsWith("$")) {
        // Reference to previous result
        const stepIndex = parseInt(value.slice(1));
        processed[key] = this.context.results[stepIndex];
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * Extract tool result from AI response
   */
  private extractToolResult(response: any): any {
    // Implementation depends on response format
    return response.toolResults?.[0] || response.content;
  }

  /**
   * Get chain context
   */
  getContext(): ChainContext {
    return this.context;
  }

  /**
   * Reset chain
   */
  reset(): this {
    this.context = {
      steps: [],
      results: [],
      currentStep: 0,
      metadata: {},
    };
    return this;
  }
}

/**
 * Pre-built chain templates
 */
class ChainTemplates {
  /**
   * Search → Read → Summarize chain
   */
  static searchAnalyzeChain(query: string, maxFiles: number = 3): ToolChain {
    const chain = new ToolChain();

    return chain
      .addStep({
        toolName: "search_files",
        args: { query, max_results: maxFiles },
      })
      .addStep({
        toolName: "read_file",
        args: { path: "$0" }, // Use result from step 0
      })
      .addStep({
        toolName: "analyze_content",
        args: { content: "$1" },
      });
  }

  /**
   * Fetch → Process → Save chain
   */
  static fetchProcessSaveChain(url: string, outputPath: string): ToolChain {
    const chain = new ToolChain();

    return chain
      .addStep({
        toolName: "fetch_url",
        args: { url },
        validateResult: (result) => result.status === 200,
      })
      .addStep({
        toolName: "process_data",
        args: { data: "$0" },
      })
      .addStep({
        toolName: "write_file",
        args: {
          path: outputPath,
          content: "$1",
        },
        onError: () => "retry",
      });
  }

  /**
   * GitHub workflow: Create issue → Create branch → Push → Create PR
   */
  static githubWorkflowChain(
    repo: string,
    issueTitle: string,
    branchName: string,
  ): ToolChain {
    const chain = new ToolChain();

    return chain
      .addStep({
        toolName: "github_create_issue",
        args: {
          repo,
          title: issueTitle,
          body: "Auto-generated issue",
        },
      })
      .addStep({
        toolName: "github_create_branch",
        args: {
          repo,
          branch: branchName,
          from: "main",
        },
      })
      .addStep({
        toolName: "github_push_files",
        args: {
          repo,
          branch: branchName,
          files: [],
          message: `Fixes #$0`, // Reference issue from step 0
        },
      })
      .addStep({
        toolName: "github_create_pr",
        args: {
          repo,
          title: `Fix: ${issueTitle}`,
          head: branchName,
          base: "main",
          body: `Closes #$0`,
        },
      });
  }
}

// Usage Example 1: File Processing Chain
async function example1_FileProcessing() {
  const chain = new ToolChain();

  chain
    .addStep({
      toolName: "list_directory",
      args: { path: "./docs" },
    })
    .addStep({
      toolName: "read_file",
      args: { path: "$0" }, // Read first file from listing
      validateResult: (content) => content.length > 0,
    })
    .addStep({
      toolName: "analyze_content",
      args: { content: "$1" },
    });

  const result = await chain.execute();

  console.log("\n=== Results ===");
  console.log("Success:", result.success);
  console.log("Results:", result.results);
}

// Example 2: Data Pipeline Chain
async function example2_DataPipeline() {
  const chain = new ToolChain();

  chain
    .addStep({
      toolName: "query_database",
      args: {
        query: "SELECT * FROM users WHERE active = true",
      },
    })
    .addStep({
      toolName: "transform_data",
      args: { data: "$0" },
      onError: () => "skip", // Skip transformation errors
    })
    .addStep({
      toolName: "send_notification",
      args: {
        message: "Data pipeline completed: $1",
      },
    });

  await chain.execute();
}

// Example 3: Using Pre-built Templates
async function example3_Templates() {
  // Search and analyze
  const searchChain = ChainTemplates.searchAnalyzeChain("authentication", 5);
  await searchChain.execute();

  // GitHub workflow
  const githubChain = ChainTemplates.githubWorkflowChain(
    "myorg/myrepo",
    "Fix authentication bug",
    "fix/auth-bug",
  );
  await githubChain.execute();
}

// Main
async function main() {
  console.log("=== Example 1: File Processing ===\n");
  await example1_FileProcessing();

  console.log("\n=== Example 2: Data Pipeline ===\n");
  await example2_DataPipeline();

  console.log("\n=== Example 3: Templates ===\n");
  await example3_Templates();
}

main();
```

## Explanation

### 1. Fluent Interface

Chain steps with method chaining:

```typescript
chain
  .addStep({...})
  .addStep({...})
  .addStep({...});
```

### 2. Result References

Reference previous step results:

```typescript
args: {
  content: "$1";
} // Use result from step 1
```

### 3. Validation

Validate step results:

```typescript
validateResult: (result) => result.status === 200;
```

### 4. Error Handling

Control flow on errors:

- **"abort"**: Stop chain
- **"retry"**: Retry current step
- **"skip"**: Continue to next step

### 5. Reusable Templates

Pre-built chains for common patterns:

```typescript
ChainTemplates.searchAnalyzeChain(query);
```

## Variations

### Conditional Chains

Branch based on results:

```typescript
class ConditionalChain extends ToolChain {
  addConditionalStep(
    condition: (context: ChainContext) => boolean,
    trueStep: ChainStep,
    falseStep: ChainStep,
  ) {
    return this.addStep({
      ...trueStep,
      args: condition(this.context) ? trueStep.args : falseStep.args,
    });
  }
}

// Usage
chain.addConditionalStep(
  (ctx) => ctx.results[0].count > 100,
  { toolName: "process_large", args: {} },
  { toolName: "process_small", args: {} },
);
```

### Parallel Chains

Execute independent chains in parallel:

```typescript
async function executeParallel(chains: ToolChain[]) {
  const results = await Promise.all(chains.map((chain) => chain.execute()));

  return {
    success: results.every((r) => r.success),
    results: results.map((r) => r.results),
    errors: results.flatMap((r) => r.errors),
  };
}

// Usage
await executeParallel([
  ChainTemplates.searchAnalyzeChain("auth"),
  ChainTemplates.searchAnalyzeChain("database"),
]);
```

### Loop Chains

Repeat steps until condition met:

```typescript
class LoopChain extends ToolChain {
  async executeLoop(
    step: ChainStep,
    condition: (result: any) => boolean,
    maxIterations: number = 10,
  ) {
    let iterations = 0;
    let result: any;

    while (iterations < maxIterations) {
      result = await this.executeStep(step);

      if (condition(result)) {
        break;
      }

      iterations++;
    }

    return result;
  }
}

// Usage: Retry until success
await chain.executeLoop(
  { toolName: "check_status", args: { id: "123" } },
  (result) => result.status === "complete",
  20,
);
```

### Chain Composition

Combine multiple chains:

```typescript
class CompositeChain {
  private chains: ToolChain[] = [];

  add(chain: ToolChain): this {
    this.chains.push(chain);
    return this;
  }

  async execute() {
    const results = [];

    for (const chain of this.chains) {
      const result = await chain.execute();
      results.push(result);

      if (!result.success) {
        break; // Stop on first failure
      }
    }

    return results;
  }
}
```

## Common Patterns

### Data Processing Pipeline

```
Fetch → Validate → Transform → Store → Notify
```

### Content Workflow

```
Search → Read → Analyze → Summarize → Publish
```

### GitHub Automation

```
Create Issue → Create Branch → Commit → Push → Create PR
```

### Monitoring Pipeline

```
Query Metrics → Analyze → Alert → Create Ticket → Notify
```

## Best Practices

1. **Keep chains short**: 3-5 steps maximum
2. **Validate early**: Check results at each step
3. **Handle errors**: Define recovery strategy
4. **Use templates**: Standardize common patterns
5. **Log extensively**: Track chain execution
6. **Test chains**: Verify each step independently
7. **Document dependencies**: Clear step relationships

## See Also

- [MCP Integration Guide](../features/mcp-tools-showcase.md)
- [Error Recovery](error-recovery.md)
- [Batch Processing](batch-processing.md)
- [SDK Custom Tools](../sdk/custom-tools.md)
