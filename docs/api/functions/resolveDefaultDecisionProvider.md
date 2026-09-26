[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveDefaultDecisionProvider

# Function: resolveDefaultDecisionProvider()

> **resolveDefaultDecisionProvider**(`credentials?`): `string` \| `undefined`

The decision provider to use when a caller names none: the first
DECISION_PROVIDERS entry that is fully configured, from the environment or
from `credentials`.

This is where "if somebody configures it, we start using it" is
implemented. Returns undefined when none is configured, which every
internal consumer treats as "carry on exactly as before".

## Parameters

### credentials?

[`NeurolinkCredentials`](../type-aliases/NeurolinkCredentials.md)

## Returns

`string` \| `undefined`
