[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / classifyProviderError

# Function: classifyProviderError()

> **classifyProviderError**(`error`): [`ProviderErrorClass`](../type-aliases/ProviderErrorClass.md)

Defined in: [routing/modelPool.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L65)

Classify a provider error into a coarse `ProviderErrorClass`.

Rules (checked in order):

1. HTTP 429 or message pattern → "rate_limit"
2. HTTP 401/403, access-denied pattern, or auth keywords → "auth"
3. Context-window / token-limit message → "context_window"
4. HTTP 5xx or server-error message → "server"
5. Network connectivity error → "network"
6. Everything else → "unknown"

## Parameters

### error

`unknown`

## Returns

[`ProviderErrorClass`](../type-aliases/ProviderErrorClass.md)
