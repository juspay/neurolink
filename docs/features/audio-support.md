# Audio File Support

NeuroLink provides real-time audio streaming capabilities through the **Gemini Live API** for bidirectional voice conversations. Stream audio input to AI models and receive audio responses in real-time.

## Overview

Audio support in NeuroLink enables **real-time, bidirectional audio streaming** through Google's Gemini Live API. The system:

1. **Accepts** PCM16LE audio frames via an async iterator
2. **Streams** audio to the Gemini Live WebSocket connection
3. **Returns** audio responses as PCM16LE chunks at 24kHz
4. **Supports** continuous voice conversations with low latency

**Key Difference from Text:** Unlike text generation which completes in a single request, audio streaming maintains an open WebSocket connection for real-time bidirectional communication.

> **⚠️ Important: Audio-Only Mode**
> When audio input is present, the system operates in **audio-only mode**. The `text` field in input is ignored, and the AI responds exclusively to the audio stream. Text and audio cannot be combined in the same request.

## Supported Formats

### Input Audio Format

| Property         | Value      | Description                            |
| ---------------- | ---------- | -------------------------------------- |
| **Encoding**     | `PCM16LE`  | 16-bit PCM, little-endian              |
| **Sample Rate**  | 16000 Hz   | Default; configurable via options      |
| **Channels**     | 1 (Mono)   | Only mono audio is supported           |
| **Frame Size**   | 20-60 ms   | Recommended frame duration for latency |

### Output Audio Format

| Property        | Value      | Description                           |
| --------------- | ---------- | ------------------------------------- |
| **Encoding**    | `PCM16LE`  | 16-bit PCM, little-endian             |
| **Sample Rate** | 24000 Hz   | Gemini Live output sample rate        |
| **Channels**    | 1 (Mono)   | Mono audio output                     |

## Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Create an async iterator that yields audio frames
// NOTE: You must implement audio capture using your preferred library
// (e.g., node-microphone, portaudio, naudiodon, web Audio API)
async function* createAudioStream(): AsyncIterable<Buffer> {
  // Example: Replace with your audio source implementation
  // Each yield should be a Buffer containing PCM16LE audio data
  
  // Placeholder: Replace audioSource with your audio capture implementation
  // Example libraries: node-microphone, naudiodon, portaudio
  const audioSource = getYourAudioSource(); // Implement this
  
  while (audioSource.hasMoreData()) {
    const frame = await audioSource.getNextFrame(); // PCM16LE Buffer
    yield frame;
  }
  
  // Yield empty buffer to request model response (flush signal)
  // NOTE: Stream continues after flush - this triggers the model to respond
  yield Buffer.alloc(0);
}

// Stream audio to AI and receive audio response
// NOTE: When audio input is present, this is AUDIO-ONLY mode.
// The text field is ignored - the AI responds to audio input only.
const result = await neurolink.stream({
  input: {
    text: "", // Ignored when audio is present (audio-only mode)
    audio: {
      frames: createAudioStream(),
      sampleRateHz: 16000,       // Default: 16000
      encoding: "PCM16LE",       // Default: "PCM16LE"
      channels: 1,               // Only mono supported
    },
  },
  provider: "google-ai",
});

// Process audio response chunks
for await (const chunk of result.stream) {
  if (chunk.type === "audio") {
    // chunk.audio contains:
    // - data: Buffer (PCM16LE audio data)
    // - sampleRateHz: 24000
    // - channels: 1
    // - encoding: "PCM16LE"
    playAudio(chunk.audio.data); // Play or save the audio
  } else if ("content" in chunk) {
    // Text content (if any)
    console.log(chunk.content);
  }
}
```

### Real-Time Voice Conversation Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NOTE: These audio functions are placeholders - implement using your preferred
// audio library such as: node-microphone, naudiodon, portaudio, or web Audio API

// Example microphone capture - implement with your audio library
async function* captureFromMicrophone(): AsyncIterable<Buffer> {
  // Replace with actual microphone implementation
  // Example: const microphone = new Microphone({ sampleRate: 16000, channels: 1 });
  const microphone = await openMicrophone({  // Implement this function
    sampleRate: 16000,
    channels: 1,
    encoding: "pcm16le",
  });

  try {
    for await (const chunk of microphone) {
      yield chunk;
    }
  } finally {
    microphone.close();
  }
}

// Start voice conversation
// NOTE: When audio is present, this is AUDIO-ONLY mode.
// The text field is ignored - the AI responds to your voice input only.
const result = await neurolink.stream({
  input: {
    text: "", // Ignored when audio is present (audio-only mode)
    audio: {
      frames: captureFromMicrophone(),
      sampleRateHz: 16000,
    },
  },
  provider: "google-ai",
  model: "gemini-2.5-flash-preview-native-audio-dialog",
});

// Play responses through speakers
// NOTE: Implement openSpeaker with your audio library (e.g., speaker, node-speaker, portaudio)
const speaker = await openSpeaker({  // Implement this function
  sampleRate: 24000,
  channels: 1,
  encoding: "pcm16le",
});

for await (const chunk of result.stream) {
  if (chunk.type === "audio") {
    speaker.write(chunk.audio.data);
  }
}
```

