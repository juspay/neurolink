[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationAggregator

# Class: EvaluationAggregator

EvaluationAggregator - Aggregates evaluation results and provides analytics.
Supports statistical analysis, trend detection, and quality monitoring.

## Example

```typescript
const aggregator = new EvaluationAggregator();

// Add evaluations
aggregator.addEvaluation(evaluation1);
aggregator.addEvaluation(evaluation2);

// Get aggregation
const result = aggregator.aggregate({ threshold: 7 });
console.log(`Average score: ${result.statistics.mean}`);
console.log(`Passing rate: ${result.passingRate}%`);

// Get trend analysis
const trend = aggregator.analyzeSequenceTrend();
console.log(`Quality is ${trend.direction}`);
```

## Constructors

### Constructor

> **new EvaluationAggregator**(): `EvaluationAggregator`

#### Returns

`EvaluationAggregator`

## Methods

### addEvaluation()

> **addEvaluation**(`evaluation`): `void`

Adds an evaluation to the aggregator.

#### Parameters

##### evaluation

[`EvaluationData`](../type-aliases/EvaluationData.md)

The evaluation data to add

#### Returns

`void`

---

### addEvaluations()

> **addEvaluations**(`evaluations`): `void`

Adds multiple evaluations to the aggregator.

#### Parameters

##### evaluations

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of evaluation data to add

#### Returns

`void`

---

### clear()

> **clear**(): `void`

Clears all evaluations from the aggregator.

#### Returns

`void`

---

### getCount()

> **getCount**(): `number`

Gets the current number of evaluations.

#### Returns

`number`

---

### getEvaluations()

> **getEvaluations**(): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Gets all evaluations.

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

---

### aggregate()

> **aggregate**(`options?`): [`AggregationResult`](../type-aliases/AggregationResult.md)

Aggregates all evaluations and returns comprehensive statistics.

#### Parameters

##### options?

Aggregation options

###### threshold?

`number`

#### Returns

[`AggregationResult`](../type-aliases/AggregationResult.md)

Comprehensive aggregation result

---

### calculateStatistics()

> **calculateStatistics**(`scores`): [`ScoreStatistics`](../type-aliases/ScoreStatistics.md)

Calculates statistical summary for a set of scores.

#### Parameters

##### scores

`number`[]

Array of scores

#### Returns

[`ScoreStatistics`](../type-aliases/ScoreStatistics.md)

Statistical summary

---

### calculateDistribution()

> **calculateDistribution**(`scores`): [`ScoreDistribution`](../type-aliases/ScoreDistribution.md)

Calculates the distribution of scores across quality ranges.

#### Parameters

##### scores

`number`[]

Array of scores

#### Returns

[`ScoreDistribution`](../type-aliases/ScoreDistribution.md)

Score distribution

---

### analyzeSequenceTrend()

> **analyzeSequenceTrend**(`windowSize?`): [`TrendAnalysis`](../type-aliases/TrendAnalysis.md)

Analyzes sequence-based trends in evaluation scores (based on insertion order, not time).

#### Parameters

##### windowSize?

`number` = `5`

Moving average window size (default: 5)

#### Returns

[`TrendAnalysis`](../type-aliases/TrendAnalysis.md)

Trend analysis

---

### getFailingEvaluations()

> **getFailingEvaluations**(`threshold?`): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Gets evaluations that failed to meet the threshold.

#### Parameters

##### threshold?

`number` = `7`

The passing threshold

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of failing evaluations

---

### getHighAlertEvaluations()

> **getHighAlertEvaluations**(): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Gets evaluations with high severity alerts.

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of high-alert evaluations

---

### getOffTopicEvaluations()

> **getOffTopicEvaluations**(): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Gets evaluations marked as off-topic.

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of off-topic evaluations

---

### getTopEvaluations()

> **getTopEvaluations**(`n?`): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Gets the top N performing evaluations.

#### Parameters

##### n?

`number` = `5`

Number of evaluations to return

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of top evaluations

---

### getBottomEvaluations()

> **getBottomEvaluations**(`n?`): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Gets the bottom N performing evaluations.

#### Parameters

##### n?

`number` = `5`

Number of evaluations to return

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of bottom evaluations

---

### generateSummary()

> **generateSummary**(`threshold?`): `string`

Generates a text summary of the aggregation.

#### Parameters

##### threshold?

`number` = `7`

The passing threshold

#### Returns

`string`

Human-readable summary
