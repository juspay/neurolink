[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitTokenRequest

# Type Alias: LiveKitTokenRequest

> **LiveKitTokenRequest** = `object`

Defined in: [types/livekit.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L217)

Arguments for minting a browser join token.

## Properties

### identity

> **identity**: `string`

Defined in: [types/livekit.ts:219](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L219)

Participant identity (e.g. the authenticated user id).

---

### room

> **room**: `string`

Defined in: [types/livekit.ts:221](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L221)

Room name to join (auto-created on first join).

---

### apiKey

> **apiKey**: `string`

Defined in: [types/livekit.ts:223](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L223)

LiveKit API key.

---

### apiSecret

> **apiSecret**: `string`

Defined in: [types/livekit.ts:225](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L225)

LiveKit API secret.

---

### ttlSeconds?

> `optional` **ttlSeconds?**: `number`

Defined in: [types/livekit.ts:227](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L227)

Token lifetime in seconds (default 600; clamped to a 3600 max).
