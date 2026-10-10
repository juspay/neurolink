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

NEUROLINK_DECISION_PROVIDER overrides the search, for a host whose
PERPLEXITY_API_KEY or Cloudflare token is meant for the text provider that
shares it: `none` returns undefined whatever is configured, and a decision
provider's name returns that provider when it is configured and undefined
otherwise, never another one. A caller that names a provider explicitly is
not affected; this decides only the default.

## Parameters

### credentials?

[`NeurolinkCredentials`](../type-aliases/NeurolinkCredentials.md)

## Returns

`string` \| `undefined`
