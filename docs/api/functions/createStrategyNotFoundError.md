[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createStrategyNotFoundError

# Function: createStrategyNotFoundError()

> **createStrategyNotFoundError**(`strategyName`, `availableStrategies?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:145](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/errors/EvaluationError.ts#L145)

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
