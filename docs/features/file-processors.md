# File Processors Guide

NeuroLink includes a comprehensive file processing system that supports 17+ file types with intelligent content extraction, security sanitization, and provider-agnostic formatting. This system enables seamless multimodal AI interactions across all 13 supported providers.

## Overview

The file processor system consists of **52 TypeScript files** organized into a modular architecture:

```
src/lib/processors/
├── base/           # BaseFileProcessor abstract class and types
├── registry/       # ProcessorRegistry singleton for processor selection
├── config/         # MIME types, extensions, language maps, size limits
├── errors/         # FileErrorCode enum and error helpers
├── document/       # Excel, Word, RTF, OpenDocument processors
├── markup/         # SVG, HTML, Markdown, Text processors
├── code/           # SourceCode, Config processors
├── data/           # JSON, YAML, XML processors
├── integration/    # FileProcessorIntegration for registry usage
└── cli/            # CLI helpers for file processing
```

## Supported File Types

### Documents

| Type             | Extensions             | Processor               | Features                                             |
| ---------------- | ---------------------- | ----------------------- | ---------------------------------------------------- |
| **Excel**        | `.xlsx`, `.xls`        | `ExcelProcessor`        | Multi-sheet extraction, cell formatting, data tables |
| **Word**         | `.docx`, `.doc`        | `WordProcessor`         | Text extraction, paragraph preservation              |
| **RTF**          | `.rtf`                 | `RtfProcessor`          | Rich text to plain text conversion                   |
| **OpenDocument** | `.odt`, `.ods`, `.odp` | `OpenDocumentProcessor` | LibreOffice/OpenOffice format support                |

### Data Files

| Type     | Extensions      | Processor       | Features                                         |
| -------- | --------------- | --------------- | ------------------------------------------------ |
| **JSON** | `.json`         | `JsonProcessor` | Validation, pretty-printing, syntax highlighting |
| **YAML** | `.yaml`, `.yml` | `YamlProcessor` | Validation, formatting, multi-document support   |
| **XML**  | `.xml`          | `XmlProcessor`  | Parsing, validation, entity handling             |

### Markup Files

| Type         | Extensions         | Processor           | Features                                      |
| ------------ | ------------------ | ------------------- | --------------------------------------------- |
| **HTML**     | `.html`, `.htm`    | `HtmlProcessor`     | OWASP-compliant sanitization, text extraction |
| **SVG**      | `.svg`             | `SvgProcessor`      | XSS prevention, text injection (not binary)   |
| **Markdown** | `.md`, `.markdown` | `MarkdownProcessor` | Formatting preservation, metadata extraction  |
| **Text**     | `.txt`             | `TextProcessor`     | Plain text handling, encoding detection       |

### Source Code

| Type                | Extensions                 | Processor             | Features                            |
| ------------------- | -------------------------- | --------------------- | ----------------------------------- |
| **TypeScript**      | `.ts`, `.tsx`              | `SourceCodeProcessor` | Language detection, syntax metadata |
| **JavaScript**      | `.js`, `.jsx`, `.mjs`      | `SourceCodeProcessor` | Module detection                    |
| **Python**          | `.py`                      | `SourceCodeProcessor` | Docstring preservation              |
| **Java**            | `.java`                    | `SourceCodeProcessor` | Package detection                   |
| **Go**              | `.go`                      | `SourceCodeProcessor` | Module awareness                    |
| **Rust**            | `.rs`                      | `SourceCodeProcessor` | Crate detection                     |
| **C/C++**           | `.c`, `.cpp`, `.h`, `.hpp` | `SourceCodeProcessor` | Header handling                     |
| **C#**              | `.cs`                      | `SourceCodeProcessor` | Namespace detection                 |
| **Ruby**            | `.rb`                      | `SourceCodeProcessor` | Gem awareness                       |
| **PHP**             | `.php`                     | `SourceCodeProcessor` | Tag handling                        |
| **Swift**           | `.swift`                   | `SourceCodeProcessor` | Framework detection                 |
| **Kotlin**          | `.kt`, `.kts`              | `SourceCodeProcessor` | Android/JVM awareness               |
| **Scala**           | `.scala`                   | `SourceCodeProcessor` | SBT integration                     |
| **Shell**           | `.sh`, `.bash`, `.zsh`     | `SourceCodeProcessor` | Shebang detection                   |
| **SQL**             | `.sql`                     | `SourceCodeProcessor` | Dialect hints                       |
| **And 35+ more...** | Various                    | `SourceCodeProcessor` | Automatic language detection        |

### Configuration Files

| Type            | Extensions       | Processor         | Features                           |
| --------------- | ---------------- | ----------------- | ---------------------------------- |
| **Environment** | `.env`, `.env.*` | `ConfigProcessor` | Secret masking option              |
| **INI**         | `.ini`, `.cfg`   | `ConfigProcessor` | Section parsing                    |
| **TOML**        | `.toml`          | `ConfigProcessor` | Cargo.toml, pyproject.toml support |
| **Properties**  | `.properties`    | `ConfigProcessor` | Java properties format             |

