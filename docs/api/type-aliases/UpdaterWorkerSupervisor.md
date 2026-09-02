[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2649)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2650)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2651)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2652)

#### Returns

`void`
