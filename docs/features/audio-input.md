---
title: Audio Input & Transcription Guide
description: Complete guide to NeuroLink's audio input capabilities including real-time voice conversations with Gemini Live and TTS integration
keywords: audio, voice, speech, real-time, gemini live, transcription, audio input, voice chat, pcm, streaming audio
---

# Audio Input & Voice Conversations Guide

NeuroLink provides comprehensive audio input capabilities, enabling real-time voice conversations with AI models. This guide covers currently available features, audio specifications, and upcoming enhancements.

## Overview

### Currently Available

NeuroLink supports the following audio capabilities today:

- **Real-time voice conversations** via Gemini Live (Google AI Studio)
- **Text-to-Speech (TTS) output** via Google Cloud TTS integration
- **WebSocket-based voice streaming** for web applications
- **Bidirectional audio** - speak and hear AI responses in real-time

### Planned

The following features are planned for future releases:

- CLI commands: `neurolink audio transcribe`, `neurolink audio analyze`, `neurolink audio summarize`
- CLI commands: `neurolink voice chat`, `neurolink voice demo`
- OpenAI Whisper transcription integration
- Cross-provider audio support (Anthropic, Azure, AWS)
- File-based audio input processing

---

## Provider Support Matrix

| Provider             | Real-time Voice | TTS Output | Audio Transcription | Status           |
| -------------------- | --------------- | ---------- | ------------------- | ---------------- |
| **Google AI Studio** | Yes             | Yes        | Planned             | Production Ready |
| **Google Vertex AI** | Planned         | Yes        | Planned             | TTS Available    |
| **OpenAI**           | Planned         | Planned    | Planned             | Planned          |
| **Anthropic**        | Planned         | Planned    | Planned             | Planned          |
| **Azure OpenAI**     | Planned         | Planned    | Planned             | Planned          |
| **AWS Bedrock**      | Planned         | Planned    | Planned             | Planned          |

**Supported Model for Real-time Voice:**

| Model                                          | Provider  | Capabilities                     |
| ---------------------------------------------- | --------- | -------------------------------- |
| `gemini-2.5-flash-preview-native-audio-dialog` | Google AI | Bidirectional audio, low latency |

---

## Quick Start: Real-Time Voice (SDK)

Real-time voice conversations are available through the SDK using Gemini Live's native audio dialog model.

### Prerequisites

```bash
# Set your Google AI API key
export GOOGLE_AI_API_KEY="your-api-key"
# OR
export GEMINI_API_KEY="your-api-key"
```

### Basic Real-time Voice Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Create an async iterator for audio frames
// This example uses a hypothetical audio source
async function* getAudioFrames(): AsyncIterable<Buffer> {
  // Your audio capture logic here
  // Each frame should be PCM16LE mono at 16kHz
  // Recommended frame size: 20-60ms of audio
  while (capturing) {
    const frame = await captureAudioFrame();
    yield frame;
  }
}

// Stream with real-time audio input
const result = await neurolink.stream({
  provider: "google-ai",
  model: "gemini-2.5-flash-preview-native-audio-dialog",
  input: {
    audio: {
      frames: getAudioFrames(),
      sampleRateHz: 16000, // Input sample rate (default: 16000)
      encoding: "PCM16LE", // Encoding format (default: PCM16LE)
    },
  },
  disableTools: true, // Required for Phase 1 audio streaming
});

// Process audio responses
for await (const event of result.stream) {
  if (event.type === "audio") {
    // Handle audio output chunk
    // Output is PCM16LE mono at 24kHz
    const audioData = event.audio.data;
    playAudio(audioData);
  }
}
```

### Complete Voice Session Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

async function startVoiceSession() {
  // Audio frame queue management
  const frameQueue: Buffer[] = [];
  let isSessionActive = true;

  // Create async iterator from queue
  const audioFramesIterator: AsyncIterable<Buffer> = {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (!isSessionActive) {
            return { value: undefined, done: true };
          }
          // Wait for frames to be available
          while (frameQueue.length === 0 && isSessionActive) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          if (frameQueue.length > 0) {
            return { value: frameQueue.shift()!, done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
  };

  // Start the streaming session
  const streamResult = await neurolink.stream({
    provider: "google-ai",
    model: "gemini-2.5-flash-preview-native-audio-dialog",
    input: {
      audio: {
        frames: audioFramesIterator,
        sampleRateHz: 16000,
        encoding: "PCM16LE",
      },
    },
    disableTools: true,
  });

  // Function to add captured audio to queue
  function onAudioCaptured(pcmBuffer: Buffer) {
    frameQueue.push(pcmBuffer);
  }

  // Function to signal end of input (flush)
  function flushAudio() {
    // Push a zero-length buffer as flush signal
    frameQueue.push(Buffer.alloc(0));
  }

  // Process responses
  for await (const event of streamResult.stream) {
    if (event.type === "audio") {
      // Output audio data: PCM16LE, 24kHz, mono
      handleAudioOutput(event.audio.data);
    }
  }

  isSessionActive = false;
}

function handleAudioOutput(audioBuffer: Buffer) {
  // Play or process the audio response
  // Sample rate: 24000 Hz
  // Format: PCM16LE mono
  playAudioBuffer(audioBuffer);
}
```

