# Text-to-Speech (TTS) Streaming

## Overview

NeuroLink now supports **streaming Text-to-Speech (TTS)** synthesis integrated directly into the `BaseProvider.stream()` method. This feature enables real-time audio generation from streaming text responses, providing a seamless experience for voice-enabled applications.

## Architecture

### Flow Diagram

```
User Request
    ↓
BaseProvider.stream()
    ↓
    ├─→ Execute Real Streaming (executeStream)
    │       ↓
    │   Text Chunks Generated
    │       ↓
    │   [TTS Enabled?] ──No──→ Return Text Stream
    │       │
    │      Yes
    │       ↓
    ├─→ wrapStreamWithTTS()
    │       ↓
    │   ┌─────────────────────┐
    │   │  Phase 1: Streaming │
    │   │  - Yield text chunks│
    │   │  - Buffer text      │
    │   └─────────────────────┘
    │       ↓
    │   ┌─────────────────────┐
    │   │  Phase 2: Synthesis │
    │   │  - TTSProcessor     │
    │   │  - Generate audio   │
    │   │  - Yield audio chunk│
    │   └─────────────────────┘
    │       ↓
    └─→ Return Enhanced Stream
            (Text + Audio Chunks)
```

### Key Components

1. **BaseProvider.stream()** - Entry point that detects TTS configuration
2. **wrapStreamWithTTS()** - Wraps the text stream with TTS synthesis logic
3. **TTSProcessor.synthesize()** - Handles provider-specific audio generation
4. **StreamChunk** - Discriminated union type for text/audio chunks

## Usage

### Basic Example

```typescript
import { createAIProvider } from "neurolink";

const provider = createAIProvider({
  provider: "google-ai",
  model: "gemini-2.0-flash-exp",
});

const result = await provider.stream({
  input: { text: "Tell me a story about a brave knight" },
  tts: {
    enabled: true,
    voice: "en-US-Neural2-C",
  },
});

// Process both text and audio chunks
for await (const chunk of result.stream) {
  if (chunk.type === "text") {
    // Display text as it arrives
    process.stdout.write(chunk.content);
  } else if (chunk.type === "audio") {
    // Play or save audio
    playAudioChunk(chunk.audioChunk.data);
  }
}
```

### Advanced Example with Audio Buffering

```typescript
const result = await provider.stream({
  input: { text: "Explain quantum computing" },
  tts: {
    enabled: true,
    voice: "en-US-Neural2-D",
    speed: 0.9,
    format: "mp3",
    quality: "hd",
  },
});

const audioBuffer: Buffer[] = [];
let fullText = "";

for await (const chunk of result.stream) {
  if (chunk.type === "text") {
    fullText += chunk.content;
    console.log(chunk.content);
  } else if (chunk.type === "audio") {
    audioBuffer.push(chunk.audioChunk.data);
    
    if (chunk.audioChunk.isFinal) {
      // Save complete audio file
      const completeAudio = Buffer.concat(audioBuffer);
      fs.writeFileSync("response.mp3", completeAudio);
      console.log(`\nAudio saved: ${completeAudio.length} bytes`);
    }
  }
}
```

### Error Handling

TTS streaming implements **graceful degradation** - if audio synthesis fails, the stream continues with text-only output:

```typescript
const result = await provider.stream({
  input: { text: "This will work even if TTS fails" },
  tts: { enabled: true },
});

let audioGenerated = false;

for await (const chunk of result.stream) {
  if (chunk.type === "text") {
    console.log("Text:", chunk.content);
  } else if (chunk.type === "audio") {
    audioGenerated = true;
    console.log("Audio chunk received");
  }
}

if (!audioGenerated) {
  console.log("TTS failed, but text streaming succeeded");
}
```

## API Reference

### StreamOptions.tts

```typescript
type TTSOptions = {
  /** Enable TTS output */
  enabled?: boolean;
  
  /** Voice identifier (e.g., "en-US-Neural2-C") */
  voice?: string;
  
  /** Audio format (default: mp3) */
  format?: "mp3" | "wav" | "ogg" | "opus";
  
  /** Speaking rate 0.25-4.0 (default: 1.0) */
  speed?: number;
  
  /** Voice pitch adjustment -20.0 to 20.0 semitones (default: 0.0) */
  pitch?: number;
  
  /** Volume gain in dB -96.0 to 16.0 (default: 0.0) */
  volumeGainDb?: number;
  
  /** Audio quality (default: standard) */
  quality?: "standard" | "hd";
};
```

### StreamChunk Types

```typescript
type StreamChunk =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "audio";
      audioChunk: TTSChunk;
    };

type TTSChunk = {
  /** Audio data chunk as Buffer */
  data: Buffer;
  
  /** Audio format of this chunk */
  format: AudioFormat;
  
  /** Chunk sequence number (0-indexed) */
  index: number;
  
  /** Whether this is the final audio chunk */
  isFinal: boolean;
  
  /** Cumulative audio size in bytes so far */
  cumulativeSize?: number;
  
  /** Estimated total duration in seconds */
  estimatedDuration?: number;
  
  /** Voice used for generation */
  voice?: string;
  
  /** Sample rate in Hz */
  sampleRate?: number;
};
```

### StreamResult Metadata

When TTS is enabled, the `StreamResult.metadata` includes:

```typescript
{
  ttsEnabled: true,
  ttsProvider: "google-ai",
  ttsVoice: "en-US-Neural2-C"
}
```

