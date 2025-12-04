# Haystack Multimodal Analysis

**Comparison with NeuroLink Implementation Patterns**

This document analyzes deepset's Haystack approach to multimodal file processing and compares it with NeuroLink's implementation patterns from the PDF/CSV features.

---

## Repository Overview

- **Project**: Haystack by deepset AI
- **GitHub**: https://github.com/deepset-ai/haystack
- **Purpose**: End-to-end LLM framework for RAG, document search, and Q&A
- **Language**: Python
- **Architecture**: Component-based pipeline system

---

## Multimodal Support Matrix

### Document Converters (Text Extraction)

| Format        | Converter                   | Library Used                | Status          |
| ------------- | --------------------------- | --------------------------- | --------------- |
| PDF           | `PyPDFToDocument`           | pypdf                       | ✅ Full Support |
| PDF           | `PDFMinerToDocument`        | pdfminer.six                | ✅ Full Support |
| PDF + OCR     | `AzureOCRDocumentConverter` | Azure Document Intelligence | ✅ Full Support |
| DOCX          | `DOCXToDocument`            | python-docx                 | ✅ Full Support |
| PPTX          | `PPTXToDocument`            | python-pptx                 | ✅ Full Support |
| XLSX          | `XLSXToDocument`            | pandas + openpyxl           | ✅ Full Support |
| CSV           | `CSVToDocument`             | csv (built-in)              | ✅ Full Support |
| HTML          | `HTMLToDocument`            | trafilatura                 | ✅ Full Support |
| Markdown      | `MarkdownToDocument`        | markdown-it-py              | ✅ Full Support |
| JSON          | `JSONConverter`             | json (built-in)             | ✅ Full Support |
| MSG (Outlook) | `MSGToDocument`             | extract-msg                 | ✅ Full Support |
| TXT           | `TextFileToDocument`        | built-in                    | ✅ Full Support |
| Multi-format  | `TikaDocumentConverter`     | Apache Tika                 | ✅ Full Support |

### Audio Processing

| Feature                     | Component                  | Library            | Status          |
| --------------------------- | -------------------------- | ------------------ | --------------- |
| Audio Transcription (Cloud) | `RemoteWhisperTranscriber` | OpenAI Whisper API | ✅ Full Support |
| Audio Transcription (Local) | `LocalWhisperTranscriber`  | openai-whisper     | ✅ Full Support |
| TTS                         | ❌ Not Found               | N/A                | ❌ No Support   |

### Video Processing

| Feature               | Status        |
| --------------------- | ------------- |
| Video File Processing | ❌ No Support |
| Frame Extraction      | ❌ No Support |
| Video Transcription   | ❌ No Support |

### Image Processing

| Feature           | Component         | Status    |
| ----------------- | ----------------- | --------- |
| PDF to Image      | `PDFToImage`      | pdf2image |
| File to Image     | `FileToImage`     | PIL       |
| Image to Document | `FileToDocument`  | PIL       |
| Document to Image | `DocumentToImage` | PIL       |

---

## Key Architectural Patterns

### 1. Component-Based Architecture

Every converter is a **component** decorated with `@component`:

```python
@component
class PPTXToDocument:
    """Converts PPTX files to Documents."""

    def __init__(self, store_full_path: bool = False):
        pptx_import.check()  # Lazy import validation
        self.store_full_path = store_full_path

    @component.output_types(documents=list[Document])
    def run(
        self,
        sources: list[Union[str, Path, ByteStream]],
        meta: Optional[Union[dict[str, Any], list[dict[str, Any]]]] = None,
    ):
        # Convert files → Documents
        return {"documents": documents}
```

**Key Characteristics**:

- Standardized `run()` method signature
- Type annotations with `@component.output_types()`
- Lazy imports with error messages
- Serialization/deserialization (`to_dict()`, `from_dict()`)

### 2. ByteStream Abstraction

Unified file input handling via `ByteStream`:

```python
# Supports: file paths (str/Path), ByteStream objects, URLs
sources: list[Union[str, Path, ByteStream]]

# Helper function converts all inputs to ByteStream
bytestream = get_bytestream_from_source(source)
# bytestream.data → Buffer
# bytestream.meta → metadata dict
```

**Comparison to NeuroLink**:

- NeuroLink: `FileInput = Buffer | string` (src/lib/types/fileTypes.ts:13)
- Haystack: `Union[str, Path, ByteStream]`
- Both support: file paths, URLs, binary data
- Haystack has richer metadata handling via ByteStream class

