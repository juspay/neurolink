[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfusePrompt

# Function: getLangfusePrompt()

> **getLangfusePrompt**(`name`, `options`): `Promise`\<[`LangfusePrompt`](../type-aliases/LangfusePrompt.md)\>

## Parameters

### name

`string`

{string} - Prompt name in Langfuse.

### options

[`LangfusePromptOptions`](../type-aliases/LangfusePromptOptions.md)

{LangfusePromptOptions} - Label, fallback text, cache TTL and request timeout.

## Returns

`Promise`\<[`LangfusePrompt`](../type-aliases/LangfusePrompt.md)\>

The prompt, or `{ name, text: fallback, label, isFallback: true }`; never rejects.

## Description

Fetches a text prompt from Langfuse with the keys and host NeuroLink's tracing was started with, falling back to `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` and `LANGFUSE_BASE_URL`. Prompts are cached per project, host, name and label: within `cacheTtlMs` no request is made, and an expired entry is returned at once while one background request refreshes it. Concurrent callers share one request. Missing keys, an error, a timeout, a missing prompt or a chat prompt return the fallback, after a warning for all but missing keys; a failed request is not repeated within `cacheTtlMs`, and a prompt fetched before stays in use. `text` is returned as stored, with `{{variable}}` placeholders not filled in. The fetch ignores `langfuse: false` and `LANGFUSE_ENABLED`, so a caller with its own switch checks it first.

## Example

```ts
const prompt = await getLangfusePrompt("support-agent", {
  fallback: "You are a helpful agent.",
});
await setLangfuseContext({ prompt }, () =>
  neurolink.generate({ input: { text: "hi" }, systemPrompt: prompt.text }),
);
```
