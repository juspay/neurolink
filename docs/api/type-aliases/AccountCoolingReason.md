[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCoolingReason

# Type Alias: AccountCoolingReason

> **AccountCoolingReason** = _typeof_ `ACCOUNT_COOLING_REASONS`\[`number`\]

Defined in: [types/proxy.ts:1537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1537)

Why an account is currently cooling. Drives cooldown duration and logging.

- "weekly" : 7d unified limit rejected — cool until the weekly reset.
- "session" : 5h unified limit rejected — cool until the session reset.
- "unified" : top-level unified limit rejected — cool for retry-after.
- "transient" : short per-minute/burst 429 — cool for retry-after only.
- "auth" : transient refresh failure with bounded backoff.
