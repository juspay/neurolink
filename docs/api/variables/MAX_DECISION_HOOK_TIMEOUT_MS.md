[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MAX_DECISION_HOOK_TIMEOUT_MS

# Variable: MAX_DECISION_HOOK_TIMEOUT_MS

> `const` **MAX_DECISION_HOOK_TIMEOUT_MS**: `2147483647` = `2_147_483_647`

Largest `hookTimeoutMs` a timer honours (2^31 − 1 ms, about 24.8 days).
A delay past it — or `Infinity`, `NaN`, 0, a negative — fires at once,
so such a value falls back to the default instead of timing every hook
out immediately.
