[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / enrichCandidate

# Function: enrichCandidate()

> **enrichCandidate**(`id`, `member`, `difficulty`, `registry?`): [`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)

Enrich a pool member into a classifier candidate, pulling registry metadata
the member did not declare.

Works for any pool, catalogue-derived or hand-declared: a host that listed
`{ provider: "openai", model: "gpt-4o" }` gets the same context window and
pricing as a catalogue entry, because both resolve through the registry.
Members the registry does not know (LiteLLM, self-hosted) keep exactly what
the host declared and are still rankable — `tierScore` falls back to
neutral values rather than dropping them.

## Parameters

### id

`string`

### member

[`ClassifierRouterPoolMember`](../type-aliases/ClassifierRouterPoolMember.md)

### difficulty

[`ClassifierDifficulty`](../type-aliases/ClassifierDifficulty.md)

### registry?

`Map`\<`string`, [`ModelInfo`](../type-aliases/ModelInfo.md)\>

## Returns

[`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)
