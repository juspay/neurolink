# NeuroLink Type System Documentation

This document provides comprehensive guidance on importing and using types from the NeuroLink type system. It explains canonical sources, import hierarchies, and migration paths for deprecated exports.

## Quick Reference: Canonical Type Sources

Use this table to find the correct import path for any type:

| Type Category           | Canonical Source     | Public API      | Description                                             |
| ----------------------- | -------------------- | --------------- | ------------------------------------------------------- |
| **Multimodal Content**  | `./multimodal.js`    | ✅ `./index.js` | All content types (text, image, PDF, CSV, audio, video) |
| **Tools & Execution**   | `./tools.js`         | ✅ `./index.js` | Tool definitions, execution context, parameters         |
| **Streaming**           | `./streamTypes.js`   | ✅ `./index.js` | Streaming operations, progress tracking                 |
| **Providers**           | `./providers.js`     | ✅ `./index.js` | Provider configuration, capabilities, errors            |
| **Generation**          | `./generateTypes.js` | ✅ `./index.js` | Text generation options and results                     |
| **Conversation Memory** | `./conversation.js`  | ✅ `./index.js` | Chat messages, session memory, Redis storage            |
| **MCP Integration**     | `./mcpTypes.js`      | ✅ `./index.js` | Model Context Protocol types                            |
| **External MCP**        | `./externalMcp.js`   | ✅ `./index.js` | External MCP server management                          |
| **Configuration**       | `./configTypes.js`   | ✅ `./index.js` | NeuroLink configuration options                         |
| **Analytics**           | `./analytics.js`     | ✅ `./index.js` | Token usage, analytics data                             |
| **Evaluation**          | `./evaluation.js`    | ✅ `./index.js` | AI evaluation and judging                               |
| **CLI**                 | `./cli.js`           | ✅ `./index.js` | Command-line interface types                            |
| **Common Utilities**    | `./common.js`        | ✅ `./index.js` | JsonValue, Result, ErrorInfo, etc.                      |
| **Type Aliases**        | `./typeAliases.js`   | Selective       | Shared type aliases (use sparingly)                     |
| **SDK Types**           | `./sdkTypes.js`      | ✅ `./index.js` | Curated SDK interface types                             |

## Import Hierarchy

### Level 1: Public API (Recommended for External Users)

**Always prefer importing from the main index:**

```typescript
// ✅ RECOMMENDED: Import from main index
import type {
  Content,
  MultimodalInput,
  ToolDefinition,
  GenerateOptions,
  StreamResult,
} from "@juspay/neurolink/types";
```

The main `index.ts` provides a curated, stable public API with:

- All commonly used types
- Renamed exports to avoid conflicts
- Backward compatibility guarantees

### Level 2: Direct Module Imports (Internal/Advanced Use)

**Use when you need specific types not in the public API:**

```typescript
// ⚠️ ADVANCED: Import directly from canonical source
import type {
  ProcessedImage,
  ProviderImageFormat,
} from "@juspay/neurolink/types/multimodal";
import type { CircuitBreakerConfig } from "@juspay/neurolink/types/mcpTypes";
```

Benefits:

- Access to all types in a module
- Clearer source of truth
- Better tree-shaking in some cases

Risks:

- May access internal/unstable types
- More likely to break on updates

### Level 3: SDK-Specific Imports (SDK Users)

**For external SDK consumers who need everything:**

```typescript
// ✅ SDK USAGE: Import comprehensive SDK types
import type {
  StreamResult,
  GenerateOptions,
  ToolDefinition,
} from "@juspay/neurolink/types/sdkTypes";
```

The `sdkTypes.ts` module provides:

- All essential types for SDK integration
- Comprehensive coverage for external developers
- Maximum TypeScript support across the ecosystem

## Type Name Conflicts and Resolution

### Conflict: `ToolResult` and `ToolCall`

These types exist in both `tools.js` and `streamTypes.js` with different purposes:

