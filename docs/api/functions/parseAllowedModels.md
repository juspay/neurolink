[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / parseAllowedModels

# Function: parseAllowedModels()

> **parseAllowedModels**(`message`): `string`[] \| `undefined`

Defined in: [types/errors.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L251)

Parse the `allowed_models` array out of a provider error message body.
Currently targets the LiteLLM team-whitelist response shape:

"team not allowed to access model. This team can only access
models=['glm-latest', 'kimi-latest', 'open-large']"

Implementation note: deliberately uses `indexOf`/`slice` instead of a
single `/models\s*=\s*\[([^\]]*)\]/` regex. CodeQL flagged the latter
as `js/polynomial-redos` because the `[^\]]*` greedy quantifier on
library-supplied input can be exploited by a crafted long string. The
indexOf/slice path is O(n) with no backtracking and we additionally
cap the input length.

Returns undefined when no list is found.

## Parameters

### message

`string`

## Returns

`string`[] \| `undefined`
