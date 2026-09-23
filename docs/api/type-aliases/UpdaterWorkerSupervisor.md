[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:3210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3210)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3211)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3212)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:3213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3213)

#### Returns

`void`
