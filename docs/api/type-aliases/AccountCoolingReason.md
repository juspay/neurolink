[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCoolingReason

# Type Alias: AccountCoolingReason

> **AccountCoolingReason** = _typeof_ `ACCOUNT_COOLING_REASONS`\[`number`\]

Defined in: [types/proxy.ts:1421](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1421)

Why an account is currently cooling. Drives cooldown duration and logging.

- "weekly" : 7d unified limit rejected — cool until the weekly reset.
- "session" : 5h unified limit rejected — cool until the session reset.
- "unified" : top-level unified limit rejected — cool for retry-after.
- "transient" : short per-minute/burst 429 — cool for retry-after only.
- "auth" : transient refresh failure with bounded backoff.
