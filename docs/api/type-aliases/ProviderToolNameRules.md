[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderToolNameRules

# Type Alias: ProviderToolNameRules

> **ProviderToolNameRules** = `object`

The tool names a wire accepts: `firstChars` then `allowedChars`, at most
`maxLength` characters. Character sets are regex class bodies. Another
name has each disallowed character replaced by "_", gains a leading "_"
when its first character is not allowed first, and is cut to `maxLength`.

## Properties

### firstChars

> **firstChars**: `string`

---

### allowedChars

> **allowedChars**: `string`

---

### maxLength

> **maxLength**: `number`
