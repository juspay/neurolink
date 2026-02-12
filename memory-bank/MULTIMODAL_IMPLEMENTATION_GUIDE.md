# NeuroLink Multimodal Implementation Guide

**Based on PDF & CSV Implementation Pattern (Releases 7.50.0 & 7.51.0)**

This document extracts the proven architectural patterns from recent PDF and CSV implementations and provides a step-by-step guide for implementing the remaining multimodal features identified in the gap analysis.

---

## Table of Contents

1. [Implementation Pattern Overview](#implementation-pattern-overview)
2. [CRITICAL: Code Duplication Analysis](#critical-code-duplication-analysis)
3. [Type System Architecture](#type-system-architecture)
4. [BaseProvider Refactoring Strategy](#baseprovider-refactoring-strategy)
5. [The 7-Step Recipe](#the-7-step-recipe)
6. [Architectural Components](#architectural-components)
7. [Implementation Roadmap by Feature](#implementation-roadmap-by-feature)
8. [Code Templates](#code-templates)
9. [Integration Checklist](#integration-checklist)
10. [Testing Strategy](#testing-strategy)

---

## Implementation Pattern Overview

### What We Learned from PDF & CSV

The recent multimodal implementations (commits 374b375, 020e15a, 52abf1a) established a clear architectural pattern:

**CSV Implementation (374b375)** - Text-based multimodal processing:

- **Files changed**: 45 files
- **Lines added**: 3,793 insertions
- **Core components**: FileDetector (581 lines), CSVProcessor (369 lines), directTools (356 lines)
- **Provider support**: Universal (text-based, works with all 12+ providers)
- **Processing approach**: Streaming parser, 3 output formats (raw/json/markdown)

**PDF Implementation (020e15a, 52abf1a)** - Binary multimodal processing:

- **Files changed**: 38 files
- **Lines added**: 2,166 insertions
- **Core components**: PDFProcessor (239 lines), provider configs (114 lines)
- **Provider support**: Selective (7 providers with native PDF support)
- **Processing approach**: Binary pass-through with provider-specific validation

### Key Success Factors

1. **Unified File Detection System** - Multi-strategy approach (magic bytes, MIME, extension, content heuristics)
2. **Processor Class Pattern** - Dedicated processor for each file type with `process()` method
3. **Provider Configuration** - Centralized config system for provider-specific limits and capabilities
4. **Type Safety** - Comprehensive TypeScript types in `fileTypes.ts`
5. **CLI-First Design** - CLI flags followed by SDK integration
6. **Incremental Testing** - Tests written alongside implementation

### Additional Patterns from Haystack Analysis

After analyzing deepset's Haystack framework (14 document converters, audio transcription), we identified additional patterns to adopt:

1. **Audio Returns Text, Not Binary** - Critical insight: Audio files should be transcribed to **text**, not passed as binary
   - Haystack's `RemoteWhisperTranscriber` returns `Document(content=text)`, not audio buffer
   - Audio is converted to text via transcription APIs (Whisper, Google Speech, Azure)
   - Text content is then added to LLM prompts (not audio files)

2. **Lazy Imports with Error Messages** - Better developer experience:

   ```typescript
   // Add dependency check with install instructions
   export class AudioProcessor {
     static async process(content: Buffer, options?: AudioProcessorOptions) {
       try {
         await import("openai");
       } catch (error) {
         throw new Error(
           "Missing dependency: openai\n" +
             "Install it with: npm install openai",
         );
       }
       // ... processing
     }
   }
   ```

3. **Metadata Normalization Helper** - Simplifies batch processing:

   ```typescript
   // Allows single metadata object OR array (one per file)
   export function normalizeMetadata<T>(
     meta: T | T[] | undefined,
     count: number,
   ): T[] {
     if (!meta) return Array(count).fill({} as T);
     if (Array.isArray(meta)) {
       if (meta.length !== count) {
         throw new Error(`Metadata array length must match sources count`);
       }
       return meta;
     }
     return Array(count).fill(meta); // Single object → replicate
   }
   ```

4. **Local + Cloud Options** - Cost/privacy flexibility:
   - Haystack has both `RemoteWhisperTranscriber` (OpenAI API) and `LocalWhisperTranscriber` (on-premise)
   - Consider adding local model options for audio transcription (future enhancement)
   - Initial implementation: Cloud-first (OpenAI, Google, Azure)

5. **Component Serialization Pattern** - Configuration portability:
   - Save/load converter configurations for reproducibility
   - Consider for future enhancement

---

## CRITICAL: Code Duplication Analysis

### Current Architecture Problems

After deep analysis of the actual codebase implementation, **critical code duplication has been identified across providers**:

#### Problem 1: Duplicated Multimodal Detection Logic

**The SAME 20-40 lines of code are copy-pasted in at least 4 providers:**

**Files with duplication:**

- `src/lib/providers/anthropic.ts` (lines 167-211)
- `src/lib/providers/googleVertex.ts` (lines 839-887)
- `src/lib/providers/googleAiStudio.ts` (lines 158-189)
- `src/lib/providers/azureOpenai.ts` (lines 147-178)

**Duplicated code pattern:**

```typescript
// THIS CODE IS DUPLICATED IN EVERY PROVIDER's executeStream():
const hasMultimodalInput = !!(
  options.input?.images?.length ||
  options.input?.content?.length ||
  options.input?.files?.length ||
  options.input?.csvFiles?.length ||
  options.input?.pdfFiles?.length
);

let messages;
if (hasMultimodalInput) {
  logger.debug(`${providerName}: Detected multimodal input...`);

  const multimodalOptions = buildMultimodalOptions(
    options,
    this.providerName,
    this.modelName,
  );

  const mm = await buildMultimodalMessagesArray(
    multimodalOptions,
    this.providerName,
    this.modelName,
  );
  messages = convertToCoreMessages(mm);
} else {
  messages = await buildMessagesArray(options);
}
```

**Root cause:** `executeStream()` is abstract in BaseProvider (line 879), forcing each provider to implement multimodal detection independently.

#### Problem 2: BaseProvider is Massive (2351 Lines)

**File size breakdown:**

- `src/lib/core/baseProvider.ts` - **2,351 lines** (needs modularization)
- Single file contains: tools management, message building, streaming, generation, telemetry, analytics, performance metrics

**Impact:** Maintenance burden, difficult to understand, hard to extend

### Solution Architecture

#### Solution 1: Extract Multimodal Message Building to BaseProvider

**Create new protected helper method in BaseProvider:**

```typescript
// Add to BaseProvider class:
protected async buildMessagesForStream(
  options: StreamOptions
): Promise<CoreMessage[]> {
  const hasMultimodalInput = !!(
    options.input?.images?.length ||
    options.input?.content?.length ||
    options.input?.files?.length ||
    options.input?.csvFiles?.length ||
    options.input?.pdfFiles?.length
  );

  if (hasMultimodalInput) {
    logger.debug(
      `${this.providerName}: Detected multimodal input, using multimodal message builder`
    );

    const multimodalOptions = buildMultimodalOptions(
      options,
      this.providerName,
      this.modelName,
    );

    const mm = await buildMultimodalMessagesArray(
      multimodalOptions,
      this.providerName,
      this.modelName,
    );
    return convertToCoreMessages(mm);
  } else {
    logger.debug(
      `${this.providerName}: Text-only input, using standard message builder`
    );
    return await buildMessagesArray(options);
  }
}
```

**Then simplify ALL providers to:**

```typescript
// In each provider's executeStream():
protected async executeStream(
  options: StreamOptions,
  _analysisSchema?: ValidationSchema,
): Promise<StreamResult> {
  // Provider-specific validation
  this.validateStreamOptions(options);

  // Get tools
  const shouldUseTools = !options.disableTools && this.supportsTools();
  const tools = shouldUseTools ? await this.getAllTools() : {};

  // ✅ USE BASEPROVIDER HELPER - NO MORE DUPLICATION
  const messages = await this.buildMessagesForStream(options);

  // Provider-specific streaming implementation
  const model = await this.getAISDKModelWithMiddleware(options);
  const result = await streamText({ model, messages, tools, ... });

  return { stream: transformedStream, ... };
}
```

**Lines saved:** 20-40 lines per provider × 4+ providers = **80-160 lines eliminated**

#### Solution 2: Modularize BaseProvider (2351 Lines → Modules)

**Proposed module structure:**

```
src/lib/core/
├── baseProvider.ts (300-400 lines) - Core class, delegates to modules
├── baseProvider/
│   ├── messageBuilder.ts (400 lines) - buildMessages, buildMessagesForStream
│   ├── toolsManager.ts (500 lines) - Tool registration, MCP tools, getAllTools
│   ├── streamHandler.ts (400 lines) - Stream execution, fake streaming
│   ├── generationHandler.ts (400 lines) - Text generation, tool execution
│   ├── telemetryHandler.ts (200 lines) - Telemetry, analytics, evaluation
│   └── performanceMetrics.ts (200 lines) - Cost calculation, performance tracking
```

**Implementation approach:**

1. Extract modules one at a time (start with messageBuilder)
2. Use composition pattern - BaseProvider owns module instances
3. Maintain backward compatibility - public API unchanged
4. Follow project standards: camelCase, optional methods, rich context flow

**Example refactored BaseProvider:**

```typescript
export abstract class BaseProvider implements AIProvider {
  protected readonly modelName: string;
  protected readonly providerName: AIProviderName;

  // Module instances (composition pattern)
  private readonly messageBuilderModule: MessageBuilderModule;
  private readonly toolsManagerModule: ToolsManagerModule;
  private readonly streamHandlerModule: StreamHandlerModule;

  constructor(...) {
    // Initialize modules
    this.messageBuilderModule = new MessageBuilderModule(this);
    this.toolsManagerModule = new ToolsManagerModule(this);
    this.streamHandlerModule = new StreamHandlerModule(this);
  }

  // Delegate to modules
  protected async buildMessages(options: TextGenerationOptions) {
    return this.messageBuilderModule.buildMessages(options);
  }

  protected async buildMessagesForStream(options: StreamOptions) {
    return this.messageBuilderModule.buildMessagesForStream(options);
  }

  protected async getAllTools() {
    return this.toolsManagerModule.getAllTools();
  }
}
```

**Benefits:**

- **Maintainability:** Each module is 200-500 lines (manageable)
- **Testability:** Test modules independently
- **Extensibility:** Add new modules without touching core
- **Readability:** Clear separation of concerns

---

## Type System Architecture

### Current Type Hierarchy

After analyzing the actual implementation, here's the complete type system:

#### Core File Types (`src/lib/types/fileTypes.ts` - 123 lines)

**Source of truth for file processing:**

```typescript
export type FileType = "csv" | "image" | "pdf" | "text" | "unknown";
export type FileInput = Buffer | string;

export type FileProcessingResult = {
  type: FileType;
  content: string | Buffer; // TEXT for CSV, BUFFER for images/PDFs
  mimeType: string;
  metadata: {
    confidence: number;
    size?: number;
    filename?: string;
    // CSV-specific
    rowCount?: number;
    columnCount?: number;
    columnNames?: string[];
    // PDF-specific
    version?: string;
    estimatedPages?: number | null;
    provider?: string;
  };
};

export type CSVProcessorOptions = {
  maxRows?: number;
  formatStyle?: "raw" | "markdown" | "json";
  includeHeaders?: boolean;
};

export type PDFProcessorOptions = {
  provider?: string;
  model?: string;
  maxSizeMB?: number;
  bedrockApiMode?: "converse" | "invokeModel";
};
```

#### Content Types (`src/lib/types/content.ts` - 118 lines)

**Structured content for multimodal messages:**

```typescript
export type TextContent = { type: "text"; text: string };

export type ImageContent = {
  type: "image";
  data: Buffer | string;
  mediaType?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  metadata?: { description?: string; quality?: "low" | "high" | "auto" };
};

export type CSVContent = {
  type: "csv";
  data: Buffer | string;
  metadata?: {
    filename?: string;
    maxRows?: number;
    formatStyle?: "raw" | "markdown" | "json";
  };
};

export type PDFContent = {
  type: "pdf";
  data: Buffer | string;
  metadata?: { filename?: string; pages?: number; version?: string };
};

export type Content = TextContent | ImageContent | CSVContent | PDFContent;
```

#### Multimodal Input (`src/lib/core/baseProvider.ts` lines 58-65)

**⚠️ PROBLEM: Defined locally, should be centralized**

```typescript
// Currently defined INSIDE baseProvider.ts (NOT exported)
type MultimodalInput = {
  text: string;
  images?: Array<Buffer | string>;
  content?: Array<TextContent | ImageContent>;
  csvFiles?: Array<Buffer | string>;
  pdfFiles?: Array<Buffer | string>;
  files?: Array<Buffer | string>;
};
```

**Recommendation:** Move to `src/lib/types/multimodal.ts` and export

#### Conversation Types (`src/lib/types/conversation.ts` lines 96-145)

```typescript
export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
}

export interface MultimodalChatMessage {
  role: "user" | "assistant" | "system";
  content: string | MessageContent[];
}

export interface MessageContent {
  type: string;
  text?: string;
  image?: string;
  mimeType?: string;
}
```

### Type Reuse Opportunities

**Current duplication:**

1. `MessageContent` (conversation.ts) vs `Content` (content.ts) - similar concepts, different structures
2. `MultimodalInput` defined locally in baseProvider.ts, should be exported
3. `CSVContent`, `PDFContent` exist but not used in `MultimodalInput`

**Recommendation:**

1. **Export `MultimodalInput`** from `src/lib/types/multimodal.ts`
2. **Unify content types** - use `Content` types everywhere
3. **Create type converters** - `MessageContent` ↔ `Content`

---

```typescript
export class AudioProcessor {
  static toConfig(options: AudioProcessorOptions): Record<string, unknown> {
    return {
      provider: options.provider,
      model: options.transcriptionModel,
      language: options.language,
    };
  }

  static fromConfig(config: Record<string, unknown>): AudioProcessorOptions {
    return {
      provider: config.provider as string,
      transcriptionModel: config.model as string,
      language: config.language as string,
    };
  }
}
```

---

## Actual Message Building Flow

### How Multimodal Messages Work in NeuroLink

Understanding the complete flow is critical before implementing new features. Here's the actual implementation:

#### Entry Points

**1. generate() method (Text Generation):**

```typescript
// BaseProvider.generate() → lines 349-426
async generate(options: TextGenerationOptions): Promise<EnhancedGenerateResult> {
  // Calls this.buildMessages(options)
  const messages = await this.buildMessages(options);
  // ...
}
```

**2. stream() method (Streaming):**

```typescript
// BaseProvider.stream() → lines 133-310
async stream(options: StreamOptions): Promise<StreamResult> {
  // Calls this.executeStream() - ABSTRACT method
  const result = await this.executeStream(options, analysisSchema);
  // ...
}
```

#### The buildMessages() Method (Used by generate())

**Location:** `src/lib/core/baseProvider.ts` lines 349-426

**Flow:**

```typescript
private async buildMessages(options: TextGenerationOptions): Promise<CoreMessage[]> {
  // 1. Detect multimodal input
  const hasMultimodalInput = (opts: TextGenerationOptions): boolean => {
    const input = opts.input as MultimodalInput | undefined;
    return !!(
      input?.images?.length ||
      input?.content?.length ||
      input?.csvFiles?.length ||
      input?.pdfFiles?.length ||
      input?.files?.length
    );
  };

  // 2. Route to appropriate message builder
  if (hasMultimodalInput(options)) {
    // Multimodal path
    const input = options.input as MultimodalInput;
    const multimodalOptions = {
      input: { text, images, content, csvFiles, pdfFiles, files },
      csvOptions: options.csvOptions,
      provider: options.provider,
      model: options.model,
      // ... other options
    };

    // Calls messageBuilder.ts
    messages = await buildMultimodalMessagesArray(\n      multimodalOptions,\n      this.providerName,\n      this.modelName,\n    );
  } else {
    // Text-only path
    messages = await buildMessagesArray(options);
  }

  // 3. Convert to CoreMessage[] for Vercel AI SDK
  return messages.map(msg => ({ role: msg.role, content: msg.content }));
}
```

**Key points:**

- ✅ Centralized in BaseProvider
- ✅ All providers inherit this logic
- ✅ No duplication for generate() method

#### The executeStream() Problem (Used by stream())

**Location:** Each provider's `executeStream()` implementation

**Problem:** executeStream() is **abstract** (baseProvider.ts:879), so **EVERY provider reimplements the same logic**

**Current implementation in each provider:**

```typescript
// THIS IS DUPLICATED IN: anthropic.ts, googleVertex.ts, googleAiStudio.ts, azureOpenai.ts
protected async executeStream(options: StreamOptions): Promise<StreamResult> {
  // ❌ DUPLICATED: Multimodal detection
  const hasMultimodalInput = !!(\n    options.input?.images?.length ||\n    options.input?.content?.length ||\n    options.input?.files?.length ||\n    options.input?.csvFiles?.length ||\n    options.input?.pdfFiles?.length\n  );

  // ❌ DUPLICATED: Message building
  let messages;\n  if (hasMultimodalInput) {\n    const multimodalOptions = buildMultimodalOptions(\n      options,\n      this.providerName,\n      this.modelName,\n    );

    const mm = await buildMultimodalMessagesArray(\n      multimodalOptions,\n      this.providerName,\n      this.modelName,\n    );
    messages = convertToCoreMessages(mm);
  } else {\n    messages = await buildMessagesArray(options);
  }

  // Provider-specific streaming
  const result = await streamText({ model, messages, tools, ... });
  return result;
}
```

**Why this is a problem:**

- 🔴 Code duplication: 20-40 lines × 4+ providers = 80-160 lines
- 🔴 Maintenance burden: Fix bugs in 4+ places
- 🔴 Inconsistency risk: Providers may drift apart
- 🔴 Violates DRY principle

#### The messageBuilder.ts Orchestrator

**Location:** `src/lib/utils/messageBuilder.ts` lines 436-702

**Purpose:** Central orchestrator for all multimodal message building

**Key function: buildMultimodalMessagesArray()**

**Flow:**

```typescript
export async function buildMultimodalMessagesArray(\n  options: GenerateOptions,\n  provider: string,\n  model: string,\n): Promise<MultimodalChatMessage[]> {\n  // 1. Process unified files array (auto-detect)\n  if (options.input.files?.length) {\n    for (const file of options.input.files) {\n      const result = await FileDetector.detectAndProcess(file, {\n        maxSize,\n        allowedTypes: [\"csv\", \"image\", \"pdf\"],\n        csvOptions: options.csvOptions,\n        provider: provider,\n      });\n\n      if (result.type === \"csv\") {\n        // Add to text content\n        options.input.text += formatCSVContent(result);\n      } else if (result.type === \"image\") {\n        // Add to images array\n        options.input.images.push(result.content);\n      } else if (result.type === \"pdf\") {\n        // Add to pdfFiles array\n        options.input.pdfFiles.push(result.content);\n      }\n    }\n  }\n\n  // 2. Process explicit csvFiles (lines 502-542)\n  if (options.input.csvFiles?.length) {\n    for (const csvFile of options.input.csvFiles) {\n      const result = await FileDetector.detectAndProcess(csvFile, {\n        allowedTypes: [\"csv\"],\n        csvOptions: options.csvOptions,\n      });\n      // Convert CSV to text and append to options.input.text\n      options.input.text += formatCSVContent(result);\n    }\n  }\n\n  // 3. Process explicit pdfFiles (lines 544-573)\n  const pdfFiles: Array<{ buffer: Buffer; filename: string }> = [];\n  if (options.input.pdfFiles?.length) {\n    for (const pdfFile of options.input.pdfFiles) {\n      const result = await FileDetector.detectAndProcess(pdfFile, {\n        maxSize,\n        allowedTypes: [\"pdf\"],\n        provider: provider,\n      });\n      // Store PDFs for multimodal content (NOT text conversion)\n      pdfFiles.push({ buffer: result.content, filename });\n    }\n  }\n\n  // 4. Check if multimodal\n  const hasImages = options.input.images?.length > 0;\n  const hasPDFs = pdfFiles.length > 0;\n\n  // 5. Build messages\n  if (!hasImages && !hasPDFs) {\n    // Text only - use standard builder\n    const standardMessages = await buildMessagesArray(options);\n    return standardMessages.map(msg => ({ role: msg.role, content: msg.content }));
  }

  // 6. Multimodal path - validate provider supports vision\n  if (!ProviderImageAdapter.supportsVision(provider, model)) {\n    throw new Error(`Provider ${provider} does not support vision`);\n  }\n\n  // 7. Build multimodal content array\n  const userContent = await convertMultimodalToProviderFormat(\n    options.input.text,\n    options.input.images || [],\n    pdfFiles,\n    provider,\n    model,\n  );\n\n  // 8. Add to messages array\n  messages.push({\n    role: \"user\",\n    content: userContent,  // Array of TextPart | ImagePart | FilePart\n  });\n\n  return messages;\n}
```

**Key insights:**

- CSV files → Converted to TEXT, appended to prompt (lines 502-542)\n- PDF files → Kept as BINARY in FilePart array (lines 544-573)\n- Images → Converted to base64 data URIs\n- FileDetector.detectAndProcess() does heavy lifting\n- Provider-agnostic until final conversion

#### The multimodalOptionsBuilder Utility

**Location:** `src/lib/utils/multimodalOptionsBuilder.ts` lines 45-70

**Purpose:** Simple field extractor/normalizer

**Code:**

```typescript
export function buildMultimodalOptions(\n  options: StreamOptions,\n  providerName: string,\n  modelName: string,\n) {\n  return {\n    input: {\n      text: options.input?.text || \"\",\n      images: options.input?.images,\n      content: options.input?.content,\n      files: options.input?.files,\n      csvFiles: options.input?.csvFiles,\n      pdfFiles: options.input?.pdfFiles,\n    },\n    csvOptions: options.csvOptions,\n    systemPrompt: options.systemPrompt,\n    conversationHistory: options.conversationMessages,\n    provider: providerName,\n    model: modelName,\n    temperature: options.temperature,\n    maxTokens: options.maxTokens,\n    // ...
  };\n}
```

**Why it exists:** Converts `StreamOptions` → `GenerateOptions` for `buildMultimodalMessagesArray()`

### Implementation Checklist for New Features

When adding a new multimodal type (audio, video, Office docs):

**☐ 1. Update MultimodalInput type** (`src/lib/core/baseProvider.ts:58-65`)

```typescript
type MultimodalInput = {
  text: string;
  images?: Array<Buffer | string>;
  csvFiles?: Array<Buffer | string>;
  pdfFiles?: Array<Buffer | string>;
  audioFiles?: Array<Buffer | string>; // ← ADD THIS
  files?: Array<Buffer | string>;
};
```

**☐ 2. Update multimodal detection logic** (currently in 2 places):

- `BaseProvider.buildMessages()` lines 352-360
- DUPLICATED in each provider's `executeStream()` - **NEEDS REFACTORING**

**☐ 3. Add processor route** in `buildMultimodalMessagesArray()`

```typescript
} else if (result.type === \"audio\") {\n  // Transcribe to text\n  const transcription = await AudioProcessor.process(result.content);\n  options.input.text += transcription;\n}
```

**☐ 4. Update StreamOptions and GenerateOptions types**

**☐ 5. Follow 7-step recipe** (processor, types, FileDetector, CLI, etc.)

---

## The 7-Step Recipe

This is the exact sequence used for PDF and CSV. Follow this for audio, video, Office docs, and TTS.

### Step 1: Create Processor Class

**Location**: `src/lib/utils/[type]Processor.ts`

**Requirements**:

- Static `process()` method accepting `Buffer` and returning `FileProcessingResult`
- Options type for processor configuration
- Error handling with clear messages
- Logging via logger utility

**Template**:

```typescript
// src/lib/utils/audioProcessor.ts
import type {
  FileProcessingResult,
  AudioProcessorOptions,
} from "../types/fileTypes.js";
import { logger } from "./logger.js";

export class AudioProcessor {
  static async process(
    content: Buffer,
    options?: AudioProcessorOptions,
  ): Promise<FileProcessingResult> {
    // 1. Validate file format
    // 2. Check provider capabilities
    // 3. Process/convert as needed
    // 4. Return standardized result

    return {
      type: "audio",
      content: processedContent,
      mimeType: "audio/mpeg",
      metadata: {
        confidence: 100,
        size: content.length,
        // format-specific metadata
      },
    };
  }
}
```

**Examples**:

- CSV: 369 lines with streaming parser, 3 output formats
- PDF: 239 lines with magic byte validation, provider configs

### Step 2: Add Type Definitions

**Location**: `src/lib/types/fileTypes.ts`

**Requirements**:

- Add new FileType to union: `"csv" | "image" | "pdf" | "audio" | "video" | ...`
- Create processor options type
- Create provider config type (if provider-specific)
- Add metadata fields to `FileProcessingResult`

**Template**:

```typescript
// Add to FileType union
export type FileType =
  | "csv"
  | "image"
  | "pdf"
  | "audio"
  | "video"
  | "docx"
  | "text"
  | "unknown";

// Processor options
export type AudioProcessorOptions = {
  provider?: string;
  transcriptionModel?: string;
  language?: string;
  maxDurationSeconds?: number;
};

// Provider config (if needed)
export interface AudioProviderConfig {
  maxSizeMB: number;
  maxDurationSeconds: number;
  supportsTranscription: boolean;
  supportedFormats: string[];
}
```

**Examples**:

- CSV added: `CSVProcessorOptions` (3 fields), metadata fields (5 fields)
- PDF added: `PDFProcessorOptions` (4 fields), `PDFProviderConfig` interface, `PDFAPIType` enum

### Step 3: Integrate with FileDetector

**Location**: `src/lib/utils/fileDetector.ts`

**Changes needed**:

1. Add magic bytes detection to `MagicBytesStrategy`
2. Add MIME type mapping to `MimeTypeStrategy`
3. Add extension mapping to `ExtensionStrategy`
4. Update `processFile()` method to route to new processor

**Template**:

```typescript
// In MagicBytesStrategy.detect()
if (this.isMP3(input)) {
  return this.result("audio", "audio/mpeg", 95);
}

private isMP3(buf: Buffer): boolean {
  // Magic bytes: FF FB (MP3) or ID3 tag
  return (buf.length >= 3 && buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) ||
         (buf.length >= 3 && buf.toString('ascii', 0, 3) === 'ID3');
}

// In processFile()
case "audio":
  return await AudioProcessor.process(content, {
    provider: options?.provider,
    ...options?.audioOptions
  });
```

**Examples**:

- CSV added: 4 detection strategies, content heuristics for comma-separated values
- PDF added: Magic bytes `%PDF-`, extension `.pdf`, MIME `application/pdf`

### Step 4: Update CLI Integration

**Location**: `src/cli/factories/commandFactory.ts`

**Requirements**:

- Add CLI flags (e.g., `--audio <path>`, `--audio-language <lang>`)
- Add to `optionsSchema.ts` for type safety
- Parse options and pass to SDK

**Template**:

```typescript
// Add CLI options
.option("--audio <path>", "Audio file for transcription (can be used multiple times)")
.option("--audio-language <language>", "Language for audio transcription (default: auto)")

// Parse in buildInputOptions()
if (options.audio) {
  const audioFiles = Array.isArray(options.audio) ? options.audio : [options.audio];
  inputOptions.audioFiles = audioFiles;
  if (options.audioLanguage) {
    inputOptions.audioOptions = { language: options.audioLanguage };
  }
}
```

**Examples**:

- CSV added: `--csv`, `--csv-max-rows`, `--csv-format` flags
- PDF added: `--pdf` flag with provider compatibility validation

### Step 5: Update Message Builder

**Location**: `src/lib/utils/messageBuilder.ts`

**Requirements**:

- Handle new file type in multimodal message construction
- Support both explicit arrays (e.g., `audioFiles`) and auto-detection (`files`)
- Add to content blocks for providers that support it

**Template**:

```typescript
// In buildMultimodalInput()
if (audioFiles?.length) {
  for (const audioFile of audioFiles) {
    const result = await AudioProcessor.process(audioFile, {
      provider,
      ...audioOptions,
    });

    // Add to appropriate content block
    // For transcription-based: convert to text and add as text block
    // For native audio input: add as audio content block
  }
}
```

**Examples**:

- CSV: Added to text content blocks (248 lines modified)
- PDF: Added to document content blocks with provider-specific formatting (148 lines modified)

### Step 6: Add Provider Support

**Location**: Individual provider files in `src/lib/providers/`

**Requirements** (varies by feature):

- Update provider's message conversion logic
- Add format-specific content blocks
- Handle provider-specific APIs (e.g., Files API for OpenAI)

**Template**:

```typescript
// In provider file (e.g., openAI.ts)
if (audioFiles?.length && this.supportsAudio()) {
  // Use provider's audio API
  const transcription = await this.transcribeAudio(audioFiles[0]);
  userContent.push({ type: "text", text: transcription });
}

private supportsAudio(): boolean {
  return ["gpt-4", "gpt-4-turbo", "gpt-4o"].includes(this.model);
}
```

**Examples**:

- CSV: Universal support, added to all 12+ providers (minimal changes)
- PDF: Selective support, 11 providers modified with provider-specific logic (862 lines in Ollama alone)

### Step 7: Testing & Documentation

**Testing** - `test/continuous-test-suite.ts`:

- CLI generate test
- CLI stream test
- SDK generate test
- SDK stream test
- Multimodal combination tests (audio + image, audio + CSV, etc.)
- Error handling tests

**Documentation**:

- Feature guide: `docs/features/[feature]-support.md`
- Update: `docs/features/multimodal-chat.md`
- Update: `docs/features/index.md`
- Example code: `examples/[feature]-analysis.ts`
- Test fixtures: `test/fixtures/` and `examples/data/`

**Examples**:

- CSV: 584 lines of tests (6 tests), 509-line feature guide, 4 examples
- PDF: 510 lines of tests (8 tests), 832-line feature guide, 7 examples

---

## Architectural Components

### Component Hierarchy

```
NeuroLink SDK Entry Point (neurolink.ts)
    ↓
BaseProvider (baseProvider.ts)
    ↓
MessageBuilder (messageBuilder.ts)
    ↓
FileDetector (fileDetector.ts)
    ↓
[Type]Processor (csvProcessor.ts, pdfProcessor.ts, etc.)
    ↓
Provider Implementation (openAI.ts, anthropic.ts, etc.)
```

### File Structure Pattern

```
src/
├── lib/
│   ├── types/
│   │   └── fileTypes.ts          # Type definitions
│   ├── utils/
│   │   ├── fileDetector.ts       # Auto-detection (581 lines)
│   │   ├── csvProcessor.ts       # CSV processing (369 lines)
│   │   ├── pdfProcessor.ts       # PDF processing (239 lines)
│   │   ├── audioProcessor.ts     # [NEW] Audio transcription
│   │   ├── videoProcessor.ts     # [NEW] Video processing
│   │   └── officeProcessor.ts    # [NEW] DOCX/PPTX/XLSX
│   ├── providers/
│   │   ├── openAI.ts             # Provider-specific integration
│   │   └── [...]
│   └── agent/
│       └── directTools.ts        # CSV analysis tool (356 lines)
├── cli/
│   └── factories/
│       └── commandFactory.ts     # CLI flags
└── test/
    ├── continuous-test-suite.ts  # Integration tests
    └── fixtures/                 # Test data
```

### Data Flow for New File Type

```
User Input (CLI/SDK)
    ↓
CLI Parser / SDK Method
    ↓
FileDetector.detectAndProcess()
    ├── Magic Bytes → FileType
    ├── Load Content → Buffer
    └── Route to Processor
        ↓
[Type]Processor.process()
    ├── Validate format
    ├── Check provider support
    └── Convert/process content
        ↓
FileProcessingResult
    ↓
MessageBuilder.buildMultimodalInput()
    ├── Combine with text/images/other files
    └── Format for provider
        ↓
Provider API Call
    ├── OpenAI: Files API or inline
    ├── Anthropic: Document API
    ├── Vertex: Document API
    └── Others: Provider-specific
        ↓
LLM Response
```

---

## Implementation Roadmap by Feature

Based on the gap analysis, here's how to implement each missing feature using the 7-step recipe.

### 1. Audio File Transcription (Highest Priority)

**Gap**: 100% missing - SurfSense has full support, NeuroLink has none

**Effort**: ~5-7 days (similar to PDF: 2,166 insertions)

**Implementation Strategy**: Provider-dependent

**Step-by-Step**:

1. **Create AudioProcessor** (`src/lib/utils/audioProcessor.ts` - ~300 lines)
   - Magic bytes detection: MP3 (`FF FB`), M4A (`00 00 00 18 66 74 79 70`), WAV (`52 49 46 46`), FLAC (`66 4C 61 43`)
   - Provider routing: OpenAI Whisper API, Google Speech-to-Text, Azure Speech
   - **CRITICAL**: Return transcribed **TEXT**, not audio buffer
     - `content: transcription.text` (string)
     - `mimeType: "text/plain"` (not `audio/*`)
     - Audio files are converted to text via transcription APIs
     - Text is then added to LLM prompts (like CSV/PDF text content)

2. **Add Types** (`src/lib/types/fileTypes.ts`)

   ```typescript
   export type FileType = ... | "audio";

   export type AudioProcessorOptions = {
     provider?: string;
     transcriptionModel?: string; // whisper-1, chirp-3
     language?: string;            // en, es, fr, etc.
     prompt?: string;              // Context for transcription
     maxDurationSeconds?: number;  // 600 for most providers
   };

   export interface AudioProviderConfig {
     maxSizeMB: number;              // 25MB for Whisper
     maxDurationSeconds: number;     // 600 seconds
     supportsTranscription: boolean;
     supportedFormats: string[];     // mp3, m4a, wav, webm
     apiType: "whisper" | "speech-to-text" | "chirp";
   }
   ```

3. **Integrate with FileDetector**
   - Add to `MagicBytesStrategy`: MP3, M4A, WAV, FLAC detection
   - Add to `MimeTypeStrategy`: `audio/mpeg`, `audio/mp4`, `audio/wav`
   - Add to `ExtensionStrategy`: `.mp3`, `.m4a`, `.wav`, `.flac`, `.opus`
   - Route to `AudioProcessor.process()`

4. **CLI Integration** (`commandFactory.ts`)

   ```bash
   --audio <path>              # Audio file for transcription
   --audio-language <code>     # Language code (en, es, fr)
   --audio-model <model>       # whisper-1, chirp-3
   ```

5. **Message Builder Integration**
   - Transcribe audio → text
   - Add transcribed text to message with header: `# Transcription of {filename}\n\n{text}`
   - Similar to SurfSense pattern (lines 778-849 in documents_routes.py)

6. **Provider Support**
   - **OpenAI**: Whisper API (25MB, 600s, mp3/m4a/wav/webm)
   - **Google Vertex**: Chirp 3 (10MB, unlimited duration)
   - **Azure**: Speech-to-Text API (100MB, no limit)
   - **Others**: Delegate to OpenAI Whisper

7. **Testing & Docs**
   - Test fixtures: `test-audio.mp3` (2-3 mins), `speech-sample.wav`
   - 6-8 tests: CLI/SDK generate, streaming, error handling
   - Documentation: `docs/features/audio-transcription.md` (~400 lines)
   - Examples: `examples/audio-transcription.ts`

**SurfSense Reference**:

- `surfsense_backend/app/routes/documents_routes.py:778-849`
- Uses OpenAI `atranscription()` API
- Pattern: Upload → Transcribe → Store as markdown with header

**Dependencies to Add**:

```json
{
  "@google-cloud/speech": "^6.0.0", // Optional: Google Speech-to-Text
  "microsoft-cognitiveservices-speech-sdk": "^1.35.0" // Optional: Azure Speech
}
```

---

### 2. Real-time Audio Streaming (Medium Priority)

**Gap**: 100% missing - NeuroLink has Gemini Live, but needs expansion

**Effort**: ~3-4 days

**Implementation Strategy**: SDK-only (no file processing needed)

**Current State**: Gemini Live already implemented in `googleAiStudio.ts:449-520`

**Enhancements Needed**:

1. **Extract Audio Streaming to Dedicated Module**
   - Move Gemini Live logic to `src/lib/utils/audioStreaming.ts`
   - Create `AudioStreamProcessor` class
   - Support PCM streaming at 16kHz and 24kHz

2. **Expand Provider Support**
   - **OpenAI**: Realtime API (PCM, 16kHz/24kHz)
   - **Anthropic**: No native support (convert to file-based)
   - **Azure**: Real-time speech API

3. **Add Stream Configuration Types**

   ```typescript
   export type AudioStreamConfig = {
     format: "pcm" | "opus" | "mp3";
     sampleRate: 16000 | 24000 | 48000;
     channels: 1 | 2;
     bitDepth: 16 | 24;
   };
   ```

4. **Documentation**
   - Update `docs/features/audio-transcription.md` with streaming section
   - Add example: `examples/realtime-audio-chat.ts`

**SurfSense Reference**: Not applicable (web-based only)

---

### 3. Video File Processing (High Priority)

**Gap**: 100% missing - SurfSense has YouTube support, NeuroLink has none

**Effort**: ~6-8 days

**Implementation Strategy**: Hybrid (transcription + vision)

**Step-by-Step**:

1. **Create VideoProcessor** (`src/lib/utils/videoProcessor.ts` - ~350 lines)
   - Magic bytes detection: MP4 (`00 00 00 18 66 74 79 70`), WebM (`1A 45 DF A3`), AVI (`52 49 46 46`)
   - **Two processing modes**:
     - **Audio extraction + transcription**: Extract audio track → transcribe with Whisper
     - **Frame extraction + vision**: Extract key frames → analyze with vision models
   - Combine transcript + visual analysis

2. **Add Types**

   ```typescript
   export type FileType = ... | "video";

   export type VideoProcessorOptions = {
     provider?: string;
     extractFrames?: boolean;       // Extract key frames for vision analysis
     frameInterval?: number;        // Seconds between frames (default: 30)
     maxFrames?: number;            // Max frames to extract (default: 10)
     transcribeAudio?: boolean;     // Extract and transcribe audio (default: true)
     audioOptions?: AudioProcessorOptions;
   };

   export interface VideoProviderConfig {
     maxSizeMB: number;             // 100MB typical
     maxDurationSeconds: number;    // 600 seconds
     supportsFrameExtraction: boolean;
     supportsAudioExtraction: boolean;
   }
   ```

3. **Dependencies to Add**

   ```json
   {
     "fluent-ffmpeg": "^2.1.2", // Video processing
     "@ffmpeg-installer/ffmpeg": "^1.1.0" // FFmpeg binary
   }
   ```

4. **Processing Pipeline**

   ```typescript
   async process(content: Buffer, options?: VideoProcessorOptions) {
     // 1. Extract audio track using ffmpeg
     const audioBuffer = await this.extractAudio(content);

     // 2. Transcribe audio using AudioProcessor
     const transcript = await AudioProcessor.process(audioBuffer, {
       provider: options?.provider,
       ...options?.audioOptions
     });

     // 3. Extract key frames (optional)
     let frames: Buffer[] = [];
     if (options?.extractFrames) {
       frames = await this.extractFrames(content, {
         interval: options.frameInterval || 30,
         maxFrames: options.maxFrames || 10
       });
     }

     // 4. Return combined result
     return {
       type: "video",
       content: {
         transcript: transcript.content,
         frames: frames,  // For vision analysis
       },
       metadata: {
         duration: videoDuration,
         frameCount: frames.length,
         hasAudio: audioBuffer.length > 0
       }
     };
   }
   ```

5. **Message Builder Integration**
   - Add transcript as text block
   - Add frames as image blocks (if extracted)
   - Format: `# Video Analysis: {filename}\n\n## Transcript:\n{text}\n\n## Visual Content:\n[frames as images]`

6. **CLI Integration**

   ```bash
   --video <path>              # Video file for analysis
   --video-extract-frames      # Extract and analyze frames
   --video-frame-interval <n>  # Seconds between frames (default: 30)
   ```

7. **Provider Support**
   - **All providers**: Audio transcription (via Whisper)
   - **Vision providers**: Frame analysis (GPT-4V, Claude, Gemini)

8. **Testing**
   - Test fixtures: `sample-video.mp4` (30s), `presentation.webm`
   - 8-10 tests: Audio-only, frames-only, combined, error cases

**SurfSense Reference**:

- `surfsense_backend/app/tasks/document_processors/youtube_processor.py:92-149`
- YouTube-specific (uses YouTube Transcript API)
- Pattern: Fetch metadata → Get captions → Format with timestamps

**NeuroLink Approach** (different from SurfSense):

- Local video file processing (not YouTube URLs)
- Use ffmpeg for audio/frame extraction
- Combine with existing audio + vision capabilities

---

### 4. Office Documents - DOCX/PPTX/XLSX (High Priority)

**Gap**: 100% missing - SurfSense uses Docling/Unstructured, NeuroLink has none

**Effort**: ~7-10 days (most complex)

**Implementation Strategy**: ETL service integration

**Options for Implementation**:

#### Option A: Use Mammoth.js (Lightweight, Node-native)

- **Pros**: No external services, fast, simple
- **Cons**: DOCX only, no tables/images, limited formatting
- **Best for**: Basic text extraction

#### Option B: Use Unstructured.io API (Recommended)

- **Pros**: 34+ formats, excellent table/image extraction, cloud or self-hosted
- **Cons**: Requires API key or Docker deployment
- **Best for**: Production, comprehensive extraction

#### Option C: Use Docling (GPU-accelerated, local)

- **Pros**: Local processing, no API costs, GPU acceleration
- **Cons**: Complex setup, GPU required for best performance
- **Best for**: On-premise deployments

**Recommended**: Start with Option B (Unstructured.io), add Option C later

**Step-by-Step (Unstructured.io approach)**:

1. **Create OfficeProcessor** (`src/lib/utils/officeProcessor.ts` - ~400 lines)

   ```typescript
   export class OfficeProcessor {
     static async process(content: Buffer, options?: OfficeProcessorOptions) {
       const format = this.detectFormat(content); // docx, pptx, xlsx

       // Use Unstructured.io API
       const response = await fetch(
         "https://api.unstructured.io/general/v0/general",
         {
           method: "POST",
           headers: {
             "unstructured-api-key": apiKey,
           },
           body: formData, // file + parameters
         },
       );

       const elements = await response.json();

       // Convert to markdown
       const markdown = this.elementsToMarkdown(elements);

       return {
         type: format,
         content: markdown,
         mimeType: this.getMimeType(format),
         metadata: {
           pageCount: elements.filter((e) => e.type === "page").length,
           tableCount: elements.filter((e) => e.type === "table").length,
           imageCount: elements.filter((e) => e.type === "image").length,
         },
       };
     }

     private static detectFormat(buf: Buffer): "docx" | "pptx" | "xlsx" {
       // All Office files are ZIP archives with specific internal structure
       // Check for [Content_Types].xml and look for specific namespaces
     }
   }
   ```

2. **Add Types**

   ```typescript
   export type FileType = ... | "docx" | "pptx" | "xlsx";

   export type OfficeProcessorOptions = {
     provider?: string;
     extractTables?: boolean;      // Extract tables separately
     extractImages?: boolean;      // Extract and analyze images
     includeMetadata?: boolean;    // Include doc metadata
     etlService?: "unstructured" | "docling" | "llamacloud";
   };

   export interface ETLServiceConfig {
     apiKey?: string;
     endpoint?: string;
     timeout?: number;
     maxSizeMB?: number;
   }
   ```

3. **Dependencies**

   ```json
   {
     "unstructured-client": "^0.9.0", // Official Unstructured.io SDK
     "mammoth": "^1.6.0" // Backup for simple DOCX
   }
   ```

4. **FileDetector Integration**
   - Magic bytes: All Office XML formats start with `PK` (ZIP) + internal structure
   - Detailed detection:
     - DOCX: `[Content_Types].xml` contains `wordprocessingml`
     - PPTX: Contains `presentationml`
     - XLSX: Contains `spreadsheetml`

5. **Message Builder**
   - Convert Office docs to markdown
   - Extract tables → CSV format
   - Extract images → separate image analysis
   - Format: `# Document: {filename}\n\n{markdown content}`

6. **CLI Integration**

   ```bash
   --office <path>             # Office document (DOCX/PPTX/XLSX)
   --office-extract-tables     # Extract tables as CSV
   --office-extract-images     # Extract and analyze images
   --etl-service <service>     # unstructured | docling | llamacloud
   ```

7. **Environment Configuration**

   ```bash
   UNSTRUCTURED_API_KEY=your-api-key
   UNSTRUCTURED_ENDPOINT=https://api.unstructured.io  # or self-hosted
   ```

8. **Testing**
   - Test fixtures: `report.docx`, `presentation.pptx`, `data.xlsx`
   - 10-12 tests: Each format, table extraction, image extraction, error cases

**SurfSense Reference**:

- `surfsense_backend/app/services/docling_service.py:67-129`
- Uses Docling with GPU acceleration
- Pattern: Initialize pipeline → Configure OCR → Convert document → Extract markdown

**Fallback Strategy**:

1. Try Unstructured.io API (primary)
2. Fall back to Mammoth.js for DOCX (if API fails)
3. Return error for PPTX/XLSX if API unavailable

---

### 5. Text-to-Speech (TTS) (Medium Priority)

**Gap**: 100% missing - SurfSense has Kokoro + cloud TTS, NeuroLink has none

**Effort**: ~4-5 days

**Implementation Strategy**: Provider-based (not file processing)

**Step-by-Step**:

1. **Create TTSProcessor** (`src/lib/utils/ttsProcessor.ts` - ~250 lines)

   ```typescript
   export class TTSProcessor {
     static async synthesize(
       text: string,
       options: TTSOptions,
     ): Promise<Buffer> {
       const provider = options.provider || "openai";

       switch (provider) {
         case "openai":
           return await this.openAITTS(text, options);
         case "azure":
           return await this.azureTTS(text, options);
         case "google":
           return await this.googleTTS(text, options);
         case "elevenlabs":
           return await this.elevenLabsTTS(text, options);
         default:
           throw new Error(`TTS provider ${provider} not supported`);
       }
     }

     private static async openAITTS(text: string, options: TTSOptions) {
       const response = await fetch("https://api.openai.com/v1/audio/speech", {
         method: "POST",
         headers: {
           Authorization: `Bearer ${apiKey}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           model: options.model || "tts-1",
           voice: options.voice || "alloy",
           input: text,
           response_format: options.format || "mp3",
           speed: options.speed || 1.0,
         }),
       });

       return Buffer.from(await response.arrayBuffer());
     }
   }
   ```

2. **Add Types**

   ```typescript
   export type TTSOptions = {
     provider?: "openai" | "azure" | "google" | "elevenlabs";
     voice?: string; // alloy, echo, fable, etc.
     model?: string; // tts-1, tts-1-hd
     speed?: number; // 0.25 - 4.0
     format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
     language?: string; // en, es, fr, etc.
   };

   export interface TTSProviderConfig {
     voices: string[];
     languages: string[];
     maxChars: number; // 4096 for OpenAI
     formats: string[];
     supportsSSML: boolean;
   }
   ```

3. **SDK Integration** (not CLI-focused)

   ```typescript
   // In neurolink.ts
   async textToSpeech(text: string, options?: TTSOptions): Promise<Buffer> {
     return await TTSProcessor.synthesize(text, {
       provider: this.provider,
       ...options
     });
   }
   ```

4. **CLI Integration**

   ```bash
   npx @juspay/neurolink tts "Hello world" --voice alloy --output speech.mp3
   npx @juspay/neurolink tts --file input.txt --voice echo --format opus
   ```

5. **Provider Support Matrix**
   - **OpenAI**: 6 voices, 100+ languages, 4096 chars, $15/1M chars
   - **Azure**: 400+ voices, 140+ languages, SSML support
   - **Google Vertex**: 380+ voices, 50+ languages, WaveNet/Neural2
   - **ElevenLabs**: Custom voices, voice cloning, highest quality

6. **Dependencies**

   ```json
   {
     "@azure/cognitiveservices-speech-sdk": "^1.35.0",
     "@google-cloud/text-to-speech": "^5.0.0",
     "elevenlabs-api": "^1.0.0"
   }
   ```

7. **Testing**
   - 6-8 tests: Each provider, voice options, format conversion
   - Test input: Short phrases, long paragraphs, SSML markup

**SurfSense Reference**:

- `surfsense_backend/app/services/kokoro_tts_service.py:1-139`
- Local TTS with Kokoro model
- 9 languages, 24kHz output
- Pattern: Load model → Generate speech → Stream response

**NeuroLink Approach**:

- Cloud-first (OpenAI, Azure, Google)
- No local model (simpler deployment)
- Async generation with streaming option

---

## Code Templates

### Processor Class Template

```typescript
// src/lib/utils/[type]Processor.ts
import type {
  FileProcessingResult,
  [Type]ProcessorOptions,
  [Type]ProviderConfig,
} from "../types/fileTypes.js";
import { logger } from "./logger.js";

// Provider configuration (if provider-specific)
const [TYPE]_PROVIDER_CONFIGS: Record<string, [Type]ProviderConfig> = {
  openai: {
    maxSizeMB: 25,
    supportsFeature: true,
    // ... provider-specific limits
  },
  // ... other providers
};

export class [Type]Processor {
  // Magic bytes or file signature
  private static readonly [TYPE]_SIGNATURE = Buffer.from(...);

  /**
   * Process [type] file to LLM-ready format
   *
   * @param content - File content as Buffer
   * @param options - Processing options
   * @returns Processed file result
   */
  static async process(
    content: Buffer,
    options?: [Type]ProcessorOptions,
  ): Promise<FileProcessingResult> {
    const provider = (options?.provider || "unknown").toLowerCase();
    const config = [TYPE]_PROVIDER_CONFIGS[provider];

    // 1. Validate file format
    if (!this.isValid[Type](content)) {
      throw new Error(
        `Invalid [type] file format. File must have valid signature.`
      );
    }

    // 2. Check provider support
    if (!config || !config.supportsFeature) {
      const supportedProviders = Object.keys([TYPE]_PROVIDER_CONFIGS)
        .filter((p) => [TYPE]_PROVIDER_CONFIGS[p].supportsFeature)
        .join(", ");

      throw new Error(
        `[Type] files not supported with ${provider} provider.\n` +
        `Supported providers: ${supportedProviders}`
      );
    }

    // 3. Validate size limits
    const sizeMB = content.length / (1024 * 1024);
    if (sizeMB > config.maxSizeMB) {
      throw new Error(
        `File size ${sizeMB.toFixed(2)}MB exceeds ${config.maxSizeMB}MB limit`
      );
    }

    // 4. Process/convert content
    const processedContent = await this.processContent(content, options);

    // 5. Extract metadata
    const metadata = this.extractMetadata(content);

    logger.info(`[[Type]Processor] ✅ Processed file`, {
      provider,
      size: `${sizeMB.toFixed(2)}MB`,
      ...metadata,
    });

    // 6. Return standardized result
    return {
      type: "[type]",
      content: processedContent,
      mimeType: "application/[type]",
      metadata: {
        confidence: 100,
        size: content.length,
        ...metadata,
        provider,
      },
    };
  }

  /**
   * Check if provider supports this file type natively
   */
  static supportsNative[Type](provider: string): boolean {
    const config = [TYPE]_PROVIDER_CONFIGS[provider];
    return config?.supportsFeature || false;
  }

  /**
   * Get provider-specific configuration
   */
  static getProviderConfig(provider: string): [Type]ProviderConfig | null {
    return [TYPE]_PROVIDER_CONFIGS[provider] || null;
  }

  /**
   * Validate file format using magic bytes
   */
  private static isValid[Type](buffer: Buffer): boolean {
    if (buffer.length < this.[TYPE]_SIGNATURE.length) {
      return false;
    }
    return buffer
      .subarray(0, this.[TYPE]_SIGNATURE.length)
      .equals(this.[TYPE]_SIGNATURE);
  }

  /**
   * Process file content (format conversion, extraction, etc.)
   */
  private static async processContent(
    buffer: Buffer,
    options?: [Type]ProcessorOptions,
  ): Promise<string | Buffer> {
    // Implementation-specific processing
    // Examples:
    // - CSV: Parse and convert to markdown/JSON → Return string
    // - PDF: Pass through as Buffer → Return Buffer
    // - Audio: Transcribe to text via Whisper API → Return string (CRITICAL: not Buffer!)
    // - Office: Extract to markdown via ETL → Return string

    return buffer; // or processed string
  }

  /**
   * Extract file metadata
   */
  private static extractMetadata(buffer: Buffer) {
    // Extract format-specific metadata
    // Examples:
    // - CSV: row count, column count
    // - PDF: page count, version
    // - Audio: duration, sample rate
    // - Office: page count, table count

    return {
      // metadata fields
    };
  }
}
```

### Type Definitions Template

```typescript
// Add to src/lib/types/fileTypes.ts

// 1. Add to FileType union
export type FileType =
  | "csv"
  | "image"
  | "pdf"
  | "audio"      // NEW
  | "video"      // NEW
  | "docx"       // NEW
  | "pptx"       // NEW
  | "xlsx"       // NEW
  | "text"
  | "unknown";

// 2. Processor options type
export type [Type]ProcessorOptions = {
  provider?: string;
  // Format-specific options
  maxSize?: number;
  // ... other options
};

// 3. Provider configuration (if needed)
export interface [Type]ProviderConfig {
  maxSizeMB: number;
  maxDuration?: number;        // For audio/video
  supportsNative: boolean;
  supportedFormats: string[];  // file extensions
  apiType?: string;            // API variant (document, files-api, etc.)
}

// 4. Add metadata fields to FileProcessingResult
export type FileProcessingResult = {
  type: FileType;
  content: string | Buffer;
  mimeType: string;
  metadata: {
    confidence: number;
    size?: number;
    filename?: string;

    // CSV-specific
    rowCount?: number;
    columnCount?: number;

    // PDF-specific
    estimatedPages?: number | null;
    version?: string;

    // Audio-specific (NEW)
    duration?: number;           // seconds
    sampleRate?: number;         // Hz
    transcription?: string;

    // Video-specific (NEW)
    frameCount?: number;
    hasAudio?: boolean;

    // Office-specific (NEW)
    pageCount?: number;
    tableCount?: number;
    imageCount?: number;
  };
};
```

### FileDetector Integration Template

```typescript
// Add to src/lib/utils/fileDetector.ts

// 1. Add magic bytes detection
class MagicBytesStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    if (!Buffer.isBuffer(input)) {
      return this.unknown();
    }

    // ... existing checks (PNG, JPEG, PDF, etc.)

    // NEW: Add format detection
    if (this.is[Type](input)) {
      return this.result("[type]", "application/[type]", 95);
    }

    return this.unknown();
  }

  private is[Type](buf: Buffer): boolean {
    // Magic bytes check
    // Example for MP3:
    return (buf.length >= 3 && buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) ||
           (buf.length >= 3 && buf.toString('ascii', 0, 3) === 'ID3');
  }
}

// 2. Add MIME type mapping
class MimeTypeStrategy implements DetectionStrategy {
  private mimeToFileType(mime: string): FileType {
    // ... existing mappings

    // NEW: Add MIME type
    if (mime.includes("audio/")) {
      return "audio";
    }
    if (mime.includes("video/")) {
      return "video";
    }
    if (mime.includes("application/vnd.openxmlformats-officedocument.wordprocessingml")) {
      return "docx";
    }

    return "unknown";
  }
}

// 3. Add extension mapping
class ExtensionStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    const ext = this.getExtension(input);
    if (!ext) return this.unknown();

    const typeMap: Record<string, FileType> = {
      // ... existing mappings

      // NEW: Add extensions
      mp3: "audio",
      m4a: "audio",
      wav: "audio",
      flac: "audio",
      mp4: "video",
      webm: "video",
      avi: "video",
      docx: "docx",
      pptx: "pptx",
      xlsx: "xlsx",
    };

    const type = typeMap[ext.toLowerCase()];
    return { /* ... */ };
  }
}

