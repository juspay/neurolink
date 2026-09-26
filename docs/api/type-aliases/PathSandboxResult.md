[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PathSandboxResult

# Type Alias: PathSandboxResult

> **PathSandboxResult** = \{ `path`: `string`; `error?`: `undefined`; \} \| \{ `path?`: `undefined`; `error`: `string`; \}

Outcome of a containment check. Exactly one branch is present, so a caller
that forgets to check `error` cannot accidentally read a path that was
refused.
