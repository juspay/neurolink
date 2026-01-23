# NeuroLink Speech-to-Text (STT) Support Implementation Plan

## Executive Summary

This document outlines the comprehensive approach for implementing Speech-to-Text (STT) **input modality** support in NeuroLink. The implementation leverages Google Cloud Speech-to-Text v1 API through existing `google-ai` and `vertex` providers, ensuring backward compatibility while providing powerful audio transcription capabilities through both CLI and SDK interfaces.

**Status: 🚧 IMPLEMENTATION PLANNED**

> All code examples in this document are **conceptual implementation patterns** showing the integration approach. They illustrate the architecture and flow.

---

## Table of Contents

1. [Problem Statement & Solution](#problem-statement--solution)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Strategy](#implementation-strategy)
4. [Speech-to-Text Configuration](#speech-to-text-configuration)
5. [Audio Format Support](#audio-format-support)
6. [CLI Usage Examples](#cli-usage-examples)
7. [SDK Integration Examples](#sdk-integration-examples)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Conclusion](#conclusion)

---

## Problem Statement & Solution

### Core Challenge

The primary challenge is implementing STT as a native **input modality** in NeuroLink without creating a separate provider, while maintaining:

1. **Consistency with NeuroLink Architecture**: Use existing `generate()` and `stream()` methods
2. **Authentication Reuse**: Leverage existing `google-ai` and `vertex` provider authentication
3. **Zero Breaking Changes**: Existing functionality must remain unaffected
4. **Provider Independence**: STT as an optional input processor, not a separate AI provider

### Solution Architecture

The solution implements STT as an **input modality** (similar to CSV/PDF/Image processing):

1. **Input Layer**: Generic `files` array for audio files, optional `sttOptions` configuration
2. **Detection Layer**: `FileDetector` auto-detects audio files (magic bytes, MIME type, extension)
3. **Processing Layer**: Routes to `AudioProcessor` → `GoogleSTTHandler` → Google Cloud Speech-to-Text v1 API
4. **Output Layer**: Transcribed text injected into prompt text via existing MessageBuilder flow
5. **AI Processing**: LLM processes prompt with transcribed audio content (or returns raw transcript if `useAIResponse: false`)

---

## Architecture Overview

### Data Flow Diagram

```
User Request → NeuroLink Core → FileDetector → AudioProcessor → GoogleSTTHandler → Google Cloud STT v1
     ↓              ↓                ↓              ↓               ↓                   ↓
Input +        Check files    Detect audio    Check sttOptions  Transcribe         Transcript text
files array      array           type                                                   ↓
sttOptions                                                            MessageBuilder (check useAIResponse)
                                                                              ↓
                                                                    ┌─────────────────┐
                                                                    │  useAIResponse? │
                                                                    └────────┬────────┘
                                                                             │
                                                    ┌────────────────────────┴────────────────────────┐
                                                    │                                                 │
                                            useAIResponse: true                            useAIResponse: false
                                            (default - AI mode)                           (direct transcript)
                                                    │                                                 │
                                                    ↓                                                 ↓
                                        Inject into prompt text                         Store in _sttTranscripts
                                                    ↓                                                 ↓
                                        Build CoreMessage[] array                      Skip AI provider call
                                                    ↓                                                 ↓
                                        Call AI Provider API                            Return raw transcript
                                        (OpenAI/Anthropic/etc.)                                      ↓
                                                    ↓                                    { content: "transcript...",
                                        LLM processes augmented                            _sttOnly: true,
                                        prompt with transcript                             tokenUsage: 0 }
                                                    ↓
                                        AI generates response
                                        (summary/analysis/etc.)
                                                    ↓
                                        { content: "AI response..." }
```

**File Detection Strategy** (existing infrastructure):

1. Magic bytes: `FF FB` (MP3), `RIFF` (WAV), `fLaC` (FLAC) → 95% confidence
2. MIME type: `audio/mpeg`, `audio/wav` → 85% confidence
3. Extension: `.mp3`, `.wav`, `.flac` → 70% confidence
4. Content heuristics → 75% confidence

**Routing Logic** (same as CSV/PDF):

- Audio files in `input.files` are detected by FileDetector (via magic bytes, MIME type, extension)
- If `sttOptions` provided → AudioProcessor calls GoogleSTTHandler for transcription
- If no `sttOptions` → AudioProcessor extracts metadata only (existing behavior with optional Whisper fallback)
- **Single entry point**: All audio files flow through `input.files` → no separate `audioFiles` array

**AI Processing Control** (`useAIResponse` flag):

- `useAIResponse: true` (default) → Inject transcript into prompt → AI processes → AI-generated summary/analysis
- `useAIResponse: false` → Skip AI processing → Return raw transcript directly (direct STT mode)

### AI Processing Stage

This section elaborates on the stage where the transcribed audio text is processed by the AI model.

**How it works - Two Modes:**

**Mode 1: AI Processing (default - useAIResponse: true):**

```typescript
files: ["meeting.mp3"] 
  ↓
FileDetector.detectAndProcess() → detects as "audio" type
  ↓
Routes to AudioProcessor.processFile()
  ↓
AudioProcessor checks if sttOptions provided → calls transcribe()
  ↓
Returns transcript in result.content (text)
  ↓
MessageBuilder checks useAIResponse → injects transcript into prompt text
  ↓
AI processes prompt with transcribed audio → Intelligent summary/analysis
```

**Mode 2: Direct Transcript (useAIResponse: false):**

```typescript
files: ["meeting.mp3"]
  ↓
FileDetector.detectAndProcess() → detects as "audio" type
  ↓
Routes to AudioProcessor.processFile()
  ↓
AudioProcessor calls transcribe()
  ↓
Returns transcript in result.content
  ↓
MessageBuilder checks useAIResponse → stores in _sttTranscripts (skip AI injection)
  ↓
NeuroLink.generate() detects direct mode → returns raw transcript (skip AI provider call)
```

**Example:**

```typescript
// Conceptual: Shows how STT would be used in SDK
const result = await neurolink.generate({
  input: { 
    text: "Summarize this meeting recording:",
    files: ["meeting.mp3"]  // Auto-detected as audio
  },
  sttOptions: {
    language: "en-IN",
    model: "default"
  }
});

// Result includes transcribed audio in the prompt
console.log(result.content); // AI summary based on transcribed audio
```

### Key Components

1. **STT Service**: Core transcription orchestrator using Google Cloud Speech-to-Text v1 API (GoogleSTTHandler)
2. **FileDetector Integration**: Existing file detection infrastructure (magic bytes, MIME type, extension) routes audio files to AudioProcessor
3. **AudioProcessor Enhancement**: Modified to call GoogleSTTHandler when `sttOptions` is provided
4. **Provider Auth Context**: Providers supply `GOOGLE_APPLICATION_CREDENTIALS` for STT v1 authentication (no transcription logic in providers)
5. **CLI Interface**: Command-line audio transcription configuration via existing `--file` flag + `sttOptions`
6. **SDK Interface**: Programmatic STT integration via `sttOptions` in `generate()` options

### Authentication Flow

> Speech-to-Text v1 requires service account authentication. API keys are not supported.

**Note**: Provider selection does not change STT authentication behavior; STT v1 always uses service account credentials.

```
Provider: google-ai | vertex
          ↓
GOOGLE_APPLICATION_CREDENTIALS (required: service account JSON key)
          ↓
Service Account (IAM role: roles/speech.client)
          ↓
Google Cloud Speech-to-Text v1 API
          ↓
speech.googleapis.com
```

**Required Environment Variables:**

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON key file

---

## Implementation Strategy

### Phase 1: Type System Updates

**Objective**: Add STT option to GenerateOptions and transcript metadata to input processing

**Files Modified**:

- `src/lib/types/generateTypes.ts`
- `src/lib/types/multimodal.ts` (new STTOptions type)

**Changes**:

```typescript
// Conceptual
// In generateTypes.ts
export type GenerateOptions = {
  input: {
    text: string;
    images?: Array<Buffer | string>;
    csvFiles?: Array<Buffer | string>;
    pdfFiles?: Array<Buffer | string>;
    videoFiles?: Array<Buffer | string>;
    files?: Array<Buffer | string>;  // Generic files (supports audio for STT transcription)
  };
  
  // ... existing fields ...
  
  // NEW: Speech-to-Text processing options
  sttOptions?: {
    language?: string;           // Language code (default: "en-IN")
    model?: "default" | "latest_long" | "latest_short" | "command_and_search"; // STT model (default: "default")
    enableAutomaticPunctuation?: boolean; // Auto punctuation (default: true)
    profanityFilter?: boolean;   // Filter profanity (default: false)
    sampleRateHertz?: number;    // Audio sample rate override
    useAIResponse?: boolean;        // AI response to the transcribed text as output (default: true)
  };
};
```

**Success Criteria**:

- ✅ Type definitions compile without errors
- ✅ Optional fields don't affect existing code
- ✅ Clear documentation in type definitions

### Phase 2: STT Utilities

**Objective**: Create core STT infrastructure

**New Files**:

- `src/lib/stt/googleSTTHandler.ts` - Google Cloud Speech-to-Text v1 API integration
- `src/lib/types/sttTypes.ts` - STT-specific type definitions

**Implementation Pattern**:

```typescript
// src/lib/stt/googleSTTHandler.ts
import { SpeechClient } from '@google-cloud/speech';

export class GoogleSTTHandler {
  /**
   * Transcribe audio using Google Cloud Speech-to-Text v1 API
   * - Validates audio buffer
   * - Builds v1 recognition request
   * - Calls Google STT v1
   * - Returns normalized transcript
   */
  static async transcribe(
    audioBuffer: Buffer,
    sttOptions: STTOptions
  ): Promise<{
    transcript: string;
  }> {

    // v1 always uses service account credentials via GOOGLE_APPLICATION_CREDENTIALS
    const client = new SpeechClient();

    const request = {
      config: {
        languageCode: sttOptions.language ?? 'en-IN',
        enableAutomaticPunctuation: sttOptions.enableAutomaticPunctuation ?? true,
        sampleRateHertz: sttOptions.sampleRateHertz,
        profanityFilter: sttOptions.profanityFilter ?? false,

        // Optional v1 models only
        // model: 'default' | 'video' | 'phone_call' (default: 'default')
      },
      audio: {
        content: audioBuffer.toString('base64'),
      },
    };

    const [response] = await client.recognize(request);

    const transcript =
      response.results
        ?.map(r => r.alternatives?.[0]?.transcript)
        .join(' ') ?? '';

    return {
      transcript,
    };
  }
}
```

### Phase 3: File Processing Pipeline Integration

**Objective**: Integrate Google Cloud STT v1 into existing audio file processing pipeline

**Files Modified**:

- `src/lib/processors/media/AudioProcessor.ts` - Add STT transcription option for audio files detected via generic `files` array
- `src/lib/utils/fileDetector.ts` - Pass `sttOptions` through to AudioProcessor when processing audio files

**Implementation Pattern**:

**1. Update AudioProcessor** (`src/lib/processors/media/AudioProcessor.ts`):

Currently, AudioProcessor already has OpenAI Whisper transcription (lines 392-489). We'll add Google Cloud STT v1 as an alternative:

```typescript
// Conceptual implementation showing integration pattern
/**
 * Attempt transcription using configured STT provider
 * Priority: Google Cloud STT v1 > OpenAI Whisper
 */
private async attemptTranscription(
  buffer: Buffer,
  filename: string,
  mimetype: string | undefined,
  sttOptions?: STTOptions
): Promise<{
  transcript: string | undefined;
  hasTranscript: boolean;
  transcriptionProvider: string | undefined;
}> {
  // 1. Try Google Cloud STT v1 if sttOptions provided and credentials available
  if (sttOptions && this.hasGoogleCloudCredentials()) {
    try {
      const result = await transcribe(audioBuffer: Buffer, sttOptions: STTOptions);
      return {
        transcript: result.transcript,
        hasTranscript: true,
        transcriptionProvider: 'google-cloud-stt',
      };
    } catch (error) {
      logger.warn('[AudioProcessor] Google Cloud STT failed, falling back to Whisper', error);
    }
  }

  // 2. Fallback to OpenAI Whisper (existing implementation, automatic when OPENAI_API_KEY set)
  return this.attemptWhisperTranscription(buffer, filename, mimetype);
}
```

**Key changes:**

- Add `sttOptions` parameter to `processFile()` method signature
- Call `transcribe()` when `sttOptions` is provided
- Preserve existing Whisper fallback for backward compatibility

**Note**: Whisper fallback is only attempted when OpenAI credentials are present; otherwise audio is metadata-only.

**2. Update MessageBuilder** (`src/lib/utils/messageBuilder.ts`):

MessageBuilder already processes the generic `files` array via `FileDetector`. When `sttOptions` is provided, audio files detected in `files` will automatically trigger transcription through the existing pipeline. No separate audio-specific handler needed—STT logic is injected into `AudioProcessor` and flows through the standard file processing path.

**3. Update FileDetector** (`src/lib/utils/fileDetector.ts`):

Modify `detectAndProcess` to accept and forward `sttOptions` to AudioProcessor:

```typescript
// Conceptual: Shows parameter addition pattern (not complete implementation)
static async detectAndProcess(
  fileInput: Buffer | string,
  options?: {
    allowedTypes?: string[];
    csvOptions?: CSVOptions;
    sttOptions?: STTOptions;  // NEW: Pass STT options through
    provider?: string;
  }
): Promise<FileProcessingResult> {
  // ... existing detection logic ...
  
  // When processing audio files, pass sttOptions to processor
  if (detection.type === 'audio') {
    return await this.processAudioFile(content, detection, {
      sttOptions: options?.sttOptions,
      provider: options?.provider,
    });
  }
  
  // ... other file type handling ...
}

private static async processAudioFile(
  content: Buffer,
  detection: FileDetectionResult,
  options?: { sttOptions?: STTOptions; provider?: string }
): Promise<FileProcessingResult> {
  const audioFilename = detection.metadata.filename || "audio";
  
  try {
    // Process with AudioProcessor (includes STT if sttOptions provided)
    const audioResult = await audioProcessor.processFile(
      {
        id: audioFilename,
        name: audioFilename,
        mimetype: detection.mimeType || "audio/mpeg",
        size: content.length,
        buffer: content,
      },
      {
        sttOptions: options?.sttOptions,  // Forward STT options
        provider: options?.provider,
      }
    );
    
    if (audioResult.success && audioResult.data) {
      // Return transcription as text content if available
      return {
        type: "audio",
        content: audioResult.data.transcript || audioResult.data.textContent,
        mimeType: detection.mimeType,
        metadata: {
          ...detection.metadata,
          hasTranscript: audioResult.data.hasTranscript,
          transcriptionProvider: audioResult.data.transcriptionProvider,
          duration: audioResult.data.metadata.duration,
        },
      };
    }
  } catch (error) {
    logger.warn(`[FileDetector] AudioProcessor failed, using fallback`);
  }
  
  // Fallback to metadata-only placeholder
  return {
    type: "audio",
    content: FileDetector.formatInformativePlaceholder("Audio", audioFilename, content, detection),
    mimeType: detection.mimeType,
    metadata: detection.metadata,
  };
}
```

**Key changes:**

- Add `sttOptions` to `detectAndProcess` options parameter
- Forward `sttOptions` to `audioProcessor.processFile()`
- AudioProcessor uses `sttOptions` presence to trigger Google STT v1 transcription

### Phase 4: Provider Auth Context

**Objective**: Enable google-ai and vertex providers to supply auth credentials to GoogleSTTHandler

**Provider Responsibility**: **Auth Context Only**

- **google-ai**: Provides `GOOGLE_APPLICATION_CREDENTIALS` for STT v1 authentication
- **vertex**: Already uses service account auth; STT reuses same credentials

```typescript
// Conceptual: Optional observability pattern
const hasAudioWithSTT = !!(  
  options.input.files?.some(f => this.isAudioFile(f)) && 
  options.sttOptions
);

if (hasAudioWithSTT) {
  logger.debug('[Provider] Audio files detected with STT options', {
    audioFileCount: options.input.files.filter(f => this.isAudioFile(f)).length,
    sttLanguage: options.sttOptions.language,
    sttModel: options.sttOptions.model,
  });
}

// Then delegate to core multimodal pipeline (existing pattern)
const messages = await buildMultimodalMessagesArray(options);
```

**Note**: The `SpeechClient` from `@google-cloud/speech` v7.x handles v1 authentication:

- **Service Account**: Uses `GOOGLE_APPLICATION_CREDENTIALS` (recommended for production)
- **API Key**: Not supported for Speech-to-Text v1 (v1 requires service account authentication)

> ⚠️ **Authentication Requirement**: Speech-to-Text v1 **does not support API key authentication**.
> You must use service account credentials with appropriate IAM permissions.

### Phase 5: CLI Integration

**Objective**: Add CLI commands for audio transcription

**Files Modified**:

- `src/cli/factories/commandFactory.ts` - Add STT-related flags to existing `--file` option
- `src/cli/parser.ts` - No new commands needed (STT uses existing file handling)

**CLI Commands (Proposed Interface)**:

1. **Transcribe Audio to Text**:

   ```bash
   neurolink generate "Transcribe this" --file meeting.mp3 --stt-language en-IN
   ```

2. **Auto-Detect File Type**

    ```bash
    neurolink generate "Transcribe this file" --file song.mp3
    ```

3. **Save Transcriptions as Outputs**:

   ```bash
   neurolink generate "Transcribe and Save as Text" --file audio.wav --output transcript.txt
   ```

**CLI Flags**:

- `--file <file>`: Generic file input (auto-detects audio, CSV, PDF, etc. - can be used multiple times)
- `--stt-language <code>`: Language code for audio transcription (default: "en-IN")
- `--stt-model <model>`: STT model: default, latest_long, latest_short, command_and_search (default: "default")
- `--stt-punctuation`: Enable automatic punctuation (default: true)
- `--stt-filter`: Enable profanity filter (default: false)

### Phase 6: Testing & Validation

**Objective**: Comprehensive testing across platforms and scenarios

**Test Categories**:

1. **Unit Tests**:
   - STT service utility tests
   - Audio validator tests

2. **Integration Tests**:
   - End-to-end transcription
   - Provider integration tests (google-ai, vertex)
   - CLI command tests

3. **Format Tests**:
   - MP3, WAV, FLAC, OGG format support
   - Sample rate validation (8kHz-48kHz)

4. **Authentication Tests**:
   - Service account authentication (v1 requirement)
   - Permission validation (roles/speechtotext.client)

**Success Criteria**:

- ✅ >80% code coverage
- ✅ All audio formats tested
- ✅ No breaking changes to existing tests

---

## Speech-to-Text Configuration

### Supported Languages

Google Cloud Speech-to-Text v1 supports 125+ languages and variants. We are using 'en-IN' as default.

### STT Models

### STT Models (Google Cloud Speech-to-Text **v1**)

| Model                    | Description                                                                 | Use Case                                                    |
| **latest_short**         | Latest-generation model optimized for **short audio**                       | Commands, voice search, short utterances (≈ under 1 minute) |
| **latest_long**          | Latest-generation model optimized for **long-form audio**                   | Meetings, interviews, podcasts, batch transcription         |
| **default**              | General-purpose speech recognition model                                    | Safe default for most clean or moderately noisy audio       |
| **command_and_search**   | Optimized for short spoken commands                                         | Voice assistants, search queries                            |

> **Note:** Domain-specific v1 models (video, phone_call) are intentionally excluded from the public API to reduce misuse.

### Configuration Options

```typescript
// Conceptual: Proposed sttOptions structure
sttOptions: {
  language: "en-IN",               // Language code
  model: "default",                 // STT model
  enableAutomaticPunctuation: true, // Auto punctuation
  profanityFilter: false,           // Filter profanity
  sampleRateHertz: 16000,           // Audio sample rate
}
```

---

## Audio Format Support

### Encoding Formats

| Format | Extension | Sample Rate | Channels | Use Case |
| **MP3** | .mp3 | 8-48 kHz | Mono/Stereo | Default, balanced |
| **WAV** | .wav | 8-48 kHz | Mono/Stereo | Highest quality |
| **FLAC** | .flac | 8-48 kHz | Mono/Stereo | Lossless compression |
| **OGG** | .ogg | 8-48 kHz | Mono/Stereo | Web streaming |
| **WebM** | .webm | 8-48 kHz | Mono/Stereo | Video audio extraction |
| **AMR** | .amr | 8 kHz | Mono | Mobile recordings |

---

## CLI Usage Examples

### Using generate()

Transcribe audio file:

```bash
neurolink generate "Summarize this recording" \
  --file meeting.mp3 \
  --provider google-ai
```

Use specific STT model:

```bash
neurolink generate "Transcribe voice command" \
  --file command.wav \
  --stt-model default \
  --provider google-ai
```

Transcribe to file:

```bash
neurolink generate "What's being said here?" \
  --file meeting.mp3 \
  --stt-language en-IN \
  --output transcript.txt
```

### Using stream()

```bash
# Basic streaming with STT
neurolink stream "Summarize this recording" --file meeting.mp3 --provider google-ai
```

---

## SDK Integration Examples

> **Note**: These are conceptual usage examples showing the proposed API design.

### Using generate() (Conceptual)

```typescript
// Conceptual: Proposed SDK API for STT integration
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync } from "fs";

const neurolink = new NeuroLink();

// Basic audio transcription
const result = await neurolink.generate({
  input: { 
    text: "Summarize this meeting recording:",
    files: ["meeting.mp3"]
  },
  provider: "google-ai",
  sttOptions: {
    language: "hi-IN",
    model: "default",
  }
});

console.log("Summary:", result.content);
```

### Using stream() (Conceptual)

```typescript
// Conceptual: Proposed streaming API for STT
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Stream AI analysis of transcribed audio
const stream = await neurolink.stream({
  input: { 
    text: "Summarize this meeting recording and extract action items:",
    files: ["meeting.mp3"]
  },
  provider: "google-ai",
  sttOptions: {
    language: "en-IN",
    model: "default",
  }
});

// Process streaming chunks
console.log("Streaming AI summary:\n");
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
console.log("\n\nStream complete!");
```

#### Error Handling Patterns

```typescript
// Robust STT with error handling
async function transcribeWithRetry(
  audioFile: string,
  maxRetries = 3
) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await neurolink.generate({
        input: { 
          text: "Transcribe this audio:",
          files: [audioFile]
        },
        provider: "vertex",
        sttOptions: {
          language: "hi-IN",
          model: "default",
        }
      });

      return { success: true, transcript: result.content };
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry validation errors
      if (error.message.includes('invalid format') || 
          error.message.includes('unsupported')) {
        break;
      }
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  return { success: false, error: lastError?.message };
}
```

---

## Technical Implementation Details

### Authentication Methods

```bash
# Set environment variable to service account JSON file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

```typescript
// Conceptual: Authentication pattern (uses Google Auth Library token generation)
import { SpeechClient } from '@google-cloud/speech';

const client = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
```

**Required IAM Permissions**:

The service account needs the following IAM role:

- **Cloud Speech Administrator** (`roles/speech.admin`) OR
- **Cloud Speech Client** (`roles/speech.client`)

Grant permissions:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/speech.client"
```

### Error Handling

#### Error Types

1. **Validation Errors** (STTError: INVALID_*)
   - Invalid audio format
   - File too large
   - Invalid language code
   - Unsupported sample rate

2. **API Errors** (STTError: API_*)
   - Authentication failure
   - Quota exceeded
   - Service unavailable
   - Network timeout

3. **Processing Errors** (STTError: PROCESSING_*)
   - Transcription failed
   - Audio decode error
   - Empty audio file

#### Error Recovery Strategies

**API Failures**:

- Retry with exponential backoff (3 attempts)
- Fallback to another provider(if available) if Google Cloud fails
- Skip transcription and return metadata-only

**File System Failures**:

- Validate file exists before processing
- Check file permissions
- Provide detailed error messages with solutions

---

## Dependencies

```json
{
  "dependencies": {
    "@google-cloud/speech": "^7.0.0",  // Google Cloud Speech-to-Text API
    "google-auth-library": "^9.0.0"     // Authentication (already installed)
  }
}
```

---

## Success Criteria

- **Functional**: Audio transcription via Google Cloud STT v1
- **Quality**: High accuracy with Google Cloud STT model
- **Performance**: <5 seconds for typical audio files
- **Integration**: Works with google-ai/vertex, reuses auth, no breaking changes
- **Reliability**: Error recovery, validation, >80% test coverage
- **Security**: Input sanitization, file validation, API key protection
- **Compatibility**: Fallback to another available provider if Google Cloud unavailable

---

## Migration Path

For existing AudioProcessor users (currently using other providers):

1. **No Breaking Changes**: Existing code continues to work
2. **Auto-Upgrade**: If Google Cloud credentials detected, automatically use STT v1
3. **Fallback**: Falls back to available providers if Google Cloud fails

Before (uses OpenAI Whisper automatically):

```typescript
const result = await neurolink.generate({
  input: { text: "Summarize", files: ["audio.mp3"] },
});
```

After (uses Google Cloud STT v1 if credentials available):

```typescript
const result = await neurolink.generate({
  input: { text: "Summarize", files: ["audio.mp3"] },
  sttOptions: { model: "default" }
});
```

---

## Conclusion

This implementation plan provides a complete roadmap for adding Speech-to-Text capabilities to NeuroLink as a native input modality, following the exact same architectural patterns as CSV, PDF, and other multimodal features.

**Key Architectural Principles:**

1. **Single Multimodal Path**: STT uses the existing `input.files` array—no separate `audioFiles` field
2. **Existing Pipeline Reuse**: FileDetector → AudioProcessor → MessageBuilder flow remains unchanged
3. **Optional Enhancement**: `sttOptions` presence triggers Google Cloud STT v1 transcription
4. **Backward Compatibility**: Existing Whisper transcription continues to work as fallback
5. **Zero Breaking Changes**: All current audio processing behavior preserved
