---
title: Text-to-Speech (TTS) Integration Guide
description: Complete guide to NeuroLink's TTS capabilities for generating high-quality audio from text and AI responses
keywords: tts, text-to-speech, audio, voice, speech synthesis, google cloud tts, audio generation
---

# Text-to-Speech (TTS) Integration Guide

NeuroLink provides integrated Text-to-Speech (TTS) capabilities, allowing you to generate high-quality audio from text prompts or AI-generated responses. This feature is perfect for voice assistants, accessibility features, narration, podcasts, and more.

## Overview

**Key Features:**

- **High-quality voices** - Neural, Wavenet, and Standard voice types
- **Multiple languages** - 50+ voices across 10+ languages
- **Flexible audio formats** - MP3, WAV, OGG/Opus
- **Voice customization** - Adjust speed, pitch, and volume
- **Two synthesis modes** - Direct text-to-speech OR AI response synthesis
- **Production-ready** - Google Cloud TTS integration

---

## Quick Start

### Installation

TTS support is built into NeuroLink. No additional installation required.

### Environment Setup

TTS requires Google Cloud credentials:

```bash
# Option 1: Service account (recommended for production)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Option 2: API key (simpler for development)
export GOOGLE_AI_API_KEY="your-api-key"
```

**API Key Configuration:**

If using API key authentication, enable both APIs in Google Cloud Console:

1. Navigate to "APIs & Services" > "Credentials"
2. Create or select your API key
3. Under "API restrictions", enable:
   - **Generative Language API** (for Gemini)
   - **Cloud Text-to-Speech API** (for TTS)

### Basic Usage

**CLI:**

```bash
# Generate and play audio automatically
neurolink generate "Hello, world!" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C

# Save to file
neurolink generate "Welcome to our application" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C \
  --tts-output welcome.mp3
```

**SDK:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Hello, world!" },
  provider: "google-ai",
  tts: {
    enabled: true,
    voice: "en-US-Neural2-C",
    format: "mp3",
    play: true, // Auto-play in CLI, manual in SDK
  },
});

// Access generated audio
console.log("Audio size:", result.tts?.size, "bytes");
console.log("Audio format:", result.tts?.format);
```

---

## Supported Providers

TTS is currently available through Google Cloud Text-to-Speech API:

| Provider      | Authentication                                     | Voices     | Notes                                |
| ------------- | -------------------------------------------------- | ---------- | ------------------------------------ |
| **google-ai** | API Key (`GOOGLE_AI_API_KEY`)                      | 50+ voices | Simplest setup, good for development |
| **vertex**    | Service Account (`GOOGLE_APPLICATION_CREDENTIALS`) | 50+ voices | Recommended for production           |

**Planned for future releases:**

- OpenAI TTS (GPT-4 voices: alloy, echo, fable, onyx, nova, shimmer)
- Azure Speech Services
- AWS Polly

---

## Voice Selection

### Available Voice Types

Google Cloud TTS offers three voice quality tiers:

| Voice Type   | Quality | Cost   | Use Case                                | Example Voice      |
| ------------ | ------- | ------ | --------------------------------------- | ------------------ |
| **Neural2**  | Highest | High   | Natural conversations, voice assistants | `en-US-Neural2-C`  |
| **Wavenet**  | High    | Medium | Professional narration, podcasts        | `en-US-Wavenet-D`  |
| **Standard** | Good    | Low    | Cost optimization, bulk generation      | `en-US-Standard-B` |

### Voice Discovery

Voice identifiers follow Google Cloud TTS naming conventions: `<language>-<variant>-<type>-<name>` (e.g., `en-US-Neural2-C`, `en-GB-Wavenet-D`).

Refer to the [Google Cloud TTS voice list](https://cloud.google.com/text-to-speech/docs/voices) for all available voices.

### Supported Languages

**English Variants:**

- `en-US` - United States English
- `en-GB` - British English
- `en-AU` - Australian English
- `en-IN` - Indian English

**Other Languages:**

- `es-ES`, `es-US` - Spanish (Spain, Latin America)
- `fr-FR`, `fr-CA` - French (France, Canada)
- `de-DE` - German
- `ja-JP` - Japanese
- `hi-IN` - Hindi
- `zh-CN`, `zh-TW` - Chinese (Simplified, Traditional)
- `pt-BR`, `pt-PT` - Portuguese (Brazil, Portugal)
- `it-IT` - Italian
- `ko-KR` - Korean
- `ru-RU` - Russian

### Voice Selection Guidelines

**For Natural Conversations:**

```typescript
tts: {
  voice: "en-US-Neural2-C",  // Female, natural
  // OR
  voice: "en-US-Neural2-A",  // Male, natural
}
```

**For Professional Narration:**

```typescript
tts: {
  voice: "en-US-Wavenet-D",  // Male, professional
  // OR
  voice: "en-GB-Wavenet-A",  // British, professional
}
```

**For Cost Optimization:**

```typescript
tts: {
  voice: "en-US-Standard-B",  // Lower cost
}
```

---

## TTS Synthesis Modes

NeuroLink supports two TTS synthesis modes:

### Mode 1: Direct Text-to-Speech (Default)

Converts input text directly to speech **without** AI generation.

```typescript
const result = await neurolink.generate({
  input: { text: "Welcome to our service!" },
  provider: "google-ai",
  tts: {
    enabled: true,
    useAiResponse: false, // Default: synthesize input text
    voice: "en-US-Neural2-C",
  },
});

