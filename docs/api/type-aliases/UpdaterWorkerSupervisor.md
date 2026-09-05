[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2661)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2662)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2663)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2664)

#### Returns

`void`