// 4. Add to processFile router
private static async processFile(
  content: Buffer,
  detection: FileDetectionResult,
  options?: CSVProcessorOptions,
  provider?: string,
): Promise<FileProcessingResult> {
  switch (detection.type) {
    // ... existing cases

    // NEW: Add processor routing
    case "audio":
      return await AudioProcessor.process(content, {
        provider,
        ...options?.audioOptions
      });

    case "video":
      return await VideoProcessor.process(content, {
        provider,
        ...options?.videoOptions
      });

    case "docx":
    case "pptx":
    case "xlsx":
      return await OfficeProcessor.process(content, {
        provider,
        ...options?.officeOptions
      });

    default:
      throw new Error(`Unsupported file type: ${detection.type}`);
  }
}
```

### CLI Integration Template

```typescript
// Add to src/cli/factories/commandFactory.ts

// 1. Add CLI options
program
  .command("generate")
  // ... existing options

  // NEW: Add file type flags
  .option("--audio <path>", "[Type] file (can be used multiple times)")
  .option(
    "--audio-language <code>",
    "Language for transcription (default: auto)",
  )
  .option("--audio-model <model>", "Transcription model (default: whisper-1)");

// 2. Parse options in buildInputOptions()
function buildInputOptions(options: GenerateOptions): InputOptions {
  const inputOptions: InputOptions = {};

  // ... existing parsing (images, csvFiles, pdfFiles)

  // NEW: Parse new file type
  if (options.audio) {
    const audioFiles = Array.isArray(options.audio)
      ? options.audio
      : [options.audio];
    inputOptions.audioFiles = audioFiles;

    // Parse audio-specific options
    if (options.audioLanguage || options.audioModel) {
      inputOptions.audioOptions = {
        language: options.audioLanguage,
        transcriptionModel: options.audioModel,
      };
    }
  }

  return inputOptions;
}

