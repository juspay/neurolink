[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionAnswerReading

# Type Alias: DecisionAnswerReading

> **DecisionAnswerReading** = `object`

## Properties

### answers

> `readonly` **answers**: `Readonly`\<`Record`\<`string`, [`DecisionAnswer`](DecisionAnswer.md)\>\>

---

### dropped

> `readonly` **dropped**: readonly `string`[]

Ids of answers the server returned that could not be parsed.

---

### refused?

> `readonly` `optional` **refused?**: readonly `string`[]

Ids of questions the model declined to answer; they have no answer.
