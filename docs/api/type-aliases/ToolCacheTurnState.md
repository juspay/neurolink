[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCacheTurnState

# Type Alias: ToolCacheTurnState

> **ToolCacheTurnState** = `object`

Tool-result-cache state scoped to ONE `generate()` / `stream()` turn. It
lives in an AsyncLocalStorage owned by the NeuroLink instance module, not on
the instance, so two turns running concurrently on one instance (the normal
server shape) each see only their own `disableToolCache` flag and their own
repeat-call keys, and a turn nested inside another (the tool and classifier
routers re-enter `generate()`) gets a fresh state without ending the outer
turn's.

## Properties

### disableToolCache

> **disableToolCache**: `boolean`

The turn's `disableToolCache` option: bypass the result cache entirely.

---

### keysServed

> **keysServed**: `Set`\<`string`\>

(toolName + args) keys already served during this turn. A repeat
occurrence bypasses the cache: a model re-calling a tool with identical
args in one turn wants fresh state, not the memoized first result.
