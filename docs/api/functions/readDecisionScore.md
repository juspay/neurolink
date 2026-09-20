[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / readDecisionScore

# Function: readDecisionScore()

> **readDecisionScore**(`answers`, `id`): [`DecisionScoreReading`](../type-aliases/DecisionScoreReading.md) \| `undefined`

Defined in: [utils/decisionAnswers.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/utils/decisionAnswers.ts#L56)

The `decide` inference type — typed, calibrated judgements from a model that
generates no text, alongside `generate` and `stream`.

Call it with `neurolink.decide({ state, questions })`, or `tryDecide()` for
the fail-open variant every internal consumer uses. TypeSafe's Jev is the
first provider; a provider declares the capability with `"decide"` in its
descriptor's `inferenceKinds`.

Latency on a decision model is flat in question count — 1 question ~393ms,
400 questions ~465ms — while concurrent requests queue. Always batch; never
fan out. A `choice` answer carries the full distribution, so one question
over N options also ranks all N.

## Parameters

### answers

[`DecisionAnswerMap`](../type-aliases/DecisionAnswerMap.md)

### id

`string`

## Returns

[`DecisionScoreReading`](../type-aliases/DecisionScoreReading.md) \| `undefined`

## Example

```ts
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const result = await new NeuroLink().tryDecide({
  // null if unconfigured
  state: ticketText,
  questions: {
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: { billing: "Payments", technical: "Bugs", sales: "Pricing" },
    },
    urgent: { type: "boolean", instructions: "Is this urgent?" },
  },
});
const team = result && readDecisionChoice(result.answers, "team");
if (team && team.confidence > 0.7) {
  route(team.choice);
}
```
