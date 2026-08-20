[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2551)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2552)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2553)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2554)

#### Returns

`void`