---

## Quick Start: TTS Integration

NeuroLink provides Text-to-Speech output via Google Cloud TTS. TTS can be combined with any text generation.

### CLI Usage

```bash
# Generate text and convert to speech
neurolink generate "Hello, world!" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C

# Save audio to file
neurolink generate "Welcome to NeuroLink" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C \
  --tts-output welcome.mp3

# Customize voice parameters
neurolink generate "This is a test" \
  --provider google-ai \
  --tts-voice en-US-Wavenet-D \
  --tts-speed 1.2 \
  --tts-pitch 2.0 \
  --tts-format mp3 \
  --tts-output test.mp3

# Synthesize AI response (not input text)
neurolink generate "Tell me a joke" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C \
  --tts-use-ai-response \
  --tts-output joke.mp3
```

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "fs";

const neurolink = new NeuroLink();

// Basic TTS
const result = await neurolink.generate({
  input: { text: "Hello, world!" },
  provider: "google-ai",
  tts: {
    enabled: true,
    voice: "en-US-Neural2-C",
    format: "mp3",
    play: true, // Auto-play in CLI
  },
});

// Save TTS audio
if (result.tts?.buffer) {
  writeFileSync("output.mp3", result.tts.buffer);
  console.log(`Audio saved: ${result.tts.size} bytes`);
}

// Advanced TTS with AI response synthesis
const aiResponse = await neurolink.generate({
  input: { text: "Explain quantum computing briefly" },
  provider: "google-ai",
  tts: {
    enabled: true,
    useAiResponse: true, // Synthesize AI's response
    voice: "en-US-Wavenet-D",
    format: "mp3",
    speed: 0.9,
    pitch: -2.0,
  },
});

console.log("Text:", aiResponse.content);
console.log("Audio size:", aiResponse.tts?.size, "bytes");
```

For comprehensive TTS documentation, see the [TTS Integration Guide](tts.md).

---

## Voice Demo Example

NeuroLink includes a complete voice demo application demonstrating real-time bidirectional audio conversations.

### Location

```
examples/voice-demo/
  server.mjs      # WebSocket server with NeuroLink integration
  public/
    index.html    # Web interface
    client.js     # Browser audio capture and playback
```

### Running the Demo

```bash
# Navigate to the project root
cd /path/to/neurolink

# Build the SDK first
pnpm run build

# Set your API key
export GOOGLE_AI_API_KEY="your-api-key"

