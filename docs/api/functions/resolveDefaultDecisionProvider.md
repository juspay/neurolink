[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveDefaultDecisionProvider

# Function: resolveDefaultDecisionProvider()

> **resolveDefaultDecisionProvider**(): `string` \| `undefined`

Defined in: [factories/providerDescriptors.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerDescriptors.ts#L613)

The decision provider to use when a caller names none: the first one whose
primary credential env var is actually set.

This is where "if somebody sets the key, we start using it" is implemented.
Returns undefined when none is configured, which every internal consumer
treats as "carry on exactly as before".

## Returns

`string` \| `undefined`
