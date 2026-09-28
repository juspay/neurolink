[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TOOL_EVENTS_WRAPPED

# Variable: TOOL_EVENTS_WRAPPED

> `const` **TOOL_EVENTS_WRAPPED**: unique `symbol`

Own property stamped on a tool object whose `execute` already emits one
`tool:start` / `tool:end` pair per execution. It lives on the OBJECT, not
the function: later layers (the execution recorder, discovery) replace
`execute` via `{ ...tool, execute }`, which drops a function-identity check
but carries a symbol-keyed own property along.
