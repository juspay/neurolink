[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / rankCatalogue

# Function: rankCatalogue()

> **rankCatalogue**(`candidates`, `difficulty`, `input?`, `requiredCapabilities?`): [`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)[]

Rank candidates deterministically for a difficulty. The fallback that makes
the catalogue safe to enable: with no decision provider configured this is
the whole selection, and it never consults the network.

`requiredCapabilities` filters leniently — a candidate with no recorded
capabilities is kept rather than starving the pool on missing metadata,
matching `ClassifierRouter.filterByCapabilities`.

## Parameters

### candidates

readonly [`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)[]

### difficulty

[`ClassifierDifficulty`](../type-aliases/ClassifierDifficulty.md)

### input?

`Pick`\<[`ClassifierRouterInput`](../type-aliases/ClassifierRouterInput.md), `"estimatedInputTokens"`\>

### requiredCapabilities?

readonly `string`[]

## Returns

[`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)[]