### 3. Document-Centric Output

All converters return **Document** objects:

```python
Document(
    content=extracted_text,  # String content
    meta={
        "file_path": path,
        "page_count": 5,
        # ... format-specific metadata
    }
)
```

**Comparison to NeuroLink**:

- NeuroLink: `FileProcessingResult` (content + metadata)
- Haystack: `Document` objects
- Both use structured metadata
- Haystack is more opinionated (Document class for RAG pipelines)

### 4. Lazy Imports with Error Messages

```python
with LazyImport("Run 'pip install python-pptx'") as pptx_import:
    from pptx import Presentation

def __init__(self):
    pptx_import.check()  # Validates import or shows install message
```

**Benefit**: Dependencies only required when component is used

**Comparison to NeuroLink**:

- NeuroLink: Runtime import errors
- Haystack: Helpful error messages with install instructions

### 5. Metadata Normalization

```python
def normalize_metadata(
    meta: Optional[Union[dict[str, Any], list[dict[str, Any]]]],
    sources_count: int
) -> list[dict[str, Any]]:
    """
    Converts single dict → list of dicts (one per source)
    Handles metadata for batch processing
    """
```

Allows:

- Single metadata dict (applied to all files)
- List of metadata dicts (one per file)

---

## Implementation Insights by File Type

### Office Documents (DOCX/PPTX/XLSX)

#### DOCX Implementation

**Library**: `python-docx`

**Key Features**:

1. **Table Extraction** with 2 formats:
   - Markdown (pipe tables)
   - CSV

```python
class DOCXTableFormat(Enum):
    MARKDOWN = "markdown"
    CSV = "csv"

# Table conversion example
if table_format == "markdown":
    markdown_table = self._table_to_markdown(table)
elif table_format == "csv":
    csv_table = self._table_to_csv(table)
```

2. **Link Handling** with 2 formats:
   - Markdown (`[text](url)`)
   - Plain text

3. **Metadata Extraction**:
   - Author, title, subject, keywords
   - Created/modified dates
   - Language, category, revision

4. **Comment Handling**:
   - Option to keep or discard comments
   - Comments added inline or in metadata

**NeuroLink Implementation Recommendation**:

- Use `mammoth.js` for basic DOCX (Node.js native)
- Or use Unstructured.io API for advanced features (tables, images)
- Follow Haystack's table format pattern (markdown/csv options)

#### PPTX Implementation

**Library**: `python-pptx`

**Simple Implementation** (~112 lines):

```python
def _convert(self, file_content: io.BytesIO) -> str:
    pptx_presentation = Presentation(file_content)
    text_all_slides = []
    for slide in pptx_presentation.slides:
        text_on_slide = []
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                text_on_slide.append(shape.text)
        text_all_slides.append("\n".join(text_on_slide))

    # Join slides with form feed character
    text = "\f".join(text_all_slides)
    return text
```

**Pattern**: Extract text from each slide → Join with `\f` (form feed) as separator

**NeuroLink Implementation**: Could use `pptxgenjs` (JS) or Unstructured.io API

#### XLSX Implementation

**Library**: `pandas + openpyxl`

**Key Features**:

1. **Sheet Selection**:
   - Read specific sheet by name/index
   - Read all sheets (creates one Document per sheet)

2. **Table Formats**:
   - CSV (default)
   - Markdown (requires `tabulate` library)

3. **Excel Column Names**:
   - Generates Excel-style column names (A, B, C, ..., AA, AB, ...)

```python
@staticmethod
def _generate_excel_column_names(n_cols: int) -> list[str]:
    """Generates A, B, C, ..., Z, AA, AB, ..."""
    result = []
    for i in range(n_cols):
        col_name = ""
        num = i
        while num >= 0:
            col_name = chr(num % 26 + 65) + col_name
            num = num // 26 - 1
        result.append(col_name)
    return result
```

4. **Metadata**: Includes `sheet_name` for multi-sheet files

**Comparison to NeuroLink CSV**:

- NeuroLink CSV: 3 formats (raw, markdown, json)
- Haystack XLSX: 2 formats (csv, markdown)
- Both use pandas for heavy lifting

### PDF Processing

**Two Implementations**:

1. **PyPDFToDocument** (text extraction):
   - Uses `pypdf` library
   - 2 extraction modes:
     - `PLAIN`: Simple text extraction
     - `LAYOUT`: Preserves PDF layout
   - Configurable orientation handling
   - Font/spacing parameters

