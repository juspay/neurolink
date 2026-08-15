[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSAudioFormat

# Type Alias: TTSAudioFormat

> **TTSAudioFormat** = `"mp3"` \| `"wav"` \| `"ogg"` \| `"opus"` \| `"m4a"` \| `"flac"` \| `"webm"` \| `"mp4"` \| `"mpeg"` \| `"mpga"` \| `"pcm16"`

Defined in: [types/tts.ts:16](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L16)

Supported audio formats for TTS output, STT input, and Realtime PCM streams.

`pcm16` is included for the OpenAI Realtime PCM16 output stream — the chunk
is raw PCM, not a RIFF/WAV-headered file. Consumers must not pass `pcm16`
bytes to a WAV duration parser.