```typescript
// tools.js - Tool system metadata
export type ToolResult = {
  toolName: string;
  output?: unknown;
  error?: string;
  // ... tool-specific fields
};

// streamTypes.js - Streaming execution
export type ToolResult = {
  toolName: string;
  status: "success" | "failure";
  executionTime?: number;
  // ... streaming-specific fields
};
```

**Resolution in index.ts:**

```typescript
// From tools.js - Default (unaliased)
export type { ToolResult, ToolCall } from "./tools.js";

// From streamTypes.js - Aliased to avoid conflict
export type {
  ToolCall as StreamToolCall,
  ToolResult as StreamToolResult,
} from "./streamTypes.js";
```

**How to use:**

```typescript
// ✅ Tool system metadata
import type { ToolResult } from "@juspay/neurolink/types";

// ✅ Streaming execution
import type { StreamToolResult } from "@juspay/neurolink/types";

// ⚠️ If you need both, use aliased names
import type {
  ToolResult as ToolMetadataResult,
  StreamToolResult,
} from "@juspay/neurolink/types";
```

## Deprecated Paths and Migration

### 1. Content Types (DEPRECATED: `content.ts`)

**Status:** `content.ts` is a compatibility layer. All types moved to `multimodal.ts`.

```typescript
// ❌ DEPRECATED (still works)
import type { Content, MultimodalInput } from "./types/content.js";

// ✅ MIGRATION PATH 1: Use canonical source
import type { Content, MultimodalInput } from "./types/multimodal.js";

// ✅ MIGRATION PATH 2: Use public API (recommended)
import type { Content, MultimodalInput } from "./types/index.js";
```

**Why deprecated?**

- `multimodal.ts` is the single source of truth
- `content.ts` only re-exports for backward compatibility
- Better organization with audio/video types in multimodal

**Migration timeline:**

- Current: Both work (deprecation notice in JSDoc)
- v9.0.0: `content.ts` will be removed

### 2. Conversation Message Content (RE-EXPORTED)

```typescript
// ⚠️ Re-exported for convenience (works but not recommended)
import type { MessageContent } from "./types/conversation.js";

// ✅ PREFERRED: Import from canonical source
import type { MessageContent } from "./types/multimodal.js";

// ✅ BEST: Use public API
import type { MessageContent } from "./types/index.js";
```

**Note:** `conversation.ts` re-exports `MessageContent` and `MultimodalChatMessage` from `multimodal.ts` for convenience, but prefer importing from the canonical source.

## Best Practices

### 1. Always Use the Public API for External Code

```typescript
// ✅ GOOD: Public API (stable, documented)
import type { ToolDefinition } from "@juspay/neurolink/types";

// ❌ BAD: Internal path (may break)
import type { ToolDefinition } from "@juspay/neurolink/types/tools";
```

### 2. Use Canonical Sources for Internal Code

```typescript
// ✅ GOOD: Direct canonical import within the codebase
import type { Content } from "../types/multimodal.js";

// ⚠️ ACCEPTABLE: Public API import
import type { Content } from "../types/index.js";

// ❌ BAD: Deprecated re-export
import type { Content } from "../types/content.js";
```

### 3. Prefer Type-Only Imports

```typescript
// ✅ GOOD: Type-only import (better tree-shaking)
import type { ToolDefinition } from "@juspay/neurolink/types";

// ⚠️ AVOID: Mixed import (unless you need runtime values)
import { ToolDefinition } from "@juspay/neurolink/types";
```

Exception: When importing type guards or runtime utilities:

```typescript
// ✅ CORRECT: Runtime type guard needs regular import
import { isMultimodalInput, type Content } from "./types/multimodal.js";
```

### 4. Document Type Source in Complex Files

```typescript
/**
 * Message builder for multimodal content
 *
 * Type sources:
 * - Content types: ./types/multimodal.js
 * - Tool types: ./types/tools.js
 * - Generation types: ./types/generateTypes.js
 */
import type { Content, MultimodalInput } from "../types/multimodal.js";
import type { ToolDefinition } from "../types/tools.js";
import type { GenerateOptions } from "../types/generateTypes.js";
```

## Common Import Patterns

