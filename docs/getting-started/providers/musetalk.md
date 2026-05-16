---
title: MuseTalk Provider Guide (avatar via Replicate)
description: Generate lip-synced talking-head videos via the MuseTalk model on Replicate
keywords: musetalk, replicate, lip-sync, avatar, talking-head
---

# MuseTalk Provider Guide

**Lip-synced avatar videos via the MuseTalk model on Replicate**

---

## Overview

MuseTalk is a low-latency open-source lip-sync model hosted on Replicate.
NeuroLink wraps it under `output.avatar.provider = "musetalk"`.

### Key Facts

- **Hosting**: Replicate Predictions API
- **Model**: e.g. `cjwbw/musetalk:...`
- **Async**: Submit + poll
- **Output**: MP4

---

## Quick Start

### 1. Get a Replicate Token

[https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)

### 2. Configure

```bash
REPLICATE_API_TOKEN=r8_your-token
```

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync, writeFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "vertex",
  output: {
    mode: "avatar",
    avatar: {
      provider: "musetalk", // routes to Replicate-hosted MuseTalk
      image: readFileSync("./portrait.jpg"),
      audio: readFileSync("./narration.mp3"),
    },
  },
});
if (result.avatar?.buffer) {
  writeFileSync("./avatar.mp4", result.avatar.buffer);
}
```

---

## CLI Usage

```bash
pnpm run cli generate "" \
  --provider musetalk \
  --avatarImage ./portrait.jpg \
  --avatarAudio ./narration.mp3 \
  --avatarOutput ./avatar.mp4
```

---

## Configuration Reference

| Environment Variable  | Required | Description              |
| --------------------- | -------- | ------------------------ |
| `REPLICATE_API_TOKEN` | Yes      | Replicate token (shared) |

---

## See Also

- [HeyGen Provider](/docs/getting-started/providers/heygen)
- [D-ID Provider](/docs/getting-started/providers/d-id)
- [Replicate Provider](/docs/getting-started/providers/replicate)
