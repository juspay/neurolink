[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorClass

# Type Alias: ProviderErrorClass

> **ProviderErrorClass** = `"rate_limit"` \| `"auth"` \| `"context_window"` \| `"server"` \| `"network"` \| `"unknown"`

Defined in: [types/modelPool.ts:27](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/modelPool.ts#L27)

Coarse error class returned by `classifyProviderError`.
Drives the cooldown decision inside ModelPool.
