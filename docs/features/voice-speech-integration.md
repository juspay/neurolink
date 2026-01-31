---
title: Voice and Speech Integration Guide
description: Complete guide to NeuroLink's voice capabilities including TTS, STT, and realtime voice operations
keywords: voice, speech, tts, stt, text-to-speech, speech-to-text, transcription, audio, elevenlabs, deepgram, whisper, assemblyai, azure, google
---

# Voice and Speech Integration Guide

NeuroLink provides comprehensive voice and speech capabilities through a unified API, supporting multiple providers for Text-to-Speech (TTS), Speech-to-Text (STT), and Realtime Voice operations.

## Overview

**Key Features:**

- **Multiple TTS Providers** - Google, ElevenLabs, OpenAI, Azure, Sarvam, Murf, Play.ai, Speechify
- **Multiple STT Providers** - Deepgram, Whisper, Gladia, AssemblyAI, Google Cloud, Azure Speech
- **Realtime Voice** - OpenAI Realtime API, Gemini Live API
- **Streaming Support** - Real-time audio streaming for both TTS and STT
- **Speaker Diarization** - Identify and separate speakers in transcriptions
- **Word-level Timestamps** - Precise timing for each word in transcriptions
- **Voice Customization** - Speed, pitch, emotions, and style control
- **Unified CLI Commands** - Simple command-line interface for all voice operations

---

## Quick Start

### CLI Usage

```bash
# Text-to-Speech (TTS)
neurolink voice synthesize "Hello, welcome to NeuroLink!" --provider elevenlabs --output hello.mp3

# Speech-to-Text (STT)
neurolink voice transcribe audio.mp3 --provider whisper --output transcript.json

# List available providers
neurolink voice providers
```

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { VoiceFactory, VoiceRegistry } from "@juspay/neurolink/voice";

// Initialize voice providers
await VoiceRegistry.registerAllProviders();

// Create TTS provider
const tts = await VoiceFactory.createTTSProvider("elevenlabs");
const audio = await tts.synthesize("Hello, world!", { voice: "Rachel" });

// Create STT provider
const stt = await VoiceFactory.createSTTProvider("whisper");
const transcript = await stt.transcribe(audioBuffer, { language: "en" });
```

---

## Text-to-Speech (TTS) Providers

### Provider Comparison

| Provider       | Streaming | Max Text | Languages | Key Feature                   | Env Variable                              |
| -------------- | --------- | -------- | --------- | ----------------------------- | ----------------------------------------- |
| **google-tts** | No        | 5,000    | 50+       | Neural/WaveNet voices         | `GOOGLE_APPLICATION_CREDENTIALS`          |
| **elevenlabs** | Yes       | 5,000    | 29        | Ultra-realistic voices        | `ELEVENLABS_API_KEY`                      |
| **openai-tts** | No        | 4,096    | 50+       | Alloy/Nova/Shimmer voices     | `OPENAI_API_KEY`                          |
| **azure-tts**  | Yes       | 10,000   | 140+      | SSML support, emotions        | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |
| **sarvam**     | No        | 5,000    | 12 Indian | Indian language specialist    | `SARVAM_API_KEY`                          |
| **murf**       | No        | 10,000   | 20+       | Voice styles and emotions     | `MURF_API_KEY`                            |
| **playai**     | Yes       | 5,000    | 40+       | Ultra-realistic, emotions     | `PLAYAI_API_KEY`, `PLAYAI_USER_ID`        |
| **speechify**  | Yes       | 50,000   | 30+       | Long-form content, audiobooks | `SPEECHIFY_API_KEY`                       |

### Google Cloud TTS

Google's Text-to-Speech with Neural2 and WaveNet voices.

```bash
# CLI
neurolink voice synthesize "Hello world" --provider google-tts --voice en-US-Neural2-C

# Environment
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("google-tts");
const result = await tts.synthesize("Hello world", {
  voice: "en-US-Neural2-C",
  format: "mp3",
  speed: 1.0,
});
```

### ElevenLabs

Ultra-realistic AI voices with emotion and style control.

```bash
# CLI
neurolink voice synthesize "Welcome to ElevenLabs" --provider elevenlabs --voice Rachel

# Environment
export ELEVENLABS_API_KEY="your-api-key"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("elevenlabs");
const result = await tts.synthesize("Welcome to ElevenLabs", {
  voice: "Rachel",
  format: "mp3",
  stability: 0.5,
  similarityBoost: 0.75,
});