// 3. Add to optionsSchema.ts (for type safety)
export interface GenerateOptions {
  // ... existing options

  // NEW: Add option types
  audio?: string | string[];
  audioLanguage?: string;
  audioModel?: string;
}
```

---

## Integration Checklist

Use this checklist for each new multimodal feature:

### Phase 1: Core Implementation

- [ ] Create processor class in `src/lib/utils/[type]Processor.ts`
  - [ ] Implement `static process()` method
  - [ ] Add file validation (magic bytes, size limits)
  - [ ] Add provider configuration (if provider-specific)
  - [ ] Add error handling with clear messages
  - [ ] Add logging via logger utility
- [ ] Add type definitions to `src/lib/types/fileTypes.ts`
  - [ ] Add to `FileType` union
  - [ ] Create `[Type]ProcessorOptions` type
  - [ ] Create `[Type]ProviderConfig` interface (if needed)
  - [ ] Add metadata fields to `FileProcessingResult`
- [ ] Integrate with FileDetector in `src/lib/utils/fileDetector.ts`
  - [ ] Add magic bytes detection
  - [ ] Add MIME type mapping
  - [ ] Add extension mapping
  - [ ] Add content heuristics (if applicable)
  - [ ] Route to processor in `processFile()`

### Phase 2: SDK Integration

- [ ] Update message builder in `src/lib/utils/messageBuilder.ts`
  - [ ] Handle new file type in multimodal construction
  - [ ] Support explicit array (e.g., `audioFiles`)
  - [ ] Support auto-detection via `files` array
  - [ ] Format content for provider consumption
- [ ] Update providers in `src/lib/providers/`
  - [ ] Identify which providers support the feature
  - [ ] Update message conversion logic
  - [ ] Add provider-specific APIs (if needed)
  - [ ] Handle format-specific content blocks
- [ ] Update base provider in `src/lib/core/baseProvider.ts`
  - [ ] Add method for new feature (if needed)
  - [ ] Update multimodal support flags

### Phase 3: CLI Integration

- [ ] Add CLI flags in `src/cli/factories/commandFactory.ts`
  - [ ] Add primary flag (e.g., `--audio <path>`)
  - [ ] Add option flags (e.g., `--audio-language`)
  - [ ] Parse options and map to SDK types
- [ ] Update options schema in `src/cli/loop/optionsSchema.ts`
  - [ ] Add type definitions for new flags
  - [ ] Ensure type safety

### Phase 4: Testing

- [ ] Create test fixtures in `test/fixtures/` and `examples/data/`
  - [ ] Valid files (small, medium sizes)
  - [ ] Invalid files (for error testing)
  - [ ] Edge cases (empty, corrupted, wrong format)
- [ ] Add tests to `test/continuous-test-suite.ts`
  - [ ] CLI generate test
  - [ ] CLI stream test
  - [ ] SDK generate test
  - [ ] SDK stream test
  - [ ] Multimodal combination tests
  - [ ] Error handling tests
  - [ ] Provider-specific tests (if applicable)
- [ ] Run full test suite
  - [ ] All new tests passing
  - [ ] No regression in existing tests

### Phase 5: Documentation

- [ ] Create feature guide in `docs/features/[feature]-support.md`
  - [ ] Overview and capabilities
  - [ ] Supported formats and providers
  - [ ] CLI usage examples
  - [ ] SDK usage examples
  - [ ] Configuration options
  - [ ] Limitations and best practices
- [ ] Update multimodal docs in `docs/features/multimodal-chat.md`
  - [ ] Add section for new file type
  - [ ] Update examples with new format
- [ ] Update feature index in `docs/features/index.md`
  - [ ] Add entry for new feature
- [ ] Create example code in `examples/[feature]-analysis.ts`
  - [ ] Basic usage
  - [ ] Advanced usage
  - [ ] Multiple file combinations
  - [ ] Error handling
- [ ] Update README.md
  - [ ] Add to "What's New" section
  - [ ] Update feature list

### Phase 6: Dependencies & Configuration

- [ ] Add npm dependencies to `package.json`
  - [ ] Install and test dependencies
  - [ ] Update `pnpm-lock.yaml`
- [ ] Add environment variables to `.env.example`
  - [ ] API keys for external services
  - [ ] Configuration options
- [ ] Update build configuration (if needed)
  - [ ] Vite config for bundling
  - [ ] TypeScript config for types

### Phase 7: Release Preparation

- [ ] Run linter and fix issues: `npm run lint`
- [ ] Run type checker: `npm run typecheck`
- [ ] Run full test suite: `npm test`
- [ ] Build project: `npm run build`
- [ ] Test CLI locally: `npx @juspay/neurolink [feature] ...`
- [ ] Update CHANGELOG.md
- [ ] Create pull request with detailed description

---

## Testing Strategy

### Test Structure (Based on PDF/CSV Tests)

Each feature should have 6-8 tests minimum:

```typescript
// test/continuous-test-suite.ts

