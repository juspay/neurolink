[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`
