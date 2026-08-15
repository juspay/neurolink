[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DistributableTask

# Type Alias: DistributableTask

> **DistributableTask** = `object`

Defined in: [types/agentNetwork.ts:1354](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1354)

Task definition for distribution

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:1356](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1356)

Unique task ID

---

### input

> **input**: `string`

Defined in: [types/agentNetwork.ts:1359](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1359)

Task description/input

---

### priority

> **priority**: [`TaskPriority`](TaskPriority.md)

Defined in: [types/agentNetwork.ts:1362](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1362)

Task priority

---

### requiredSkills?

> `optional` **requiredSkills?**: `string`[]

Defined in: [types/agentNetwork.ts:1365](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1365)

Required skills/capabilities

---

### preferredAgent?

> `optional` **preferredAgent?**: `string`

Defined in: [types/agentNetwork.ts:1368](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1368)

Preferred agent (for affinity)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:1371](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1371)

Task metadata

---

### deadline?

> `optional` **deadline?**: `number`

Defined in: [types/agentNetwork.ts:1374](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1374)

Deadline timestamp

---

### parentTaskId?

> `optional` **parentTaskId?**: `string`

Defined in: [types/agentNetwork.ts:1377](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1377)

Parent task ID (for subtasks)

---

### dependencies?

> `optional` **dependencies?**: `string`[]

Defined in: [types/agentNetwork.ts:1380](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1380)

Dependencies (task IDs)
