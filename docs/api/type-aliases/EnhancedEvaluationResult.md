[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedEvaluationResult

# Type Alias: EnhancedEvaluationResult

> **EnhancedEvaluationResult** = [`EvaluationData`](EvaluationData.md) & `object`

Defined in: [types/evaluation.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L125)

Evaluation result type
Extends EvaluationData with additional fields

## Type Declaration

### domainAlignment?

> `optional` **domainAlignment?**: `number`

### terminologyAccuracy?

> `optional` **terminologyAccuracy?**: `number`

### toolEffectiveness?

> `optional` **toolEffectiveness?**: `number`

### contextUtilization?

> `optional` **contextUtilization?**: `object`

#### contextUtilization.conversationUsed

> **conversationUsed**: `boolean`

#### contextUtilization.toolsUsed

> **toolsUsed**: `boolean`

#### contextUtilization.domainKnowledgeUsed

> **domainKnowledgeUsed**: `boolean`

### evaluationContext?

> `optional` **evaluationContext?**: `object`

#### evaluationContext.domain

> **domain**: `string`

#### evaluationContext.toolsEvaluated

> **toolsEvaluated**: `string`[]

#### evaluationContext.conversationTurns

> **conversationTurns**: `number`

### isOffTopic

> **isOffTopic**: `boolean`

### alertSeverity

> **alertSeverity**: [`AlertSeverity`](AlertSeverity.md)

### reasoning

> **reasoning**: `string`
