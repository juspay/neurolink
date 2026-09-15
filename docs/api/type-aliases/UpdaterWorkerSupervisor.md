[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:2963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2963)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2964)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2965)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:2966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2966)

#### Returns

`void`
