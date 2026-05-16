---
title: HeyGen Provider Guide (avatar)
description: Generate talking-head avatar videos via HeyGen through NeuroLink
keywords: heygen, avatar, talking-head, lip-sync, video, ai presenter
---

# HeyGen Provider Guide

**Talking-head avatar videos via HeyGen's V2 API**

---

## Overview

[HeyGen](https://www.heygen.com/) generates studio-quality avatar videos
from a portrait + script. NeuroLink dispatches via
`output: { mode: 'avatar' }`.

### Key Facts

- **Endpoints**: `POST /v2/video/generate`, `GET /v1/video_status.get`
- **Async**: Submit + poll
- **Output**: MP4 (default) / WebM
- **Requires**: HeyGen account-bound avatar id

---

## Quick Start

### 1. Get an API Key + Avatar ID

[https://app.heygen.com/settings/api](https://app.heygen.com/settings/api)
and pick an avatar id from your avatar library.

### 2. Configure

```bash
HEYGEN_API_KEY=your-key
HEYGEN_TEST_AVATAR_ID=avatar_xxx   # Optional — for the avatar test suite
```

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { writeFileSync } from "node:fs";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "vertex", // unused — driven by output.avatar
  output: {
    mode: "avatar",
    avatar: {
      provider: "heygen",
      image: "avatar_xxx", // HeyGen avatar id
      text: "Hello from NeuroLink", // HeyGen runs TTS internally
      voice: "voice_xxx", // HeyGen voice id (optional)
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
pnpm run cli generate "Hello world" \
  --provider heygen \
  --avatarImage avatar_xxx \
  --avatarVoice voice_xxx \
  --avatarOutput ./avatar.mp4
```

---

## Configuration Reference

| Environment Variable    | Required | Description                      |
| ----------------------- | -------- | -------------------------------- |
| `HEYGEN_API_KEY`        | Yes      | HeyGen API key                   |
| `HEYGEN_TEST_AVATAR_ID` | No       | Optional avatar id for test runs |

---

## See Also

- [D-ID Provider](/docs/getting-started/providers/d-id)
- [MuseTalk via Replicate](/docs/getting-started/providers/musetalk)