// Audio contains: "Welcome to our service!"
// No AI generation occurs
```

**Use cases:**

- Pre-written scripts
- System notifications
- Fixed announcements
- Voice confirmations

### Mode 2: AI Response Synthesis

Generates AI response first, then converts the response to speech.

```typescript
const result = await neurolink.generate({
  input: { text: "Tell me a joke" },
  provider: "google-ai",
  tts: {
    enabled: true,
    useAiResponse: true, // Synthesize AI's response
    voice: "en-US-Neural2-C",
  },
});

// AI generates joke text
// TTS synthesizes the joke audio
// Both text and audio available in result
```

**Use cases:**

- Voice assistants
- Interactive AI conversations
- Dynamic content narration
- AI-powered podcasts

---

## Audio Format Options

### Supported Formats

| Format       | Quality | File Size            | Platform Support | Use Case                       |
| ------------ | ------- | -------------------- | ---------------- | ------------------------------ |
| **MP3**      | Good    | Small (~100 KB/min)  | All platforms    | Default, balanced quality/size |
| **WAV**      | Best    | Large (~1 MB/min)    | All platforms    | Highest quality, editing       |
| **OGG/Opus** | Good    | Medium (~150 KB/min) | macOS, Linux     | Web streaming                  |

### Format Selection

```typescript
// Default: MP3 (balanced quality and size)
tts: {
  voice: "en-US-Neural2-C",
  format: "mp3"  // Default
}

// Best quality: WAV
tts: {
  voice: "en-US-Neural2-C",
  format: "wav"
}

// Web streaming: OGG
tts: {
  voice: "en-US-Neural2-C",
  format: "ogg"
}
```

### Platform-Specific Considerations

**Windows:**

- Built-in playback only supports WAV format
- Auto-converts to WAV when `play: true` on Windows
- Use MP3 for file output, WAV for immediate playback

**macOS/Linux:**

- All formats supported
- `afplay` (macOS) and `ffplay` (Linux) handle all formats
- Use MP3 for general purpose

---

## Voice Customization

### Speaking Rate

Control speech speed (0.25 to 4.0):

```typescript
// Slower (half speed)
tts: {
  voice: "en-US-Neural2-C",
  speed: 0.5
}

// Normal speed (default)
tts: {
  voice: "en-US-Neural2-C",
  speed: 1.0  // Default
}

// Faster (double speed)
tts: {
  voice: "en-US-Neural2-C",
  speed: 2.0
}
```

**CLI:**

```bash
neurolink generate "This is faster speech" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C \
  --tts-speed 1.5
```

### Pitch Adjustment

Adjust voice pitch (-20.0 to 20.0 semitones):

```typescript
// Lower pitch (deeper voice)
tts: {
  voice: "en-US-Neural2-C",
  pitch: -5.0
}