// Streaming
for await (const chunk of tts.synthesizeStream!("Long text...", options)) {
  // Process audio chunks in real-time
}
```

### OpenAI TTS

OpenAI's text-to-speech with voices like Alloy, Echo, Nova.

```bash
# CLI
neurolink voice synthesize "Hello from OpenAI" --provider openai-tts --voice nova

# Environment
export OPENAI_API_KEY="your-api-key"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("openai-tts");
const result = await tts.synthesize("Hello from OpenAI", {
  voice: "nova",
  format: "mp3",
  speed: 1.0,
});
```

### Azure Speech TTS

Microsoft Azure Speech Services with SSML support.

```bash
# CLI
neurolink voice synthesize "Hello from Azure" --provider azure-tts --voice en-US-JennyNeural

# Environment
export AZURE_SPEECH_KEY="your-speech-key"
export AZURE_SPEECH_REGION="eastus"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("azure-tts");
const result = await tts.synthesize("Hello from Azure", {
  voice: "en-US-JennyNeural",
  format: "mp3",
  style: "cheerful",
  styleDegree: 1.5,
});
```

### Sarvam AI TTS

Specialized for Indian languages with natural pronunciation.

```bash
# CLI
neurolink voice synthesize "नमस्ते" --provider sarvam --voice hi-IN-female-1

# Environment
export SARVAM_API_KEY="your-api-key"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("sarvam");
const result = await tts.synthesize("नमस्ते, आप कैसे हैं?", {
  voice: "hi-IN-female-1",
  format: "wav",
  speed: 1.0,
});
```

### Murf.ai TTS

Professional voice-over with styles and emotions.

```bash
# CLI
neurolink voice synthesize "Professional narration" --provider murf --voice en-US-Marcus

# Environment
export MURF_API_KEY="your-api-key"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("murf");
const result = await tts.synthesize("Professional narration here", {
  voice: "en-US-Marcus",
  format: "mp3",
  style: "Conversational",
  emotion: "Happy",
});
```

### Play.ai TTS

Ultra-realistic voices with emotion control.

```bash
# CLI
neurolink voice synthesize "Natural conversation" --provider playai --voice jennifer

# Environment
export PLAYAI_API_KEY="your-api-key"
export PLAYAI_USER_ID="your-user-id"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("playai");
const result = await tts.synthesize("Natural conversation here", {
  voice: "jennifer",
  format: "mp3",
  emotion: "happy",
  speed: 1.0,
});
```

### Speechify TTS

Optimized for long-form content and audiobooks.

```bash
# CLI
neurolink voice synthesize "Long article text..." --provider speechify --voice george

# Environment
export SPEECHIFY_API_KEY="your-api-key"
```

```typescript
// SDK
const tts = await VoiceFactory.createTTSProvider("speechify");
const result = await tts.synthesize(longArticleText, {
  voice: "george",
  format: "mp3",
  speed: 1.2, // Slightly faster for audiobooks
});
```

---

## Speech-to-Text (STT) Providers

### Provider Comparison

| Provider       | Streaming | Diarization | Languages | Key Feature                     | Env Variable                              |
| -------------- | --------- | ----------- | --------- | ------------------------------- | ----------------------------------------- |
| **deepgram**   | Yes       | Yes         | 36+       | Fast, real-time streaming       | `DEEPGRAM_API_KEY`                        |
| **whisper**    | No        | No          | 99        | Multilingual, high accuracy     | `OPENAI_API_KEY`                          |
| **gladia**     | Yes       | Yes         | 99        | Translation, entity detection   | `GLADIA_API_KEY`                          |
| **assemblyai** | Yes       | Yes         | 99        | AI features, summarization      | `ASSEMBLYAI_API_KEY`                      |
| **google-stt** | Yes       | Yes         | 125+      | Enterprise-grade, custom models | `GOOGLE_APPLICATION_CREDENTIALS`          |
| **azure-stt**  | Yes       | Yes         | 100+      | Custom speech, pronunciation    | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |

### Deepgram STT

Fast, real-time speech recognition with Nova model.

```bash
# CLI
neurolink voice transcribe audio.mp3 --provider deepgram --diarization

