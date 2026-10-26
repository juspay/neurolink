[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AttachmentsConfig

# Type Alias: AttachmentsConfig

> **AttachmentsConfig** = `object`

`new NeuroLink({ attachments })` — what an instance may read or fetch on a
caller's behalf.

Every field also has an environment variable for deployments that cannot
change constructor arguments (the CLI, containers). An explicit field wins
over its variable.

| Field                 | Environment variable                                        | Default                   |
| --------------------- | ----------------------------------------------------------- | ------------------------- |
| `allowedRoots`        | `NEUROLINK_ATTACHMENT_ROOTS` (path-list, `:`/`;` separated) | unrestricted (warns once) |
| `allowInsecureUrls`   | `NEUROLINK_ATTACHMENT_ALLOW_INSECURE_URLS=1`                | `false`                   |
| `allowPrivateNetwork` | `NEUROLINK_ATTACHMENT_ALLOW_PRIVATE_NETWORK=1`              | `false`                   |
| `followRedirects`     | `NEUROLINK_ATTACHMENT_FOLLOW_REDIRECTS=0`                   | `true`                    |
| `maxBytes`            | `NEUROLINK_ATTACHMENT_MAX_BYTES`                            | each loader's own cap     |

## Properties

### allowedRoots?

> `optional` **allowedRoots?**: `string`[]

Directories a local file path may resolve into. Containment is checked on
the real (symlink-resolved) path of both the root and the target, and the
file is opened `O_NOFOLLOW` on that real path, so a symlink planted under
a root cannot reach outside it. Unset means any readable file — the
pre-hardening behaviour — and the SDK warns once per process when it
reads a path without roots. A host that forwards strings from untrusted
callers must set this.

---

### allowInsecureUrls?

> `optional` **allowInsecureUrls?**: `boolean`

Accept `http://` attachment URLs. Default `false`: plain HTTP carries the
bytes — and any credentials on the request — in the clear, and is the
transport every loopback and link-local target answers on.

---

### allowPrivateNetwork?

> `optional` **allowPrivateNetwork?**: `boolean`

Fetch URLs whose host is, or resolves to, a loopback, RFC 1918,
link-local, CGNAT, multicast or cloud-metadata address. Default `false`.
The connection is still pinned to the resolved addresses.

---

### followRedirects?

> `optional` **followRedirects?**: `boolean`

Follow HTTP redirects (up to five hops). Default `true`. Every hop is
re-validated against the same URL policy, and caller-supplied headers
(`authHeaders`) are never sent to a redirect target.

---

### maxBytes?

> `optional` **maxBytes?**: `number`

Upper bound, in bytes, for any single attachment read or download. A
loader's own cap still applies when it is lower.