// Normal pitch (default)
tts: {
  voice: "en-US-Neural2-C",
  pitch: 0.0  // Default
}

// Higher pitch
tts: {
  voice: "en-US-Neural2-C",
  pitch: 5.0
}
```

**CLI:**

```bash
neurolink generate "Higher pitch test" \
  --provider google-ai \
  --tts-voice en-US-Neural2-C \
  --tts-pitch 3.0
```

### Volume Adjustment

Control output volume (-96.0 to 16.0 dB):

```typescript
tts: {
  voice: "en-US-Neural2-C",
  volumeGainDb: 0.0  // Default (no change)
}
```

---

## Complete Configuration Reference

### SDK Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Your text here" },
  provider: "google-ai", // or "vertex"
  tts: {
    enabled: true, // Enable TTS output
    useAiResponse: false, // false = input text, true = AI response
    voice: "en-US-Neural2-C", // Voice identifier
    format: "mp3", // Audio format: "mp3" | "wav" | "ogg"
    speed: 1.0, // Speaking rate: 0.25-4.0
    pitch: 0.0, // Pitch adjustment: -20.0 to 20.0
    volumeGainDb: 0.0, // Volume: -96.0 to 16.0
    quality: "standard", // Quality: "standard" | "hd"
    output: "./audio.mp3", // Optional file path
    play: false, // Auto-play (CLI only)
  },
});

// Access results
console.log("Text:", result.content);
console.log("Audio size:", result.tts?.size, "bytes");
console.log("Audio format:", result.tts?.format);
console.log("Voice used:", result.tts?.voice);

// Save audio to file
if (result.tts?.buffer) {
  import { writeFileSync } from "fs";
  writeFileSync("output.mp3", result.tts.buffer);
}
```

### CLI Flags

```bash
neurolink generate "Your text" \
  --provider google-ai \
  --tts-voice <voice-id> \      # Required to enable TTS
  --tts-format <format> \        # mp3|wav|ogg (default: mp3)
  --tts-speed <rate> \           # 0.25-4.0 (default: 1.0)
  --tts-pitch <pitch> \          # -20.0 to 20.0 (default: 0.0)
  --tts-output <file> \          # Save to file
  --tts-use-ai-response          # Synthesize AI response instead of input
```

---

## Use Cases & Examples

### 1. Voice Assistant

Create a voice assistant that speaks responses:

```typescript
const assistant = new NeuroLink();

const response = await assistant.generate({
  input: { text: "What's the weather like today?" },
  provider: "google-ai",
  tts: {
    enabled: true,
    useAiResponse: true, // Speak AI's weather response
    voice: "en-US-Neural2-C",
    play: true,
  },
});

// AI generates weather info and speaks it
```

### 2. Accessibility Features

Screen reader-style narration for visually impaired users:

```typescript
const narration = await neurolink.generate({
  input: { text: "Button clicked. Navigation menu opened." },
  provider: "google-ai",
  tts: {
    enabled: true,
    voice: "en-US-Neural2-C",
    speed: 1.2, // Slightly faster for efficiency
    play: true,
  },
});
```

### 3. Podcast Generation

Generate professional podcast intros:

```bash
neurolink generate "Welcome to Tech Insights Podcast, episode 42. Today we're discussing the future of AI development." \
  --provider google-ai \
  --tts-voice en-US-Wavenet-D \
  --tts-speed 0.95 \
  --tts-format mp3 \
  --tts-output podcast-intro.mp3
```

### 4. Language Learning

Slow pronunciation for language learners:

```bash
# Slow French pronunciation
neurolink generate "Je m'appelle Claude. Comment allez-vous?" \
  --provider google-ai \
  --tts-voice fr-FR-Neural2-A \
  --tts-speed 0.7 \
  --tts-output french-slow.mp3

# Normal speed for comparison
neurolink generate "Je m'appelle Claude. Comment allez-vous?" \
  --provider google-ai \
  --tts-voice fr-FR-Neural2-A \
  --tts-speed 1.0 \
  --tts-output french-normal.mp3
```

