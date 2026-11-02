[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationErasureResult

# Type Alias: ConversationErasureResult

> **ConversationErasureResult** = `object`

Receipt returned by a confirmed permanent erasure.

## Properties

### status

> **status**: `"erased"`

---

### backend

> **backend**: `"redis-standalone"`

---

### protocol

> **protocol**: [`ConversationErasureProtocol`](ConversationErasureProtocol.md)

---

### participatingWritesFenced

> **participatingWritesFenced**: `true`

---

### strictWriteProtocol

> **strictWriteProtocol**: `true`

---

### legacyWritersFenced

> **legacyWritersFenced**: `false`

---

### sessionId

> **sessionId**: `string`

---

### userId

> **userId**: `string`

---

### namespaceDigest

> **namespaceDigest**: `string`

---

### serverRunIdDigest

> **serverRunIdDigest**: `string`

---

### storeEpochDigest

> **storeEpochDigest**: `string`

---

### evictionPolicy

> **evictionPolicy**: `"noeviction"`

---

### evictionCounter

> **evictionCounter**: `number`

---

### deletedKeys

> **deletedKeys**: `number`

---

### removedIndexMembers

> **removedIndexMembers**: `number`

---

### tombstoneExpiry

> **tombstoneExpiry**: `null`
