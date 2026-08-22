[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCoolingReason

# Type Alias: AccountCoolingReason

> **AccountCoolingReason** = _typeof_ `ACCOUNT_COOLING_REASONS`\[`number`\]

Defined in: [types/proxy.ts:1439](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1439)

Why an account is currently cooling. Drives cooldown duration and logging.

- "weekly" : 7d unified limit rejected — cool until the weekly reset.
- "session" : 5h unified limit rejected — cool until the session reset.
- "unified" : top-level unified limit rejected — cool for retry-after.
- "transient" : short per-minute/burst 429 — cool for retry-after only.
- "auth" : transient refresh failure with bounded backoff.
