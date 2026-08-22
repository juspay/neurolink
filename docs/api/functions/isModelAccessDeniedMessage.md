[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isModelAccessDeniedMessage

# Function: isModelAccessDeniedMessage()

> **isModelAccessDeniedMessage**(`message`): `boolean`

Defined in: [types/errors.ts:343](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L343)

Returns true when `message` looks like a model-access-denied response
(LiteLLM "team not allowed", generic "not allowed to access model",
or "team can only access models=[...]").

## Parameters

### message

`string`

## Returns

`boolean`
