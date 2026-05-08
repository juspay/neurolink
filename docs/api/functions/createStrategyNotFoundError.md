[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createStrategyNotFoundError

# Function: createStrategyNotFoundError()

> **createStrategyNotFoundError**(`strategyName`, `availableStrategies?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L145)

Helper function to create a strategy not found error.

## Parameters

### strategyName

`string`

The name of the strategy that was not found

### availableStrategies?

`string`[] = `[]`

List of available strategies

## Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

A typed NeuroLinkFeatureError
