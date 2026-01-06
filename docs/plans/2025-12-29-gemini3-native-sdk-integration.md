# Gemini 3 Native SDK Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Route Gemini 3 models through native `@google/genai` SDK to handle thought_signature automatically, fixing the "Function call is missing a thought_signature" error.

**Architecture:** Detect Gemini 3 models at runtime and route them through the native `@google/genai` SDK (already in node_modules at v1.22.0) instead of `@ai-sdk/google`. The native SDK handles thought signatures automatically. Existing tools work as-is.

**Tech Stack:** TypeScript, @google/genai v1.22.0 (existing), existing `convertZodToJsonSchema()` utility

---

## Key Insight: Minimal Changes Required

1. **Types**: Import directly from `@google/genai` - NO new type files
2. **Tool conversion**: Use existing `convertZodToJsonSchema()` - minimal wrapper
3. **Continuous tests**: Just change model name - existing tools work as-is

---

## Task 1: Add Native SDK Stream Method to GoogleAIStudioProvider

**Files:**

- Modify: `src/lib/providers/googleAiStudio.ts`

**Step 1: Add imports for model detection and schema conversion**

Add after line ~28 (after existing imports):

```typescript
import { isGemini3Model } from "../utils/modelDetection.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import type { Tool } from "ai";
```

**Step 2: Add native SDK stream method**

Add new method (around line 400, after existing `executeStream`):

```typescript
/**
 * Execute stream using native @google/genai SDK for Gemini 3 models
 * This bypasses @ai-sdk/google to properly handle thought_signature
 */
private async executeNativeGemini3Stream(
  options: StreamOptions,
): Promise<StreamResult> {
  const apiKey = this.getApiKey();
  const client = await createGoogleGenAIClient(apiKey);
  const modelName = options.model || this.modelName;

  logger.debug("[GoogleAIStudio] Using native @google/genai for Gemini 3", {
    model: modelName,
    hasTools: !!options.tools && Object.keys(options.tools).length > 0,
  });

  // Build contents from input
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (options.systemPrompt) {
    // System prompt as first user message (or use systemInstruction in config)
  }

  contents.push({
    role: "user",
    parts: [{ text: options.input.text }],
  });

  // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
  type FunctionDeclaration = {
    name: string;
    description: string;
    parametersJsonSchema?: Record<string, unknown>;
  };

  let tools: Array<{ functionDeclarations: FunctionDeclaration[] }> | undefined;
  const executeMap = new Map<string, Tool["execute"]>();

  if (options.tools && Object.keys(options.tools).length > 0 && !options.disableTools) {
    const functionDeclarations: FunctionDeclaration[] = [];

    for (const [name, tool] of Object.entries(options.tools)) {
      const decl: FunctionDeclaration = {
        name,
        description: tool.description || `Tool: ${name}`,
      };

      if (tool.parameters) {
        decl.parametersJsonSchema = convertZodToJsonSchema(
          tool.parameters as ZodUnknownSchema,
        );
        // Remove $schema if present
        if (decl.parametersJsonSchema.$schema) {
          delete decl.parametersJsonSchema.$schema;
        }
      }

      functionDeclarations.push(decl);

      if (tool.execute) {
        executeMap.set(name, tool.execute);
      }
    }

    tools = [{ functionDeclarations }];

    logger.debug("[GoogleAIStudio] Converted tools for native SDK", {
      toolCount: functionDeclarations.length,
      toolNames: functionDeclarations.map(t => t.name),
    });
  }

  // Build config
  const config: Record<string, unknown> = {
    temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0
    maxOutputTokens: options.maxTokens,
  };

  if (tools) {
    config.tools = tools;
  }

  if (options.systemPrompt) {
    config.systemInstruction = options.systemPrompt;
  }

  // Add thinking config for Gemini 3
  if (options.thinkingConfig?.enabled || options.thinkingConfig?.thinkingLevel) {
    config.thinkingConfig = {
      includeThoughts: true,
      thinkingLevel: options.thinkingConfig.thinkingLevel || "high",
    };
  }

  const startTime = Date.now();
  const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
  let currentContents = [...contents];
  let finalText = "";
  const allToolCalls: Array<{ toolName: string; args: Record<string, unknown> }> = [];
  let step = 0;

  // Agentic loop for tool calling
  while (step < maxSteps) {
    step++;
    logger.debug(`[GoogleAIStudio] Native SDK step ${step}/${maxSteps}`);

    try {
      const stream = await client.models.generateContentStream({
        model: modelName,
        contents: currentContents,
        config,
      });

      let stepText = "";
      let stepFunctionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

      for await (const chunk of stream) {
        if (chunk.text) {
          stepText += chunk.text;
        }
        if (chunk.functionCalls) {
          stepFunctionCalls.push(...chunk.functionCalls);
        }
      }

      // If no function calls, we're done
      if (stepFunctionCalls.length === 0) {
        finalText = stepText;
        break;
      }

      // Execute function calls
      logger.debug(`[GoogleAIStudio] Executing ${stepFunctionCalls.length} function calls`);

      // Add model response with function calls to history
      currentContents.push({
        role: "model",
        parts: stepFunctionCalls.map(fc => ({ functionCall: fc })) as any,
      });

      // Execute each function and collect responses
      const functionResponses: Array<{ functionResponse: { name: string; response: unknown } }> = [];

      for (const call of stepFunctionCalls) {
        allToolCalls.push({ toolName: call.name, args: call.args });

        const execute = executeMap.get(call.name);
        if (execute) {
          try {
            const result = await execute(call.args);
            functionResponses.push({
              functionResponse: { name: call.name, response: { result } },
            });
          } catch (error) {
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { error: error instanceof Error ? error.message : "Error" },
              },
            });
          }
        } else {
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { error: `Tool not found: ${call.name}` },
            },
          });
        }
      }

      // Add function responses to history
      currentContents.push({
        role: "function",
        parts: functionResponses as any,
      });

    } catch (error) {
      logger.error("[GoogleAIStudio] Native SDK error", error);
      throw this.handleProviderError(error);
    }
  }

  const responseTime = Date.now() - startTime;

  // Create async iterable for streaming result
  async function* createTextStream(): AsyncIterable<{ content: string }> {
    yield { content: finalText };
  }

  return {
    stream: createTextStream(),
    provider: this.providerName,
    model: modelName,
    toolCalls: allToolCalls,
    metadata: {
      streamId: `native-${Date.now()}`,
      startTime,
      responseTime,
      totalToolExecutions: allToolCalls.length,
    },
  };
}
```