### CLI Usage

Audio streaming is primarily designed for SDK integration. The CLI provides basic support for debugging:

```bash
# Stream mode shows audio chunk indicators
neurolink stream "Respond with audio" --provider google-ai --debug

# Output shows [audio-chunk] markers in debug mode
```

> **Note:** Full audio playback in CLI requires additional audio libraries. For production audio applications, use the SDK with appropriate audio I/O libraries.

## API Reference

### StreamOptions (Audio Input)

```typescript
type StreamOptions = {
  input: {
    text: string;                    // Text prompt or context
    audio?: AudioInputSpec;          // Audio input specification
    // ... other input options
  };
  provider?: "google-ai";            // Currently only Google AI supports audio
  model?: string;                    // Audio-capable model
  // ... other options
};
```

### AudioInputSpec

```typescript
type AudioInputSpec = {
  frames: AsyncIterable<Buffer>;     // PCM16LE mono frames (20-60ms recommended)
  sampleRateHz?: number;             // Default: 16000
  encoding?: "PCM16LE";              // Only PCM16LE supported
  channels?: 1;                      // Only mono supported
};
```

### AudioChunk (Response)

```typescript
type AudioChunk = {
  data: Buffer;                      // PCM16LE audio data
  sampleRateHz: number;              // Typically 24000 for Gemini output
  channels: number;                  // 1 (mono)
  encoding: "PCM16LE";               // Encoding format
};
```

### StreamResult (Audio Response)

```typescript
type StreamResult = {
  stream: AsyncIterable<
    { content: string } |            // Text chunks
    { type: "audio"; audio: AudioChunk }  // Audio chunks
  >;
  provider?: string;
  model?: string;
  metadata?: {
    streamId?: string;
    startTime?: number;
    // ... other metadata
  };
};
```

## Configuration

### Environment Variables

| Variable                         | Description                          | Required |
| -------------------------------- | ------------------------------------ | -------- |
| `GOOGLE_AI_API_KEY`              | Google AI Studio API key             | Yes      |
| `GOOGLE_GENERATIVE_AI_API_KEY`   | Alternative API key name             | No       |
| `GOOGLE_VOICE_AI_MODEL`          | Override default audio model         | No       |

### Default Audio Model

The default audio model is `gemini-2.5-flash-preview-native-audio-dialog`. You can override this:

```typescript
// Via SDK option
const result = await neurolink.stream({
  input: { 
    text: "Hello",
    audio: { frames: audioStream },
  },
  provider: "google-ai",
  model: "gemini-2.5-flash-preview-native-audio-dialog",
});
```

```bash
# Via environment variable
export GOOGLE_VOICE_AI_MODEL=gemini-2.5-flash-preview-native-audio-dialog
```

## Provider Support

### Supported Providers

| Provider        | Audio Input | Audio Output | Status     | Notes                              |
| --------------- | ----------- | ------------ | ---------- | ---------------------------------- |
| **Google AI**   | ✅          | ✅           | Production | Via Gemini Live API                |

### Unsupported Providers

The following providers **do not currently support** audio streaming:

- OpenAI
- Anthropic
- AWS Bedrock
- Google Vertex AI
- Azure OpenAI
- Ollama
- Mistral
- Hugging Face
- LiteLLM
- SageMaker

> Audio support may be added to additional providers as their APIs support real-time audio streaming.

### Google AI Studio Configuration

```typescript
// Ensure API key is set
process.env.GOOGLE_AI_API_KEY = "your-api-key";

// Or use environment variable
// export GOOGLE_AI_API_KEY=AIza-your-key

const result = await neurolink.stream({
  input: {
    text: "Start a voice conversation",
    audio: { frames: audioStream },
  },
  provider: "google-ai",
});
```

## Language Support

The Gemini Live API supports multiple languages for voice conversations. Specify the language in your text prompt:

### Supported Languages (ISO 639-1)

| Code | Language            | Code | Language           |
| ---- | ------------------- | ---- | ------------------ |
| en   | English             | fr   | French             |
| es   | Spanish             | de   | German             |
| it   | Italian             | pt   | Portuguese         |
| nl   | Dutch               | pl   | Polish             |
| ru   | Russian             | ja   | Japanese           |
| ko   | Korean              | zh   | Chinese            |
| ar   | Arabic              | hi   | Hindi              |
| tr   | Turkish             | vi   | Vietnamese         |
| th   | Thai                | id   | Indonesian         |

