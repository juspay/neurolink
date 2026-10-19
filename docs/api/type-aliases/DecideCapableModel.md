[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideCapableModel

# Type Alias: DecideCapableModel

> **DecideCapableModel** = `object`

See `DecideBlock.capableModel`.

## Properties

### model

> **model**: `string`

A key of the entry's `models.catalog`.

---

### questionTypes

> **questionTypes**: readonly [`DecisionQuestionType`](DecisionQuestionType.md)[]

Question types that send a request to `model`; media always does.
