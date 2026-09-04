[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2655)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2656)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2657)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2658)

#### Returns

`void`
