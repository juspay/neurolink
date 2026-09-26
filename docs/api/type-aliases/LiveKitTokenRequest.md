[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitTokenRequest

# Type Alias: LiveKitTokenRequest

> **LiveKitTokenRequest** = `object`

Arguments for minting a browser join token.

## Properties

### identity

> **identity**: `string`

Participant identity (e.g. the authenticated user id).

---

### room

> **room**: `string`

Room name to join (auto-created on first join).

---

### apiKey

> **apiKey**: `string`

LiveKit API key.

---

### apiSecret

> **apiSecret**: `string`

LiveKit API secret.

---

### ttlSeconds?

> `optional` **ttlSeconds?**: `number`

Token lifetime in seconds (default 600; clamped to a 3600 max).
