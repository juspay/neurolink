# NeuroLink Multimodal Support

NeuroLink supports 50+ file types including images, PDFs, documents, spreadsheets, and code files.

## Supported Input Types

| Category         | Extensions                | Processing                              |
| ---------------- | ------------------------- | --------------------------------------- |
| **Images**       | PNG, JPEG, WebP, GIF, SVG | Base64 encoding, vision analysis        |
| **Documents**    | PDF                       | Native PDF support or text extraction   |
| **Spreadsheets** | CSV, XLSX, XLS            | Data extraction with formatting         |
| **Office Docs**  | DOCX, RTF, ODT            | Text extraction                         |
| **Data**         | JSON, YAML, XML           | Syntax-aware parsing                    |
| **Markup**       | HTML, Markdown, SVG       | Sanitization and text extraction        |
| **Code**         | 50+ languages             | Syntax highlighting, language detection |

## Image Input

```typescript
// Single image from file path
const result = await neurolink.generate({
  input: {
    text: "Describe this image",
    images: ["./screenshot.png"],
  },
});

// Multiple images
const result = await neurolink.generate({
  input: {
    text: "Compare these two images",
    images: ["./before.png", "./after.png"],
  },
});

// Image from Buffer
import { readFileSync } from "fs";
const imageBuffer = readFileSync("./photo.jpg");

const result = await neurolink.generate({
  input: {
    text: "What is in this photo?",
    images: [imageBuffer],
  },
});

// Image from URL
const result = await neurolink.generate({
  input: {
    text: "Describe this image",
    images: ["https://example.com/image.jpg"],
  },
});

// Image with alt text
const result = await neurolink.generate({
  input: {
    text: "Analyze",
    images: [{ data: "./chart.png", altText: "Q3 Sales Chart" }],
  },
});
```

**Vision-Capable Providers:**

- OpenAI: gpt-4o, gpt-4-turbo
- Anthropic: All Claude 3 models
- Vertex: Gemini 2.5+, Gemini 3
- Google AI: Gemini 2.5+
- Bedrock: Claude 3 models

## PDF Documents

```typescript
// PDF file
const result = await neurolink.generate({
  input: {
    text: "Summarize this document",
    pdfFiles: ["./report.pdf"],
  },
});

// Multiple PDFs
const result = await neurolink.generate({
  input: {
    text: "Compare these contracts",
    pdfFiles: ["./contract-v1.pdf", "./contract-v2.pdf"],
  },
});

// PDF from Buffer
const pdfBuffer = readFileSync("./document.pdf");
const result = await neurolink.generate({
  input: {
    text: "Extract key points",
    pdfFiles: [pdfBuffer],
  },
});
```

**PDF Support by Provider:**

- Vertex AI: Native visual PDF analysis
- Anthropic: Native PDF support
- Bedrock: Native PDF support
- Google AI Studio: Native PDF support
- Others: Text extraction fallback

## CSV Data

```typescript
// CSV file
const result = await neurolink.generate({
  input: {
    text: "Analyze this sales data",
    csvFiles: ["./sales.csv"],
  },
});

// With options
const result = await neurolink.generate({
  input: {
    text: "Find trends in this data",
    csvFiles: ["./metrics.csv"],
  },
  csvOptions: {
    maxRows: 100, // Limit rows
    formatStyle: "markdown", // 'raw' | 'markdown' | 'json'
    includeHeaders: true,
  },
});
```

## Auto-Detect Files

