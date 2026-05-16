---
title: D-ID Provider Guide (avatar)
description: Generate lip-synced talking-head videos via the D-ID Talks API
keywords: d-id, did, avatar, talking head, lip-sync, presenter
---

# D-ID Provider Guide

**Lip-synced talking-head videos via the D-ID `/talks` API**

---

## Overview

[D-ID](https://www.d-id.com/) turns a still portrait + narration into a
talking head. NeuroLink dispatches via `output: { mode: 'avatar' }`
with `provider: 'd-id'`.

### Key Facts

- **Endpoint**: `POST https://api.d-id.com/talks`
- **Auth**: HTTP Basic with the API key as the user
- **Async**: Submit + poll
- **Output**: MP4

---

## Quick Start

### 1. Get an API Key

[https://studio.d-id.com/account-settings](https://studio.d-id.com/account-settings)

### 2. Configure

```bash
DID_API_KEY=your-d-id-key
```

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync, readFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "vertex",
  output: {
    mode: "avatar",
    avatar: {
      provider: "d-id",
      image: readFileSync("./portrait.jpg"), // Buffer | path | URL
      text: "Hello, this is your AI presenter.",
      ttsProvider: "openai-tts",
      voice: "alloy",
    },
  },
});
if (result.avatar?.buffer) {
  writeFileSync("./talk.mp4", result.avatar.buffer);
}
```

---

## CLI Usage

```bash
pnpm run cli generate "Hello world" \
  --provider d-id \
  --avatarImage ./portrait.jpg \
  --avatarText "Welcome to NeuroLink" \
  --avatarOutput ./talk.mp4
```

---

## Configuration Reference

| Environment Variable | Required | Description  |
| -------------------- | -------- | ------------ |
| `DID_API_KEY`        | Yes      | D-ID API key |

---

## See Also

- [HeyGen Provider](/docs/getting-started/providers/heygen)
- [MuseTalk via Replicate](/docs/getting-started/providers/musetalk)
