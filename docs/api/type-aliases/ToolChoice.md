[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolChoice

# Type Alias: ToolChoice\<TOOLS\>

> **ToolChoice**\<`TOOLS`\> = `"auto"` \| `"none"` \| `"required"` \| \{ `type`: `"tool"`; `toolName`: `Extract`\<keyof `TOOLS`, `string`\>; \}

Upstream bounds this by `Record<string, unknown>`, not by `ToolSet`.

## Type Parameters

### TOOLS

`TOOLS` _extends_ `Record`\<`string`, `unknown`\>
