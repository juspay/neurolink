[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionHookAnswersContext

# Type Alias: DecisionHookAnswersContext

> **DecisionHookAnswersContext** = [`DecisionHookContext`](DecisionHookContext.md) & `object`

What `onAnswers` receives once the decision has returned.

## Type Declaration

### answers

> **answers**: [`DecisionAnswerMap`](DecisionAnswerMap.md)

The host's answers, keyed by the ids the host used in `extendQuestions`
— the namespacing applied on the wire is undone here. Empty when the
host added no questions.

### result

> **result**: [`DecisionResult`](DecisionResult.md)

The whole result, including NeuroLink's own answers under its own ids.
