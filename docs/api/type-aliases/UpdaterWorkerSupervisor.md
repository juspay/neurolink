[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:3213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3213)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3214)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3215)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:3216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3216)

#### Returns

`void`