2. **PDFMinerToDocument** (alternative):
   - Uses `pdfminer.six` library
   - Different extraction algorithm

3. **AzureOCRDocumentConverter** (OCR):
   - Azure Document Intelligence API
   - Supports PDF, JPEG, PNG, BMP, TIFF, **DOCX, XLSX, PPTX, HTML**
   - OCR for scanned documents
   - Table extraction with context
   - Layout modes: natural reading order or single column

**Comparison to NeuroLink**:

- NeuroLink: Binary PDF pass-through to vision models (no text extraction)
- Haystack: Text extraction for RAG (search, Q&A)
- Different use cases:
  - NeuroLink: AI vision analysis of PDF content
  - Haystack: Text-based document retrieval

### Audio Transcription

**Two Implementations**:

1. **RemoteWhisperTranscriber** (Cloud):

```python
@component
class RemoteWhisperTranscriber:
    def __init__(
        self,
        api_key: Secret = Secret.from_env_var("OPENAI_API_KEY"),
        model: str = "whisper-1",
        **kwargs  # language, prompt, temperature
    ):
        self.client = OpenAI(api_key=api_key.resolve_value())

    @component.output_types(documents=list[Document])
    def run(self, sources: list[Union[str, Path, ByteStream]]):
        documents = []
        for source in sources:
            file = io.BytesIO(source.data)
            content = self.client.audio.transcriptions.create(
                file=file,
                model=self.model,
                **self.whisper_params
            )
            doc = Document(content=content.text, meta=source.meta)
            documents.append(doc)
        return {"documents": documents}
```

**Features**:

- Supports all Whisper API parameters:
  - `language`: ISO-639-1 code for better accuracy
  - `prompt`: Guide model style or continue previous audio
  - `temperature`: 0-1 for output randomness
- Returns JSON format only

2. **LocalWhisperTranscriber** (On-premise):

```python
@component
class LocalWhisperTranscriber:
    def __init__(
        self,
        model: Literal["tiny", "base", "small", "medium", "large", ...],
        device: Optional[ComponentDevice] = None,  # CPU/GPU selection
    ):
        self.model = model
        self.device = ComponentDevice.resolve_device(device)

    def warm_up(self):
        """Loads model in memory"""
        self._model = whisper.load_model(self.model, device=self.device)

    def run(self, sources, whisper_params=None):
        for source in sources:
            transcription = self._model.transcribe(str(path), **kwargs)
            # Returns: text, segments, language, etc.
```

**Key Differences**:

- Remote: API-based, no model download, pay per use
- Local: Self-hosted, GPU support, free after setup
- Both return Document objects with transcribed text

**NeuroLink Implementation Path**:

- Start with RemoteWhisperTranscriber pattern (OpenAI API)
- Use `AudioProcessor` class following NeuroLink patterns
- Add provider support: OpenAI, Google, Azure
- Future: Local Whisper option

---

## Comparison: Haystack vs NeuroLink Patterns

### Architecture Philosophy

| Aspect           | Haystack                           | NeuroLink                                     |
| ---------------- | ---------------------------------- | --------------------------------------------- |
| **Language**     | Python                             | TypeScript/Node.js                            |
| **Design**       | Component-based RAG pipelines      | Provider-agnostic SDK                         |
| **Focus**        | Document processing → RAG          | Multimodal input → LLM providers              |
| **File Output**  | Document objects (text + metadata) | FileProcessingResult (text/binary + metadata) |
| **Dependencies** | Heavy (pandas, numpy, PIL, etc.)   | Lightweight (csv-parser, minimal)             |

### File Processing Approach

| Aspect          | Haystack                            | NeuroLink                                      |
| --------------- | ----------------------------------- | ---------------------------------------------- |
| **PDF**         | Text extraction (pypdf, pdfminer)   | Binary pass-through to vision models           |
| **Office Docs** | Text extraction (python-docx, etc.) | ❌ Not yet implemented                         |
| **CSV**         | pandas-based conversion             | Streaming parser, 3 formats                    |
| **Images**      | PIL-based processing                | Provider-specific formatting (base64/data URI) |
| **Audio**       | Whisper transcription → text        | ❌ Not yet implemented                         |
| **Video**       | ❌ No support                       | ❌ Not yet implemented                         |

### Strengths of Each Approach

**Haystack Strengths**:

