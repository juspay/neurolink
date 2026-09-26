[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OutlineSection

# Type Alias: OutlineSection

> **OutlineSection** = `object`

A section in a file outline (used for code, PDFs, spreadsheets)

## Properties

### name

> **name**: `string`

Section heading/name (e.g., function name, class name, sheet name)

---

### kind

> **kind**: `string`

Type of section (function, class, import, sheet, page, heading)

---

### startLine

> **startLine**: `number`

Starting line number (1-indexed)

---

### endLine

> **endLine**: `number`

Ending line number (1-indexed)

---

### depth

> **depth**: `number`

Nesting depth (0 = top-level)

---

### children?

> `optional` **children?**: `OutlineSection`[]

Child sections (e.g., methods within a class)