# Environment
export DEEPGRAM_API_KEY="your-api-key"
```

```typescript
// SDK
const stt = await VoiceFactory.createSTTProvider("deepgram");
const result = await stt.transcribe(audioBuffer, {
  language: "en",
  diarization: true,
  model: "nova-2",
  punctuate: true,
});

console.log(result.text);
console.log(`Speakers: ${result.metadata.speakerCount}`);
```

### OpenAI Whisper STT

OpenAI's Whisper model for multilingual transcription.

```bash
# CLI
neurolink voice transcribe audio.mp3 --provider whisper --language en

# Environment
export OPENAI_API_KEY="your-api-key"
```

```typescript
// SDK
const stt = await VoiceFactory.createSTTProvider("whisper");
const result = await stt.transcribe(audioBuffer, {
  language: "en",
  format: "mp3",
  model: "whisper-1",
});

console.log(result.text);
console.log(`Duration: ${result.duration}s`);
```

### Gladia STT

Advanced transcription with translation and entity detection.

```bash
# CLI
neurolink voice transcribe audio.mp3 --provider gladia --diarization --word-timestamps

# Environment
export GLADIA_API_KEY="your-api-key"
```

```typescript
// SDK
const stt = await VoiceFactory.createSTTProvider("gladia");
const result = await stt.transcribe(audioBuffer, {
  diarization: true,
  wordTimestamps: true,
  translation: { targetLanguage: "es" },
});

console.log(result.text);
for (const segment of result.segments) {
  console.log(
    `[${segment.start}s - ${segment.end}s] ${segment.speaker}: ${segment.text}`,
  );
}
```

### AssemblyAI STT

AI-powered transcription with summarization and sentiment analysis.

```bash
# CLI
neurolink voice transcribe audio.mp3 --provider assemblyai --diarization

# Environment
export ASSEMBLYAI_API_KEY="your-api-key"
```

```typescript
// SDK
const stt = await VoiceFactory.createSTTProvider("assemblyai");
const result = await stt.transcribe(audioBuffer, {
  language: "en",
  diarization: true,
  wordTimestamps: true,
  summarization: true,
  sentimentAnalysis: true,
  entityDetection: true,
});

console.log(result.text);
console.log(`Summary: ${result.metadata.summary}`);
console.log(`Sentiment: ${result.metadata.sentiment}`);
```

### Google Cloud STT

Google's enterprise-grade speech recognition.

```bash
# CLI
neurolink voice transcribe audio.mp3 --provider google-stt --diarization

# Environment
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

```typescript
// SDK
const stt = await VoiceFactory.createSTTProvider("google-stt");
const result = await stt.transcribe(audioBuffer, {
  language: "en-US",
  diarization: true,
  model: "latest_long", // or "phone_call", "video", "command_and_search"
  enableAutomaticPunctuation: true,
});

console.log(result.text);
```

### Azure Speech STT

Microsoft Azure Speech Services for transcription.

```bash
# CLI
neurolink voice transcribe audio.mp3 --provider azure-stt --diarization

# Environment
export AZURE_SPEECH_KEY="your-speech-key"
export AZURE_SPEECH_REGION="eastus"
```

```typescript
// SDK
const stt = await VoiceFactory.createSTTProvider("azure-stt");
const result = await stt.transcribe(audioBuffer, {
  language: "en-US",
  diarization: true,
  recognitionMode: "conversation", // or "dictation", "interactive"
});

console.log(result.text);
```

---

## Realtime Voice Providers

### OpenAI Realtime API

Full-duplex voice conversations with GPT-4.

```typescript
import { VoiceFactory } from "@juspay/neurolink/voice";

const realtime = await VoiceFactory.createRealtimeProvider("openai-realtime");

// Connect to realtime session
const session = await realtime.connect({
  model: "gpt-4o-realtime-preview",
  voice: "alloy",
  instructions: "You are a helpful assistant.",
});

// Handle events
session.on("audio", (audioData) => {
  // Play audio response
});

session.on("text", (text) => {
  console.log("Assistant:", text);
});

// Send audio input
await session.sendAudio(microphoneBuffer);

// Disconnect
await realtime.disconnect();
```

### Gemini Live API

Google's realtime voice API.

```typescript
import { VoiceFactory } from "@juspay/neurolink/voice";

const realtime = await VoiceFactory.createRealtimeProvider("gemini-live");

const session = await realtime.connect({
  model: "gemini-2.0-flash-exp",
  voice: "Puck",
  systemInstruction: "You are a helpful assistant.",
});

// Handle events
session.on("audio", (audioData) => {
  // Play audio response
});

// Send audio
await session.sendAudio(audioBuffer);
```