1. **Comprehensive document converters** (14 formats)
2. **Lazy imports** with helpful error messages
3. **Component reusability** in pipelines
4. **Metadata-rich** Document objects
5. **Local + Cloud options** (e.g., LocalWhisper + RemoteWhisper)
6. **OCR support** via Azure Document Intelligence

**NeuroLink Strengths**:

1. **Provider-agnostic** multimodal LLM support
2. **Vision model integration** (native PDF/image analysis)
3. **Lightweight dependencies**
4. **TypeScript type safety**
5. **Streaming support**
6. **CLI-first design**

---

## Key Learnings for NeuroLink

### 1. Audio Transcription Implementation

**Adopt Haystack's Pattern**:

```typescript
// src/lib/utils/audioProcessor.ts
export class AudioProcessor {
  static async process(
    content: Buffer,
    options?: AudioProcessorOptions,
  ): Promise<FileProcessingResult> {
    const provider = options?.provider || "openai";

    // Similar to RemoteWhisperTranscriber
    const transcription = await this.transcribeAudio(content, {
      model: options?.transcriptionModel || "whisper-1",
      language: options?.language,
      prompt: options?.prompt,
      provider,
    });

    return {
      type: "audio",
      content: transcription.text, // Text transcription
      mimeType: "text/plain", // Changed from audio/* to text
      metadata: {
        confidence: 100,
        size: content.length,
        duration: transcription.duration,
        language: transcription.language,
        originalFormat: this.detectFormat(content),
      },
    };
  }

  private static async transcribeAudio(
    buffer: Buffer,
    options: TranscriptionOptions,
  ): Promise<Transcription> {
    switch (options.provider) {
      case "openai":
        return await this.openAIWhisper(buffer, options);
      case "google":
        return await this.googleSpeechToText(buffer, options);
      case "azure":
        return await this.azureSpeech(buffer, options);
      default:
        throw new Error(
          `Unsupported transcription provider: ${options.provider}`,
        );
    }
  }
}
```

**Key Insights**:

- Audio files → Text transcription (not binary pass-through)
- Support both cloud APIs and local models
- Return text content, not audio buffer
- Include transcription metadata (language, duration)

### 2. Office Document Processing

**Two Options**:

**Option A: Simple Text Extraction** (like Haystack):

- DOCX: Use `mammoth.js` (Node equivalent of python-docx)
- PPTX: Use `pptxgenjs` or slide-text extraction
- XLSX: Already have CSV support, extend for multi-sheet

**Option B: Advanced ETL** (recommended):

- Use Unstructured.io API (like SurfSense)
- Supports tables, images, complex layouts
- More comprehensive than Haystack's approach

### 3. Lazy Import Pattern

**Adopt for Node.js**:

```typescript
// src/lib/utils/lazyImports.ts
export class LazyImport {
  static async check(
    moduleName: string,
    installCommand: string
  ): Promise<void> {
    try {
      await import(moduleName);
    } catch (error) {
      throw new Error(
        `Missing dependency: ${moduleName}\n` +
        `Install it with: ${installCommand}`
      );
    }
  }
}

// Usage in AudioProcessor
static async process(content: Buffer, options?: AudioProcessorOptions) {
  await LazyImport.check("openai", "npm install openai");
  // ... rest of processing
}
```

### 4. Metadata Normalization

**Add Helper Function**:

```typescript
// src/lib/utils/metadataNormalizer.ts
export function normalizeMetadata<T>(
  meta: T | T[] | undefined,
  count: number,
): T[] {
  if (!meta) {
    return Array(count).fill({} as T);
  }
  if (Array.isArray(meta)) {
    if (meta.length !== count) {
      throw new Error(
        `Metadata array length (${meta.length}) must match sources count (${count})`,
      );
    }
    return meta;
  }
  // Single object → replicate for all sources
  return Array(count).fill(meta);
}
```

### 5. Component Serialization Pattern

**Add to NeuroLink Processors**:

