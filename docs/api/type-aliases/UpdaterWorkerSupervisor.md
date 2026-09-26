[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisor

# Type Alias: UpdaterWorkerSupervisor

> **UpdaterWorkerSupervisor** = `object`

Defined in: [types/proxy.ts:3280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3280)

Handle used by the proxy process to inspect and stop updater supervision.

## Properties

### currentPid

> **currentPid**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3281)

#### Returns

`number` \| `undefined`

---

### checkNow

> **checkNow**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3282)

#### Returns

`number` \| `undefined`

---

### stop

> **stop**: () => `void`

Defined in: [types/proxy.ts:3283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3283)

#### Returns

`void`
