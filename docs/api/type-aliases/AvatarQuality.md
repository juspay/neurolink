[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarQuality

# Type Alias: AvatarQuality

> **AvatarQuality** = `"standard"` \| `"hd"`

Defined in: [types/avatar.ts:24](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L24)

Quality presets for avatar generation. Provider-specific mappings:

- D-ID: "standard" → 720p, "hd" → 1080p
- HeyGen: "standard" → 720p, "hd" → 1080p with enhancement
- MuseTalk (Replicate): single quality only; "hd" is no-op
