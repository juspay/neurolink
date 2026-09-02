[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2642)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2643)

#### Returns

`void`