## Performance Considerations

### Latency

TTS synthesis adds latency after text streaming completes:

- **Text streaming**: Real-time as chunks arrive
- **Audio synthesis**: Batch processing after all text is received
- **Total latency**: Text latency + TTS synthesis time

### Optimization Tips

1. **Use appropriate voice models**: Standard voices are faster than HD/Neural voices
2. **Adjust speed**: Higher speeds reduce synthesis time
3. **Monitor buffer size**: Large text responses take longer to synthesize
4. **Implement timeouts**: Set reasonable timeouts for TTS operations

```typescript
const result = await provider.stream({
  input: { text: longText },
  tts: {
    enabled: true,
    quality: "standard", // Faster than "hd"
    speed: 1.2, // Slightly faster speech
  },
  timeout: 60000, // 60 second timeout
});
```

## Supported Providers

Currently, TTS streaming is supported for providers with registered TTS handlers:

- ✅ **Google AI** (Gemini models)
- ✅ **OpenAI** (GPT models)
- ✅ **Anthropic** (Claude models - with external TTS)

To check if a provider supports TTS:

```typescript
import { TTSProcessor } from "neurolink";

if (TTSProcessor.supports("google-ai")) {
  console.log("Google AI TTS is available");
}
```

## Implementation Details

### Text Buffering Strategy

The implementation buffers all text chunks before synthesizing audio to ensure:

1. **Complete context**: The full response is available for synthesis
2. **Natural speech**: Audio is generated from complete sentences/paragraphs
3. **Optimal quality**: TTS engines work best with complete text

### Error Recovery

TTS errors are logged but don't interrupt the stream:

```typescript
try {
  const ttsResult = await TTSProcessor.synthesize(fullText, provider, ttsOptions);
  yield { type: "audio", audioChunk: ttsResult };
} catch (ttsError) {
  logger.error(`[TTS Streaming] Synthesis failed:`, ttsError);
  // Stream continues with text-only output
}
```

### Metadata Tracking

The implementation tracks:

- TTS synthesis latency
- Audio chunk size and duration
- Voice and format information
- Provider-specific metadata

## Best Practices

### 1. Always Check for Audio Chunks

```typescript
for await (const chunk of result.stream) {
  switch (chunk.type) {
    case "text":
      handleText(chunk.content);
      break;
    case "audio":
      handleAudio(chunk.audioChunk);
      break;
  }
}
```

### 2. Handle the Final Audio Chunk

```typescript
if (chunk.type === "audio" && chunk.audioChunk.isFinal) {
  // This is the last audio chunk
  saveCompleteAudio(audioBuffer);
}
```

### 3. Implement Fallback UI

```typescript
let audioAvailable = false;

for await (const chunk of result.stream) {
  if (chunk.type === "audio") {
    audioAvailable = true;
  }
}

if (!audioAvailable) {
  showTextOnlyMessage();
}
```

### 4. Monitor Performance

```typescript
const startTime = Date.now();

for await (const chunk of result.stream) {
  if (chunk.type === "audio") {
    const latency = Date.now() - startTime;
    console.log(`TTS latency: ${latency}ms`);
  }
}
```

## Testing

Run the integration tests:

```bash
npm test test/integration/tts-streaming.test.ts
```

Test coverage includes:

- ✅ Text and audio chunk generation
- ✅ Error handling and graceful degradation
- ✅ Metadata validation
- ✅ Text buffering behavior
- ✅ Disabled TTS (text-only) mode

## Troubleshooting

### No Audio Chunks Received

**Possible causes:**
- TTS handler not registered for the provider
- Provider not configured (missing API keys)
- Text response is empty
- TTS synthesis failed (check logs)

**Solution:**
```typescript
import { TTSProcessor } from "neurolink";

// Check if provider is supported
if (!TTSProcessor.supports("your-provider")) {
  console.error("TTS not supported for this provider");
}
```

### Audio Quality Issues

**Possible causes:**
- Using "standard" quality instead of "hd"
- Incorrect sample rate
- Audio format not supported by playback device

**Solution:**
```typescript
tts: {
  enabled: true,
  quality: "hd",
  format: "mp3", // Most compatible
}
```

### High Latency

**Possible causes:**
- Large text responses
- HD quality synthesis
- Network latency to TTS service

**Solution:**
```typescript
tts: {
  enabled: true,
  quality: "standard", // Faster
  speed: 1.2, // Slightly faster speech
}
```

## Future Enhancements

Planned improvements for TTS streaming:

1. **Incremental synthesis**: Synthesize audio as text chunks arrive (streaming TTS)
2. **Chunk-level synthesis**: Generate audio for each sentence/paragraph
3. **Multi-voice support**: Different voices for different speakers
4. **Background synthesis**: Parallel audio generation while streaming text
5. **Caching**: Cache frequently synthesized phrases

## Related Documentation

- [TTS Configuration](./tts-configuration.md)
- [Audio Formats](./audio-formats.md)
- [Provider-Specific TTS](./provider-tts.md)
- [Streaming API Reference](../api/streaming.md)

## Changelog

### v1.0.0 (Issue #516)

- ✅ Integrated TTS into `BaseProvider.stream()`
- ✅ Implemented text buffering and batch synthesis
- ✅ Added error handling with graceful degradation
- ✅ Included TTS metadata in stream results
- ✅ Added comprehensive integration tests
- ✅ Documented API and usage patterns
