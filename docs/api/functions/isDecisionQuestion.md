[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isDecisionQuestion

# Function: isDecisionQuestion()

> **isDecisionQuestion**(`value`): `value is DecisionQuestion`

Runtime check that a value from outside the type system — a host's
`extendQuestions` hook — is a well-formed question, so a malformed one
is dropped on its own rather than failing the whole request that
NeuroLink's own routing depends on.

A `choice` needs at least two options and a `score` at least two levels;
fewer carries no information, and the servers refuse it anyway.

## Parameters

### value

`unknown`

## Returns

`value is DecisionQuestion`