Use `files` array for automatic type detection:

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze all these files",
    files: [
      "./screenshot.png", // Image
      "./data.csv", // CSV
      "./report.pdf", // PDF
      "./config.json", // JSON
      "./code.ts", // TypeScript
    ],
  },
});
```

## Excel Spreadsheets

```typescript
const result = await neurolink.generate({
  input: {
    text: "Summarize this spreadsheet",
    files: ["./budget.xlsx"],
  },
});
```

**Features:**

- Multi-sheet extraction
- Cell formatting preservation
- Formula result extraction

## Word Documents

```typescript
const result = await neurolink.generate({
  input: {
    text: "Extract the main points from this document",
    files: ["./proposal.docx"],
  },
});
```

**Supported formats:**

- `.docx` - Modern Word format
- `.rtf` - Rich Text Format
- `.odt` - OpenDocument Text

## Data Files

### JSON

```typescript
const result = await neurolink.generate({
  input: {
    text: "What API endpoints are defined?",
    files: ["./openapi.json"],
  },
});
```

### YAML

```typescript
const result = await neurolink.generate({
  input: {
    text: "Explain this Kubernetes configuration",
    files: ["./deployment.yaml"],
  },
});
```

### XML

```typescript
const result = await neurolink.generate({
  input: {
    text: "Parse this XML and summarize",
    files: ["./data.xml"],
  },
});
```

## Markup Files

### HTML

```typescript
const result = await neurolink.generate({
  input: {
    text: "What does this webpage do?",
    files: ["./page.html"],
  },
});
```

HTML is sanitized (OWASP-compliant) before processing.

### SVG

```typescript
const result = await neurolink.generate({
  input: {
    text: "Describe this vector graphic",
    files: ["./logo.svg"],
  },
});
```

SVG is sanitized and processed as text (not binary image).

### Markdown

```typescript
const result = await neurolink.generate({
  input: {
    text: "Summarize this README",
    files: ["./README.md"],
  },
});
```

## Source Code

NeuroLink supports 50+ programming languages:

```typescript
const result = await neurolink.generate({
  input: {
    text: "Review this code for bugs",
    files: [
      "./app.ts", // TypeScript
      "./utils.py", // Python
      "./main.go", // Go
      "./Component.jsx", // React
      "./style.css", // CSS
    ],
  },
});
```

**Supported Languages:**
TypeScript, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin, Scala, R, Julia, Lua, Perl, Shell, PowerShell, SQL, GraphQL, and 30+ more.

### Config Files

```typescript
const result = await neurolink.generate({
  input: {
    text: "Check this configuration",
    files: [
      "./.env", // Environment
      "./config.ini", // INI format
      "./settings.toml", // TOML
      "./.npmrc", // NPM config
    ],
  },
});
```

## Video Input

```typescript
const result = await neurolink.generate({
  input: {
    text: "Describe what happens in this video",
    videoFiles: ["./clip.mp4"],
  },
  videoOptions: {
    frames: 8, // Frames to extract
    quality: 85, // JPEG quality
    format: "jpeg", // 'jpeg' | 'png'
    transcribeAudio: true, // Extract and transcribe audio
  },
});
```

**Supported formats:** MP4, WebM, MOV, AVI, MKV

## CLI Usage

```bash
# Image analysis
neurolink generate "Describe this" --image ./photo.jpg

# PDF summary
neurolink generate "Summarize" --pdf ./report.pdf

# CSV analysis
neurolink generate "Analyze trends" --csv ./data.csv

# Auto-detect files
neurolink generate "Explain these" --file ./code.ts --file ./config.json

# Video analysis
neurolink generate "Describe" --video ./clip.mp4 --video-frames 12

# Multiple inputs
neurolink generate "Compare" --image ./a.png --image ./b.png --pdf ./docs.pdf
```

## File Size Considerations

| File Type | Recommended Max | Notes                |
| --------- | --------------- | -------------------- |
| Images    | 20MB            | Resized if larger    |
| PDFs      | 50MB            | Page limit may apply |
| CSV       | 10MB            | Use maxRows option   |
| Code      | 100KB           | Split large files    |

## Provider Capabilities

```typescript
// Check if provider supports vision
const status = await neurolink.getProviderStatus();

// Provider capabilities vary:
// - Not all providers support all file types
// - PDF support varies (native vs extraction)
// - Video support is limited
```

## Error Handling

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze",
      images: ["./photo.jpg"],
    },
  });
} catch (error) {
  if (error.code === "UNSUPPORTED_FILE_TYPE") {
    console.error("File type not supported");
  } else if (error.code === "FILE_TOO_LARGE") {
    console.error("File exceeds size limit");
  } else if (error.code === "VISION_NOT_SUPPORTED") {
    console.error("Provider does not support images");
  }
}
```

## Next Steps

- MCP tools - Add external tools
- RAG integration - Document-grounded generation
- Providers - Configure vision-capable providers