### Language Example

```typescript
const result = await neurolink.stream({
  input: {
    text: "Respond in Spanish. You are a helpful voice assistant.",
    audio: { frames: audioStream },
  },
  provider: "google-ai",
});
```

## Voice Configuration

The Gemini Live API uses a fixed voice preset:

```typescript
// Voice is hardcoded to "Orus" and cannot be changed
// voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } }
```

> **Note:** Voice selection is currently hardcoded in the provider implementation. Custom voice configuration may be added in future SDK versions.

## Limitations

### Format Restrictions

- **Input encoding**: Only `PCM16LE` is supported
- **Channels**: Only mono (1 channel) audio is supported
- **Sample rate**: 16000 Hz recommended for input

### Provider Restrictions

- **Single provider**: Only Google AI (Gemini Live) supports audio streaming
- **API key required**: `GOOGLE_AI_API_KEY` must be set
- **Dependency required**: `@google/genai` package must be installed

### Technical Limitations

| Limitation               | Details                                          |
| ------------------------ | ------------------------------------------------ |
| **Max session duration** | Subject to Gemini Live API limits                |
| **Latency**              | Network-dependent; typically 200-500ms           |
| **Concurrent sessions**  | Limited by API quota                             |
| **Frame size**           | 20-60ms frames recommended for optimal latency   |

### Feature Limitations

- **Audio-only mode**: When audio input is present, text input is ignored; the AI responds only to audio
- **No text-to-speech conversion**: Audio output requires audio input
- **No transcription**: Audio is processed directly, not transcribed
- **No audio file input**: Only streaming audio via `AsyncIterable<Buffer>`
- **No audio recording**: SDK doesn't record audio; implement in your application
- **No text+audio combination**: Text and audio cannot be combined in the same request

## Troubleshooting

### Error: "Missing '@google/genai'"

**Problem:** The `@google/genai` package is not installed.

**Solution:**

```bash
# Install the required package
pnpm add @google/genai
# or
npm install @google/genai
```

### Error: "GOOGLE_AI_API_KEY environment variable is not set"

**Problem:** No API key configured for Google AI.

**Solution:**

```bash
# Set the environment variable
export GOOGLE_AI_API_KEY=AIza-your-api-key

# Or add to .env file
GOOGLE_AI_API_KEY=AIza-your-api-key
```

### Error: "Stream options must include either input.text or input.audio"

**Problem:** Neither text nor audio input was provided.

**Solution:**

```typescript
// Ensure you provide at least text or audio input
const result = await neurolink.stream({
  input: {
    text: "Hello", // Required if no audio
    // OR
    audio: { frames: audioStream }, // Required if no text
  },
});
```

### No Audio Output Received

**Problem:** Stream completes but no audio chunks are received.

**Possible causes and solutions:**

1. **API key invalid**: Verify your `GOOGLE_AI_API_KEY` is correct
2. **Model not available**: Try the default model `gemini-2.5-flash-preview-native-audio-dialog`
3. **Network issues**: Check your internet connection
4. **Audio format incorrect**: Ensure input is PCM16LE mono at 16000 Hz

```typescript
// Debug by checking stream events
for await (const chunk of result.stream) {
  console.log("Chunk type:", chunk.type || "text");
  if (chunk.type === "audio") {
    console.log("Audio bytes:", chunk.audio.data.length);
  }
}
```

### Audio Quality Issues

**Problem:** Audio output sounds distorted or choppy.

**Solutions:**

1. **Verify sample rate**: Output is 24000 Hz, not 16000 Hz
2. **Check buffer handling**: Don't drop or reorder audio chunks
3. **Frame size**: Use 20-60ms frames for input

```typescript
// Correct playback configuration
// NOTE: Implement openSpeaker with your audio library (e.g., speaker, node-speaker)
const speaker = await openSpeaker({
  sampleRate: 24000,  // Match Gemini output (24kHz, not 16kHz)
  channels: 1,
  encoding: "pcm16le",
});
```

### WebSocket Connection Failures

**Problem:** Connection closes unexpectedly.

**Solutions:**

1. **Check network stability**: Ensure stable internet connection
2. **Firewall rules**: Allow WebSocket connections to Google APIs
3. **Proxy configuration**: Configure proxy if behind corporate firewall

```bash
# For proxy environments
export HTTPS_PROXY=http://proxy.company.com:8080
```

## Cost Information

### Google AI Pricing

Audio streaming costs depend on:

- **Audio duration**: Billed per minute of audio processed
- **Model used**: Different models have different rates
- **API tier**: Free tier has limited quota

### Pricing

