[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / classifyHeuristic

# Function: classifyHeuristic()

> **classifyHeuristic**(`input`): [`ClassifierDecision`](../type-aliases/ClassifierDecision.md)

Defined in: [routing/classifierStrategies.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierStrategies.ts#L57)

Heuristic classifier — maps the binary fast/reasoning scores plus prompt
length into one of five difficulty tiers. Deterministic and dependency-free.

## Parameters

### input

[`ClassifierRouterInput`](../type-aliases/ClassifierRouterInput.md)

## Returns

[`ClassifierDecision`](../type-aliases/ClassifierDecision.md)
