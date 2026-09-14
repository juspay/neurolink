[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2949)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2950)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2951)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2952)

#### Returns

`void`
