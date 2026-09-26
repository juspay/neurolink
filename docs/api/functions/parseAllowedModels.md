[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / parseAllowedModels

# Function: parseAllowedModels()

> **parseAllowedModels**(`message`): `string`[] \| `undefined`

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
