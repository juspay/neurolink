[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolChoice

# Type Alias: ToolChoice\<TOOLS\>

> **ToolChoice**\<`TOOLS`\> = `"auto"` \| `"none"` \| `"required"` \| \{ `type`: `"tool"`; `toolName`: `Extract`\<keyof `TOOLS`, `string`\>; \}

Defined in: [types/aiCompat.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L173)

Upstream bounds this by `Record<string, unknown>`, not by `ToolSet`.

## Type Parameters

### TOOLS

`TOOLS` _extends_ `Record`\<`string`, `unknown`\>
