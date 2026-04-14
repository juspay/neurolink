# Migration Design: Remove AI SDK Google Dependencies

**Date**: 2026-01-01
**Branch**: `feat/remove-ai-sdk-google`
**Status**: Planning

---

## Summary

Remove Vercel AI SDK wrappers (`@ai-sdk/google`, `@ai-sdk/google-vertex`) and migrate to the official unified Google SDK (`@google/genai`) for all Google AI Studio and Vertex AI Gemini models.

---

## Motivation

1. **Reduce dependencies** - Eliminate wrapper layer, use official SDK directly
2. **Future-proof** - `@google-cloud/vertexai` is deprecated (EOL June 2025); `@google/genai` is Google's recommended unified SDK
3. **Consistency** - Native SDK path already exists for Gemini 3 with tools; extend pattern to all models
4. **Better feature support** - Direct access to `thought_signature`, extended thinking, and future Gemini features

---

## Current State Analysis

### Dependencies to Remove

```json
{
  "@ai-sdk/google": "^1.2.22",
  "@ai-sdk/google-vertex": "^2.2.27"
}
```

### Dependencies to Keep

```json
{
  "@google/genai": "^1.34.0", // Unified SDK for both AI Studio and Vertex
  "@google/generative-ai": "^0.24.1", // Legacy - can be removed later
  "@google-cloud/vertexai": "^1.10.0" // Deprecated - can be removed later
}
```

### Provider Files to Modify

| File                                  | Lines | Current Approach                          |
| ------------------------------------- | ----- | ----------------------------------------- |
| `src/lib/providers/googleAiStudio.ts` | ~1370 | AI SDK primary, native for Gemini 3+tools |
| `src/lib/providers/googleVertex.ts`   | ~3285 | AI SDK primary, native for Gemini 3+tools |

---

## Architecture Design

### New Unified Approach

The `@google/genai` SDK supports both authentication modes:

```typescript
import { GoogleGenAI } from "@google/genai";

// Google AI Studio (API Key)
const client = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });

// Vertex AI (Project/Location)
const client = new GoogleGenAI({
  vertexai: true,
  project: "your-project",
  location: "us-central1",
});
```

### Streaming Architecture

Replace `streamText()` from AI SDK with native streaming:

```typescript
// Before (AI SDK)
const result = streamText({
  model: createGoogleGenerativeAI({ apiKey })(modelName),
  messages,
  temperature,
  tools,
  ...
});

// After (@google/genai)
const client = new GoogleGenAI({ apiKey });
const stream = await client.models.generateContentStream({
  model: modelName,
  contents: messages,
  config: {
    temperature,
    maxOutputTokens,
    thinkingConfig: { ... }
  },
  tools: functionDeclarations
});
```

### Message Format Transformation

| Vercel AI SDK Format                                  | @google/genai Format                  |
| ----------------------------------------------------- | ------------------------------------- |
| `{ role: "user", content: [{ type: "text", text }] }` | `{ role: "user", parts: [{ text }] }` |
| `{ type: "image", image: Buffer }`                    | `{ inlineData: { mimeType, data } }`  |
| `{ type: "file", data: Buffer }`                      | `{ fileData: { mimeType, fileUri } }` |

### Tool Format Transformation

| Vercel AI SDK Tool                     | @google/genai FunctionDeclaration             |
| -------------------------------------- | --------------------------------------------- |
| `{ description, parameters, execute }` | `{ name, description, parametersJsonSchema }` |

---

## Implementation Plan

### Phase 1: Google AI Studio Provider (`googleAiStudio.ts`)

**Step 1.1**: Remove AI SDK imports

```diff
- import { createGoogleGenerativeAI } from "@ai-sdk/google";
- import { streamText, type LanguageModelV1 } from "ai";
+ import { GoogleGenAI, type Content, type Part } from "@google/genai";
```

**Step 1.2**: Replace `getAISDKModel()` with native client

```typescript
// New method
private createClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: this.getApiKey() });
}
```

**Step 1.3**: Convert message building

- Add new `convertToGoogleContents()` method
- Transform `CoreMessage[]` to `Content[]` (Google format)
- Handle multimodal parts (text, images, PDFs)

**Step 1.4**: Replace streaming implementation

- Use existing `executeNativeGemini3Stream()` as template
- Remove model detection logic (all models use native now)
- Implement unified streaming for all Gemini models

**Step 1.5**: Replace generation implementation

- Use existing `executeNativeGemini3Generate()` as template
- Extend to all models

### Phase 2: Google Vertex Provider (`googleVertex.ts`)

**Step 2.1**: Remove AI SDK imports

```diff
- import { createVertex } from "@ai-sdk/google-vertex";
- import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
+ import { GoogleGenAI } from "@google/genai";
```

**Note**: Anthropic Claude models via Vertex will still use `@ai-sdk/google-vertex/anthropic` since that's a separate API.

**Step 2.2**: Replace Gemini model creation

```typescript
private createVertexClient(): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true,
    project: this.projectId,
    location: this.location
  });
}
```

**Step 2.3**: Dual architecture

- Keep `createVertexAnthropic()` for Claude models
- Use `@google/genai` for all Gemini models

**Step 2.4**: Unify streaming/generation paths

- Reuse patterns from Google AI Studio
- Handle Vertex-specific authentication

### Phase 3: BaseProvider Updates

**Step 3.1**: Update abstract methods