---

## CLI Reference

### Voice Synthesize Command

```bash
neurolink voice synthesize <text> [options]

Options:
  -p, --provider   TTS provider to use (default: google-tts)
  -v, --voice      Voice ID to use
  -o, --output     Output file path
  -f, --format     Audio format: mp3, wav, ogg, opus (default: mp3)
  -s, --speed      Speaking rate 0.25-4.0 (default: 1.0)
  --pitch          Voice pitch adjustment
  --play           Play audio after synthesis

Examples:
  neurolink voice synthesize "Hello world" --provider elevenlabs --voice Rachel
  neurolink voice synthesize "Welcome" --output welcome.mp3 --format wav
  neurolink voice synthesize "Test" --speed 1.5 --play
```

### Voice Transcribe Command

```bash
neurolink voice transcribe <file> [options]

Options:
  -p, --provider        STT provider to use (default: whisper)
  -l, --language        Audio language code (e.g., en-US)
  -f, --format          Audio format (auto-detected from extension)
  -d, --diarization     Enable speaker diarization
  -w, --word-timestamps Enable word-level timestamps
  -o, --output          Output JSON file path

Examples:
  neurolink voice transcribe meeting.mp3 --provider deepgram --diarization
  neurolink voice transcribe audio.wav --provider whisper --language en
  neurolink voice transcribe podcast.mp3 --word-timestamps --output transcript.json
```

### Voice Providers Command

```bash
neurolink voice providers [options]

Options:
  -t, --type    Filter by type: tts, stt, realtime, all (default: all)

Examples:
  neurolink voice providers
  neurolink voice providers --type tts
  neurolink voice providers --type stt
```

---

## Environment Variables Reference

### TTS Provider Environment Variables

| Provider   | Required Variables                        | Optional Variables      |
| ---------- | ----------------------------------------- | ----------------------- |
| google-tts | `GOOGLE_APPLICATION_CREDENTIALS`          | `GOOGLE_PROJECT_ID`     |
| elevenlabs | `ELEVENLABS_API_KEY`                      | `ELEVENLABS_MODEL_ID`   |
| openai-tts | `OPENAI_API_KEY`                          | `OPENAI_ORG_ID`         |
| azure-tts  | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | `AZURE_SPEECH_ENDPOINT` |
| sarvam     | `SARVAM_API_KEY`                          | -                       |
| murf       | `MURF_API_KEY`                            | -                       |
| playai     | `PLAYAI_API_KEY`, `PLAYAI_USER_ID`        | -                       |
| speechify  | `SPEECHIFY_API_KEY`                       | -                       |

### STT Provider Environment Variables

| Provider   | Required Variables                        | Optional Variables      |
| ---------- | ----------------------------------------- | ----------------------- |
| deepgram   | `DEEPGRAM_API_KEY`                        | -                       |
| whisper    | `OPENAI_API_KEY`                          | `OPENAI_ORG_ID`         |
| gladia     | `GLADIA_API_KEY`                          | -                       |
| assemblyai | `ASSEMBLYAI_API_KEY`                      | -                       |
| google-stt | `GOOGLE_APPLICATION_CREDENTIALS`          | `GOOGLE_PROJECT_ID`     |
| azure-stt  | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | `AZURE_SPEECH_ENDPOINT` |

### Realtime Provider Environment Variables

| Provider        | Required Variables                                      |
| --------------- | ------------------------------------------------------- |
| openai-realtime | `OPENAI_API_KEY`                                        |
| gemini-live     | `GOOGLE_AI_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` |

---

## Error Handling

### TTS Errors

```typescript
import { TTSError, TTS_ERROR_CODES } from "@juspay/neurolink/voice";

try {
  const result = await tts.synthesize(text, options);
} catch (error) {
  if (error instanceof TTSError) {
    switch (error.code) {
      case TTS_ERROR_CODES.AUTHENTICATION_ERROR:
        console.error("Invalid API key");
        break;
      case TTS_ERROR_CODES.VOICE_NOT_FOUND:
        console.error("Voice not available");
        break;
      case TTS_ERROR_CODES.TEXT_TOO_LONG:
        console.error("Text exceeds maximum length");
        break;
      case TTS_ERROR_CODES.RATE_LIMIT_ERROR:
        console.error("Rate limit exceeded, retry later");
        break;
    }
  }
}
```

