# Approach: Implementing Tool Response Validation in NeuroLink

## 1. Goal

To enhance the reliability of AI tool usage within NeuroLink by validating the _output_ of a tool against a predefined schema. If the output is invalid, the system should provide this failure information back to the LLM for potential self-correction, rather than proceeding with a broken workflow.

## 2. Background

The current NeuroLink SDK uses the `zod` library to define schemas for tool _inputs_ (`parameters`), ensuring the AI provides the correct arguments when it calls a tool. This proposal extends that concept to the tool's _output_.

The core logic for tool execution resides in the `executeTool` method within `src/lib/mcp/toolRegistry.ts`. This is where we will intercept the tool's response to perform our validation.

## 3. Proposed Implementation Plan

### Step 1: Enhance the Tool Definition

First, we need to update the `SimpleTool` interface in `src/lib/sdk/toolRegistration.ts` to allow developers to specify an output schema. This change will be non-breaking.

**File:** `src/lib/sdk/toolRegistration.ts`

```typescript
// In the SimpleTool interface
export interface SimpleTool<TArgs = ToolArgs, TResult = JsonValue>
  extends Omit<CoreSimpleTool<TArgs, TResult>, "execute"> {
  /**
   * Tool description that helps AI understand when to use it
   */
  description: string;

  /**
   * Parameters schema using Zod (optional)
   */
  parameters?: ZodUnknownSchema;

  /**
   * NEW: Response schema using Zod to validate the tool's output (optional)
   */
  responseSchema?: ZodUnknownSchema; // <--- ADD THIS LINE

  /**
   * Tool execution function
   */
  execute: (params: TArgs, context?: ToolContext) => Promise<TResult>;

  // ... rest of the interface
}
```

### Step 2: Modify the Tool Execution Logic

Next, we'll modify the `executeTool` method in `src/lib/mcp/toolRegistry.ts` to perform the validation.

**File:** `src/lib/mcp/toolRegistry.ts`

The logic will be inserted right after the tool's `execute` method is called.

```typescript
// Inside the executeTool method...

// ...
const toolImpl = this.toolImpls.get(toolId);
// ...

// Execute the actual tool
registryLogger.debug(`Executing tool '${toolName}' with args:`, args);
const toolResult = await toolImpl.execute(args, execContext);

// =================================================================
// START: NEW VALIDATION LOGIC
// =================================================================

// Ensure z is imported: `import { z } from "zod";`
if (toolImpl.responseSchema) {
  const parsed = (toolImpl.responseSchema as z.ZodTypeAny).safeParse(
    toolResult,
  );
  if (!parsed.success) {
    registryLogger.warn(`Tool '${toolName}' response validation failed.`);
    const errorPayload = {
      code: "TOOL_RESPONSE_VALIDATION_FAILED",
      message: "Tool response validation failed.",
      details: {
        toolName,
        // Consider zod-to-json-schema for richer descriptions
        expectedSchema: toolImpl.responseSchema.description ?? "No description",
        receivedSample: toolResult,
        validationErrors: parsed.error.flatten(),
      },
      metadata: {
        toolName,
        sessionId: execContext?.sessionId,
      },
    };
    // Return in standardized ToolResult shape (adjust keys to your type)
    const toolErrorResult: ToolResult = {
      type: "error",
      error: errorPayload,
    };
    return toolErrorResult;
  }
}

// =================================================================
// END: NEW VALIDATION LOGIC
// =================================================================

// Properly wrap raw results in ToolResult format
let result: ToolResult;
// ... (rest of the function continues as normal)
```

## 4. How It Works: The Flow

1.  **Tool Definition:** A developer defines a tool and, in addition to the `parameters` schema, provides a `responseSchema`.

    ```typescript
    import { z } from "zod";

    const getUserTool = {
      description: "Gets a user's profile from the database",
      parameters: z.object({ userId: z.string() }),
      // The new schema for the tool's output
      responseSchema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
      }),
      async execute({ userId }) {
        // Imagine this fetches from a database
        const user = await db.users.find(userId);
        return user; // Returns { id: '...', name: '...', email: '...' }
      },
    };
    ```

2.  **Tool Execution:** The LLM decides to use `getUserTool`. NeuroLink's `executeTool` method is called.

3.  **Validation:**

    - The `execute` function runs and returns a user object.
    - **Before** proceeding, our new logic checks if a `responseSchema` exists.
    - It finds the schema and uses `zod.safeParse()` to validate the returned user object without throwing an error.

4.  **Outcome:**
    - **Success:** If the returned object matches the schema (`safeParse` returns `{ success: true }`), execution continues as normal. The LLM gets the successful tool result.
    - **Failure:** If the `execute` function returns an object that doesn't match the schema, `safeParse` will return `{ success: false, error: ... }`.
      - Our logic detects this failure.
      - It constructs a detailed, standardized `ToolResult` object containing the validation errors.
      - This structured error is sent back to the LLM, providing clear context for what went wrong.

## 5. Benefits of this Approach

- **Self-Correction:** The LLM receives a clear, structured error message. It can then reason about the failure and potentially try again (e.g., call a different tool, or call the same tool with different parameters).
- **Robustness:** Prevents bad data from flowing through a multi-step tool chain, stopping errors at the source.
- **Developer Experience:** Provides clear, immediate feedback to developers when their tool's return value is incorrect.
- **Non-Breaking:** The `responseSchema` is optional. Tools without it will continue to work exactly as they do now.
