[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / detectAndRedactPII

# Function: detectAndRedactPII()

> **detectAndRedactPII**(`text`, `config`): `Promise`\<[`PiiDetectionResult`](../type-aliases/PiiDetectionResult.md)\>

Defined in: [utils/piiDetector.ts:169](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/piiDetector.ts#L169)

Detect and optionally redact PII from a text string.

Detection runs per-field (each named segment scanned independently) so that
offset positions always refer to the correct field's text — not a concatenated
blob (Bug C3 fix).

Custom patterns are validated before execution to prevent catastrophic
backtracking (Bug C10 fix).

## Parameters

### text

`string`

The input text to scan

### config

[`PiiDetectionConfig`](../type-aliases/PiiDetectionConfig.md)

PII detection configuration

## Returns

`Promise`\<[`PiiDetectionResult`](../type-aliases/PiiDetectionResult.md)\>

Detection result with (optionally) redacted text and found PII
