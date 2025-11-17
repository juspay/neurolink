# NeuroLink Text-to-Speech (TTS) Support Implementation Approach

## Executive Summary

This document outlines the comprehensive approach for implementing Text-to-Speech (TTS) output support in NeuroLink. The implementation leverages Google Cloud Text-to-Speech API through existing `google-ai` and `vertex` providers, ensuring 100% backward compatibility while providing powerful audio generation capabilities through both CLI and SDK interfaces.

**Status: 🚧 IMPLEMENTATION PLANNED**

---

## Table of Contents

1. [Problem Statement & Solution](#problem-statement--solution)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Strategy](#implementation-strategy)
4. [Voice Selection & Configuration](#voice-selection--configuration)
5. [Audio Format Support](#audio-format-support)
6. [CLI Usage Examples](#cli-usage-examples)
7. [SDK Integration Examples](#sdk-integration-examples)
8. [Technical Implementation Details](#technical-implementation-details)

---

## Problem Statement & Solution

### Core Challenge

The primary challenge is implementing TTS as a native **output modality** in NeuroLink without creating a separate provider, while maintaining:

1. **Consistency with NeuroLink Architecture**: Only expose `generate()` and `stream()` methods
2. **Authentication Reuse**: Leverage existing `google-ai` and `vertex` provider authentication
3. **Zero Breaking Changes**: Existing functionality must remain unaffected
4. **Provider Independence**: TTS as an optional output, not a separate AI provider

### Solution Architecture

The solution implements TTS as an **output modality** (symmetric to PDF/CSV modalities):

1. **Input Layer**: Text input with optional `tts` configuration
2. **Processing Layer**: Direct TTS conversion
3. **Output Layer**: Google Cloud TTS API converts text to audio buffer
4. **Playback Layer**: Cross-platform audio playback with temporary file management

**Note**: When `tts` option is provided, the system directly converts input text to speech without AI model inference, making it efficient for text-to-speech scenarios.

```typescript
// ✅ SOLUTION: TTS as Output Modality
const result = await neurolink.generate({
  input: { text: "Hello, world!" },
  provider: "google-ai",  // or "vertex"
  tts: {
    voice: "en-US-Neural2-C",
    encoding: "MP3",
    play: true
  }
});

// Result includes both text and audio
console.log(result.content);        // "Hello, world!"
console.log(result.audio?.buffer);  // Buffer with MP3 audio
```

---

## Architecture Overview

### Data Flow Diagram

```
User Request → NeuroLink Core → Provider Detection → TTS Service → Google Cloud TTS
     ↓              ↓                ↓                  ↓              ↓
Input + tts    Check tts option   google-ai/vertex   Voice Config   Audio Buffer
option                                                               ↓
                                                                Audio Player
                                                                (Optional)
                                                                     ↓
                                                              GenerateResult
                                                              { content, audio }
```

### Key Components

1. **TTS Service**: Core audio generation orchestrator using Google Cloud TTS API
2. **Audio Player**: Cross-platform playback utility (macOS/Linux/Windows)
3. **Voice Registry**: Voice discovery and metadata management
4. **Provider Integration**: TTS detection in google-ai and vertex providers
5. **CLI Interface**: Command-line TTS generation and voice discovery
6. **SDK Interface**: Programmatic TTS integration via `generate()` options

### Authentication Flow

```
Provider: google-ai
    ↓
GOOGLE_AI_API_KEY 
    ↓
Google Cloud TTS API

Provider: vertex
    ↓
GOOGLE_APPLICATION_CREDENTIALS (service account with IAM permissions)
    ↓
Google Cloud TTS API
```

---

## Implementation Strategy

### Phase 1: Type System Updates

**Objective**: Add TTS option to GenerateOptions and audio field to GenerateResult

**Files Modified**:
- `src/lib/types/generateTypes.ts`

**Changes**:
```typescript
export type GenerateOptions = {
  // ... existing fields ...

  tts?: {
    voice: string;                      // Voice name (e.g., "en-US-Neural2-C")
    encoding?: "MP3" | "WAV" | "OGG";  // Audio format (default: MP3)
    speakingRate?: number;              // 0.25 to 4.0 (default: 1.0)
    pitch?: number;                     // -20.0 to 20.0 (default: 0.0)
    play?: boolean;                     // Auto-play (default: false)
  };
};

export type GenerateResult = {
  // ... existing fields ...

  audio?: {
    buffer: Buffer;                     // Audio data
    encoding: "MP3" | "WAV" | "OGG";   // Audio format
    size: number;                       // Size in bytes
  };
};
```

**Success Criteria**:
- ✅ Type definitions compile without errors
- ✅ Optional fields don't affect existing code
- ✅ Clear documentation in type definitions

### Phase 2: TTS Utilities

**Objective**: Create core TTS infrastructure

**New Files**:
- `src/lib/tts/audio-player.ts` - Cross-platform audio playback
- `src/lib/tts/voice-registry.ts` - Voice discovery and caching
- `src/lib/tts/tts-service.ts` - Main TTS generation logic
- `src/lib/types/tts.ts` - TTS-specific type definitions

**Key Utilities**:

1. **Audio Player**:
   - macOS: `afplay` (pre-installed)
   - Linux: `ffplay` (from ffmpeg) or `aplay` (WAV only)
   - Windows: PowerShell `System.Media.SoundPlayer` (WAV only)

2. **Voice Registry**:
   - Fetch voices from Google Cloud TTS API
   - 15-minute cache to reduce API calls
   - Filter by language code
   - Return structured voice metadata

3. **TTS Service**:
   - Generate audio from text
   - Handle authentication (API key or service account)
   - Manage encoding format
   - Optional audio playback

### Phase 3: Provider Integration

**Objective**: Add TTS support to google-ai and vertex providers

**Files Modified**:
- `src/lib/providers/googleAiStudio.ts`
- `src/lib/providers/googleVertex.ts`

**Implementation Pattern**:
```typescript
async generate(options: GenerateOptions): Promise<GenerateResult> {
  // Check if TTS output requested
  if (options.tts) {
    return this.generateTTS(options);
  }

  // Normal Gemini/Vertex generation
  return this.generateText(options);
}

private async generateTTS(options: GenerateOptions): Promise<GenerateResult> {
  if (!options.tts) {
    throw new Error("TTS options are required");
  }

  const { voice, encoding = "MP3", speakingRate = 1.0, pitch = 0.0, play = false } = options.tts;

  // Validate required voice field
  if (!voice) {
    throw new Error("Voice is required for TTS generation");
  }

  // Auto-convert to WAV on Windows if play=true
  let finalEncoding = encoding;
  if (play && process.platform === "win32" && encoding !== "WAV") {
    finalEncoding = "WAV";
  }

  // Extract language code from voice name
  const languageCode = voice.match(/^([a-z]{2}-[A-Z]{2})/)?.[1] || "en-US";

  // Call Google Cloud TTS API
  const response = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: await this.getTTSHeaders(),  // API key or Bearer token
      body: JSON.stringify({
        input: { text: options.input.text },
        voice: { languageCode, name: voice },
        audioConfig: {
          audioEncoding: this.mapEncoding(finalEncoding),
          speakingRate,
          pitch
        }
      })
    }
  );

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, "base64");

  // Play if requested (uses platform-specific player: afplay/ffplay/PowerShell)
  if (play) {
    await this.audioPlayer.playFromBuffer(audioBuffer, finalEncoding);
  }

  return {
    content: options.input.text,
    audio: {
      buffer: audioBuffer,
      encoding: finalEncoding,
      size: audioBuffer.length
    },
    provider: this.getName(),
  };
}

private mapEncoding(encoding: "MP3" | "WAV" | "OGG"): string {
  switch (encoding) {
    case "MP3":
      return "MP3";
    case "WAV":
      return "LINEAR16";
    case "OGG":
      return "OGG_OPUS";
    default:
      return "MP3";
  }
}
```

**Note**: The `getTTSHeaders()` method will handle authentication differently for each provider:
- **google-ai**: Returns API key header (`X-Goog-Api-Key`)
- **vertex**: Returns Bearer token header (`Authorization`) from service account

**Success Criteria**:
- ✅ TTS works with both google-ai and vertex providers
- ✅ Authentication handled seamlessly

### Phase 4: CLI Integration

**Objective**: Add CLI commands for TTS generation and voice discovery

**Files Modified**:
- `src/cli/commands/generate.ts` - Add TTS flags
- `src/cli/commands/tts.ts` - New TTS command module
- `src/cli/index.ts` - Register TTS commands

**CLI Commands**:

1. **Generate with TTS Output**:
   ```bash
   neurolink generate "text" --tts-voice <voice> [options]
   ```

2. **List Available Voices**:
   ```bash
   neurolink tts voices [language]
   ```

**CLI Flags**:
- `--tts-voice <voice>`: Voice name (required to enable TTS)
- `--tts-encoding <format>`: MP3/WAV/OGG (default: MP3)
- `--tts-rate <rate>`: Speaking rate 0.25-4.0 (default: 1.0)
- `--tts-pitch <pitch>`: Pitch -20.0 to 20.0 (default: 0.0)
- `--tts-output <file>`: Save to file (optional)

**Note**: Providing `--tts-voice` triggers TTS mode. CLI always plays audio automatically.

### Phase 5: Testing & Validation

**Objective**: Comprehensive testing across platforms and scenarios

**Test Categories**:

1. **Unit Tests**:
   - TTS service utility tests
   - Audio player tests (mocked)
   - Voice registry tests (mocked API)

2. **Integration Tests**:
   - End-to-end TTS generation
   - Provider integration tests
   - CLI command tests

3. **Cross-Platform Tests**:
   - macOS playback verification
   - Linux playback verification (ffplay/aplay)
   - Windows playback verification (WAV format)

4. **Authentication Tests**:
   - API key authentication
   - Service account authentication
   - Permission validation

**Success Criteria**:
- ✅ >80% code coverage
- ✅ All platforms tested
- ✅ No breaking changes to existing tests

---

## Voice Selection & Configuration

### Available Voices

Google Cloud TTS provides 50+ voices across 10+ languages:

**English Variants**:
- `en-US`: United States English
- `en-GB`: British English
- `en-AU`: Australian English
- `en-IN`: Indian English

**Other Languages**:
- `es-ES`, `es-US`: Spanish
- `fr-FR`, `fr-CA`: French
- `de-DE`: German
- `ja-JP`: Japanese
- `hi-IN`: Hindi
- And more...

### Voice Types

1. **NEURAL2**: Latest neural voices (highest quality, recommended)
   - Example: `en-US-Neural2-A`, `en-US-Neural2-C`

2. **WAVENET**: High-quality neural voices
   - Example: `en-US-Wavenet-A`, `en-US-Wavenet-D`

3. **STANDARD**: Standard voices
   - Example: `en-US-Standard-A`, `en-US-Standard-B`

### Voice Discovery

#### CLI Voice Discovery

```bash
# List all available voices
neurolink tts voices

# Filter by language
neurolink tts voices en-US

# JSON format for programmatic use
neurolink tts voices en-IN --format json

# Table format for easy reading
neurolink tts voices fr-FR --format table
```

#### SDK Voice Discovery

```typescript
import { NeuroLink } from '@juspay/neurolink';

const neurolink = new NeuroLink();

// Get all voices
const allVoices = await neurolink.getTTSVoices();

// Get voices for specific language
const usVoices = await neurolink.getTTSVoices("en-US");

// Voice structure
interface VoiceOption {
  name: string;           // "en-US-Neural2-C"
  languageCode: string;   // "en-US"
  gender: "MALE" | "FEMALE" | "NEUTRAL";
  type: "NEURAL2" | "WAVENET" | "STANDARD";
}
```

### Voice Selection Guidelines

**For Natural Conversations**: Use Neural2 voices
```typescript
tts: { voice: "en-US-Neural2-C" }  // Female, natural
tts: { voice: "en-US-Neural2-A" }  // Male, natural
```

**For Professional Narration**: Use Wavenet voices
```typescript
tts: { voice: "en-US-Wavenet-D" }  // Male, professional
tts: { voice: "en-GB-Wavenet-A" }  // British, professional
```

**For Cost Optimization**: Use Standard voices
```typescript
tts: { voice: "en-US-Standard-B" }  // Lower cost
```

---

## Audio Format Support

### Encoding Formats

| Format | Quality | File Size | Platform Support | Use Case |
|--------|---------|-----------|------------------|----------|
| **MP3** | Good | Small (~100KB/min) | All platforms | Default, balanced |
| **WAV** | Best | Large (~1MB/min) | All platforms | Windows playback required |
| **OGG** | Good | Medium (~150KB/min) | macOS, Linux | Web streaming |

### Format Selection

```typescript
// Default: MP3 (balanced quality and size)
tts: {
  voice: "en-US-Neural2-C",
  encoding: "MP3"
}

// Best quality: WAV
tts: {
  voice: "en-US-Neural2-C",
  encoding: "WAV"
}

// Web streaming: OGG
tts: {
  voice: "en-US-Neural2-C",
  encoding: "OGG"
}
```

### Platform-Specific Considerations

**Windows Playback**:
- System.Media.SoundPlayer only supports WAV format
- Auto-conversion: When `play: true` on Windows, encoding auto-converts to WAV
- Manual override not needed

```typescript
// On Windows, this automatically uses WAV for playback
const result = await neurolink.generate({
  input: { text: "Hello from Windows" },
  provider: "google-ai",
  tts: {
    voice: "en-US-Neural2-C",
    encoding: "MP3",  // User requests MP3, but auto-converts to WAV on Windows
    play: true
  }
});
// result.audio.encoding === "WAV" (on Windows with play: true)
```

**macOS/Linux**:
- All formats supported
- `afplay` (macOS) and `ffplay` (Linux) handle MP3/WAV/OGG

### Audio Configuration Options

#### Speaking Rate

Control speech speed (0.25 to 4.0):

```typescript
tts: {
  voice: "en-US-Neural2-C",
  speakingRate: 0.5   // Half speed (slower)
}

tts: {
  voice: "en-US-Neural2-C",
  speakingRate: 1.0   // Normal speed (default)
}

tts: {
  voice: "en-US-Neural2-C",
  speakingRate: 2.0   // Double speed (faster)
}
```

#### Pitch Adjustment

Adjust voice pitch (-20.0 to 20.0):

```typescript
tts: {
  voice: "en-US-Neural2-C",
  pitch: -5.0   // Lower pitch (deeper voice)
}

tts: {
  voice: "en-US-Neural2-C",
  pitch: 0.0    // Normal pitch (default)
}

tts: {
  voice: "en-US-Neural2-C",
  pitch: 5.0    // Higher pitch
}
```

---

## CLI Usage Examples

### Basic TTS Generation

```bash
# Generate and play audio (plays automatically)
neurolink generate "Hello, world!" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C

# Another example with different voice
neurolink generate "Testing TTS" \
  --provider vertex \
  --tts-voice en-US-Neural2-A

# Save to file
neurolink generate "Save this audio" \
  --provider google-ai \
  --tts-voice en-US-Neural2-D \
  --tts-output ~/Desktop/audio.mp3
```

### Advanced TTS Configuration

```bash
# Custom speaking rate and pitch
neurolink generate "This is faster with higher pitch" \
  --provider vertex \
  --tts-voice en-US-Neural2-C \
  --tts-rate 1.5 \
  --tts-pitch 3.0

# Different audio encoding
neurolink generate "High quality WAV audio" \
  --provider google-ai \
  --tts-voice en-US-Neural2-A \
  --tts-encoding WAV \
  --tts-output audio.wav

# OGG format for web streaming
neurolink generate "Web-optimized audio" \
  --provider vertex \
  --tts-voice en-US-Neural2-C \
  --tts-encoding OGG \
  --tts-output stream.ogg
```

### Multilingual TTS

```bash
# French TTS
neurolink generate "Bonjour, monde!" \
  --provider google-ai \
  --tts-voice fr-FR-Wavenet-A

# Spanish TTS
neurolink generate "Hola, mundo!" \
  --provider vertex \
  --tts-voice es-ES-Neural2-A

# Indian English TTS
neurolink generate "Hello from India" \
  --provider google-ai \
  --tts-voice en-IN-Neural2-A

# Hindi TTS
neurolink generate "नमस्ते, दुनिया!" \
  --provider vertex \
  --tts-voice hi-IN-Wavenet-A
```

### Voice Discovery Commands

```bash
# List all voices (text format)
neurolink tts voices

# List US English voices
neurolink tts voices en-US

# List British English voices in JSON
neurolink tts voices en-GB --format json

# List Indian English voices in table format
neurolink tts voices en-IN --format table

# Quiet mode (minimal output)
neurolink tts voices en-US --quiet

# Debug mode (verbose output)
neurolink tts voices --debug
```

### Production Use Cases

#### Podcast Generation

```bash
# Generate podcast intro with professional voice
neurolink generate "Welcome to Tech Insights Podcast, episode 42." \
  --provider vertex \
  --tts-voice en-US-Wavenet-D \
  --tts-rate 0.95 \
  --tts-encoding MP3 \
  --tts-output podcast-intro.mp3
```

#### Accessibility Features

```bash
# Screen reader-style narration
neurolink generate "Button clicked. Navigation menu opened." \
  --provider google-ai \
  --tts-voice en-US-Neural2-C \
  --tts-rate 1.2
```

#### Language Learning

```bash
# Slow French pronunciation
neurolink generate "Je m'appelle Claude. Comment allez-vous?" \
  --provider vertex \
  --tts-voice fr-FR-Neural2-A \
  --tts-rate 0.7

# Normal speed for comparison
neurolink generate "Je m'appelle Claude. Comment allez-vous?" \
  --provider vertex \
  --tts-voice fr-FR-Neural2-A \
  --tts-rate 1.0 \
  --tts-output french-normal.mp3
```

---

## SDK Integration Examples

### Basic SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic TTS generation
const result = await neurolink.generate({
  input: { text: "Hello, world!" },
  provider: "google-ai",
  tts: {
    voice: "en-US-Neural2-C",
    encoding: "MP3",
    play: true
  }
});

// Access generated content and audio
console.log("Text:", result.content);
console.log("Audio size:", result.audio?.size, "bytes");
console.log("Audio encoding:", result.audio?.encoding);

// Save audio to file
import { writeFileSync } from "fs";
if (result.audio) {
  writeFileSync("output.mp3", result.audio.buffer);
}
```

### Advanced SDK Patterns

#### Custom Voice Configuration

```typescript
// French TTS with custom parameters
const frenchResult = await neurolink.generate({
  input: { text: "Bonjour, monde!" },
  provider: "vertex",
  tts: {
    voice: "fr-FR-Wavenet-A",
    encoding: "WAV",
    speakingRate: 1.2,  // 20% faster
    pitch: 2.0,         // Slightly higher pitch
    play: false         // Don't auto-play
  }
});

// Save high-quality WAV file
if (frenchResult.audio) {
  writeFileSync("french-greeting.wav", frenchResult.audio.buffer);
}
```

#### Batch TTS Generation

```typescript
// Generate multiple audio files
async function generateBatchAudio(texts: string[], voice: string) {
  const results = [];

  for (const text of texts) {
    const result = await neurolink.generate({
      input: { text },
      provider: "google-ai",
      tts: {
        voice,
        encoding: "MP3",
        play: false
      }
    });

    results.push({
      text,
      audioBuffer: result.audio?.buffer,
      audioSize: result.audio?.size
    });
  }

  return results;
}

// Usage
const audioFiles = await generateBatchAudio([
  "Welcome to our application.",
  "Please enter your username and password.",
  "Login successful. Redirecting to dashboard."
], "en-US-Neural2-C");

// Save all audio files
audioFiles.forEach((item, index) => {
  if (item.audioBuffer) {
    writeFileSync(`audio-${index}.mp3`, item.audioBuffer);
    console.log(`Generated: audio-${index}.mp3 (${item.audioSize} bytes)`);
  }
});
```

#### Error Handling Patterns

```typescript
// Robust TTS with error handling
async function generateTTSWithRetry(
  text: string,
  voice: string,
  maxRetries = 3
) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await neurolink.generate({
        input: { text },
        provider: "google-ai",
        tts: { voice, encoding: "MP3", play: false }
      });

      // Validate audio buffer
      if (!result.audio || result.audio.size === 0) {
        throw new Error("Empty audio buffer received");
      }

      return {
        success: true,
        audio: result.audio,
        attempt
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      // Don't retry on invalid input
      if (error.message.includes('invalid voice') ||
          error.message.includes('text too long')) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error occurred",
    attempts: maxRetries
  };
}

// Usage with error handling
const result = await generateTTSWithRetry(
  "Generate this audio with retry logic",
  "en-US-Neural2-C"
);

if (result.success && result.audio) {
  console.log("Audio generated successfully");
  writeFileSync("output.mp3", result.audio.buffer);
} else {
  console.error("TTS generation failed:", result.error);
}
```

#### Streaming Text to Audio

```typescript
// Stream AI-generated text and convert to audio
async function streamAndSpeak(prompt: string, voice: string) {
  // Step 1: Generate text via streaming
  const streamResult = await neurolink.stream({
    input: { text: prompt },
    provider: "vertex",
    model: "gemini-2.0-flash-exp"
  });

  let fullText = "";
  for await (const chunk of streamResult.stream) {
    fullText += chunk.content;
    process.stdout.write(chunk.content);
  }

  console.log("\n\nConverting to audio...");

  // Step 2: Convert complete text to audio
  const ttsResult = await neurolink.generate({
    input: { text: fullText },
    provider: "google-ai",
    tts: {
      voice,
      encoding: "MP3",
      play: true  // Auto-play the generated audio
    }
  });

  return {
    text: fullText,
    audio: ttsResult.audio
  };
}

// Usage
const result = await streamAndSpeak(
  "Explain quantum computing in simple terms",
  "en-US-Neural2-C"
);

console.log("Audio size:", result.audio?.size, "bytes");
if (result.audio) {
  writeFileSync("explanation.mp3", result.audio.buffer);
}
```

#### Multi-Language Support

```typescript
// Generate audio in multiple languages
async function generateMultilingualAudio(
  translations: Record<string, { text: string; voice: string }>
) {
  const results: Record<string, Buffer> = {};

  for (const [language, config] of Object.entries(translations)) {
    const result = await neurolink.generate({
      input: { text: config.text },
      provider: "google-ai",
      tts: {
        voice: config.voice,
        encoding: "MP3",
        play: false
      }
    });

    if (result.audio) {
      results[language] = result.audio.buffer;
      console.log(`✅ Generated ${language} audio (${result.audio.size} bytes)`);
    }
  }

  return results;
}

// Usage
const translations = await generateMultilingualAudio({
  english: {
    text: "Hello, welcome to our application.",
    voice: "en-US-Neural2-C"
  },
  french: {
    text: "Bonjour, bienvenue dans notre application.",
    voice: "fr-FR-Wavenet-A"
  },
  spanish: {
    text: "Hola, bienvenido a nuestra aplicación.",
    voice: "es-ES-Neural2-A"
  },
  hindi: {
    text: "नमस्ते, हमारे एप्लिकेशन में आपका स्वागत है।",
    voice: "hi-IN-Wavenet-A"
  }
});

// Save all translations
Object.entries(translations).forEach(([lang, buffer]) => {
  writeFileSync(`welcome-${lang}.mp3`, buffer);
});
```

---

## Technical Implementation Details

### Google Cloud TTS API Integration

#### API Endpoint

```
POST https://texttospeech.googleapis.com/v1/text:synthesize
```

#### Request Format

```json
{
  "input": {
    "text": "Hello, world!"
  },
  "voice": {
    "languageCode": "en-US",
    "name": "en-US-Neural2-C"
  },
  "audioConfig": {
    "audioEncoding": "MP3",
    "speakingRate": 1.0,
    "pitch": 0.0
  }
}
```

#### Response Format

```json
{
  "audioContent": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA..."
}
```

The `audioContent` field contains base64-encoded audio data that is decoded to a Buffer.

### Authentication Methods

#### API Key Authentication (google-ai provider)

```typescript
// Environment variable
export GOOGLE_AI_API_KEY="AIzaSy..."

// Request headers
{
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.GOOGLE_AI_API_KEY
}
```

**API Key Restrictions**:
1. In Google Cloud Console, navigate to "APIs & Services" > "Credentials"
2. Create or select API key
3. Click "Restrict Key"
4. Under "API restrictions", select "Restrict key"
5. Choose both:
   - **Generative Language API** (for Gemini)
   - **Cloud Text-to-Speech API** (for TTS)

This allows a single API key to work for both Gemini text generation and TTS audio generation.

#### Service Account Authentication (vertex provider)

```bash
# Set environment variable to service account JSON file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

```typescript
// Google Auth Library handles token generation
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const client = await auth.getClient();
const accessToken = await client.getAccessToken();

// Request headers
{
  "Content-Type": "application/json",
  "Authorization": `Bearer ${accessToken.token}`
}
```

**Required IAM Permissions**:
- `aiplatform.endpoints.predict` (for Vertex AI)
- `texttospeech.synthesize` (for TTS)

### Audio Encoding Mapping

NeuroLink uses user-friendly encoding names that map to Google's internal formats:

```typescript
function mapAudioEncoding(encoding: AudioEncoding): GoogleAudioEncoding {
  switch (encoding) {
    case "MP3":
      return "MP3";           // MPEG Audio Layer III
    case "WAV":
      return "LINEAR16";      // Uncompressed 16-bit signed linear PCM
    case "OGG":
      return "OGG_OPUS";      // Opus codec in OGG container
    default:
      return "MP3";
  }
}
```

### Cross-Platform Audio Playback

#### Implementation Strategy

1. **Temporary File Creation**: Audio buffer written to OS temp directory
2. **Platform Detection**: `process.platform` determines playback method
3. **Command Execution**: Platform-specific audio player command
4. **Cleanup**: Temporary file deleted in finally block

#### Platform-Specific Commands

**macOS** (`darwin`):
```bash
afplay /tmp/tts-abc123.mp3
```

**Linux**:
```bash
# Primary: ffplay (supports all formats)
ffplay -nodisp -autoexit /tmp/tts-abc123.mp3

# Fallback: aplay (WAV only)
aplay /tmp/tts-abc123.wav
```

**Windows** (`win32`):
```powershell
# PowerShell System.Media.SoundPlayer (WAV only)
$player = New-Object System.Media.SoundPlayer
$player.SoundLocation = 'C:\Temp\tts-abc123.wav'
$player.PlaySync()
```

#### Security Considerations

```typescript
// Windows path escaping to prevent injection
const escapedPath = filePath.replace(/'/g, "''");

// Use execFile instead of exec to avoid shell injection
import { execFile } from "child_process";
await execFile("afplay", [filePath]);  // ✅ Safe
await exec(`afplay "${filePath}"`);     // ❌ Vulnerable to injection
```

### Input Validation

```typescript
// Text validation
if (!input.text || input.text.trim().length === 0) {
  throw new TTSError("Text is required", "INVALID_TEXT");
}

const textBytes = new TextEncoder().encode(input.text).length;
if (textBytes > 5000) {
  throw new TTSError("Text exceeds 5000 bytes", "TEXT_TOO_LONG");
}

// Speaking rate validation
if (input.speakingRate != null &&
    (input.speakingRate < 0.25 || input.speakingRate > 4.0)) {
  throw new TTSError("Speaking rate must be 0.25-4.0", "INVALID_RATE");
}

// Pitch validation
if (input.pitch != null &&
    (input.pitch < -20.0 || input.pitch > 20.0)) {
  throw new TTSError("Pitch must be -20.0 to 20.0", "INVALID_PITCH");
}

// Voice name format validation
const voicePattern = /^[a-z]{2}-[A-Z]{2}(?:-[A-Za-z0-9]+)+$/;
if (!voicePattern.test(input.voiceName)) {
  throw new TTSError("Invalid voice name format", "INVALID_VOICE");
}
```