### 5. Multilingual Support

Generate audio in multiple languages:

```typescript
const translations = {
  english: {
    text: "Hello, welcome to our application.",
    voice: "en-US-Neural2-C",
  },
  french: {
    text: "Bonjour, bienvenue dans notre application.",
    voice: "fr-FR-Wavenet-A",
  },
  spanish: {
    text: "Hola, bienvenido a nuestra aplicación.",
    voice: "es-ES-Neural2-A",
  },
  hindi: {
    text: "नमस्ते, हमारे एप्लिकेशन में आपका स्वागत है।",
    voice: "hi-IN-Wavenet-A",
  },
};

for (const [lang, config] of Object.entries(translations)) {
  const result = await neurolink.generate({
    input: { text: config.text },
    provider: "google-ai",
    tts: {
      enabled: true,
      voice: config.voice,
      format: "mp3",
      output: `welcome-${lang}.mp3`,
    },
  });
  console.log(`Generated ${lang} audio (${result.tts?.size} bytes)`);
}
```

### 6. Batch Audio Generation

Generate multiple audio files efficiently:

```typescript
async function generateBatchAudio(
  texts: string[],
  voice: string = "en-US-Neural2-C",
) {
  const results = [];

  for (const text of texts) {
    const result = await neurolink.generate({
      input: { text },
      provider: "google-ai",
      tts: {
        enabled: true,
        voice,
        format: "mp3",
      },
    });

    results.push({
      text,
      audioBuffer: result.tts?.buffer,
      audioSize: result.tts?.size,
    });
  }

  return results;
}

// Usage
const audioFiles = await generateBatchAudio([
  "Welcome to our application.",
  "Please enter your username and password.",
  "Login successful. Redirecting to dashboard.",
]);

// Save all files
audioFiles.forEach((item, index) => {
  if (item.audioBuffer) {
    writeFileSync(`audio-${index}.mp3`, item.audioBuffer);
  }
});
```

### 7. Streaming Text + Audio

Stream AI-generated text and convert to audio:

```typescript
async function streamAndSpeak(prompt: string, voice: string) {
  // Step 1: Stream AI response
  const streamResult = await neurolink.stream({
    input: { text: prompt },
    provider: "google-ai",
    model: "gemini-2.0-flash-exp",
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
      enabled: true,
      voice,
      play: true,
    },
  });

  return {
    text: fullText,
    audio: ttsResult.tts,
  };
}

// Usage
const result = await streamAndSpeak(
  "Explain quantum computing in simple terms",
  "en-US-Neural2-C",
);
```

---

## Error Handling

### Common Error Patterns

```typescript
async function generateTTSWithRetry(
  text: string,
  voice: string,
  maxRetries: number = 3,
) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await neurolink.generate({
        input: { text },
        provider: "google-ai",
        tts: {
          enabled: true,
          voice,
          format: "mp3",
        },
      });

      // Validate audio buffer
      if (!result.tts || result.tts.size === 0) {
        throw new Error("Empty audio buffer received");
      }

      return {
        success: true,
        audio: result.tts,
        attempt,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      // Don't retry on invalid input
      if (
        error.message.includes("invalid voice") ||
        error.message.includes("text too long")
      ) {
        break;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error occurred",
    attempts: maxRetries,
  };
}

// Usage
const result = await generateTTSWithRetry(
  "Generate this with retry logic",
  "en-US-Neural2-C",
);

if (result.success && result.audio) {
  console.log("Success!");
  writeFileSync("output.mp3", result.audio.buffer);
} else {
  console.error("Failed:", result.error);
}
```

---

## Troubleshooting

### Common Issues

