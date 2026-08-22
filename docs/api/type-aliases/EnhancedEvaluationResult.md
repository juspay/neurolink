[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedEvaluationResult

# Type Alias: EnhancedEvaluationResult

> **EnhancedEvaluationResult** = [`EvaluationData`](EvaluationData.md) & `object`

Defined in: [types/evaluation.ts:120](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L120)

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
