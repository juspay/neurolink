[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexNativeLoopPart

# Type Alias: VertexNativeLoopPart

> **VertexNativeLoopPart** = [`VertexNativePart`](VertexNativePart.md) \| \{ `functionCall`: \{ `name`: `string`; `args`: `Record`\<`string`, `unknown`\>; \}; \} \| \{ `functionResponse`: \{ `name`: `string`; `response`: `Record`\<`string`, `unknown`\>; \}; \}

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

Part variants that ride the native Gemini agentic tool loop in addition to
the plain `VertexNativePart` content shapes: model-issued function calls
replayed into history, and the function responses (plus wrap-up nudge text
parts) sent back on the next user turn. Mirrors the optional
`functionCall` / `functionResponse` members of the @google/genai SDK's
`Part` type, so loop contents stay directly assignable to the SDK payload.
