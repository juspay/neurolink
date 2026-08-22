[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isAbortError

# Function: isAbortError()

> **isAbortError**(`error`): `boolean`

Defined in: [utils/errorHandling.ts:1392](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/errorHandling.ts#L1392)

Detect AbortError from any source (DOMException, plain Error, or message-based).
Used to short-circuit retry/fallback loops when an abort signal fires.

Uses `includes()` for message checks because provider error handlers
(e.g., googleVertex.formatProviderError) wrap the original AbortError
in a formatted error like "❌ Provider Error\n\nThis operation was aborted\n\n..."
which destroys the exact message match.

## Parameters

### error

`unknown`

## Returns

`boolean`