**Step 3: Update executeStream to route Gemini 3 models**

Find the `executeStream` method (around line 145) and add check at the beginning:

```typescript
protected async executeStream(
  options: StreamOptions,
  _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
): Promise<StreamResult> {
  // Check if this is a Gemini 3 model with tools - use native SDK for thought_signature
  const modelName = options.model || this.modelName;
  const hasTools = options.tools && Object.keys(options.tools).length > 0 && !options.disableTools;

  if (isGemini3Model(modelName) && hasTools) {
    logger.info("[GoogleAIStudio] Routing Gemini 3 to native SDK for tool calling", {
      model: modelName,
    });
    return this.executeNativeGemini3Stream(options);
  }

  // Existing code continues...
  // Phase 1: if audio input present, bridge to Gemini Live
  if (options.input?.audio) {
```

**Step 4: Verify changes compile**

Run: `pnpm run check`
Expected: No TypeScript errors

**Step 5: Build**

Run: `pnpm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/lib/providers/googleAiStudio.ts
git commit -m "$(cat <<'EOF'
feat(google-ai): add native @google/genai for Gemini 3 tool calling

Route Gemini 3 models with tools through native @google/genai SDK
to properly handle thought_signature requirements.

- Detect Gemini 3 models using isGemini3Model()
- Convert tools using existing convertZodToJsonSchema()
- Implement agentic loop for multi-step tool calling
- Native SDK handles thought signatures automatically

Fixes: "Function call is missing a thought_signature" error
EOF
)"
```

---

## Task 2: Add Native SDK Stream Method to GoogleVertexProvider

**Files:**

- Modify: `src/lib/providers/googleVertex.ts`

**Step 1: Add imports for model detection**

Add after existing imports (around line 30):

```typescript
import { isGemini3Model } from "../utils/modelDetection.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
```

**Step 2: Add helper to create Vertex-authenticated @google/genai client**

Add new method (around line 200):

```typescript
/**
 * Create @google/genai client configured for Vertex AI
 */
private async createVertexGenAIClient(): Promise<GenAIClient> {
  const project = getVertexProjectId();
  const location = this.region || getVertexLocation();

  const mod: unknown = await import("@google/genai");
  const ctor = (mod as Record<string, unknown>).GoogleGenAI as unknown;
  if (!ctor) {
    throw new Error("@google/genai does not export GoogleGenAI");
  }

  const Ctor = ctor as GoogleGenAIClass;

  return new Ctor({
    vertexai: true,
    project,
    location,
  });
}
```

**Step 3: Add native SDK stream method**

Add the same `executeNativeGemini3Stream` method as Task 1, but:

- Use `this.createVertexGenAIClient()` instead of `createGoogleGenAIClient(apiKey)`
- Change log prefix from `[GoogleAIStudio]` to `[GoogleVertex]`

