[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLeaseVerdict

# Type Alias: ProxyShareLeaseVerdict

> **ProxyShareLeaseVerdict** = \{ `usable`: `true`; `nextHeartbeatDueAt`: `number`; \} \| \{ `usable`: `false`; `reason`: `"unsigned"` \| `"expired"` \| `"grace_elapsed"` \| `"stopped"`; `detail`: `string`; \}

Why a lease is not currently usable.
