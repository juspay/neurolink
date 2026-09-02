[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLeaseVerdict

# Type Alias: ProxyShareLeaseVerdict

> **ProxyShareLeaseVerdict** = \{ `usable`: `true`; `nextHeartbeatDueAt`: `number`; \} \| \{ `usable`: `false`; `reason`: `"unsigned"` \| `"expired"` \| `"grace_elapsed"` \| `"stopped"`; `detail`: `string`; \}

Defined in: [types/proxy.ts:4127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4127)

Why a lease is not currently usable.
