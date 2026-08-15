[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorClass

# Type Alias: ProviderErrorClass

> **ProviderErrorClass** = `"rate_limit"` \| `"auth"` \| `"context_window"` \| `"server"` \| `"network"` \| `"unknown"`

Defined in: [types/modelPool.ts:27](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/modelPool.ts#L27)

Coarse error class returned by `classifyProviderError`.
Drives the cooldown decision inside ModelPool.
