[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isAbortError

# Function: isAbortError()

> **isAbortError**(`error`): `boolean`

Defined in: [utils/errorHandling.ts:1392](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/errorHandling.ts#L1392)

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
