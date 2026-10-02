[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeLoopPrepareStep

# Type Alias: NativeLoopPrepareStep

> **NativeLoopPrepareStep** = (`options`) => `PromiseLike`\<\{ `toolChoice?`: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>; \} \| `undefined`\>

The per-step hook shape every native loop calls: the narrowest common form
of the `prepareStep` callbacks declared on GenerateOptions, StreamOptions
and TextGenerationOptions, each of which is assignable to it. The loops
read only `toolChoice` off the result.

## Parameters

### options

#### steps

[`StepResult`](StepResult.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>[]

#### stepNumber

`number`

#### maxSteps

`number`

#### model

[`LanguageModel`](LanguageModel.md)

## Returns

`PromiseLike`\<\{ `toolChoice?`: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>; \} \| `undefined`\>