### Pattern 1: Multimodal Content Processing

```typescript
import type {
  Content,
  ImageContent,
  PDFContent,
  MultimodalInput,
} from "./types/multimodal.js";
import { isImageContent, isPDFContent } from "./types/multimodal.js";
```

### Pattern 2: Tool System Integration

```typescript
import type {
  ToolDefinition,
  ToolArgs,
  ToolResult,
  ToolContext,
  AvailableTool,
} from "./types/tools.js";
```

### Pattern 3: Streaming Operations

```typescript
import type {
  StreamResult,
  StreamingOptions,
  StreamingProgressData,
  ProgressCallback,
} from "./types/streamTypes.js";

// If you also need tool execution types
import type { StreamToolCall, StreamToolResult } from "./types/index.js"; // Use aliased names from index
```

### Pattern 4: Provider Configuration

```typescript
import type {
  AISDKModel,
  ProviderError,
  AIModelProviderConfig,
  ModelCapability,
} from "./types/providers.js";
```

### Pattern 5: Complete SDK Integration

```typescript
// For external SDK users: comprehensive type import
import type {
  GenerateOptions,
  GenerateResult,
  StreamResult,
  ToolDefinition,
  Content,
  MultimodalInput,
  ProgressCallback,
} from "@juspay/neurolink/types/sdkTypes";
```

## Type Organization Principles

### 1. Single Source of Truth

Each type has **one canonical definition**:

- No duplicate definitions across files
- Re-exports are clearly marked as such
- Deprecated re-exports have migration notices

### 2. Logical Grouping

Types are grouped by domain:

- **Domain files** (e.g., `multimodal.js`, `tools.js`) - Related types together
- **Feature files** (e.g., `streaming.js`, `analytics.js`) - Feature-specific types
- **Integration files** (e.g., `mcpTypes.js`, `externalMcp.js`) - Integration interfaces

### 3. Public vs Internal

- **Public API** (`index.ts`, `sdkTypes.ts`) - Stable, documented, versioned
- **Internal types** (individual modules) - May change between minor versions
- **Utility types** (`common.js`, `typeAliases.js`) - Shared primitives

### 4. Backward Compatibility

- Deprecated paths maintained for at least one major version
- Clear deprecation notices in JSDoc
- Migration examples provided
- Type aliases used to avoid breaking changes

## File-Specific Guidelines

### `multimodal.ts` - Canonical Content Types

**Purpose:** Single source for all multimodal content types

**Exports:**

- Content types: `TextContent`, `ImageContent`, `PDFContent`, etc.
- Input types: `MultimodalInput`, `MultimodalMessage`
- Provider types: `VisionCapability`, `ProviderImageFormat`
- Type guards: `isImageContent()`, `isPDFContent()`, etc.

**Import from here when:**

- Processing multimodal content
- Building message formatters
- Working with provider adapters

### `content.ts` - Backward Compatibility Layer

**Purpose:** Deprecated re-export file for migration

**Status:** ⚠️ DEPRECATED - Use `multimodal.ts` instead

**What it does:**

- Re-exports all types from `multimodal.ts`
- Provides type-only re-exports for types
- Provides runtime re-exports for type guards

**Do not use in new code** - Import from `multimodal.ts` or `index.ts` instead

### `tools.ts` - Tool System Types

**Purpose:** Tool definitions, execution, and metadata

**Exports:**

- Definitions: `ToolDefinition`, `AvailableTool`
- Execution: `ToolArgs`, `ToolResult`, `ToolContext`
- Parameters: `ToolParameterSchema`, `BaseToolArgs`

**Note:** `ToolResult` here is for tool metadata, not streaming results

### `streamTypes.ts` - Streaming Operations

**Purpose:** Streaming execution and progress tracking

**Exports:**

- Results: `StreamResult`, `StreamTextResult`
- Progress: `StreamingProgressData`, `ProgressCallback`
- Tools: `ToolCall`, `ToolResult` (streaming versions)

**Note:** `ToolResult` here is for streaming execution, different from `tools.js`

