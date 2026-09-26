[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerStatusMessage

# Type Alias: ProxyWorkerStatusMessage

> **ProxyWorkerStatusMessage** = \{ `type`: `"proxy-worker:ready"`; `generation`: `number`; `pid`: `number`; `version`: `string`; `processInstanceId?`: `string`; `socketOfferProtocol?`: `"control-before-handle"`; `socketCommitProtocol?`: `"worker-ack"`; \} \| \{ `type`: `"proxy-worker:drained"`; `generation`: `number`; `pid`: `number`; \} \| \{ `type`: `"proxy-worker:activated"`; `generation`: `number`; `pid`: `number`; \} \| \{ `type`: `"proxy-worker:fatal"`; `generation`: `number`; `pid`: `number`; `message`: `string`; \} \| \{ `type`: `"proxy-worker:socket-accepted"`; `generation`: `number`; `pid`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:socket-committed"`; `generation`: `number`; `pid`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:replacement-requested"`; `generation`: `number`; `pid`: `number`; `reason`: `"environment"`; \}

Defined in: [types/proxy.ts:3306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3306)

## Union Members

### Type Literal

\{ `type`: `"proxy-worker:ready"`; `generation`: `number`; `pid`: `number`; `version`: `string`; `processInstanceId?`: `string`; `socketOfferProtocol?`: `"control-before-handle"`; `socketCommitProtocol?`: `"worker-ack"`; \}

#### type

> **type**: `"proxy-worker:ready"`

#### generation

> **generation**: `number`

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### processInstanceId?

> `optional` **processInstanceId?**: `string`

#### socketOfferProtocol?

> `optional` **socketOfferProtocol?**: `"control-before-handle"`

New supervisors defer sending descriptors until commit.

#### socketCommitProtocol?

> `optional` **socketCommitProtocol?**: `"worker-ack"`

New workers confirm descriptor adoption before a generation drains.

---

### Type Literal

\{ `type`: `"proxy-worker:drained"`; `generation`: `number`; `pid`: `number`; \}

---

### Type Literal

\{ `type`: `"proxy-worker:activated"`; `generation`: `number`; `pid`: `number`; \}

---

### Type Literal

\{ `type`: `"proxy-worker:fatal"`; `generation`: `number`; `pid`: `number`; `message`: `string`; \}

---

### Type Literal

\{ `type`: `"proxy-worker:socket-accepted"`; `generation`: `number`; `pid`: `number`; `socketId`: `string`; \}

---

### Type Literal

\{ `type`: `"proxy-worker:socket-committed"`; `generation`: `number`; `pid`: `number`; `socketId`: `string`; \}

---

### Type Literal

\{ `type`: `"proxy-worker:replacement-requested"`; `generation`: `number`; `pid`: `number`; `reason`: `"environment"`; \}
