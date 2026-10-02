[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepToolChoiceInput

# Type Alias: StepToolChoiceInput

> **StepToolChoiceInput** = `object`

What `resolveStepToolChoice` needs to decide one step's tool choice.
Shared by the native generate loop and both stream loops so the
`toolChoiceSteps` / `prepareStep` rule cannot drift between them.

## Properties

### base

> **base**: `unknown`

The turn's resolved tool choice in NeuroLink shape, or undefined.

---

### step

> **step**: `number`

Zero-based step index.

---

### toolChoiceSteps?

> `optional` **toolChoiceSteps?**: `number`

---

### prepareStep?

> `optional` **prepareStep?**: [`NativeLoopPrepareStep`](NativeLoopPrepareStep.md)

---

### steps

> **steps**: [`StepResult`](StepResult.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>[]

Records of the steps completed so far, handed to `prepareStep`.

---

### maxSteps

> **maxSteps**: `number`

---

### model

> **model**: `string`

The resolved model id (always a string at runtime), handed to `prepareStep`.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

The turn's abort signal; a pending `prepareStep` is released when it fires.