describe("[Feature] Support", () => {
  // 1. CLI Generate Test
  it("should handle [feature] via CLI generate", async () => {
    const result = await executeCommand(
      `generate "Analyze this [feature]" --[feature] test/fixtures/sample.[ext] --provider vertex`
    );
    expect(result).toContain("expected output");
  });

  // 2. CLI Stream Test
  it("should handle [feature] via CLI stream", async () => {
    const result = await executeStreamCommand(
      `stream "Summarize this [feature]" --[feature] test/fixtures/sample.[ext] --provider anthropic`
    );
    expect(result).toContain("expected output");
  });

  // 3. SDK Generate Test
  it("should handle [feature] via SDK generate", async () => {
    const response = await neurolink.generate({
      input: {
        text: "What is in this [feature]?",
        [feature]Files: ["test/fixtures/sample.[ext]"]
      },
      provider: "openai"
    });
    expect(response.text).toBeTruthy();
  });

  // 4. SDK Stream Test
  it("should handle [feature] via SDK stream", async () => {
    const chunks: string[] = [];
    await neurolink.stream({
      input: {
        text: "Describe this [feature]",
        [feature]Files: ["test/fixtures/sample.[ext]"]
      },
      provider: "vertex",
      onChunk: (chunk) => chunks.push(chunk.text)
    });
    expect(chunks.join("")).toBeTruthy();
  });

  // 5. Multimodal Combination Test
  it("should handle [feature] + image combination", async () => {
    const response = await neurolink.generate({
      input: {
        text: "Compare the [feature] and image",
        [feature]Files: ["test/fixtures/sample.[ext]"],
        images: ["test/fixtures/chart.png"]
      },
      provider: "vertex"
    });
    expect(response.text).toBeTruthy();
  });

  // 6. Error Handling Test
  it("should handle invalid [feature] file", async () => {
    await expect(
      neurolink.generate({
        input: {
          text: "Analyze this",
          [feature]Files: ["test/fixtures/invalid.[ext]"]
        },
        provider: "openai"
      })
    ).rejects.toThrow("Invalid [feature] file");
  });

  // 7. Provider Compatibility Test (if applicable)
  it("should reject unsupported provider", async () => {
    await expect(
      neurolink.generate({
        input: {
          text: "Analyze this",
          [feature]Files: ["test/fixtures/sample.[ext]"]
        },
        provider: "unsupported-provider"
      })
    ).rejects.toThrow("[Feature] files not supported");
  });

  // 8. Format Options Test (if applicable)
  it("should handle format options", async () => {
    const response = await neurolink.generate({
      input: {
        text: "Process this [feature]",
        [feature]Files: ["test/fixtures/sample.[ext]"],
        [feature]Options: {
          format: "json"
        }
      },
      provider: "openai"
    });
    expect(response.text).toContain("{");  // JSON format
  });
});
```

### Test Fixtures

Create realistic test files:

- **Small files** (< 100KB): Quick tests, CI/CD friendly
- **Medium files** (1-10MB): Real-world scenarios
- **Invalid files**: Error handling
- **Edge cases**: Empty, corrupted, wrong format

**Examples from PDF/CSV**:

- CSV: `test/fixtures/transactions.csv` (16 rows), `merchant-summary.csv` (6 rows), `large.csv` (101 rows)
- PDF: `test/fixtures/valid-sample.pdf`, `multi-page.pdf`, `invalid.pdf`

---

## Summary

This guide provides the complete implementation pattern extracted from NeuroLink's successful PDF and CSV implementations. The 7-step recipe has been validated across ~6,000 lines of production code and can be directly applied to:

1. **Audio Transcription** (~5-7 days)
2. **Video Processing** (~6-8 days)
3. **Office Documents** (~7-10 days)
4. **TTS** (~4-5 days)

**Total estimated effort**: 22-30 days for all remaining features.

**Key Success Metrics from PDF/CSV**:

- CSV: 3,793 lines added, 45 files changed, 6 tests, universal provider support
- PDF: 2,166 lines added, 38 files changed, 8 tests, 7 providers with native support

Follow this guide step-by-step to maintain code quality, architecture consistency, and comprehensive test coverage that matches the existing NeuroLink standards.
