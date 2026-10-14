[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionDialect

# Type Alias: DecisionDialect

> **DecisionDialect** = `object`

How questions are written to, and answers read from, a decide wire. One
dialect serves every vendor that speaks the same layout.

## Properties

### name

> `readonly` **name**: [`DecideDialectName`](DecideDialectName.md)

---

### encodeQuestion

> **encodeQuestion**: (`question`) => `Record`\<`string`, `unknown`\>

#### Parameters

##### question

[`DecisionQuestion`](DecisionQuestion.md)

#### Returns

`Record`\<`string`, `unknown`\>

---

### buildBody

> **buildBody**: (`input`) => `Record`\<`string`, `unknown`\>

#### Parameters

##### input

[`DecisionDialectBody`](DecisionDialectBody.md)

#### Returns

`Record`\<`string`, `unknown`\>

---

### readAnswers

> **readAnswers**: (`decoded`, `reportedConfidence`, `asked`) => [`DecisionAnswerReading`](DecisionAnswerReading.md) \| `undefined`

`undefined` means the response has no usable answers container. `asked`
is the request's own question map, for a wire that echoes names rather
than the ids sent.

#### Parameters

##### decoded

`Readonly`\<`Record`\<`string`, `unknown`\>\>

##### reportedConfidence

`Readonly`\<`Record`\<`string`, `number`\>\>

##### asked

[`DecisionQuestionMap`](DecisionQuestionMap.md)

#### Returns

[`DecisionAnswerReading`](DecisionAnswerReading.md) \| `undefined`