```diff
- abstract getAISDKModel(): LanguageModelV1;
+ // Remove - no longer needed for Google providers
```

**Step 3.2**: Make `getAISDKModel()` optional or provider-specific

- Non-Google providers still use AI SDK
- Google providers use native SDK directly

### Phase 4: Test Updates

**Step 4.1**: Update `test/setup.ts` mocks

```diff
- vi.mock("@ai-sdk/google", () => ({ google: vi.fn() }));
- vi.mock("@ai-sdk/google-vertex", () => ({ vertex: vi.fn() }));
+ vi.mock("@google/genai", () => ({
+   GoogleGenAI: vi.fn().mockImplementation(() => ({
+     models: {
+       generateContent: vi.fn(),
+       generateContentStream: vi.fn()
+     }
+   }))
+ }));
```

**Step 4.2**: Update unit tests

- `test/unit/models/gemini-3-flash.test.ts`
- `test/unit/thinking/thinking-configuration.test.ts`
- `test/unit/providers/factory.test.ts`

**Step 4.3**: Run integration tests

```bash
TEST_PROVIDER=google-ai-studio pnpm run test:legacy
TEST_PROVIDER=vertex pnpm run test:legacy
```

---

## Key Transformations

### 1. Message Content Transformation

```typescript
function convertToGoogleContents(messages: CoreMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: Array.isArray(msg.content)
      ? msg.content.map((part) => convertPart(part))
      : [{ text: msg.content }],
  }));
}

function convertPart(part: ContentPart): Part {
  switch (part.type) {
    case "text":
      return { text: part.text };
    case "image":
      return {
        inlineData: {
          mimeType: part.mimeType,
          data: part.image.toString("base64"),
        },
      };
    case "file":
      return {
        inlineData: {
          mimeType: part.mimeType,
          data: part.data.toString("base64"),
        },
      };
  }
}
```

### 2. Tool Transformation

```typescript
function convertToolsToFunctionDeclarations(
  tools: Record<string, Tool>,
): FunctionDeclaration[] {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  }));
}
```

### 3. Thinking Configuration

```typescript
function buildThinkingConfig(
  options: StreamOptions,
): ThinkingConfig | undefined {
  if (!options.thinkingConfig?.enabled) return undefined;

  if (isGemini3Model(modelName)) {
    return {
      thinkingLevel: options.thinkingConfig.thinkingLevel || "medium",
    };
  } else if (supportsThinkingConfig(modelName)) {
    return {
      thinkingBudget: options.thinkingConfig.budgetTokens,
    };
  }
}
```

---

## Backward Compatibility

### No Breaking API Changes

- SDK public interface (`neurolink.stream()`, `neurolink.generate()`) unchanged
- CLI commands unchanged
- Configuration unchanged

### Internal-Only Changes

- Provider implementation details
- SDK dependency swap
- Test mocks

---

## Risk Mitigation

| Risk                        | Mitigation                                                 |
| --------------------------- | ---------------------------------------------------------- |
| Native SDK missing features | Existing Gemini 3 native implementation proves feasibility |
| Test breakage               | Comprehensive test suite with known patterns               |
| Authentication differences  | `@google/genai` supports both API key and Vertex auth      |
| Performance regression      | Native SDK eliminates wrapper overhead                     |

---

## Testing Strategy

### 1. Unit Tests

```bash
pnpm test test/unit/models/gemini-3-flash.test.ts
pnpm test test/unit/thinking/thinking-configuration.test.ts
```

### 2. Integration Tests

```bash
TEST_PROVIDER=google-ai-studio pnpm run test:legacy
TEST_PROVIDER=vertex pnpm run test:legacy
```

### 3. End-to-End Tests

```bash
bash test/test-all-providers.sh
bash test/run-all-providers-sequential.sh
```

### 4. Manual Validation

```bash
# Google AI Studio
pnpm run build:cli
./dist/cli/index.js generate "Hello" --provider google-ai-studio

# Vertex AI
./dist/cli/index.js generate "Hello" --provider vertex --model gemini-2.5-flash
```

---

## Success Criteria

1. ✅ `@ai-sdk/google` and `@ai-sdk/google-vertex` removed from package.json
2. ✅ All existing tests pass
3. ✅ CLI commands work for both Google AI Studio and Vertex AI
4. ✅ Streaming works correctly
5. ✅ Tool calling works correctly
6. ✅ Multimodal (images, PDFs) works correctly
7. ✅ Extended thinking works correctly
8. ✅ Build succeeds with no errors

---

## File Change Summary

| File                                      | Action                                           |
| ----------------------------------------- | ------------------------------------------------ |
| `package.json`                            | Remove `@ai-sdk/google`, `@ai-sdk/google-vertex` |
| `src/lib/providers/googleAiStudio.ts`     | Full refactor to `@google/genai`                 |
| `src/lib/providers/googleVertex.ts`       | Partial refactor (Gemini models only)            |
| `test/setup.ts`                           | Update mocks                                     |
| `test/unit/models/gemini-3-flash.test.ts` | Update imports/mocks                             |

---

## Timeline Estimate

- **Phase 1** (Google AI Studio): Core implementation
- **Phase 2** (Vertex AI): Extend pattern
- **Phase 3** (BaseProvider): Cleanup
- **Phase 4** (Tests): Validation

---

## Next Steps

1. User approval of this design
2. Create implementation plan with detailed steps
3. Execute implementation
4. Run full test suite
5. Create PR for review
