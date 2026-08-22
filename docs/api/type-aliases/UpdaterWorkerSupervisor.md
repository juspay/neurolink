[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2541)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2542)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2543)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2544)

#### Returns

`void`
