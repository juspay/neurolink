[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexOutboundFailureInput

# Type Alias: CodexOutboundFailureInput

> **CodexOutboundFailureInput** = `object`

What a single insertion point in `codexProxyRoutes.ts` observed.

## Properties

### failureClass

> **failureClass**: [`CodexOutboundFailureClass`](CodexOutboundFailureClass.md)

---

### transportErrorCode?

> `optional` **transportErrorCode?**: `string`

Present only for `non_retryable_transport`: the transport error code
(e.g. `ECONNREFUSED`) that was NOT in the retryable allow-list.

---

### lastStatus?

> `optional` **lastStatus?**: `number`

Present only for `loop_fallthrough`: the raw HTTP status the last
exhausted account attempt ended on (`lastErrorStatus` at the account-loop
call site). A 401/403 there is a Codex credential failure and stays
eligible; any other 4xx except 429 rejects the request itself.

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Present only for `loop_fallthrough`: the error code the last exhausted
account attempt reported, when it reported one. A code
`classifyProxyFailureCode` marks non-retryable (content policy, invalid
request) makes the failure ineligible whatever the status.
