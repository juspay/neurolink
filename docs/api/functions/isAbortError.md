[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isAbortError

# Function: isAbortError()

> **isAbortError**(`error`): `boolean`

Defined in: [utils/errorHandling.ts:1088](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/errorHandling.ts#L1088)

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
