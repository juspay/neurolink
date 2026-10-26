# Attachment Security

Every NeuroLink call that names a file path or a URL — `input.files`,
`input.images`, `input.pdfFiles`, `rag.files`, `transcribe({ audio })`,
Director Mode segment images, the RAG `WebLoader` — turns that string into
bytes on the host that runs the SDK. This page describes what the SDK will and
will not read on a caller's behalf, how to narrow it, and what changed.

## The policy

One `attachments` option on the `NeuroLink` constructor governs all of those
loaders. Every field also has an environment variable for deployments that
cannot change constructor arguments (the CLI, containers); an explicit field
wins over its variable.

```typescript
const neurolink = new NeuroLink({
  attachments: {
    // Directories a local path may resolve into. Unset = any readable file.
    allowedRoots: ["/srv/uploads"],
    // Accept http:// URLs. Default false.
    allowInsecureUrls: false,
    // Fetch loopback / RFC 1918 / link-local / cloud-metadata targets. Default false.
    allowPrivateNetwork: false,
    // Follow redirects (up to five hops, each re-checked). Default true.
    followRedirects: true,
    // Upper bound for any single attachment read or download, in bytes.
    maxBytes: 64 * 1024 * 1024,
  },
});
```

| Field                 | Environment variable                                       | Default                  |
| --------------------- | ---------------------------------------------------------- | ------------------------ |
| `allowedRoots`        | `NEUROLINK_ATTACHMENT_ROOTS` (`:`- or `;`-separated paths) | unrestricted, warns once |
| `allowInsecureUrls`   | `NEUROLINK_ATTACHMENT_ALLOW_INSECURE_URLS=1`               | `false`                  |
| `allowPrivateNetwork` | `NEUROLINK_ATTACHMENT_ALLOW_PRIVATE_NETWORK=1`             | `false`                  |
| `followRedirects`     | `NEUROLINK_ATTACHMENT_FOLLOW_REDIRECTS=0` to disable       | `true`                   |
| `maxBytes`            | `NEUROLINK_ATTACHMENT_MAX_BYTES`                           | each loader's own cap    |

## URLs

A URL attachment is fetched the way the HTTP server already fetched one before
this change: the host is resolved and every address it resolves to is checked
against the private, loopback, link-local, CGNAT, multicast and cloud-metadata
ranges (IPv4 and IPv6, every encoding of an IP literal); the connection is
pinned to exactly those addresses, so a resolver that answers differently for
the real request gains nothing; the body is counted as it streams and refused
the moment it passes the cap.

- **HTTPS only.** An `http://` URL is refused with a message that names
  `attachments.allowInsecureUrls`. Plain HTTP is the transport every loopback
  and link-local target answers on, and it carries any credential on the
  request in the clear.
- **Public hosts only.** `http://127.0.0.1/`, `https://169.254.169.254/`,
  `https://10.0.0.5/` and a host name that resolves to any of those are
  refused unless `allowPrivateNetwork` is set. Even then the connection is
  still pinned.
- **Redirects are re-validated per hop.** Each `Location` is checked exactly
  like the first URL, and the caller's headers (`authHeaders` on a processor)
  are sent to the first host only — a credential meant for one origin is never
  replayed to the one it redirects to. `followRedirects: false` refuses any
  3xx outright, which is what the server's own download path does.
- **Capped while streaming.** `transcribe()` from a URL, the `WebLoader`, and
  every image or file URL read at most their loader's cap (or
  `attachments.maxBytes`, when lower) and stop the transfer there.

A refused URL in `input.images` is dropped with a warning, as a URL that failed
to download always was; a refused URL in `input.files`, `rag.files` or
`transcribe({ audio })` fails the call.

## Local paths

A path is resolved to its real location (symlinks followed) and, when
`allowedRoots` is set, refused unless that real path is inside one of the
roots — so a symlink planted under a root cannot reach outside it. The file is
then opened `O_NOFOLLOW` on that real path (a link swapped in after the check
is refused by the kernel), must be a regular file (no FIFOs, devices or
directories), and is read under the size cap through the same descriptor that
was measured, so a file growing under the read is noticed rather than
buffered.

