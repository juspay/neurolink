[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsOutputFormat

# Type Alias: ElevenLabsOutputFormat

> **ElevenLabsOutputFormat** = `"mp3_22050_32"` \| `"mp3_44100_32"` \| `"mp3_44100_64"` \| `"mp3_44100_96"` \| `"mp3_44100_128"` \| `"mp3_44100_192"` \| `"opus_48000_32"` \| `"opus_48000_64"` \| `"opus_48000_96"` \| `"opus_48000_128"` \| `"opus_48000_192"` \| `"pcm_8000"` \| `"pcm_16000"` \| `"pcm_22050"` \| `"pcm_24000"` \| `"pcm_44100"` \| `"pcm_48000"` \| `"ulaw_8000"` \| `"alaw_8000"`

Every `output_format` value the ElevenLabs text-to-speech endpoint accepts.
There is no `ogg_*` family — Ogg/Opus is `opus_48000_<kbps>`.