### STT Errors

```typescript
import { STTError, STT_ERROR_CODES } from "@juspay/neurolink/voice";

try {
  const result = await stt.transcribe(audio, options);
} catch (error) {
  if (error instanceof STTError) {
    switch (error.code) {
      case STT_ERROR_CODES.AUTHENTICATION_ERROR:
        console.error("Invalid API key");
        break;
      case STT_ERROR_CODES.UNSUPPORTED_FORMAT:
        console.error("Audio format not supported");
        break;
      case STT_ERROR_CODES.AUDIO_TOO_LONG:
        console.error("Audio exceeds maximum duration");
        break;
      case STT_ERROR_CODES.TRANSCRIPTION_FAILED:
        console.error("Transcription failed");
        break;
    }
  }
}
```

---

## Best Practices

### Choosing a TTS Provider

1. **For ultra-realistic voices**: ElevenLabs, Play.ai
2. **For long-form content**: Speechify (50K char limit)
3. **For Indian languages**: Sarvam AI
4. **For professional voice-over**: Murf.ai
5. **For production reliability**: Google TTS, Azure TTS
6. **For simplicity**: OpenAI TTS

### Choosing an STT Provider

1. **For real-time streaming**: Deepgram, Google Cloud STT
2. **For multilingual support**: Whisper, Gladia
3. **For AI features (summary, sentiment)**: AssemblyAI
4. **For speaker diarization**: Deepgram, AssemblyAI, Google Cloud STT
5. **For enterprise**: Google Cloud STT, Azure Speech

### Performance Optimization

```typescript
// Use streaming for long text
for await (const chunk of tts.synthesizeStream!(longText, options)) {
  // Stream to audio player immediately
  audioPlayer.appendBuffer(chunk.data);
}

// Use appropriate model for audio length
const options = {
  model: audioDuration > 60 ? "latest_long" : "latest_short",
};

// Enable only needed features
const sttOptions = {
  diarization: needsSpeakerIdentification,
  wordTimestamps: needsPreciseTiming,
  // Don't enable features you don't need
};
```

---

## Implementation Status

### TTS Providers (8/8 Complete)

| Provider   | Status   | Features                                     |
| ---------- | -------- | -------------------------------------------- |
| google-tts | Complete | Neural2, WaveNet, Standard voices            |
| elevenlabs | Complete | Streaming, voice cloning, emotions           |
| openai-tts | Complete | alloy, echo, fable, onyx, nova, shimmer      |
| azure-tts  | Complete | SSML, styles, emotions, streaming            |
| sarvam     | Complete | 12 Indian languages                          |
| murf       | Complete | Voice styles, emotions, professional quality |
| playai     | Complete | Streaming, emotions, ultra-realistic         |
| speechify  | Complete | Long-form, audiobooks, 50K char limit        |

### STT Providers (6/6 Complete)

| Provider   | Status   | Features                                      |
| ---------- | -------- | --------------------------------------------- |
| deepgram   | Complete | Nova-2, streaming, diarization                |
| whisper    | Complete | Whisper-1, 99 languages                       |
| gladia     | Complete | Streaming, translation, entity detection      |
| assemblyai | Complete | Streaming, summarization, sentiment, entities |
| google-stt | Complete | Streaming, diarization, custom models         |
| azure-stt  | Complete | Streaming, diarization, pronunciation         |

### Realtime Providers (2/2 Complete)

| Provider        | Status   | Features                              |
| --------------- | -------- | ------------------------------------- |
| openai-realtime | Complete | Full-duplex, GPT-4o, function calling |
| gemini-live     | Complete | Full-duplex, Gemini 2.0               |

### CLI Commands (3/3 Complete)

| Command                   | Status   | Description                  |
| ------------------------- | -------- | ---------------------------- |
| `voice synthesize <text>` | Complete | Text-to-speech synthesis     |
| `voice transcribe <file>` | Complete | Speech-to-text transcription |
| `voice providers`         | Complete | List available providers     |

---

## Related Documentation

- [Text-to-Speech Guide](./tts.md) - Detailed TTS documentation
- [Audio Input Guide](./audio-input.md) - Working with audio files
- [Real-time Speech Agents](../real-time-speech-agents.md) - Building voice agents
- [CLI Reference](../cli/commands.md) - Complete CLI documentation