### `index.ts` - Public API

**Purpose:** Main entry point for external users

**What it does:**

- Exports commonly used types
- Resolves name conflicts with aliases
- Provides stable public API

**Aliased exports:**

- `StreamToolCall` (from `streamTypes.js`)
- `StreamToolResult` (from `streamTypes.js`)

### `sdkTypes.ts` - SDK Interface

**Purpose:** Comprehensive types for SDK consumers

**What it does:**

- Re-exports all essential SDK types
- Provides maximum TypeScript support
- Curates types for external developers

**Use when:**

- Building SDK integrations
- Need comprehensive type coverage
- Want all types in one import

## Troubleshooting

### Issue: "Cannot find type X"

**Solution:** Check the canonical source table above and import from the correct file.

```typescript
// If you can't find a type in index.ts, try the canonical source
import type { ProcessedImage } from "./types/multimodal.js";
```

### Issue: "Type X conflicts with Type Y"

**Solution:** Use the aliased names from `index.ts`:

```typescript
// ✅ Use aliased names for streaming types
import type { StreamToolResult } from "./types/index.js";
```

### Issue: "Import from deprecated path"

**Solution:** Follow the migration path in the deprecation notice:

```typescript
// See deprecation notice in content.ts for migration path
// Migrate from content.ts to multimodal.ts
```

## Contributing Guidelines

When adding new types:

1. **Add to appropriate canonical file** (e.g., `multimodal.ts`, `tools.ts`)
2. **Export from `index.ts`** if public API
3. **Export from `sdkTypes.ts`** if needed by SDK consumers
4. **Document in this README** under canonical sources table
5. **Add JSDoc comments** explaining purpose and usage
6. **Include examples** in JSDoc for complex types

When deprecating types:

1. **Add deprecation notice** in JSDoc
2. **Provide migration path** with code examples
3. **Keep deprecated exports** for at least one major version
4. **Update this README** with migration guidance

## Examples

### Complete Multimodal Generation

```typescript
import type {
  GenerateOptions,
  MultimodalInput,
  Content,
} from "@juspay/neurolink/types";

const input: MultimodalInput = {
  text: "Analyze this image",
  images: [imageBuffer],
  pdfFiles: [pdfBuffer],
};

const options: GenerateOptions = {
  input,
  provider: "google-ai",
  model: "gemini-2.5-flash",
  temperature: 0.7,
};
```

### Streaming with Tools

```typescript
import type {
  StreamResult,
  StreamingOptions,
  ProgressCallback,
  StreamToolCall,
  StreamToolResult,
} from "@juspay/neurolink/types";

const onProgress: ProgressCallback = (progress) => {
  console.log(`Progress: ${progress.chunkCount} chunks`);
};

const options: StreamingOptions = {
  providers: [{ provider: "openai", model: "gpt-4" }],
  temperature: 0.7,
};
```

### Custom Tool Definition

```typescript
import type {
  ToolDefinition,
  ToolArgs,
  ToolResult,
  ToolContext,
} from "@juspay/neurolink/types";

const myTool: ToolDefinition = {
  name: "custom_tool",
  description: "My custom tool",
  parameters: {
    type: "object",
    properties: {
      input: { type: "string" },
    },
    required: ["input"],
  },
  execute: async (
    args: ToolArgs,
    context: ToolContext,
  ): Promise<ToolResult> => {
    return {
      toolName: "custom_tool",
      output: "result",
      status: "success",
    };
  },
};
```

## Version History

- **v8.4.0**: Current version, `content.ts` deprecated
- **v8.0.0**: Introduction of `multimodal.ts` as canonical source
- **v7.x**: Multiple type files without clear hierarchy
- **v9.0.0** (planned): Remove `content.ts`, full migration to `multimodal.ts`

## Additional Resources

- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - Type system contribution guidelines
- [CLAUDE.md](../../../CLAUDE.md) - Architecture documentation
- API Documentation - Full API reference (coming soon)

---

**Questions or suggestions?** Open an issue on GitHub or contribute to this documentation.
