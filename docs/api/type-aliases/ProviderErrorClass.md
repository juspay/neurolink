[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorClass

# Type Alias: ProviderErrorClass

> **ProviderErrorClass** = `"rate_limit"` \| `"auth"` \| `"context_window"` \| `"server"` \| `"network"` \| `"unknown"`

Defined in: [types/modelPool.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/modelPool.ts#L27)

Coarse error class returned by `classifyProviderError`.
Drives the cooldown decision inside ModelPool.