# Run the demo server
node examples/voice-demo/server.mjs
```

The demo will:

1. Start a WebSocket server on port 5175 (or next available port)
2. Open your browser automatically to the demo interface
3. Allow you to speak and receive real-time AI audio responses

### Demo Architecture

```
Browser (client.js)
    |
    | WebSocket (ws://localhost:5175/ws)
    |
    v
Server (server.mjs)
    |
    | neurolink.stream()
    |
    v
Gemini Live API
    |
    | PCM16LE audio chunks
    |
    v
Server -> Browser -> Audio playback
```

### Key Code from Voice Demo Server

```typescript
// From examples/voice-demo/server.mjs
const streamResult = await neurolink.stream({
  provider: "google-ai",
  model:
    process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-native-audio-dialog",
  input: {
    audio: {
      frames: framesFromClient,
      // sampleRateHz defaults to 16000
      // encoding defaults to 'PCM16LE'
    },
  },
  disableTools: true, // Required for audio streaming
});

// Stream audio responses back to client
for await (const ev of streamResult.stream) {
  if (ev.type === "audio") {
    // Send raw PCM16LE bytes back to the client
    ws.send(ev.audio.data, { binary: true });
  }
}
```

---

## Audio Specifications

### Input Audio Format

| Parameter       | Value               | Notes                                |
| --------------- | ------------------- | ------------------------------------ |
| **Encoding**    | PCM16LE             | 16-bit signed integer, little-endian |
| **Sample Rate** | 16,000 Hz           | 16 kHz mono                          |
| **Channels**    | 1 (mono)            | Stereo not supported in Phase 1      |
| **Frame Size**  | 20-60ms recommended | ~320-960 samples per frame           |
| **Byte Order**  | Little-endian       | Intel/ARM standard                   |

### Output Audio Format

| Parameter       | Value         | Notes                                |
| --------------- | ------------- | ------------------------------------ |
| **Encoding**    | PCM16LE       | 16-bit signed integer, little-endian |
| **Sample Rate** | 24,000 Hz     | 24 kHz mono                          |
| **Channels**    | 1 (mono)      | Single channel output                |
| **Byte Order**  | Little-endian | Intel/ARM standard                   |

### Converting Audio Formats

**From Float32 to PCM16LE (for input):**

```javascript
function floatTo16BitPCM(float32Array) {
  const length = float32Array.length;
  const buffer = new ArrayBuffer(length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < length; i++) {
    // Clamp value to [-1, 1]
    let sample = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit signed integer
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}
```

**From PCM16LE to Float32 (for output playback):**

```javascript
function pcm16ToFloat32(pcm16Buffer) {
  const dataInt16 = new Int16Array(pcm16Buffer);
  const dataFloat32 = new Float32Array(dataInt16.length);

  for (let i = 0; i < dataInt16.length; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }

  return dataFloat32;
}
```

### Browser Audio Context Setup

```javascript
// Input context at 16kHz for capturing
const inputCtx = new AudioContext({ sampleRate: 16000 });

// Output context at 24kHz for playback
const outputCtx = new AudioContext({ sampleRate: 24000 });
```

---

## SDK API Reference

### AudioInputSpec

Configuration for streaming audio input.

```typescript
type AudioInputSpec = {
  /**
   * Async iterator yielding PCM16LE audio frames
   * Each frame should be 20-60ms of audio (mono)
   */
  frames: AsyncIterable<Buffer>;

  /**
   * Input sample rate in Hz
   * @default 16000
   */
  sampleRateHz?: number;

  /**
   * Audio encoding format
   * @default "PCM16LE"
   */
  encoding?: "PCM16LE";

  /**
   * Number of audio channels
   * Phase 1 only supports mono
   * @default 1
   */
  channels?: 1;
};
```

### AudioChunk

Audio output chunk received from streaming responses.

```typescript
type AudioChunk = {
  /**
   * Raw audio data buffer (PCM16LE format)
   */
  data: Buffer;

  /**
   * Sample rate of the audio data
   * Gemini typically outputs at 24000 Hz
   */
  sampleRateHz: number;

  /**
   * Number of audio channels (typically 1 for mono)
   */
  channels: number;

  /**
   * Audio encoding format
   */
  encoding: "PCM16LE";
};
```

### StreamOptions with Audio

```typescript
type StreamOptions = {
  input: {
    text: string;
    audio?: AudioInputSpec; // Optional audio input
    // ... other input options
  };

  provider: string;
  model?: string;
  disableTools?: boolean; // Required true for audio streaming
  // ... other options
};
```

### Stream Result Events

```typescript
// Stream yields different event types
type StreamEvent =
  | { content: string } // Text chunk
  | { type: "audio"; audio: AudioChunk } // Audio chunk
  | { type: "image"; imageOutput: { base64: string } }; // Image output

// Usage
for await (const event of result.stream) {
  if ("content" in event) {
    // Text content
    console.log(event.content);
  } else if (event.type === "audio") {
    // Audio data
    playAudio(event.audio.data);
  }
}
```

### AudioContent (File-based - Future)

For file-based audio input (planned feature).

```typescript
type AudioContent = {
  type: "audio";
  data: Buffer | string; // Buffer, base64, URL, or file path
  mediaType?:
    | "audio/mpeg" // MP3
    | "audio/wav" // WAV
    | "audio/ogg" // OGG
    | "audio/webm" // WebM
    | "audio/aac" // AAC
    | "audio/flac" // FLAC
    | "audio/mp4"; // M4A
  metadata?: {
    filename?: string;
    duration?: number; // in seconds
    sampleRate?: number;
    channels?: number;
    transcription?: string; // Pre-existing transcription
  };
};
```

---

## Roadmap

### Phase 1 (Current)

- Real-time voice with Gemini Live
- Bidirectional audio streaming via SDK
- Voice demo example application
- TTS output integration

### Phase 2 (Planned)

- **CLI Voice Commands**

  ```bash
  # Start interactive voice chat
  neurolink voice chat --provider google-ai

  # Launch voice demo server
  neurolink voice demo --port 5175
  ```

- **Audio Transcription**

  ```bash
  # Transcribe audio file
  neurolink audio transcribe recording.mp3 --provider openai

  # Analyze audio content
  neurolink audio analyze podcast.mp3 --prompt "Summarize key points"
  ```

### Phase 3 (Planned)

- **OpenAI Whisper Integration**

  ```typescript
  const transcription = await neurolink.transcribe({
    audioFile: "./recording.mp3",
    provider: "openai",
    model: "whisper-1",
    language: "en",
  });
  ```

- **Cross-provider Audio Support**
  - Anthropic voice capabilities
  - Azure Speech Services
  - AWS Transcribe

- **File-based Audio Input**
  ```typescript
  const result = await neurolink.generate({
    input: {
      text: "Analyze this audio file",
      audioFiles: ["./meeting.mp3"],
    },
    provider: "openai",
  });
  ```

---

## Environment Setup

### Required Environment Variables

```bash
# For Google AI Studio (Gemini Live)
export GOOGLE_AI_API_KEY="your-api-key"
# OR
export GEMINI_API_KEY="your-api-key"

# For TTS (Google Cloud)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
# OR use the same GOOGLE_AI_API_KEY with Cloud TTS API enabled
```

### API Key Configuration

For Gemini Live and TTS to work with an API key:

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create or select your API key
3. Under "API restrictions", enable:
   - **Generative Language API** (for Gemini)
   - **Cloud Text-to-Speech API** (for TTS output)

---

## Troubleshooting

### Common Issues

| Issue                       | Cause                    | Solution                                           |
| --------------------------- | ------------------------ | -------------------------------------------------- |
| **No audio output**         | Missing API key          | Set `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY`        |
| **"disableTools required"** | Tools enabled with audio | Add `disableTools: true` to stream options         |
| **Choppy audio playback**   | Buffer underrun          | Increase buffer size or frame rate                 |
| **Wrong sample rate**       | Mismatched audio context | Use 16kHz input, 24kHz output contexts             |
| **WebSocket disconnects**   | Network timeout          | Implement reconnection logic                       |
| **"Model not found"**       | Invalid model name       | Use `gemini-2.5-flash-preview-native-audio-dialog` |

### Audio Quality Issues

**Clipping/Distortion:**

- Ensure input samples are normalized to [-1, 1] range
- Check gain levels before PCM conversion

**Echo/Feedback:**

- Mute microphone during AI audio playback
- Implement voice activity detection (VAD)

**Latency:**

- Use smaller frame sizes (20ms)
- Process audio in real-time, avoid buffering
- Use WebSocket for low-latency transport

### Debug Mode

Enable debug logging to troubleshoot audio issues:

```bash
export NEUROLINK_DEBUG=true
```

```typescript
const neurolink = new NeuroLink({
  debug: true,
});
```

---

## Related Features

**Audio & Voice:**

- [TTS Integration Guide](tts.md) - Complete Text-to-Speech documentation
- [Video Generation](video-generation.md) - AI-powered video with audio
- [PPT Generation](ppt-generation.md) - AI-powered PowerPoint presentations

**Multimodal Capabilities:**

- [Multimodal Guide](multimodal.md) - Images, PDFs, CSV inputs
- [PDF Support](pdf-support.md) - Document processing

**Advanced Features:**

- [Streaming](../advanced/streaming.md) - Stream AI responses in real-time
- [Provider Orchestration](provider-orchestration.md) - Multi-provider failover

**Documentation:**

- [CLI Commands](../cli/commands.md) - Complete CLI reference
- [SDK API Reference](../sdk/api-reference.md) - Full API documentation
- [Troubleshooting](../troubleshooting.md) - Extended error catalog

---

## Summary

NeuroLink's audio input capabilities provide:

**Currently Available:**

- Real-time voice conversations via Gemini Live
- Bidirectional audio streaming (speak and hear)
- TTS output via Google Cloud
- Voice demo example application
- PCM16LE audio format support

**Planned:**

- CLI voice commands (`voice chat`, `audio transcribe`)
- OpenAI Whisper transcription
- Cross-provider audio support
- File-based audio processing

**Next Steps:**

1. Set up [environment variables](#environment-setup)
2. Try the [voice demo](#voice-demo-example) application
3. Integrate [real-time voice](#quick-start-real-time-voice-sdk) in your SDK code
4. Explore [TTS output](tts.md) for text-to-speech
5. Check [troubleshooting](#troubleshooting) if you encounter issues