Pricing for audio streaming varies. Check the official [Google AI Pricing](https://ai.google.dev/pricing) page for current rates.

> **Note:** Google AI offers a free tier for development and testing. Review the official pricing documentation for accurate cost estimates before production deployment.

### Cost Optimization Tips

1. **Short sessions**: End sessions when conversation is complete
2. **Efficient framing**: Use optimal frame sizes (20-60ms)
3. **Monitor usage**: Track audio usage in your application
4. **Free tier**: Use Google AI free tier for development and testing

## Advanced Usage

### Handling Interruptions

The Gemini Live API supports interruption detection:

```typescript
for await (const chunk of result.stream) {
  if (chunk.type === "audio") {
    // Check for interruption flag in the underlying message
    // Interruptions are handled internally by the provider
    playAudio(chunk.audio.data);
  }
}
```

### Flush Control Signal

Send a zero-length buffer to request the model to respond (flush signal). The stream continues after the flush - this triggers the model to generate a response while keeping the session open:

```typescript
async function* audioWithFlush(): AsyncIterable<Buffer> {
  // Stream audio frames
  for (const frame of audioFrames) {
    yield frame;
  }
  
  // Request model to respond (flush signal)
  // NOTE: Stream continues after this - session remains open
  yield Buffer.alloc(0);
}
```

### Error Recovery

```typescript
try {
  const result = await neurolink.stream({
    input: {
      text: "Start conversation",
      audio: { frames: audioStream },
    },
    provider: "google-ai",
  });

  for await (const chunk of result.stream) {
    processChunk(chunk);
  }
} catch (error) {
  if (error.message.includes("RATE_LIMIT")) {
    console.error("Rate limited - wait and retry");
  } else if (error.message.includes("API_KEY_INVALID")) {
    console.error("Check your GOOGLE_AI_API_KEY");
  } else {
    console.error("Audio stream error:", error.message);
  }
}
```

## Examples

See the `examples/voice-demo` directory for audio-related examples.

> **Note:** Audio streaming examples are available in the `examples/voice-demo` directory. Additional examples may be added as the feature matures.

## Related Features

- [Multimodal Chat](./multimodal-chat.md) - Overview of multimodal capabilities
- [Streaming](../advanced/streaming.md) - Text streaming guide
- [Google AI Setup](../getting-started/providers/google-ai.md) - Provider configuration

## Technical Details

### Audio Processing Flow

```
1. User provides AsyncIterable<Buffer> audio frames
   ↓
2. NeuroLink validates input (frames present, valid iterator)
   ↓
3. Creates WebSocket connection to Gemini Live API
   ↓
4. Configures response modalities: ["AUDIO"]
   ↓
5. Streams PCM16LE frames to API
   ↓
6. Receives audio chunks from API
   ↓
7. Decodes base64 to Buffer and wraps in AudioChunk
   ↓
8. Yields to consumer via AsyncIterable
```

### Implementation Files

- **`src/lib/types/streamTypes.ts`** - AudioInputSpec, AudioChunk, PCMEncoding types
- **`src/lib/providers/googleAiStudio.ts`** - Gemini Live API integration
- **`src/lib/neurolink.ts`** - Stream method and audio validation
- **`src/lib/types/providers.ts`** - LiveServerMessage, GenAIClient types

### Type Definitions

```typescript
// PCM Encoding Type
type PCMEncoding = "PCM16LE";

// Audio Input Specification
type AudioInputSpec = {
  frames: AsyncIterable<Buffer>;  // PCM16LE mono frames
  sampleRateHz?: number;          // Default: 16000
  encoding?: PCMEncoding;         // Default: "PCM16LE"
  channels?: 1;                   // Phase 1: mono only
};

// Audio Output Chunk
type AudioChunk = {
  data: Buffer;
  sampleRateHz: number;           // Typically 24000
  channels: number;               // 1
  encoding: PCMEncoding;          // "PCM16LE"
};
```

## Future Enhancements

Planned features for audio support:

- **Additional providers**: OpenAI Realtime API, Anthropic audio
- **Audio file input**: Support for WAV, MP3, FLAC files
- **Transcription**: Optional speech-to-text conversion
- **Voice selection**: Configurable voice presets
- **Multi-channel**: Stereo audio support
- **Audio recording**: Built-in recording utilities
- **CLI audio playback**: Direct audio output in terminal

## Changelog

### Current Version

- ✅ Real-time audio streaming via Gemini Live API
- ✅ PCM16LE input/output support
- ✅ Mono audio at 16kHz input, 24kHz output
- ✅ WebSocket-based bidirectional streaming
- ✅ Flush control signals
- ✅ Error handling and recovery
- ✅ SDK integration with AsyncIterable interface

---

**Next:** [Multimodal Chat Guide](./multimodal-chat.md) | [Streaming Guide](../advanced/streaming.md)
