[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isModelAccessDeniedMessage

# Function: isModelAccessDeniedMessage()

> **isModelAccessDeniedMessage**(`message`): `boolean`

Defined in: [types/errors.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L343)

Returns true when `message` looks like a model-access-denied response
(LiteLLM "team not allowed", generic "not allowed to access model",
or "team can only access models=[...]").

## Parameters

### message

`string`

## Returns

`boolean`