**Without roots the SDK reads any file the process can.** That is the
pre-existing behaviour, kept for backward compatibility, and the SDK says so
once per process:

```
[NeuroLink] Reading a local attached file with no attachment roots configured. Any readable file on this host can be attached by naming its path. If paths come from untrusted callers, set `attachments.allowedRoots` on the NeuroLink instance or the NEUROLINK_ATTACHMENT_ROOTS environment variable.
```

**A host that forwards strings from untrusted callers must set roots.** The
HTTP server's own routes already refuse every path by default; the SDK now
gives an embedding application the same control. A path outside the roots is
refused before the file system is consulted, with the same error for a missing
file and a forbidden one, so the refusal is not an oracle for which files
exist.

## Temporary files

Attachments the SDK persists for lazy reading, video frames, Whistle decode
buffers and Director Mode clips are written into directories created with
`mkdtemp` (mode `0700`) as files with mode `0600`, and removed on `clear()` /
pipeline completion or at process exit. The local artifact store uses a
per-user directory (`neurolink-artifacts-<uid>`) and refuses one that is a
symlink or owned by another user.

## Archives and YAML

- A ZIP whose central directory names the same member twice is reported, and
  only the first occurrence is read — the entry the listing described is the
  entry that is opened. With the shipped `adm-zip` such an archive is refused
  as corrupt.
- A YAML document whose aliases expand far past its own size (a "billion
  laughs" file) is parsed as shared references, and its `asJson` rendering is
  bounded at the processor's byte limit: above it `asJson` is `null` and a
  warning says why, instead of the expansion being materialised.

## ffmpeg

Every `ffmpeg` and `ffprobe` invocation the SDK makes passes
`-nostdin -protocol_whitelist file,crypto,data` for its inputs, so a container
or playlist that references another URL or file cannot make the decoder fetch
it, whatever the installed build's defaults are. A caller-supplied file name
contributes a temp-file suffix only when it is a known video extension, and a
frame or subtitle extraction that times out kills the child instead of
abandoning it.

## Breaking changes

These defaults changed; each has an explicit switch.

| Before                                                                                  | Now                                                                         | Switch                                                                             |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `http://` URLs in `input.images`, `input.files`, `transcribe`, `WebLoader` were fetched | refused                                                                     | `attachments.allowInsecureUrls` / `NEUROLINK_ATTACHMENT_ALLOW_INSECURE_URLS=1`     |
| URLs on private, loopback or link-local hosts were fetched                              | refused                                                                     | `attachments.allowPrivateNetwork` / `NEUROLINK_ATTACHMENT_ALLOW_PRIVATE_NETWORK=1` |
| Redirects were followed to any target with the caller's headers                         | followed only to a target the policy allows, caller headers dropped per hop | `attachments.followRedirects: false` refuses them altogether                       |
| A local path was read silently                                                          | still read, but a one-time warning names `attachments.allowedRoots`         | set `allowedRoots` to make the warning go away and the boundary real               |
| Redis session/user ids were used as given                                               | ids containing `:` `*` `?` `[` or a line break are refused                  | `NEUROLINK_REDIS_ALLOW_LEGACY_IDS=1` warns instead, while migrating                |
| Google Speech-to-Text sent the API key as `?key=`                                       | sent as the `x-goog-api-key` header                                         | none needed                                                                        |
| `.env` and `.env.backup.*` written by the CLI at the umask default                      | written `0600`                                                              | none needed                                                                        |

## See also

- [Multimodal input](/docs/features/multimodal) — images, PDFs, CSV, video
- [Transcribe](/docs/features/transcribe) — `transcribe({ audio })` from a path or URL
- [RAG](/docs/features/rag) — `rag.files` and the `WebLoader`
- [Video Director Mode](/docs/features/video-director-mode) — segment images
- [Environment variables](/docs/getting-started/environment-variables)
