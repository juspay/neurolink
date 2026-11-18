[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfusePrompt

# Type Alias: LangfusePrompt

> **LangfusePrompt** = [`LangfusePromptRef`](LangfusePromptRef.md) & `object`

## Type Declaration

### text

> **text**: `string`

Prompt text to send to the model.

### isFallback

> **isFallback**: `boolean`

## Description

A text prompt resolved by `getLangfusePrompt`. `isFallback` is `true` when `text` is the caller's fallback, which carries no `version`.
