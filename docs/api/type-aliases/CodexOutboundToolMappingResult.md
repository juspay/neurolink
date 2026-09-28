[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexOutboundToolMappingResult

# Type Alias: CodexOutboundToolMappingResult

> **CodexOutboundToolMappingResult** = `object`

One declared tool's mapping outcome inside `codexOutboundFallback.ts`:
the translated Claude tool, its kind (for `toolKindByName`), and any
degrade reasons collected while flattening its schema (fed to
`recordCodexOutboundSchemaDegraded` in `proxyTracer.ts`).

## Properties

### tool

> **tool**: [`ClaudeTool`](ClaudeTool.md)

---

### kind

> **kind**: [`CodexNativeToolKind`](CodexNativeToolKind.md)

---

### reasons

> **reasons**: `string`[]
