[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupervisionOptions

# Type Alias: SupervisionOptions

> **SupervisionOptions** = `object`

Defined in: [types/agentNetwork.ts:1003](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1003)

Supervision options

## Properties

### enforceApproval?

> `optional` **enforceApproval?**: `boolean`

Defined in: [types/agentNetwork.ts:1005](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1005)

Whether to enforce approval

---

### approvalTimeout?

> `optional` **approvalTimeout?**: `number`

Defined in: [types/agentNetwork.ts:1008](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1008)

Timeout for approval

---

### timeoutBehavior?

> `optional` **timeoutBehavior?**: `"reject"` \| `"approve"` \| `"escalate"`

Defined in: [types/agentNetwork.ts:1011](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1011)

Fallback behavior on timeout
