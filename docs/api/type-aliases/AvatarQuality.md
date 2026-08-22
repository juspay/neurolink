[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarQuality

# Type Alias: AvatarQuality

> **AvatarQuality** = `"standard"` \| `"hd"`

Defined in: [types/avatar.ts:24](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L24)

Quality presets for avatar generation. Provider-specific mappings:

- D-ID: "standard" → 720p, "hd" → 1080p
- HeyGen: "standard" → 720p, "hd" → 1080p with enhancement
- MuseTalk (Replicate): single quality only; "hd" is no-op
