[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:3330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3330)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3331)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3332)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:3333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3333)

#### Returns

`void`