## Usage

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Process multiple file types in a single request
const result = await neurolink.generate({
  input: {
    text: "Analyze these files and summarize the key information",
    files: [
      "./data/report.xlsx", // Excel spreadsheet
      "./config/settings.yaml", // YAML configuration
      "./src/main.ts", // TypeScript source
      "./docs/architecture.svg", // SVG diagram (injected as text)
      "./api/schema.json", // JSON schema
    ],
  },
  provider: "vertex",
});

console.log(result.content);
```

### CLI Usage

```bash
# Single file
neurolink generate "Analyze this spreadsheet" --file ./data.xlsx

# Multiple files
neurolink generate "Compare these configs" \
  --file ./config.yaml \
  --file ./settings.json \
  --file ./app.toml

# Mixed with images and PDFs
neurolink generate "Explain this codebase" \
  --file ./src/main.ts \
  --file ./docs/diagram.svg \
  --pdf ./docs/spec.pdf \
  --image ./screenshot.png
```

### Stream Mode

```typescript
// Streaming with file processing
const stream = await neurolink.stream({
  input: {
    text: "Walk me through this code step by step",
    files: ["./src/algorithm.py"],
  },
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Architecture

### ProcessorRegistry

The `ProcessorRegistry` is a singleton that manages all file processors with priority-based selection:

```typescript
import { ProcessorRegistry } from "@juspay/neurolink";

// Get the singleton instance
const registry = ProcessorRegistry.getInstance();

// Register a custom processor (lower priority = higher precedence)
registry.register(new MyCustomProcessor(), 50);

// Find processor for a file
const processor = registry.findProcessor({
  filename: "data.xlsx",
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  size: 1024,
});

// Process a file
const result = await processor.process(fileInfo, fileContent);
```

### BaseFileProcessor

All processors extend the abstract `BaseFileProcessor` class:

```typescript
import { BaseFileProcessor, FileInfo, ProcessedFile } from "@juspay/neurolink";

export class MyProcessor extends BaseFileProcessor {
  readonly name = "my-processor";
  readonly supportedMimeTypes = ["application/x-my-format"];
  readonly supportedExtensions = [".myf"];

  canProcess(file: FileInfo): boolean {
    return this.supportedExtensions.includes(file.extension);
  }

  async process(file: FileInfo, content: Buffer): Promise<ProcessedFile> {
    const text = this.extractText(content);
    return {
      type: "text",
      content: text,
      metadata: {
        processor: this.name,
        originalFilename: file.filename,
      },
    };
  }

  getInfo(): ProcessorInfo {
    return {
      name: this.name,
      description: "Processes MY format files",
      supportedMimeTypes: this.supportedMimeTypes,
      supportedExtensions: this.supportedExtensions,
    };
  }
}
```

### FileDetector

The `FileDetector` utility automatically identifies file types:

```typescript
import { FileDetector } from "@juspay/neurolink";

const detector = new FileDetector();

// Detect by extension
const type1 = detector.detect("report.xlsx");
// Returns: { type: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }

// Detect by content (magic bytes)
const type2 = detector.detectFromContent(buffer);

// SVG special handling - returns "svg" type, not "image"
const type3 = detector.detect("diagram.svg");
// Returns: { type: "svg", mimeType: "image/svg+xml" }
```

## Security Features

### OWASP-Compliant Sanitization

The markup processors include security sanitization to prevent XSS and injection attacks:

#### HTML Sanitization

```typescript
// HtmlProcessor automatically sanitizes HTML content
// - Removes <script> tags
// - Strips event handlers (onclick, onerror, etc.)
// - Removes javascript: URLs
// - Sanitizes style attributes
// - Blocks dangerous protocols

const result = await neurolink.generate({
  input: {
    text: "Summarize this HTML content",
    files: ["./untrusted-content.html"], // Automatically sanitized
  },
});
```

#### SVG Sanitization

```typescript
// SvgProcessor sanitizes SVG before injection
// - Removes embedded scripts
// - Strips foreignObject elements
// - Sanitizes use/href attributes
// - Blocks external entity references

// SVG is injected as TEXT, not as binary image
// This prevents image-based attacks while preserving vector content
```

### File Size Limits

Default size limits prevent denial-of-service attacks:

| Category     | Default Limit | Configurable |
| ------------ | ------------- | ------------ |
| Documents    | 50 MB         | Yes          |
| Data files   | 10 MB         | Yes          |
| Code files   | 5 MB          | Yes          |
| Config files | 1 MB          | Yes          |
| Images       | 20 MB         | Yes          |

```typescript
import { ProcessorConfig } from "@juspay/neurolink";

// Configure size limits
ProcessorConfig.setLimits({
  maxDocumentSize: 100 * 1024 * 1024, // 100 MB
  maxCodeSize: 10 * 1024 * 1024, // 10 MB
});
```

## Error Handling

### FileErrorCode Enum

```typescript
import { FileErrorCode } from "@juspay/neurolink";

try {
  const result = await neurolink.generate({
    input: { files: ["./corrupted.xlsx"] },
  });
} catch (error) {
  if (error && typeof error === "object" && "code" in error) {
    switch (error.code) {
      case FileErrorCode.UNSUPPORTED_TYPE:
        console.log("File type not supported");
        break;
      case FileErrorCode.FILE_TOO_LARGE:
        console.log("File too large");
        break;
      case FileErrorCode.CORRUPTED_FILE:
        console.log("File is corrupted");
        break;
      case FileErrorCode.DOWNLOAD_AUTH_FAILED:
        console.log("Cannot read file");
        break;
    }
  }
}
```

## Provider Compatibility

All file processors work across all 13 AI providers. The processed content is formatted as text that any provider can understand:

| Provider          | Documents | Data | Markup | Code | Config |
| ----------------- | --------- | ---- | ------ | ---- | ------ |
| OpenAI            | ✅        | ✅   | ✅     | ✅   | ✅     |
| Anthropic         | ✅        | ✅   | ✅     | ✅   | ✅     |
| Google AI Studio  | ✅        | ✅   | ✅     | ✅   | ✅     |
| Google Vertex     | ✅        | ✅   | ✅     | ✅   | ✅     |
| AWS Bedrock       | ✅        | ✅   | ✅     | ✅   | ✅     |
| Azure OpenAI      | ✅        | ✅   | ✅     | ✅   | ✅     |
| Mistral           | ✅        | ✅   | ✅     | ✅   | ✅     |
| LiteLLM           | ✅        | ✅   | ✅     | ✅   | ✅     |
| Ollama            | ✅        | ✅   | ✅     | ✅   | ✅     |
| Hugging Face      | ✅        | ✅   | ✅     | ✅   | ✅     |
| SageMaker         | ✅        | ✅   | ✅     | ✅   | ✅     |
| OpenAI Compatible | ✅        | ✅   | ✅     | ✅   | ✅     |
| OpenRouter        | ✅        | ✅   | ✅     | ✅   | ✅     |

**Note:** For binary files like images and PDFs, provider-specific adapters handle the formatting. See [PDF Support](./pdf-support.md) and [Multimodal Chat](./multimodal-chat.md).

## Best Practices

### 1. Use Appropriate File Types

```typescript
// Good: Use structured data formats for data
files: ["./data.json", "./config.yaml"];

// Avoid: Using unstructured text for structured data
files: ["./data.txt"]; // Harder for AI to parse
```

### 2. Combine Related Files

```typescript
// Good: Group related files together
const result = await neurolink.generate({
  input: {
    text: "Review this module for best practices",
    files: [
      "./src/module.ts", // Implementation
      "./src/module.test.ts", // Tests
      "./src/module.types.ts", // Types
    ],
  },
});
```

### 3. Be Mindful of Token Limits

```typescript
// For large files, consider chunking or summarization
import { ProcessorConfig } from "@juspay/neurolink";

// Enable automatic truncation for very large files
ProcessorConfig.setTruncation({
  enabled: true,
  maxTokens: 50000,
  strategy: "head-tail", // Keep beginning and end
});
```

### 4. Use Specific Prompts

```typescript
// Good: Be specific about what to analyze
const result = await neurolink.generate({
  input: {
    text: "Find security vulnerabilities in this code, focusing on SQL injection and XSS",
    files: ["./src/api.ts"],
  },
});

// Less effective: Vague prompt
const result = await neurolink.generate({
  input: {
    text: "Look at this",
    files: ["./src/api.ts"],
  },
});
```

## Extending the System

### Creating a Custom Processor

```typescript
import {
  BaseFileProcessor,
  FileInfo,
  ProcessedFile,
  ProcessorRegistry,
} from "@juspay/neurolink";

class ProtobufProcessor extends BaseFileProcessor {
  readonly name = "protobuf-processor";
  readonly supportedMimeTypes = ["application/x-protobuf"];
  readonly supportedExtensions = [".proto"];

  canProcess(file: FileInfo): boolean {
    return file.extension === ".proto";
  }

  async process(file: FileInfo, content: Buffer): Promise<ProcessedFile> {
    const protoText = content.toString("utf-8");

    // Add syntax highlighting hints
    const formatted = `\`\`\`protobuf\n${protoText}\n\`\`\``;

    return {
      type: "text",
      content: formatted,
      metadata: {
        processor: this.name,
        language: "protobuf",
        filename: file.filename,
      },
    };
  }

  getInfo() {
    return {
      name: this.name,
      description: "Processes Protocol Buffer definition files",
      supportedMimeTypes: this.supportedMimeTypes,
      supportedExtensions: this.supportedExtensions,
    };
  }
}

// Register with priority 50 (lower = higher precedence)
ProcessorRegistry.getInstance().register(new ProtobufProcessor(), 50);
```

## Related Documentation

- [Multimodal Chat](./multimodal-chat.md) - Image and media handling
- [PDF Support](./pdf-support.md) - PDF-specific features
- [CSV Support](./csv-support.md) - CSV processing details
- [CLI Commands](../cli/commands.md) - CLI file options
- [SDK API Reference](../sdk/api-reference.md) - Full API documentation
