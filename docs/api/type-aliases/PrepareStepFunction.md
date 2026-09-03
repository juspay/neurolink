[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrepareStepFunction

# Type Alias: PrepareStepFunction\<TOOLS\>

> **PrepareStepFunction**\<`TOOLS`\> = (`options`) => [`PrepareStepResult`](PrepareStepResult.md)\<`TOOLS`\> \| `undefined` \| `PromiseLike`\<[`PrepareStepResult`](PrepareStepResult.md)\<`TOOLS`\> \| `undefined`\>

Defined in: [types/aiCompat.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L601)

## Type Parameters

### TOOLS

`TOOLS` _extends_ `Record`\<`string`, [`Tool`](Tool.md)\> = `Record`\<`string`, [`Tool`](Tool.md)\>

## Parameters

### options

#### steps

[`StepResult`](StepResult.md)\<[`ToolSet`](ToolSet.md)\>[]

#### stepNumber

`number`

#### model

[`LanguageModel`](LanguageModel.md)

#### messages

[`ModelMessage`](ModelMessage.md)[]

#### maxSteps?

`number`

#### experimental_context?

`unknown`

## Returns

[`PrepareStepResult`](PrepareStepResult.md)\<`TOOLS`\> \| `undefined` \| `PromiseLike`\<[`PrepareStepResult`](PrepareStepResult.md)\<`TOOLS`\> \| `undefined`\>