**Step 4: Update executeStream to route Gemini 3 models**

Same pattern as Task 1 - add check at beginning of `executeStream`.

**Step 5: Verify changes compile**

Run: `pnpm run check`
Expected: No TypeScript errors

**Step 6: Build**

Run: `pnpm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/lib/providers/googleVertex.ts
git commit -m "$(cat <<'EOF'
feat(vertex): add native @google/genai for Gemini 3 tool calling

Route Gemini 3 models on Vertex AI through native @google/genai SDK.
Uses Vertex AI authentication with project/location configuration.
EOF
)"
```

---

## Task 3: Test with Continuous Test Suite (Model Name Change Only)

**Files:**

- No file changes needed initially - run existing tests with different model

**Step 1: Run continuous tests with Gemini 3 Flash**

Run: `npx tsx test/continuous-test-suite.ts --provider=google-ai --model=gemini-3-flash-preview`

Expected: Existing tool tests pass without thought_signature errors

**Step 2: Run continuous tests with Gemini 3 Pro on Vertex**

Run: `npx tsx test/continuous-test-suite.ts --provider=vertex --model=gemini-3-pro-preview --region=global`

Expected: Existing tool tests pass without thought_signature errors

**Step 3: Run regression test with Gemini 2.5**

Run: `npx tsx test/continuous-test-suite.ts --provider=google-ai --model=gemini-2.5-flash`

Expected: Tests still pass (uses existing @ai-sdk/google path)

**Step 4: If tests pass, commit verification**

```bash
git commit --allow-empty -m "$(cat <<'EOF'
test: verify Gemini 3 tool calling with continuous test suite

Verified existing tools work with Gemini 3 models:
- google-ai + gemini-3-flash-preview: ✓
- vertex + gemini-3-pro-preview + global: ✓
- Regression: gemini-2.5-flash still works: ✓
EOF
)"
```

---

## Task 4: Add Gemini 3 Model Configurations to Test Suite (Optional)

**Only if we want to add permanent Gemini 3 test configurations**

**Files:**

- Modify: `test/continuous-test-suite.ts`

**Step 1: Add Gemini 3 provider configs**

Find `TEST_CONFIG` or provider configuration section and add:

```typescript
// Gemini 3 test configurations
const GEMINI_3_CONFIGS = {
  "google-ai-gemini3-flash": {
    provider: "google-ai",
    model: "gemini-3-flash-preview",
  },
  "google-ai-gemini3-pro": {
    provider: "google-ai",
    model: "gemini-3-pro-preview",
  },
  "vertex-gemini3-flash": {
    provider: "vertex",
    model: "gemini-3-flash-preview",
    region: "global",
  },
  "vertex-gemini3-pro": {
    provider: "vertex",
    model: "gemini-3-pro-preview",
    region: "global",
  },
};
```

**Step 2: Add --gemini3 flag to run Gemini 3 tests**

```typescript
if (args.includes("--gemini3")) {
  TEST_CONFIG.provider = "google-ai";
  TEST_CONFIG.model = "gemini-3-flash-preview";
}
```

**Step 3: Commit**

```bash
git add test/continuous-test-suite.ts
git commit -m "$(cat <<'EOF'
test(continuous): add Gemini 3 model configurations

Add --gemini3 flag and provider configs for Gemini 3 models.
Existing tools work as-is - only model names changed.
EOF
)"
```

---

## Summary

### Files Modified

1. `src/lib/providers/googleAiStudio.ts` - Native SDK integration
2. `src/lib/providers/googleVertex.ts` - Native SDK integration
3. `test/continuous-test-suite.ts` - Optional: Add Gemini 3 configs

### NO New Files Created

- Types imported directly from `@google/genai`
- Tool conversion uses existing `convertZodToJsonSchema()`

### Testing Commands

```bash
# Test Gemini 3 Flash on Google AI Studio
npx tsx test/continuous-test-suite.ts --provider=google-ai --model=gemini-3-flash-preview

# Test Gemini 3 Pro on Vertex AI (global region)
npx tsx test/continuous-test-suite.ts --provider=vertex --model=gemini-3-pro-preview --region=global

# Regression test - Gemini 2.5 should still work
npx tsx test/continuous-test-suite.ts --provider=google-ai --model=gemini-2.5-flash

# Full build and verification
pnpm run build && pnpm run check
```

### Key Design Decisions

1. **No new type files** - Import from `@google/genai` directly
2. **Minimal conversion** - Reuse existing `convertZodToJsonSchema()`
3. **Existing tools work** - No changes to tool definitions
4. **Model detection** - Use existing `isGemini3Model()` from modelDetection.ts
5. **Follows Bedrock pattern** - Bypass Vercel AI SDK for native SDK when needed
