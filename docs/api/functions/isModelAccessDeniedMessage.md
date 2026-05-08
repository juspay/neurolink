[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isModelAccessDeniedMessage

# Function: isModelAccessDeniedMessage()

> **isModelAccessDeniedMessage**(`message`): `boolean`

Defined in: [types/errors.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L300)

Returns true when `message` looks like a model-access-denied response
(LiteLLM "team not allowed", generic "not allowed to access model",
or "team can only access models=[...]").

## Parameters

### message

`string`

## Returns

`boolean`
