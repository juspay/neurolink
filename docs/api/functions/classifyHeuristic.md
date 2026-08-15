[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / classifyHeuristic

# Function: classifyHeuristic()

> **classifyHeuristic**(`input`): [`ClassifierDecision`](../type-aliases/ClassifierDecision.md)

Defined in: [routing/classifierStrategies.ts:57](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/routing/classifierStrategies.ts#L57)

Heuristic classifier — maps the binary fast/reasoning scores plus prompt
length into one of five difficulty tiers. Deterministic and dependency-free.

## Parameters

### input

[`ClassifierRouterInput`](../type-aliases/ClassifierRouterInput.md)

## Returns

[`ClassifierDecision`](../type-aliases/ClassifierDecision.md)