```typescript
export class AudioProcessor {
  // ... process() method

  static toConfig(options: AudioProcessorOptions): Record<string, unknown> {
    return {
      provider: options.provider,
      model: options.transcriptionModel,
      language: options.language,
      // ... all options
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

**Benefit**: Makes configurations portable and testable

---

## Implementation Recommendations

### Priority 1: Audio Transcription (5-7 days)

**Implementation Path**:

1. Follow Haystack's `RemoteWhisperTranscriber` pattern
2. Create `AudioProcessor` class (similar structure)
3. Support OpenAI Whisper API initially
4. Add Google Speech-to-Text and Azure Speech later
5. Return transcribed **text**, not audio buffer
6. Include metadata: duration, language, confidence

**Files to Create**:

- `src/lib/utils/audioProcessor.ts` (~350 lines)
- Add to `src/lib/types/fileTypes.ts` (AudioProcessorOptions)
- Update `fileDetector.ts` (magic bytes: MP3, M4A, WAV)

### Priority 2: Office Documents (7-10 days)

**Recommendation**: Use **Unstructured.io API** (more capable than Haystack's approach)

**Why Not Haystack's Approach**:

- Haystack uses basic text extraction (python-docx, python-pptx)
- Misses complex tables, images, layouts
- NeuroLink users expect AI-powered analysis (like PDF vision)

**Better Approach**:

- Unstructured.io API (cloud or self-hosted)
- Supports 34+ formats (more than Haystack)
- Better table/image extraction
- GPU-accelerated option (Docling)

**Hybrid Option**:

- Primary: Unstructured.io API
- Fallback: Mammoth.js for basic DOCX text extraction
- Similar to Haystack having PyPDF + PDFMiner options

### Priority 3: Video Processing (6-8 days)

**Haystack Limitation**: No video support

**NeuroLink Advantage**: Can combine audio transcription + frame analysis

**Implementation**:

1. Use `fluent-ffmpeg` to extract:
   - Audio track → Transcribe with AudioProcessor
   - Key frames → Analyze with vision models
2. Combine transcript + visual analysis
3. Return unified result

**This is a differentiator** - Haystack doesn't have this

### Priority 4: TTS (4-5 days)

**Haystack Limitation**: No TTS support

**NeuroLink Opportunity**: Add cloud TTS (OpenAI, Azure, Google)

**Implementation**: Follow MULTIMODAL_IMPLEMENTATION_GUIDE.md

---

## Conclusion

### What Haystack Does Better

1. **Comprehensive document converters** (14 formats vs NeuroLink's 3)
2. **Lazy imports with error messages** (better DX)
3. **Metadata handling** (richer, more structured)
4. **Component serialization** (config portability)
5. **Local + Cloud options** (cost/privacy flexibility)

### What NeuroLink Does Better

1. **Vision model integration** (native PDF/image analysis)
2. **Provider agnostic** (12+ LLM providers)
3. **Lightweight** (minimal dependencies)
4. **Type safety** (TypeScript)
5. **CLI-first design**

### Recommended Adoptions from Haystack

1. ✅ **Audio transcription pattern** (RemoteWhisperTranscriber approach)
2. ✅ **Lazy imports with helpful errors**
3. ✅ **Metadata normalization helper**
4. ✅ **Processor serialization/config pattern**
5. ⚠️ **Office document extraction** (but use Unstructured.io instead of python-docx)

### What to Skip

1. ❌ **Component decorator pattern** (too opinionated for NeuroLink)
2. ❌ **Document class** (FileProcessingResult is sufficient)
3. ❌ **PDF text extraction** (NeuroLink uses vision models, better approach)

---

## Files Analyzed

### Converters

- `haystack/components/converters/docx.py` (442 lines)
- `haystack/components/converters/pptx.py` (112 lines)
- `haystack/components/converters/xlsx.py` (192 lines)
- `haystack/components/converters/pypdf.py` (250+ lines)
- `haystack/components/converters/pdfminer.py`
- `haystack/components/converters/azure.py` (700+ lines, OCR)
- `haystack/components/converters/csv.py`
- `haystack/components/converters/multi_file_converter.py`

### Audio

- `haystack/components/audio/whisper_remote.py` (166 lines)
- `haystack/components/audio/whisper_local.py` (196 lines)

### Utilities

- `haystack/components/converters/utils.py`
- `haystack/dataclasses/byte_stream.py`
- `haystack/lazy_imports.py`

---

## Next Steps

1. **Implement Audio Transcription** using Haystack's patterns
2. **Add Lazy Import Helper** for better error messages
3. **Create Metadata Normalizer** utility
4. **Evaluate Unstructured.io** for Office documents (more capable than Haystack)
5. **Implement Video Processing** (NeuroLink differentiator)
6. **Add TTS** (NeuroLink differentiator)

**Total Effort**: ~22-30 days (same as original estimate)

**Result**: NeuroLink will have multimodal support comparable to Haystack + SurfSense, with additional advantages from vision model integration and provider flexibility.