| Issue                            | Cause                    | Solution                                                                                     |
| -------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| **"TTS client not initialized"** | Missing credentials      | Set `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_AI_API_KEY`                                  |
| **"Invalid voice name"**         | Voice ID not found       | Check the [Google Cloud TTS voice list](https://cloud.google.com/text-to-speech/docs/voices) |
| **"Text too long"**              | Input exceeds 5000 bytes | Split text into smaller chunks                                                               |
| **"Synthesis failed"**           | Network/API error        | Check network connection and credentials                                                     |
| **Audio doesn't play**           | Missing audio player     | Install `afplay` (macOS), `ffplay` (Linux), or use WAV on Windows                            |
| **Empty audio buffer**           | API returned no content  | Check API quota and retry                                                                    |

### Authentication Issues

**Service Account:**

```bash
# Verify credentials file exists
ls -la $GOOGLE_APPLICATION_CREDENTIALS

# Test authentication
gcloud auth application-default login
```

**API Key:**

```bash
# Verify API key is set
echo $GOOGLE_AI_API_KEY
```

### Audio Playback Issues

**macOS:**

- `afplay` is pre-installed, supports all formats
- If playback fails, check system volume settings

**Linux:**

- Install `ffmpeg` for full format support: `sudo apt install ffmpeg`
- Alternative: Use `aplay` for WAV files only

**Windows:**

- Built-in playback only supports WAV
- Install VLC or Windows Media Player for other formats
- SDK auto-converts to WAV when `play: true` on Windows

---

## Best Practices

### Performance Optimization

1. **Cache voices** - Voice list is cached for 5 minutes
2. **Batch processing** - Group multiple TTS requests when possible
3. **Use appropriate quality** - Standard voices are faster and cheaper
4. **Optimize text length** - Keep under 5000 bytes per request

### Production Deployment

1. **Use service accounts** - More secure than API keys
2. **Implement retry logic** - Handle transient network failures
3. **Monitor quota usage** - Track Google Cloud TTS API usage
4. **Set appropriate timeouts** - Default is 30 seconds
5. **Handle errors gracefully** - Provide fallback behavior

### Voice Selection

1. **Test before deploying** - Different voices suit different use cases
2. **Match gender to persona** - Choose appropriate gender for your application
3. **Consider language variants** - `en-US` vs `en-GB` vs `en-IN`
4. **Use Neural2 for quality** - Best natural-sounding voices

### Cost Management

1. **Use Standard voices** - For high-volume, non-critical use cases
2. **Cache generated audio** - Avoid regenerating the same content
3. **Monitor API usage** - Set budget alerts in Google Cloud Console

---

## Pricing

Google Cloud TTS pricing (as of 2026):

| Voice Type   | Price per 1M characters |
| ------------ | ----------------------- |
| **Neural2**  | $16.00                  |
| **Wavenet**  | $16.00                  |
| **Standard** | $4.00                   |

**Monthly free tier:** 1 million characters (Standard voices) or 1 million characters (Wavenet/Neural2 voices)

For detailed pricing, see [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing).

---

## Related Features

**Multimodal Capabilities:**

- [Multimodal Guide](multimodal.md) - Images, PDFs, CSV inputs
- [PDF Support](pdf-support.md) - Document processing
- [Video Generation](video-generation.md) - AI-powered video creation
- [PPT Generation](ppt-generation.md) - AI-powered PowerPoint presentations

**Advanced Features:**

- [Streaming](../advanced/streaming.md) - Stream AI responses in real-time
- [Provider Orchestration](provider-orchestration.md) - Multi-provider failover

**Documentation:**

- [CLI Commands](../cli/commands.md) - Complete CLI reference
- [SDK API Reference](../sdk/api-reference.md) - Full API documentation
- [Troubleshooting](../troubleshooting.md) - Extended error catalog

---

## Summary

NeuroLink's TTS integration provides:

✅ **High-quality voices** - Neural2, Wavenet, and Standard options
✅ **Multiple languages** - 50+ voices across 10+ languages
✅ **Flexible synthesis modes** - Direct text or AI response
✅ **Voice customization** - Speed, pitch, volume control
✅ **Production-ready** - Google Cloud TTS integration
✅ **Easy integration** - Works seamlessly with CLI and SDK

**Next Steps:**

1. Set up [Google Cloud credentials](#environment-setup)
2. Discover available [voices](#voice-discovery)
3. Try the [quick start examples](#quick-start)
4. Explore [use cases](#use-cases-examples) for your application
5. Check [troubleshooting](#troubleshooting) if needed
