## [9.55.2](https://github.com/juspay/neurolink/compare/v9.55.1...v9.55.2) (2026-04-18)

## [9.55.1](https://github.com/juspay/neurolink/compare/v9.55.0...v9.55.1) (2026-04-18)

## [9.55.0](https://github.com/juspay/neurolink/compare/v9.54.9...v9.55.0) (2026-04-18)

### Features

- **(gemini3):** add support for conversation memory for gemini 3 models ([0459627](https://github.com/juspay/neurolink/commit/0459627c7612343ad3fc462cea4036c993ace0fd))

## [9.54.9](https://github.com/juspay/neurolink/compare/v9.54.8...v9.54.9) (2026-04-18)

## [9.54.8](https://github.com/juspay/neurolink/compare/v9.54.7...v9.54.8) (2026-04-18)

### Bug Fixes

- **(tools):** tool filter not working ([a026921](https://github.com/juspay/neurolink/commit/a0269210c02d6970a51c64e48b9b5c716fcd6e3a))

## [9.54.7](https://github.com/juspay/neurolink/compare/v9.54.6...v9.54.7) (2026-04-18)

## [9.54.6](https://github.com/juspay/neurolink/compare/v9.54.5...v9.54.6) (2026-04-15)

## [9.54.5](https://github.com/juspay/neurolink/compare/v9.54.4...v9.54.5) (2026-04-15)

### Bug Fixes

- **(proxy):** eliminate fabricated 429 storm, harden launchd service lifecycle ([9ef0505](https://github.com/juspay/neurolink/commit/9ef0505af5db801bcadd1a2e47a0c0423957a3c4))

## [9.54.4](https://github.com/juspay/neurolink/compare/v9.54.3...v9.54.4) (2026-04-14)

## [9.54.3](https://github.com/juspay/neurolink/compare/v9.54.2...v9.54.3) (2026-04-13)

### Bug Fixes

- **(sdk):** schema-driven tool call repair, graceful abort, fallback provider (BZ-665, BZ-667, BZ-1341) ([fd74ae4](https://github.com/juspay/neurolink/commit/fd74ae4cf91f671ede17f8f9692a6c9dd7268d6a))

## [9.54.2](https://github.com/juspay/neurolink/compare/v9.54.1...v9.54.2) (2026-04-12)

### Bug Fixes

- **(proxy):** resolve 3 production bugs from Curator monitoring ([e458057](https://github.com/juspay/neurolink/commit/e4580574fbe69541bd0c5a06e10ec025e39e19cf))

## [9.54.1](https://github.com/juspay/neurolink/compare/v9.54.0...v9.54.1) (2026-04-12)

### Bug Fixes

- **(auth):** always display OAuth URL for remote device compatibility ([922daa7](https://github.com/juspay/neurolink/commit/922daa7b32c6b22d426bb644ef85a43a72509478))

## [9.54.0](https://github.com/juspay/neurolink/compare/v9.53.0...v9.54.0) (2026-04-12)

### Features

- **(voice):** add real-time voice agent server ([f0d298d](https://github.com/juspay/neurolink/commit/f0d298d6f8f303c3df34c7ff77b175d47f6f3f10))

## [9.53.0](https://github.com/juspay/neurolink/compare/v9.52.0...v9.53.0) (2026-04-12)

### Features

- **(autoresearch):** add autonomous experiment engine with scheduling and docs ([22be8c8](https://github.com/juspay/neurolink/commit/22be8c857940eeb7c42e8581483d1244ef890158))

## [9.52.0](https://github.com/juspay/neurolink/compare/v9.51.4...v9.52.0) (2026-04-12)

### Features

- **(credentials):** add per-request and per-instance credential support for all providers ([edd07bb](https://github.com/juspay/neurolink/commit/edd07bb5475d4ef33a9ce29915913ebcd8a6904b))

## [9.51.4](https://github.com/juspay/neurolink/compare/v9.51.3...v9.51.4) (2026-04-12)

### Bug Fixes

- **(mcp):** large-response externalization, retrieve_context tool, and exec cleanup ([8e802d9](https://github.com/juspay/neurolink/commit/8e802d99782b7c365557fbaeeb67bc77a8aab9f1))

## [9.51.3](https://github.com/juspay/neurolink/compare/v9.51.2...v9.51.3) (2026-04-12)

### Bug Fixes

- **(sdk):** prevent tool result context overflow, dedupe tool calls, animate CLI stream output ([211ea9d](https://github.com/juspay/neurolink/commit/211ea9d56beaf87219185f21df554b6d22fd1240))

## [9.51.2](https://github.com/juspay/neurolink/compare/v9.51.1...v9.51.2) (2026-04-11)

### Bug Fixes

- **(proxy):** full OAuth betas through proxy, explicit baseURL, and lower cooldown floor ([2014aee](https://github.com/juspay/neurolink/commit/2014aee8a3fc36dfdc474f59dc0cfdf9395cd140))

## [9.51.1](https://github.com/juspay/neurolink/compare/v9.51.0...v9.51.1) (2026-04-10)

### Bug Fixes

- **(sdk):** call stack exceeded fix for large base64 images ([c8286e1](https://github.com/juspay/neurolink/commit/c8286e145596fe3d4f957511a2a69ca3f022e57c))

## [9.51.0](https://github.com/juspay/neurolink/compare/v9.50.2...v9.51.0) (2026-04-10)

### Features

- **(proxy):** add --dev flag for isolated local proxy instances ([f9c0a35](https://github.com/juspay/neurolink/commit/f9c0a35b91d528750adca5ae241b87fbf0f0bfbc))

## [9.50.2](https://github.com/juspay/neurolink/compare/v9.50.1...v9.50.2) (2026-04-09)

### Bug Fixes

- **(sdk):** curator production fixes — compaction, timeout, MCP events, Langfuse ([220b582](https://github.com/juspay/neurolink/commit/220b582bee0b7b141d5d1d1ec680d040284385fd))

## [9.50.1](https://github.com/juspay/neurolink/compare/v9.50.0...v9.50.1) (2026-04-09)

### Bug Fixes

- **(proxy):** streaming fallback reliability and observability ([0b75a2b](https://github.com/juspay/neurolink/commit/0b75a2bd7720189c0206a7a547ff32c0a6500062))

## [9.50.0](https://github.com/juspay/neurolink/compare/v9.49.0...v9.50.0) (2026-04-08)

### Features

- **(image-compression):** add sharp-based compression for AI providers ([75645bf](https://github.com/juspay/neurolink/commit/75645bf69d9eb21bf46763c5b058cb92146c71f2)), closes [#553](https://github.com/juspay/neurolink/issues/553)

## [9.49.0](https://github.com/juspay/neurolink/compare/v9.48.3...v9.49.0) (2026-04-08)

### Features

- **(redis):** add URL-based connection support with TLS ([0b22f46](https://github.com/juspay/neurolink/commit/0b22f46d2c1783fac2bbd5eba62c7f34967fb4ff))

## [9.48.3](https://github.com/juspay/neurolink/compare/v9.48.2...v9.48.3) (2026-04-08)

### Bug Fixes

- **(ci):** upgrade to npm 11 for native OIDC publish support ([e25fedb](https://github.com/juspay/neurolink/commit/e25fedb74845322fc44509ebf076834d1a02abfd))

## [9.48.2](https://github.com/juspay/neurolink/compare/v9.48.1...v9.48.2) (2026-04-08)

### Bug Fixes

- **(release):** remove npm downgrade that breaks OIDC token persistence ([0ba4e22](https://github.com/juspay/neurolink/commit/0ba4e223af87e8f1dde31f2eb1d425ce4da3e985))

## [9.48.1](https://github.com/juspay/neurolink/compare/v9.48.0...v9.48.1) (2026-04-06)

### Bug Fixes

- **(types):** update index to export directly from multimodal (fixes [#275](https://github.com/juspay/neurolink/issues/275)) ([739ad2a](https://github.com/juspay/neurolink/commit/739ad2aa91d9766f098bb7d804de6fbb00d1c9d8))

## [9.48.0](https://github.com/juspay/neurolink/compare/v9.47.0...v9.48.0) (2026-04-05)

### Features

- **(docs):** generate unique OG images per page for rich social previews ([cb1998d](https://github.com/juspay/neurolink/commit/cb1998d5f4c57e17c1b7a7619516f98020112afe))

## [9.47.0](https://github.com/juspay/neurolink/compare/v9.46.1...v9.47.0) (2026-04-04)

### Features

- **(observability):** auto-write OTEL endpoint to ~/.neurolink/.env on telemetry setup ([a6e56f3](https://github.com/juspay/neurolink/commit/a6e56f392b66005bbd4bbfeeff952aefebf172d4))

## [9.46.1](https://github.com/juspay/neurolink/compare/v9.46.0...v9.46.1) (2026-04-04)

### Bug Fixes

- **(proxy):** PID-scoped token store temp files and dynamic launchd PATH ([dc63fa8](https://github.com/juspay/neurolink/commit/dc63fa80690d214105ccc42705bac7b821395b52))

## [9.46.0](https://github.com/juspay/neurolink/compare/v9.45.0...v9.46.0) (2026-04-04)

### Features

- **(image):** add extension whitelist validation utilities (IMG-021) ([1cfdf30](https://github.com/juspay/neurolink/commit/1cfdf30aeb57ea3566ad4c4837de6f27228514ae))

## [9.45.0](https://github.com/juspay/neurolink/compare/v9.44.1...v9.45.0) (2026-04-04)

### Features

- **(image):** implement JPEG dimension extraction via SOF marker parsing ([9fac5cb](https://github.com/juspay/neurolink/commit/9fac5cb883fcd1a3550160ecc546146ccc3a3407))

### Bug Fixes

- **(ci):** pin npm to v10 instead of latest in release workflow ([357ccf3](https://github.com/juspay/neurolink/commit/357ccf36b8a038a29b11b67988b3c30192fcc636))
- **(mb):** Make text optional when multimodal content present ([ae12580](https://github.com/juspay/neurolink/commit/ae125808cc9853e56ef62957210332da702695e4))
- **(utils):** add content-length:0 validation in URL downloader ([8fcb795](https://github.com/juspay/neurolink/commit/8fcb795e28fb3687341eb4e3853479a1bdc2d7f7)), closes [#549](https://github.com/juspay/neurolink/issues/549)

## [9.44.1](https://github.com/juspay/neurolink/compare/v9.44.0...v9.44.1) (2026-04-03)

## [9.44.0](https://github.com/juspay/neurolink/compare/v9.43.0...v9.44.0) (2026-04-02)

### Features

- **(demo):** display neurolink features in demo code ([b13e995](https://github.com/juspay/neurolink/commit/b13e99586a30b87bfda3bfcf9378e7a420fd18ed))

## [9.43.0](https://github.com/juspay/neurolink/compare/v9.42.1...v9.43.0) (2026-04-02)

### Features

- **(proxy):** harden fallback chain, add readiness checks, normalize tool schemas ([ddf34de](https://github.com/juspay/neurolink/commit/ddf34de7b7549a48d48989fd01598cd28b1f3df0))

## [9.42.1](https://github.com/juspay/neurolink/compare/v9.42.0...v9.42.1) (2026-04-02)

## [9.42.0](https://github.com/juspay/neurolink/compare/v9.41.0...v9.42.0) (2026-04-01)

### Features

- **(proxy):** add OTLP observability, passthrough mode, and env-file support ([59ae70b](https://github.com/juspay/neurolink/commit/59ae70b9a33089f04addce63eb9e6151dcc97a0f))

## [9.41.0](https://github.com/juspay/neurolink/compare/v9.40.0...v9.41.0) (2026-03-30)

### Features

- **(tasks):** add TaskManager — scheduled and self-running AI tasks ([773a090](https://github.com/juspay/neurolink/commit/773a090bcabb5c5a3dc132afa079494a121c933e))

## [9.40.0](https://github.com/juspay/neurolink/compare/v9.39.0...v9.40.0) (2026-03-30)

### Features

- **(memory):** implement multi-user memory retrieval and storage with customizable prompts ([b1f2723](https://github.com/juspay/neurolink/commit/b1f2723f3efe0c99a63cddfff1885e01d5c82575))

## [9.39.0](https://github.com/juspay/neurolink/compare/v9.38.0...v9.39.0) (2026-03-29)

### Features

- **(proxy):** add OAuth polyfill for non-Claude-Code clients ([bea68f1](https://github.com/juspay/neurolink/commit/bea68f1f9d6d1c924743f0ff6c43c1ec794fdd43))

## [9.38.0](https://github.com/juspay/neurolink/compare/v9.37.0...v9.38.0) (2026-03-28)

### Features

- **(deps):** reduce dependency size — CLI bundle, mediabunny, slim OTEL ([3e41b4b](https://github.com/juspay/neurolink/commit/3e41b4b453d84e724bc38846745e8c8c91a94c4c))

## [9.37.0](https://github.com/juspay/neurolink/compare/v9.36.1...v9.37.0) (2026-03-28)

### Features

- **(eval):** add modular evaluation scoring system with 14 scorers, pipelines, and CLI ([b2a863a](https://github.com/juspay/neurolink/commit/b2a863ad9164bf402614dda1746556625a3e620c))

## [9.36.1](https://github.com/juspay/neurolink/compare/v9.36.0...v9.36.1) (2026-03-28)

### Bug Fixes

- **(proxy):** change default strategy from round-robin to fill-first ([067ec34](https://github.com/juspay/neurolink/commit/067ec34044e2bce162e78dca2ebe104aed1560e2))

## [9.36.0](https://github.com/juspay/neurolink/compare/v9.35.0...v9.36.0) (2026-03-28)

### Features

- **(proxy):** add auto-update with traffic-aware graceful restart ([4a11a78](https://github.com/juspay/neurolink/commit/4a11a783adb4424d7a303b298c6cf9989cd4ed63))

## [9.35.0](https://github.com/juspay/neurolink/compare/v9.34.0...v9.35.0) (2026-03-28)

### Features

- **(proxy):** add auto-update with traffic-aware graceful restart ([e0ea718](https://github.com/juspay/neurolink/commit/e0ea71891f51cf3d0f1f4fbc0044efc839359eaf))

## [9.34.0](https://github.com/juspay/neurolink/compare/v9.33.0...v9.34.0) (2026-03-27)

### Features

- **(browser):** add browser-compatible bundle for client-side SDK usage ([85089db](https://github.com/juspay/neurolink/commit/85089dbc9bef912e6c3acbec729d2d4d0ac17829))

## [9.33.0](https://github.com/juspay/neurolink/compare/v9.32.1...v9.33.0) (2026-03-27)

### Features

- **(memory):** add per-call memory control options (read/write) for generate and stream in NeuroLink ([c9a354b](https://github.com/juspay/neurolink/commit/c9a354b2b3197a78a42d2a19f25757792467023f))

## [9.32.1](https://github.com/juspay/neurolink/compare/v9.32.0...v9.32.1) (2026-03-27)

### Bug Fixes

- **(proxy):** improve stability with timeout, stream safety, and launchd fixes ([393f32b](https://github.com/juspay/neurolink/commit/393f32bc3f8c07651d4da06b2501bc5358664100))

## [9.32.0](https://github.com/juspay/neurolink/compare/v9.31.2...v9.32.0) (2026-03-25)

### Features

- **(auth):** add authentication providers system with 12 providers, middleware, RBAC, and session management ([97dabd9](https://github.com/juspay/neurolink/commit/97dabd9f58b3506d13faa626359b5c9e0b1cadd9))

## [9.31.2](https://github.com/juspay/neurolink/compare/v9.31.1...v9.31.2) (2026-03-25)

### Bug Fixes

- **(proxy):** skip launchd guard when launched by launchd itself ([183996d](https://github.com/juspay/neurolink/commit/183996d40e6c718d87f1a0d3ccfc6107328cd728))

## [9.31.1](https://github.com/juspay/neurolink/compare/v9.31.0...v9.31.1) (2026-03-25)

### Bug Fixes

- **(proxy):** use stored tokenType instead of prefix heuristic for OAuth detection ([49b8db2](https://github.com/juspay/neurolink/commit/49b8db276e774dde30711603ac2d8632f1a3a0c7))

## [9.31.0](https://github.com/juspay/neurolink/compare/v9.30.0...v9.31.0) (2026-03-25)

### Features

- **(client):** add client SDKs with HTTP client, React hooks, and AI SDK adapter ([610db38](https://github.com/juspay/neurolink/commit/610db38cc2f65ba0f6e2ddb9bfc17c58e2cb8523))
- **(proxy):** add Claude proxy with multi-account OAuth pooling ([138cf67](https://github.com/juspay/neurolink/commit/138cf6709ce587564907e7ca07e38b39fdc245a8))
- **(tools):** add per-tool timeout, maxRetries at registration and error category metrics ([9ff1075](https://github.com/juspay/neurolink/commit/9ff1075fc6713bbf3c2f4c717da75b7b698c4eca))

### Bug Fixes

- **(mcp):** structured circuit breaker errors to prevent AI retry storms ([ac3afe7](https://github.com/juspay/neurolink/commit/ac3afe788a2d75bb7c0d14f0da723ec3205d99ad))
- **(proxy):** crash recovery with launchd daemon, guard restart, and setup overhaul ([2eb5a36](https://github.com/juspay/neurolink/commit/2eb5a36fcede356d4f9e12550fc314144cea1e3b))
- **(sdk):** Zod 4 migration, AI SDK v6 upgrade, security hardening, and dependency updates ([042181a](https://github.com/juspay/neurolink/commit/042181aef49e1e8b8b2b762564119d5cc1bbd807))

## [9.30.0](https://github.com/juspay/neurolink/compare/v9.29.1...v9.30.0) (2026-03-21)

### Features

- **(middleware):** add lifecycle middleware with onFinish, onError, onChunk callbacks ([2d23087](https://github.com/juspay/neurolink/commit/2d230879272a8e67fd936ff087b232bb25f612c0))

## [9.29.1](https://github.com/juspay/neurolink/compare/v9.29.0...v9.29.1) (2026-03-20)

### Bug Fixes

- **(tool):** fix tool response data as undefined bug ([049336d](https://github.com/juspay/neurolink/commit/049336d9a9c91af89041da97ca2029e0050a8c38))

## [9.29.0](https://github.com/juspay/neurolink/compare/v9.28.1...v9.29.0) (2026-03-19)

### Features

- **(observability):** add OTEL instrumentation, observability exporters, and comprehensive test suite fixes ([095a774](https://github.com/juspay/neurolink/commit/095a7748b08edac4c34467e2a72caff4426a65bd))

## [9.28.1](https://github.com/juspay/neurolink/compare/v9.28.0...v9.28.1) (2026-03-18)

### Bug Fixes

- **(docs):** comprehensive documentation audit, code example fixes, and model updates ([f294ff2](https://github.com/juspay/neurolink/commit/f294ff2eef71a09e271c5dc536a9d00d97cfd5e5))

## [9.28.0](https://github.com/juspay/neurolink/compare/v9.27.0...v9.28.0) (2026-03-18)

### Features

- **(mcp):** add MCP enhancement modules with routing, caching, batching, and wire into core SDK ([ee8a0b8](https://github.com/juspay/neurolink/commit/ee8a0b8e5e33dcafe44d33944bf9ff99ef59701a))

## [9.27.0](https://github.com/juspay/neurolink/compare/v9.26.2...v9.27.0) (2026-03-18)

### Features

- **(memory):** add CustomStorageConfig type to Hippocampus integration ([dfcea2b](https://github.com/juspay/neurolink/commit/dfcea2b04834a86812f13c5d85ad3d7b9ab530a7))

## [9.26.2](https://github.com/juspay/neurolink/compare/v9.26.1...v9.26.2) (2026-03-18)

### Bug Fixes

- **(providers):** fix Gemini 3.1 native SDK tool calling, streaming, and multimodal on Vertex global endpoint ([b95089a](https://github.com/juspay/neurolink/commit/b95089a5bc900b38678b919a6ae2567c9500ca8b))

## [9.26.1](https://github.com/juspay/neurolink/compare/v9.26.0...v9.26.1) (2026-03-16)

### Bug Fixes

- **(tests):** remove redundant vitest test cases, keep only continuous test suites ([625ecd6](https://github.com/juspay/neurolink/commit/625ecd684ec47919d3b79a8c1e907f8cb114a991))

## [9.26.0](https://github.com/juspay/neurolink/compare/v9.25.2...v9.26.0) (2026-03-16)

### Features

- **(core):** production reliability fixes, bash tool, and LiteLLM vision tests (NL-001–NL-007) ([9a915e6](https://github.com/juspay/neurolink/commit/9a915e6f00e1e54e31967e47893f3b24e40eaad9))

## [9.25.2](https://github.com/juspay/neurolink/compare/v9.25.1...v9.25.2) (2026-03-15)

### Bug Fixes

- **(core):** remove hardcoded Ollama model and unsafe type assertions (BZ-463) ([f12e03b](https://github.com/juspay/neurolink/commit/f12e03bfef007464d27c36b44694c5c4c799c6ea))

## [9.25.1](https://github.com/juspay/neurolink/compare/v9.25.0...v9.25.1) (2026-03-15)

### Bug Fixes

- **(observability):** address code review findings from PR [#860](https://github.com/juspay/neurolink/issues/860) ([1655c7e](https://github.com/juspay/neurolink/commit/1655c7ef6991eb104834e10fa7d21516539ea16d))

## [9.25.0](https://github.com/juspay/neurolink/compare/v9.24.0...v9.25.0) (2026-03-15)

### Features

- **(observability):** add OTEL instrumentation, observability exporters, and comprehensive test suite fixes ([66c4559](https://github.com/juspay/neurolink/commit/66c45592cfcf5ae5acbec0513231f48e87044dab))

## [9.24.0](https://github.com/juspay/neurolink/compare/v9.23.0...v9.24.0) (2026-03-14)

### Features

- **(ppt):** Implement CLI support for PPT Gen ([83e6847](https://github.com/juspay/neurolink/commit/83e684781b04562970bcd48f617d368d1c4db2ee))

## [9.23.0](https://github.com/juspay/neurolink/compare/v9.22.3...v9.23.0) (2026-03-14)

### Features

- **(video-generation):** Add support to generate longer videos by merging multiple scenes ([db9a94f](https://github.com/juspay/neurolink/commit/db9a94f6bbe8b9047831ef486f995c6c710372e8))

## [9.22.3](https://github.com/juspay/neurolink/compare/v9.22.2...v9.22.3) (2026-03-12)

### Bug Fixes

- **(landing):** improve mobile accessibility and touch targets ([98f3f53](https://github.com/juspay/neurolink/commit/98f3f53d9d815d84486194aae8ebd41879009e5d))

## [9.22.2](https://github.com/juspay/neurolink/compare/v9.22.1...v9.22.2) (2026-03-12)

### Bug Fixes

- **(observability):** prevent duplicate Langfuse traces from streaming by restricting trace attributes to root spans ([ddac782](https://github.com/juspay/neurolink/commit/ddac78229f7ed42a1d332c23e0a5e6d80418dd6a))

## [9.22.1](https://github.com/juspay/neurolink/compare/v9.22.0...v9.22.1) (2026-03-12)

### Bug Fixes

- **(vision):** allow unknown models for proxy providers in vision check ([b2c5b4e](https://github.com/juspay/neurolink/commit/b2c5b4edebd43545dee8ccb31cb5253302602936))

## [9.22.0](https://github.com/juspay/neurolink/compare/v9.21.0...v9.22.0) (2026-03-12)

### Features

- **(landing):** comprehensive mobile redesign across all 13 landing page components ([405e3e5](https://github.com/juspay/neurolink/commit/405e3e5eb8672b50ee1fc319088fb8c2b4fb78a0))

## [9.21.0](https://github.com/juspay/neurolink/compare/v9.20.0...v9.21.0) (2026-03-09)

### Features

- **(reports-conversation):** Add support for report metaData in getUserAllSessionsHistory ([2273af0](https://github.com/juspay/neurolink/commit/2273af00f2089dba4f691f771b8e16a6a71274b5))

## [9.20.0](https://github.com/juspay/neurolink/compare/v9.19.1...v9.20.0) (2026-03-09)

### Features

- **(landing):** redesign nervous system visualization with performance and mobile fixes ([a4c7e91](https://github.com/juspay/neurolink/commit/a4c7e91a22622b41821db09e17885a54b26c66aa))

## [9.19.1](https://github.com/juspay/neurolink/compare/v9.19.0...v9.19.1) (2026-03-07)

### Bug Fixes

- **(docs):** fix search results overlap by enabling dynamic row measurement ([8117541](https://github.com/juspay/neurolink/commit/81175416db780da9de7157f3f057c5b0c78dd7b5))

## [9.19.0](https://github.com/juspay/neurolink/compare/v9.18.0...v9.19.0) (2026-03-07)

### Features

- **(landing):** nervous system visualization redesign with SEO and SDK fixes ([d410a49](https://github.com/juspay/neurolink/commit/d410a49546e9d55bce319f41d2b11f955350becc))

## [9.18.0](https://github.com/juspay/neurolink/compare/v9.17.2...v9.18.0) (2026-03-07)

### Features

- **(sdk):** add embed() and embedMany() support across providers and server ([17243ad](https://github.com/juspay/neurolink/commit/17243ada417a192caa6e555f92df23938ddca6aa))

## [9.17.2](https://github.com/juspay/neurolink/compare/v9.17.1...v9.17.2) (2026-03-07)

### Bug Fixes

- **(docs):** fall back to local search when Algolia index doesn't exist ([93f92b6](https://github.com/juspay/neurolink/commit/93f92b6a5c898b099e4684cadfd793a807752091))

## [9.17.1](https://github.com/juspay/neurolink/compare/v9.17.0...v9.17.1) (2026-03-07)

### Bug Fixes

- **(docs):** wire up local search fallback and fix search index quality ([1b8406c](https://github.com/juspay/neurolink/commit/1b8406cd26ebf19d50a2136ef9d6314a42ef8b27))

## [9.17.0](https://github.com/juspay/neurolink/compare/v9.16.0...v9.17.0) (2026-03-06)

### Features

- **(landing):** nervous-system landing page redesign, docs overhaul, and SDK fixes ([fe756b3](https://github.com/juspay/neurolink/commit/fe756b393c0376f6c37fbab6c59ec2b31330a59f))

## [9.16.0](https://github.com/juspay/neurolink/compare/v9.15.0...v9.16.0) (2026-03-02)

### Features

- **(sdk):** add models, observability, RAG enhancements, landing overhaul, and 45 review fixes ([eb79a1f](https://github.com/juspay/neurolink/commit/eb79a1f51dfd789da49130b6a05fa40ed38fd668))

## [9.15.0](https://github.com/juspay/neurolink/compare/v9.14.0...v9.15.0) (2026-03-01)

### Features

- **(anthropic):** add Claude subscription support with OAuth 2.0 authentication ([dbe0eb0](https://github.com/juspay/neurolink/commit/dbe0eb0219c565b2329f81e4f254849315c901a2))

## [9.14.0](https://github.com/juspay/neurolink/compare/v9.13.0...v9.14.0) (2026-02-27)

### Features

- **(docs):** documentation site overhaul — MCP docs server, homepage redesign, and SEO improvements ([5b16ed4](https://github.com/juspay/neurolink/commit/5b16ed4d5455568a480aa0389ad934eed9d03360))

## [9.13.0](https://github.com/juspay/neurolink/compare/v9.12.3...v9.13.0) (2026-02-25)

### Features

- **(memory):** integrate Hippocampus SDK for enhanced user memory management ([4da4e63](https://github.com/juspay/neurolink/commit/4da4e635cb5175c10c2efc63643d97cdee301e25))

## [9.12.3](https://github.com/juspay/neurolink/compare/v9.12.2...v9.12.3) (2026-02-24)

### Bug Fixes

- **(package):** resolve consumer bundling errors for server adapters ([0f4f71d](https://github.com/juspay/neurolink/commit/0f4f71de0467835a17146c2ff540b5d2009319fb))

## [9.12.2](https://github.com/juspay/neurolink/compare/v9.12.1...v9.12.2) (2026-02-23)

### Bug Fixes

- **(deps):** move sharp, ffmpeg-static, ffprobe-static to optionalDependencies ([4810b83](https://github.com/juspay/neurolink/commit/4810b83ee876c57bd9075a3a587249f1a9db285c))

## [9.12.1](https://github.com/juspay/neurolink/compare/v9.12.0...v9.12.1) (2026-02-23)

### Bug Fixes

- **(core):** lazy-load sharp and stop leaking framework types in .d.ts ([4ecc448](https://github.com/juspay/neurolink/commit/4ecc4482dbf1b0ef30de537a0edd9b6d4ce67a3f))

## [9.12.0](https://github.com/juspay/neurolink/compare/v9.11.0...v9.12.0) (2026-02-23)

### Features

- **(core):** implement SDK boundary items — context windows, caching, tool output management ([75a07a4](https://github.com/juspay/neurolink/commit/75a07a4f6d8eaec2fefe577dc62428e759bb52ce))

### Bug Fixes

- **(mcp):** missing gap for mcp cli ([79b51a8](https://github.com/juspay/neurolink/commit/79b51a88fa8f79809917e6159106278114f86636))

## [9.11.0](https://github.com/juspay/neurolink/compare/v9.10.1...v9.11.0) (2026-02-22)

### Features

- **(core):** provider error standardization, abort hardening, session budget, and continuous test suites ([0ceb590](https://github.com/juspay/neurolink/commit/0ceb590dcad315d392f3e9563d0c5dc0c83cda00))

## [9.10.1](https://github.com/juspay/neurolink/compare/v9.10.0...v9.10.1) (2026-02-21)

### Bug Fixes

- **(video-analysis):** add stream support for video analysis ([938aeef](https://github.com/juspay/neurolink/commit/938aeef876277360700d2a7192155af1f1316f28))

## [9.10.0](https://github.com/juspay/neurolink/compare/v9.9.0...v9.10.0) (2026-02-20)

### Features

- **(generateText):** add prepareStep and toolChoice passthrough support for multi-step agentic generation ([4cd340a](https://github.com/juspay/neurolink/commit/4cd340af7d39f72006d09fe86569232d751dcd8d))

## [9.9.0](https://github.com/juspay/neurolink/compare/v9.8.0...v9.9.0) (2026-02-17)

### Features

- **(video-analysis):** add video-analysis support in neurolink ([c35f8a8](https://github.com/juspay/neurolink/commit/c35f8a8d52cc1366e10b8701285e1bec52e27d98))

## [9.8.0](https://github.com/juspay/neurolink/compare/v9.7.0...v9.8.0) (2026-02-17)

### Features

- **(scripts):** migrate peripheral JS/CJS/MJS files to TypeScript with tsx runner ([25f17e8](https://github.com/juspay/neurolink/commit/25f17e81c09d6184a4bf2ff15e4427c302fde55e))

## [9.7.0](https://github.com/juspay/neurolink/compare/v9.6.0...v9.7.0) (2026-02-16)

### Features

- **(core):** add abort signal composition, tool filtering, provider hardening, and shared utilities ([805e8fe](https://github.com/juspay/neurolink/commit/805e8fe98184d3b57360ce751d61806450fe0ab8))

## [9.6.0](https://github.com/juspay/neurolink/compare/v9.5.3...v9.6.0) (2026-02-14)

### Features

- **(context):** implement context compaction system with multi-stage pipeline, file reference registry, and codebase-wide interface-to-type migration ([c67c09b](https://github.com/juspay/neurolink/commit/c67c09ba2224a67e2e64c4ca734e055ab6cc9ccf))

### Bug Fixes

- add ffprobe-static type reference for ncc build ([1f1a11c](https://github.com/juspay/neurolink/commit/1f1a11c7d3b8c443e1d9641ab1755f7d021fc743))

## [9.5.3](https://github.com/juspay/neurolink/compare/v9.5.2...v9.5.3) (2026-02-13)

### Bug Fixes

- **(landing):** improve mobile responsiveness with aurora hero, interleaved StickyDemo, and WCAG touch targets ([a014e9e](https://github.com/juspay/neurolink/commit/a014e9e04b02872b013102a5dfbf8428e4d4eb5a))

## [9.5.2](https://github.com/juspay/neurolink/compare/v9.5.1...v9.5.2) (2026-02-12)

### Bug Fixes

- **(landing):** use dynamic GSAP imports in reveal action for SSR compatibility ([ec2ada5](https://github.com/juspay/neurolink/commit/ec2ada5c506bc3d51c419002b1a10b7b94bf00f8))

## [9.5.1](https://github.com/juspay/neurolink/compare/v9.5.0...v9.5.1) (2026-02-12)

### Bug Fixes

- **(landing):** sync lockfile with corrected deps and add blog links ([346d327](https://github.com/juspay/neurolink/commit/346d327fb895ee72f7e96b4d48f6d860cc05747c))

## [9.5.0](https://github.com/juspay/neurolink/compare/v9.4.0...v9.5.0) (2026-02-12)

### Features

- **(landing):** add marketing landing page and fix docs-site icon rendering ([bf217da](https://github.com/juspay/neurolink/commit/bf217da0f1c4865f0c89d609c4ab1082d023af38))

## [9.4.0](https://github.com/juspay/neurolink/compare/v9.3.0...v9.4.0) (2026-02-09)

### Features

- **(workflow):** implement comprehensive workflow engine for multi-model orchestration ([9257385](https://github.com/juspay/neurolink/commit/9257385e4b961dd14e21f85250b4947be9c0e7b6))

## [9.3.0](https://github.com/juspay/neurolink/compare/v9.2.0...v9.3.0) (2026-02-08)

### Features

- **(rag):** add RAG document processing with generate()/stream() integration ([e595419](https://github.com/juspay/neurolink/commit/e59541962f05efb64a95fd1c6a1e821733232d3c))

## [9.2.0](https://github.com/juspay/neurolink/compare/v9.1.1...v9.2.0) (2026-02-06)

### Features

- **(rag):** add `rag: { files }` option to generate() and stream() for automatic RAG pipeline setup
- **(rag):** add `--rag-files`, `--rag-strategy`, `--rag-chunk-size`, `--rag-chunk-overlap`, `--rag-top-k` CLI flags
- **(rag):** add 10 chunking strategies with infinite loop protection and input validation
- **(rag):** add RerankerFactory/Registry with 5 reranker types (simple, llm, batch, cross-encoder, cohere)
- **(rag):** add hybrid search with BM25 + vector similarity (RRF and linear combination fusion)
- **(rag):** migrate createVectorQueryTool parameters from JSON Schema to Zod for Vercel AI SDK compatibility
- **(streaming):** add central tool merge in BaseProvider.stream() for all 10 providers
- **(streaming):** fix external tool availability in streaming for openRouter, amazonBedrock, ollama, huggingFace, litellm, mistral, anthropic, openAI providers
- **(multimodal):** add file processor system with 17+ file types and SVG text injection ([9a7b585](https://github.com/juspay/neurolink/commit/9a7b5851e562f7bd55164d1c3dca42d8f18cc827))

### Bug Fixes

- **(rag):** fix infinite loops in markdown, html, latex, semantic, recursive chunkers with forward progress guarantees
- **(rag):** fix missing semantic-markdown strategy registration in ChunkerRegistry
- **(rag):** fix BM25 division-by-zero guard and hybridSearch embed() validation
- **(rag):** fix overlap >= maxSize validation across all chunkers

## [9.1.1](https://github.com/juspay/neurolink/compare/v9.1.0...v9.1.1) (2026-02-05)

### Bug Fixes

- **(csv-processor):** enhance metadata detection with data types and quality analysis ([2d27c5c](https://github.com/juspay/neurolink/commit/2d27c5cc4cd99b52da079fba741006216c0282ea))

## [9.1.0](https://github.com/juspay/neurolink/compare/v9.0.1...v9.1.0) (2026-02-05)

### Features

- **(ppt):** Implement Orchestration and Assembly layer For PPT Gen ([7e53846](https://github.com/juspay/neurolink/commit/7e53846815a14e6b4793e31048efe121bbc84ef5))

## [9.0.1](https://github.com/juspay/neurolink/compare/v9.0.0...v9.0.1) (2026-02-03)

### Bug Fixes

- **(pdf-processor):** enforce page limits by default with actionable alternatives ([35576aa](https://github.com/juspay/neurolink/commit/35576aa210b5a9a0bce8e6c5df041351905f0c96))

## [9.0.0](https://github.com/juspay/neurolink/compare/v8.43.0...v9.0.0) (2026-02-03)

### ⚠ BREAKING CHANGES

- **(observability):** @opentelemetry/api, @opentelemetry/sdk-trace-node, and
  @opentelemetry/sdk-trace-base are now peerDependencies. Host applications
  must install these packages directly.

### Features

- **(observability):** add external TracerProvider support with operation name auto-detection ([25e3230](https://github.com/juspay/neurolink/commit/25e32301269b45b493df17f94b7e38af2bd7ef36))

## [8.43.0](https://github.com/juspay/neurolink/compare/v8.42.0...v8.43.0) (2026-02-02)

### Features

- **(server):** implement multi-framework HTTP server adapters with full CLI support ([1651938](https://github.com/juspay/neurolink/commit/16519387ac4b6480ac779eb7b5cd90eb2cdee6e7))

## [8.42.0](https://github.com/juspay/neurolink/compare/v8.41.1...v8.42.0) (2026-02-02)

### Features

- **(cache):** Implemented LRU cache for image downloads ([6562c45](https://github.com/juspay/neurolink/commit/6562c45605a6031afe41bdfcc5de0a7687127c3f))

## [8.41.1](https://github.com/juspay/neurolink/compare/v8.41.0...v8.41.1) (2026-01-31)

### Bug Fixes

- **(ci):** add fork detection to docs PR validation workflow ([6d1f9eb](https://github.com/juspay/neurolink/commit/6d1f9eb720dea1a5997e53cbcff8d6a5c86282cd))

## [8.41.0](https://github.com/juspay/neurolink/compare/v8.40.1...v8.41.0) (2026-01-29)

### Features

- **(docs):** migrate documentation from MkDocs to Docusaurus v3 ([2f70a32](https://github.com/juspay/neurolink/commit/2f70a32d930eae2756e7785b12ee5912dd4ed5e2))

## [8.40.1](https://github.com/juspay/neurolink/compare/v8.40.0...v8.40.1) (2026-01-28)

### Bug Fixes

- **(orchestration):** changed model identifiers in modelRouter to match new claude identifiers ([e5fb153](https://github.com/juspay/neurolink/commit/e5fb153edbeace4a8fd13d416811ed37c2ea0459))

## [8.40.0](https://github.com/juspay/neurolink/compare/v8.39.0...v8.40.0) (2026-01-28)

### Features

- **(events):** Emit event when title generation is finished ([aab4a1f](https://github.com/juspay/neurolink/commit/aab4a1f9d336a9b1fa20a5b6196155ab1d8673ed))

## [8.39.0](https://github.com/juspay/neurolink/compare/v8.38.0...v8.39.0) (2026-01-27)

### Features

- **(ppt):** Implement SlideGenerator() for PPT Gen ([c804e97](https://github.com/juspay/neurolink/commit/c804e97ceda8d90bfc5ee5b976b1a8b3864f86ef))

## [8.38.0](https://github.com/juspay/neurolink/compare/v8.37.0...v8.38.0) (2026-01-23)

### Features

- **(ppt):** Add PPT generation content planner ([695b92c](https://github.com/juspay/neurolink/commit/695b92c8d2c87556fcad3d5f437605ba934e8b5d))

## [8.37.0](https://github.com/juspay/neurolink/compare/v8.36.0...v8.37.0) (2026-01-22)

### Features

- **(security):** Implement token bucket rate limiter for URL downloads ([0e3e779](https://github.com/juspay/neurolink/commit/0e3e7797800360ab1672fcb8fbd87b1f794b6e1a))

## [8.36.0](https://github.com/juspay/neurolink/compare/v8.35.2...v8.36.0) (2026-01-22)

### Features

- **(ppt):** Add Types and Validation for PPT generation ([27b970c](https://github.com/juspay/neurolink/commit/27b970c9fd5d74161b74603738ca307f8217e287))

## [8.35.2](https://github.com/juspay/neurolink/compare/v8.35.1...v8.35.2) (2026-01-15)

### Bug Fixes

- **(provider):** add network retry logic with exponential backoff to detection operations ([3b29e24](https://github.com/juspay/neurolink/commit/3b29e248766fac01f1e3ea368e9439233957121e))

## [8.35.1](https://github.com/juspay/neurolink/compare/v8.35.0...v8.35.1) (2026-01-15)

### Bug Fixes

- **(pdf):** reject empty PDFs with 0 pages instead of returning success ([92d8d4e](https://github.com/juspay/neurolink/commit/92d8d4eb3e6e675ee969e3a8ee92c5997dc416aa))

## [8.35.0](https://github.com/juspay/neurolink/compare/v8.34.1...v8.35.0) (2026-01-15)

### Features

- **(history):** Added support for maintaning sequence in ai response in Chat History ([e29fcae](https://github.com/juspay/neurolink/commit/e29fcaec10d84e4319ebe75e94aa8f0a35773ff7))

## [8.34.1](https://github.com/juspay/neurolink/compare/v8.34.0...v8.34.1) (2026-01-14)

### Bug Fixes

- **(dependancy):** add back text-to-speech to dependencies and added types to barrel import ([c4bc86b](https://github.com/juspay/neurolink/commit/c4bc86bbd3ca7fe59595c5fa3bc8c5583a2031a3))

## [8.34.0](https://github.com/juspay/neurolink/compare/v8.33.0...v8.34.0) (2026-01-13)

### Features

- **(object):** use instance-specific timeout for tool discovery and ([ba1ae4c](https://github.com/juspay/neurolink/commit/ba1ae4c13feeb3513d6800776d50b5aca94d5460))

## [8.33.0](https://github.com/juspay/neurolink/compare/v8.32.0...v8.33.0) (2026-01-12)

### Features

- **(action):** add GitHub Action for AI-powered CI/CD workflows ([fa18326](https://github.com/juspay/neurolink/commit/fa183264467e271ed5d825c6a961bdebf3d0000c))

## [8.32.0](https://github.com/juspay/neurolink/compare/v8.31.3...v8.32.0) (2026-01-05)

### Features

- **(cli):** Add video generation to CLI ([8e7f0cf](https://github.com/juspay/neurolink/commit/8e7f0cfd983f6c09aa3eaf3bdb09d9c22c0d5b02))

## [8.31.3](https://github.com/juspay/neurolink/compare/v8.31.2...v8.31.3) (2026-01-05)

### Bug Fixes

- **(csv):** standardize rowCount to exclude empty lines across all formats (CSV-025) ([c898521](https://github.com/juspay/neurolink/commit/c8985212ff6bb43a6cefbf7a5551ed603b32bc55)), closes [#390](https://github.com/juspay/neurolink/issues/390)

## [8.31.2](https://github.com/juspay/neurolink/compare/v8.31.1...v8.31.2) (2026-01-05)

### Bug Fixes

- **(cli):** add path resolution for file inputs ([2c191c0](https://github.com/juspay/neurolink/commit/2c191c0d86dbec6018ea8b7d1b35c5bba8e7b0d8)), closes [#338](https://github.com/juspay/neurolink/issues/338)

## [8.31.1](https://github.com/juspay/neurolink/compare/v8.31.0...v8.31.1) (2026-01-05)

### Bug Fixes

- **(tools):** Error not getting populated inspite tool result has error ([111f5ca](https://github.com/juspay/neurolink/commit/111f5cacdefb8a3bc8a151b5f68d782533d4b4d6))

## [8.31.0](https://github.com/juspay/neurolink/compare/v8.30.0...v8.31.0) (2026-01-05)

### Features

- **(sdk):** image generation support with gemini ([7150f8c](https://github.com/juspay/neurolink/commit/7150f8c7967d5340fe854ffd58f8474dabe9c606))

## [8.30.0](https://github.com/juspay/neurolink/compare/v8.29.0...v8.30.0) (2026-01-03)

### Features

- **(video):** add video generation support to NeuroLink SDK with Vertex AI ([6b490a1](https://github.com/juspay/neurolink/commit/6b490a1f436a823ff6bad41fc77f98d62be08c68))

## [8.29.0](https://github.com/juspay/neurolink/compare/v8.28.0...v8.29.0) (2026-01-02)

### Features

- **(mcp):** add HTTP/Streamable HTTP transport support for MCP servers ([67f1c23](https://github.com/juspay/neurolink/commit/67f1c23ac2d5e687b7455c627da952a820af773b))

## [8.28.0](https://github.com/juspay/neurolink/compare/v8.27.0...v8.28.0) (2026-01-02)

### Features

- **(video-provider):** Add video generation provider (VIDEO-GEN-003) ([e8a6eb2](https://github.com/juspay/neurolink/commit/e8a6eb2c46cf69fc341a703d7032ac381bebac23))

## [8.27.0](https://github.com/juspay/neurolink/compare/v8.26.1...v8.27.0) (2026-01-01)

### Features

- **(validation):** Video generation input validation (VIDEO-GEN-002) ([b58a532](https://github.com/juspay/neurolink/commit/b58a532fa822b365ab26a145b20719982377b73a))

## [8.26.1](https://github.com/juspay/neurolink/compare/v8.26.0...v8.26.1) (2025-12-31)

### Bug Fixes

- **(providers):** resolve Gemini 3 issues, add utilities, improve tests ([270ef6f](https://github.com/juspay/neurolink/commit/270ef6f225e7861846cf359f2d81edae38592053))

## [8.26.0](https://github.com/juspay/neurolink/compare/v8.25.0...v8.26.0) (2025-12-30)

### Features

- **(types):** Add video output types (VIDEO-GEN-001) ([1b1b5c2](https://github.com/juspay/neurolink/commit/1b1b5c23d0bdacb9d3120797b1f7984d7e0cc48c))

## [8.25.0](https://github.com/juspay/neurolink/compare/v8.24.0...v8.25.0) (2025-12-30)

### Features

- **(observability):** Add support for custom metadata in Context ([b175249](https://github.com/juspay/neurolink/commit/b175249c61357b0e6d127932bd7824d0bfe6f2ed))

## [8.24.0](https://github.com/juspay/neurolink/compare/v8.23.2...v8.24.0) (2025-12-28)

### Features

- **(openrouter):** add OpenRouter provider with 300+ model support ([563611f](https://github.com/juspay/neurolink/commit/563611f84c154e2966aebb6e8a414fcb60a26fd3)), closes [#608](https://github.com/juspay/neurolink/issues/608)

## [8.23.2](https://github.com/juspay/neurolink/compare/v8.23.1...v8.23.2) (2025-12-27)

### Bug Fixes

- **(format):** Add format validation to PDF image conversion ([bdd3285](https://github.com/juspay/neurolink/commit/bdd32855daa25d1e0fd1e94db6d97055fd5bd478))

## [8.23.1](https://github.com/juspay/neurolink/compare/v8.23.0...v8.23.1) (2025-12-24)

### Bug Fixes

- **(mcp):** Added Blocked Tool Support ([852d079](https://github.com/juspay/neurolink/commit/852d079371878d2a808ef6c0dc76103eb1d13a83))

## [8.23.0](https://github.com/juspay/neurolink/compare/v8.22.0...v8.23.0) (2025-12-23)

### Features

- **(csv):** add file extension field to CSV metadata ([044030c](https://github.com/juspay/neurolink/commit/044030c3be74121729477475becd983840e8f87c))

## [8.22.0](https://github.com/juspay/neurolink/compare/v8.21.0...v8.22.0) (2025-12-23)

### Features

- **(ci):** Add ffmpeg installation and verification to CI/CD pipeline ([1b0d669](https://github.com/juspay/neurolink/commit/1b0d669e5ee3d33f58dcfe71ddcc9bb8faf5b892))

## [8.21.0](https://github.com/juspay/neurolink/compare/v8.20.1...v8.21.0) (2025-12-22)

### Features

- **(types):** Add office document type definitions and comprehensive tests ([1b34d3d](https://github.com/juspay/neurolink/commit/1b34d3de8114bdc56600cc785e7e52aa1af1ddc7))

## [8.20.1](https://github.com/juspay/neurolink/compare/v8.20.0...v8.20.1) (2025-12-22)

### Bug Fixes

- **(Validation):** implement secure base64 validation with fail-fast checks ([f1b9b9c](https://github.com/juspay/neurolink/commit/f1b9b9c105db38ce439a5e69ff343b77b12be174)), closes [#277](https://github.com/juspay/neurolink/issues/277)

## [8.20.0](https://github.com/juspay/neurolink/compare/v8.19.1...v8.20.0) (2025-12-22)

### Features

- **(memory):** Implement token based summarization ([ffdc902](https://github.com/juspay/neurolink/commit/ffdc902f534c97a5aff38d7de419021fcabcd791))

## [8.19.1](https://github.com/juspay/neurolink/compare/v8.19.0...v8.19.1) (2025-12-20)

### Bug Fixes

- **(files):** comprehensive extension-less file detection with fallback parsing (FD-018) ([7e9dbc7](https://github.com/juspay/neurolink/commit/7e9dbc78df48f6df051c7845824977f360f8feee))

## [8.19.0](https://github.com/juspay/neurolink/compare/v8.18.0...v8.19.0) (2025-12-18)

### Features

- **(tts):** Integrate TTS into BaseProvider.generate() ([ffae0b5](https://github.com/juspay/neurolink/commit/ffae0b5be9c4a2ef249876bdeee265004adf28a3))

## [8.18.0](https://github.com/juspay/neurolink/compare/v8.17.0...v8.18.0) (2025-12-16)

### Features

- **(utils):** standardize logging levels in CSVProcessor ([1c348b2](https://github.com/juspay/neurolink/commit/1c348b28d1212cd8ec33eb0100acddaa5a3df2bd))

## [8.17.0](https://github.com/juspay/neurolink/compare/v8.16.0...v8.17.0) (2025-12-16)

### Features

- **(tts):** Add TTS type integration to GenerateOptions, GenerateResult, and StreamChunk ([e290330](https://github.com/juspay/neurolink/commit/e290330e8fe22a4cd0427185cbddbb8856fbd5ca))

## [8.16.0](https://github.com/juspay/neurolink/compare/v8.15.0...v8.16.0) (2025-12-16)

### Features

- **(tts):** Implement GoogleTTSHandler.getVoices() API ([15d39f7](https://github.com/juspay/neurolink/commit/15d39f7e6bfe093971bc822e8f4251b7e8711bb9))

## [8.15.0](https://github.com/juspay/neurolink/compare/v8.14.0...v8.15.0) (2025-12-14)

### Features

- **(tts):** Implement synthesize method in GoogleTTSHandler ([9262e37](https://github.com/juspay/neurolink/commit/9262e37a08ef856eb5d16fd65fa922bd700897cb))

## [8.14.0](https://github.com/juspay/neurolink/compare/v8.13.2...v8.14.0) (2025-12-14)

### Features

- **(tts):** Create GoogleTTSHandler skeleton structure ([60db6a8](https://github.com/juspay/neurolink/commit/60db6a813d350756dad9a7baeee3ff5ad35141e2))

## [8.13.2](https://github.com/juspay/neurolink/compare/v8.13.1...v8.13.2) (2025-12-14)

### Bug Fixes

- **(sdk):** Replace hardcoded timeouts with class constants ([a34c291](https://github.com/juspay/neurolink/commit/a34c29155e82ef4f498714c031401463351171bd))

## [8.13.1](https://github.com/juspay/neurolink/compare/v8.13.0...v8.13.1) (2025-12-13)

### Bug Fixes

- **(provider):** Implement image count limits with validation and warnings ([ff3e27a](https://github.com/juspay/neurolink/commit/ff3e27a5ab3aafffc8312f645e0ebc566600cc63))

## [8.13.0](https://github.com/juspay/neurolink/compare/v8.12.0...v8.13.0) (2025-12-13)

### Features

- **(tts):** Implement TTSProcessor.synthesize() method ([d6f3567](https://github.com/juspay/neurolink/commit/d6f3567dda26191f0ca9fd82a8cd7ccff5c9f819))

## [8.12.0](https://github.com/juspay/neurolink/compare/v8.11.0...v8.12.0) (2025-12-13)

### Features

- **(files):** Install office processing dependencies: mammoth, xlsx, adm-zip, xml2js with TypeScript types ([a236818](https://github.com/juspay/neurolink/commit/a2368182e99b58a599e77e43e823439464a2f829))

## [8.11.0](https://github.com/juspay/neurolink/compare/v8.10.1...v8.11.0) (2025-12-12)

### Features

- **(tts):** implement TTSProcessor skeleton class with handler registry ([8dc63d1](https://github.com/juspay/neurolink/commit/8dc63d15d8b71845145349b932651980aef61aa8))

## [8.10.1](https://github.com/juspay/neurolink/compare/v8.10.0...v8.10.1) (2025-12-12)

### Bug Fixes

- **(ci):** check formatting instead of auto-fix to catch issues during PR builds ([6af89d2](https://github.com/juspay/neurolink/commit/6af89d233e444ff5cb4b7d38964d3ac2b6fc19bf))

## [8.10.0](https://github.com/juspay/neurolink/compare/v8.9.0...v8.10.0) (2025-12-12)

### Features

- **(cli):** add video CLI flags tests and verification ([2d75347](https://github.com/juspay/neurolink/commit/2d753473cc75a219db4425783f4a062cca23873b))
- **(models):** add GPT-5.2 and comprehensive model updates across all providers ([b75042f](https://github.com/juspay/neurolink/commit/b75042fcb98bbf19bdfe6f197ac12d6752b291ee))

### Bug Fixes

- **(ci):** use minimal plugins for semantic-release validation to avoid npm auth requirement ([f3ab09e](https://github.com/juspay/neurolink/commit/f3ab09e0cdc79ae70e55a37246d0edfe9a41a77d))

## [8.9.0](https://github.com/juspay/neurolink/compare/v8.8.0...v8.9.0) (2025-12-11)

### Features

- **(csv):** add sampleDataFormat option for CSV metadata ([ded6ec4](https://github.com/juspay/neurolink/commit/ded6ec4ef0924ff020de079ed3a8031490e76094))

## [8.8.0](https://github.com/juspay/neurolink/compare/v8.7.0...v8.8.0) (2025-12-11)

### Features

- **(types):** add AudioProviderConfig type definition for transcription providers ([c34f437](https://github.com/juspay/neurolink/commit/c34f437455fba20b803b84811b9dda143351427e))

## [8.7.0](https://github.com/juspay/neurolink/compare/v8.6.0...v8.7.0) (2025-12-10)

### Features

- **(cli):** implement TTS audio file output (TTS-024) ([48af003](https://github.com/juspay/neurolink/commit/48af0033db12d3a7b7dd62b8fb5c965f61f20042))
- **(ImageProcessor):** Add output validation to ImageProcessor.process() method ([6fe3a16](https://github.com/juspay/neurolink/commit/6fe3a16e8290a1a7640ab51865343583253418d0))
- **(imageProcessor):** add retry logic with exponential backoff for URL downloads ([e6ab4df](https://github.com/juspay/neurolink/commit/e6ab4df4e974c3981d6a2e2de30d5b3e19ecccf9))
- **(types):** add AudioProcessorOptions and audioOptions to FileDetectorOptions ([2bd877b](https://github.com/juspay/neurolink/commit/2bd877bd5f41fed786cabbdea6e57df95bd7debb))

### Bug Fixes

- **(deps):** convert canvas and pdfjs-dist to dynamic imports for SSR compatibility ([cc7d99e](https://github.com/juspay/neurolink/commit/cc7d99e33d5087ac4d8f442c0dfebdfad9c294c4))
- **(deps):** force @semantic-release/npm v13 via pnpm override for OIDC support ([8a528c9](https://github.com/juspay/neurolink/commit/8a528c95e8c983ce3cb8d1196b8c08ae4ed93ec1))
- **(lock):** add missing update for lockfile ([376b7ad](https://github.com/juspay/neurolink/commit/376b7ad0297e1f8f6fc68c5c58d30213bae9d23c))
- **(release):** enable OIDC trusted publishing for npm ([3ba6dd9](https://github.com/juspay/neurolink/commit/3ba6dd9d7b6156e170550315f8a208ccafa5483a))
- **(tts):** add audio property to GenerateResult type and improve type safety ([e85c7d0](https://github.com/juspay/neurolink/commit/e85c7d0435b6b4f81421ce816e2252b932e0b3ca))
- **(workflows):** add job-level OIDC permissions and remove conflicting auth ([8ee4fb1](https://github.com/juspay/neurolink/commit/8ee4fb1ed3e0a996540032ddd92d4a491a2b53a1))
- **(workflows):** add OIDC authentication for npm trusted publishing ([c6bb5bb](https://github.com/juspay/neurolink/commit/c6bb5bb33c34249ee89e8622d879f266025ecb9a))

## [8.6.0](https://github.com/juspay/neurolink/compare/v8.5.1...v8.6.0) (2025-12-06)

### Features

- **(multimodal):** add altText support to ImageContent for accessibility ([27118c8](https://github.com/juspay/neurolink/commit/27118c87c73bc1eb6389bbc49dd2e59f1cc4c523)), closes [#565](https://github.com/juspay/neurolink/issues/565)

### Bug Fixes

- **(guardrails):** added fallback for guardrail errors on azure's jailbreak errors ([ae42552](https://github.com/juspay/neurolink/commit/ae4255255657c00ea164730dbd61fbad9f65f339))
- **(observability):** add support to let applications customize traces ([608d991](https://github.com/juspay/neurolink/commit/608d991114c5df2335be73f44a24a187f424373a))

## [8.5.1](https://github.com/juspay/neurolink/compare/v8.5.0...v8.5.1) (2025-12-04)

### Bug Fixes

- **(vertex):** clarify schema+tools support for Gemini vs Claude models ([e7beae9](https://github.com/juspay/neurolink/commit/e7beae987cfe58664145b32c2ae12140a5257c0c))

## [8.5.0](https://github.com/juspay/neurolink/compare/v8.4.1...v8.5.0) (2025-12-04)

### Features

- **(audio):** add AudioProcessorOptions type for audio transcription configuration ([b969ba9](https://github.com/juspay/neurolink/commit/b969ba95daf6cbcc63d94f10d632a1e977726d52))

## [8.4.1](https://github.com/juspay/neurolink/compare/v8.4.0...v8.4.1) (2025-12-04)

### Bug Fixes

- **(mem0):** custom instructions support for mem0 conversation ingestion ([486c55c](https://github.com/juspay/neurolink/commit/486c55c64eeaecf6704aea7a7bf5310270476be5))

## [8.4.0](https://github.com/juspay/neurolink/compare/v8.3.0...v8.4.0) (2025-12-01)

### Features

- **(core):** comprehensive multimodal architecture with modular refactoring and enhanced testing ([fd8d207](https://github.com/juspay/neurolink/commit/fd8d207a2f9be61e65fd00d697a0456511ece30f))

## [8.3.0](https://github.com/juspay/neurolink/compare/v8.2.0...v8.3.0) (2025-11-28)

### Features

- **(cli):** make stream the default command in loop mode ([7aeb1d7](https://github.com/juspay/neurolink/commit/7aeb1d790e1b103b5fc1889e21431e9c7b9dcf5f))

## [8.2.0](https://github.com/juspay/neurolink/compare/v8.1.0...v8.2.0) (2025-11-25)

### Features

- **(vertex):** add global endpoint support for Gemini 3 Pro Preview ([5de2cbe](https://github.com/juspay/neurolink/commit/5de2cbe3f37ef3355f5d506c03ae4417f430724c))

## [8.1.0](https://github.com/juspay/neurolink/compare/v8.0.1...v8.1.0) (2025-11-20)

### Features

- **(vertex):** add gemini-3-pro-preview model support ([896dc73](https://github.com/juspay/neurolink/commit/896dc73f017cf2c5c3a1cdbfa1806027e6acad4a))

## [8.0.1](https://github.com/juspay/neurolink/compare/v8.0.0...v8.0.1) (2025-11-20)

### Bug Fixes

- **(lint):** prettier and lint errors ([810475c](https://github.com/juspay/neurolink/commit/810475ce5bf997e389b4ee2c769cee0c03da7dfb))
- **(memory):** migrate to cloud-hosted mem0 API [BZ-45257] ([3a53a0c](https://github.com/juspay/neurolink/commit/3a53a0c792102fe5cd232f8b8c0ac59e73581497))

## [8.0.0](https://github.com/juspay/neurolink/compare/v7.54.0...v8.0.0) (2025-11-19)

### ⚠ BREAKING CHANGES

- **(deps):** Node.js 20.18.1+ is now required due to undici v7 dependency.
  Undici v7 requires the File API which is only available in Node.js 20.18.1+.

Changes:

- Update fileDetector.ts to use interceptors.redirect()
- Update messageBuilder.ts to use interceptors.redirect()
- Add getGlobalDispatcher and interceptors imports from undici
- Temporarily exclude known package vulnerabilities from security validation
- Require Node.js >=20.18.1 in package.json engines
- Update npm requirement to >=10.0.0
- Remove Node 18 from CI test matrix

Fixes build failures introduced in f19c433 (undici bump to v7)

### Features

- **(observability):** add support for userid and sessionid in langfuse traces ([b1895a6](https://github.com/juspay/neurolink/commit/b1895a622edbba9c7c360069b411a0c575a271cb))

### Bug Fixes

- **(deps):** update undici v7 API usage and require Node.js 20+ ([dc81bba](https://github.com/juspay/neurolink/commit/dc81bba41b47c37340ec9a9d7c9f0d733c06adae))

## [7.54.0](https://github.com/juspay/neurolink/compare/v7.53.5...v7.54.0) (2025-11-08)

### Features

- **(logs):** enable neurolink logs to be pushed into lighthouse ([9a752c4](https://github.com/juspay/neurolink/commit/9a752c4de4d300512027b7d405dda633701fae15))

## [7.53.5](https://github.com/juspay/neurolink/compare/v7.53.4...v7.53.5) (2025-11-06)

## [7.53.4](https://github.com/juspay/neurolink/compare/v7.53.3...v7.53.4) (2025-11-05)

### Bug Fixes

- **(sdk):** structured object response in generate function ([f16d597](https://github.com/juspay/neurolink/commit/f16d597f8e9a64f24a7a6ad5344c93add524c23d))

## [7.53.3](https://github.com/juspay/neurolink/compare/v7.53.2...v7.53.3) (2025-11-03)

## [7.53.2](https://github.com/juspay/neurolink/compare/v7.53.1...v7.53.2) (2025-10-28)

## [7.53.1](https://github.com/juspay/neurolink/compare/v7.53.0...v7.53.1) (2025-10-27)

### Bug Fixes

- **(redis):** Emit redis related info through events for logging ([3224075](https://github.com/juspay/neurolink/commit/3224075d86c97f4206855d485748a95d609256af))

## [7.53.0](https://github.com/juspay/neurolink/compare/v7.52.0...v7.53.0) (2025-10-26)

### Features

- **(test):** vitest configuration setup for cli ([ffb7db3](https://github.com/juspay/neurolink/commit/ffb7db301e2e883af5427db6e6d00a8a7dd65023))

## [7.52.0](https://github.com/juspay/neurolink/compare/v7.51.3...v7.52.0) (2025-10-24)

### Features

- **(redis):** Enable SDK-level Redis configuration for multi-tenancy ([6c68883](https://github.com/juspay/neurolink/commit/6c688833ab48608e47402c7ee3c904c6986734ae))

## [7.51.3](https://github.com/juspay/neurolink/compare/v7.51.2...v7.51.3) (2025-10-23)

### Bug Fixes

- **(neurolink):** add Zod schema detection for inputSchema field in baseProvider ([5ad0c0a](https://github.com/juspay/neurolink/commit/5ad0c0a1750b92e0e4412243f5b872f30c258624))

## [7.51.2](https://github.com/juspay/neurolink/compare/v7.51.1...v7.51.2) (2025-10-14)

## [7.51.1](https://github.com/juspay/neurolink/compare/v7.51.0...v7.51.1) (2025-10-13)

## [7.51.0](https://github.com/juspay/neurolink/compare/v7.50.0...v7.51.0) (2025-10-12)

### Features

- **(multimodal):** add comprehensive PDF file support with native document processing ([52abf1a](https://github.com/juspay/neurolink/commit/52abf1a85d3a1d9de819919eec1d0ffea3007702))
- **(multimodal):** add comprehensive PDF file support with native document processing ([020e15a](https://github.com/juspay/neurolink/commit/020e15af0bb46a2b827bb4853baafba5da03cad2))

## [7.50.0](https://github.com/juspay/neurolink/compare/v7.49.0...v7.50.0) (2025-10-08)

### Features

- **(observability):** add langfuse and telemetry support ([4172d28](https://github.com/juspay/neurolink/commit/4172d283ebce0c6dddae356d278eeceb42aa8464))

## [7.49.0](https://github.com/juspay/neurolink/compare/v7.48.1...v7.49.0) (2025-10-07)

### Features

- **(cli):** added support for resuming a conversation ([b860d29](https://github.com/juspay/neurolink/commit/b860d2995a2c3fe29a39c750f152d9f32abb612f))
- **(middleware):** implement guardrails pre-call filtering with demo and proof ([b99a7f1](https://github.com/juspay/neurolink/commit/b99a7f15e5972eec4bd5652792f56f192239fd8d))
- **(multimodal):** add comprehensive CSV file support with auto-detection and analysis tools ([374b375](https://github.com/juspay/neurolink/commit/374b3750a996a4e2e466bc1af1d54c9aec7f3b8c))

### Bug Fixes

- **(azure):** add SDK parameter support for lighthouse tool events compatibility ([a3bca3b](https://github.com/juspay/neurolink/commit/a3bca3b27b5505919a403896ee1dc1fb55a1983f))
- **(formatting):** fixed linting issues with docs ([a7d1aff](https://github.com/juspay/neurolink/commit/a7d1affa6d8d00fd2b7491e1643e86654b242a40))

## [7.48.1](https://github.com/juspay/neurolink/compare/v7.48.0...v7.48.1) (2025-10-02)

## [7.48.0](https://github.com/juspay/neurolink/compare/v7.47.3...v7.48.0) (2025-09-30)

### Features

- **(cli):** add command history support on up/down ([5aa3c2d](https://github.com/juspay/neurolink/commit/5aa3c2db04714019b34af0fd69106a8fd21ac252))

## [7.47.3](https://github.com/juspay/neurolink/compare/v7.47.2...v7.47.3) (2025-09-26)

## [7.47.2](https://github.com/juspay/neurolink/compare/v7.47.1...v7.47.2) (2025-09-26)

### Bug Fixes

- **(timestamp):** Incorrect timestamps being stored in redis ([2d66232](https://github.com/juspay/neurolink/commit/2d6623275bc4c1f5986957d476ddcf3933ba61e4))

## [7.47.1](https://github.com/juspay/neurolink/compare/v7.47.0...v7.47.1) (2025-09-26)

### Bug Fixes

- **(tools):** Unregistered tools getting called ([45fd67a](https://github.com/juspay/neurolink/commit/45fd67af418b5e458ce6a261a7891234a8d489b8))

## [7.47.0](https://github.com/juspay/neurolink/compare/v7.46.0...v7.47.0) (2025-09-25)

### Features

- **(chat):** Implement multimodal UI and extend SDK support ([12a2f59](https://github.com/juspay/neurolink/commit/12a2f59c4826e82ab1feb1347d08980682748ad2))

## [7.46.0](https://github.com/juspay/neurolink/compare/v7.45.0...v7.46.0) (2025-09-24)

### Features

- **(auto-evaluation):** added auto evaluation for LLM response ([6f23fae](https://github.com/juspay/neurolink/commit/6f23fae5cacb1c0686257cc7ed547be675b68b23))

## [7.45.0](https://github.com/juspay/neurolink/compare/v7.44.0...v7.45.0) (2025-09-24)

### Features

- **(provider):** Add support to provide region while streaming or generating for few providers ([a0a5bed](https://github.com/juspay/neurolink/commit/a0a5bed2bba4118dde149713708e36d4d29e1aae))

## [7.44.0](https://github.com/juspay/neurolink/compare/v7.43.0...v7.44.0) (2025-09-24)

### Features

- **(sdk):** Integrate mem0 for better context ([78edf08](https://github.com/juspay/neurolink/commit/78edf08467432988c968eb06f510f0198b253665))

## [7.43.0](https://github.com/juspay/neurolink/compare/v7.42.0...v7.43.0) (2025-09-23)

### Features

- **(cli):** auto-detect and enable redis support in loop conversation memory ([b7b5514](https://github.com/juspay/neurolink/commit/b7b55149eb49a9f0ffa2a257c96d869b0da59eeb))

## [7.42.0](https://github.com/juspay/neurolink/compare/v7.41.4...v7.42.0) (2025-09-23)

### Features

- **(middleware):** robust bad word filtering in guardrails and correct stream usage ([d396797](https://github.com/juspay/neurolink/commit/d396797640832a373b386a7c550ec406e129d2d2))

## [7.41.4](https://github.com/juspay/neurolink/compare/v7.41.3...v7.41.4) (2025-09-21)

### Bug Fixes

- **(types):** expose core SDK types for external developer integration ([66199c9](https://github.com/juspay/neurolink/commit/66199c9fb579f1aaab929ca987ac028eafa61a46))

## [7.41.3](https://github.com/juspay/neurolink/compare/v7.41.2...v7.41.3) (2025-09-20)

## [7.41.2](https://github.com/juspay/neurolink/compare/v7.41.1...v7.41.2) (2025-09-20)

## [7.41.1](https://github.com/juspay/neurolink/compare/v7.41.0...v7.41.1) (2025-09-20)

## [7.41.0](https://github.com/juspay/neurolink/compare/v7.40.1...v7.41.0) (2025-09-20)

### Features

- **(test):** Added tests for hitl ([5ab1885](https://github.com/juspay/neurolink/commit/5ab1885eb8788dd499cda94c67d1791e7dd9b90f))

## [7.40.1](https://github.com/juspay/neurolink/compare/v7.40.0...v7.40.1) (2025-09-17)

### Bug Fixes

- **(title):** Update system prompt to generate better title ([9d0e5b8](https://github.com/juspay/neurolink/commit/9d0e5b85a11f2cfe67942f7db407193842f8b93f))

## [7.40.0](https://github.com/juspay/neurolink/compare/v7.39.0...v7.40.0) (2025-09-17)

### Features

- **(envsetup):** Added env setup test ([d08917e](https://github.com/juspay/neurolink/commit/d08917e69675aedd468c25697250c24fbfa21372))

## [7.39.0](https://github.com/juspay/neurolink/compare/v7.38.1...v7.39.0) (2025-09-16)

### Features

- **(hitl):** Implemented human in the loop for sdk ([1a66f53](https://github.com/juspay/neurolink/commit/1a66f533d4d92fb33d203947a4c6648a72db631c))

## [7.38.1](https://github.com/juspay/neurolink/compare/v7.38.0...v7.38.1) (2025-09-16)

### Bug Fixes

- **(tool):** Openai provider's no of tool to pass ([8804d56](https://github.com/juspay/neurolink/commit/8804d5643672823d8e4684ecc622684935c3bdfe))

## [7.38.0](https://github.com/juspay/neurolink/compare/v7.37.1...v7.38.0) (2025-09-14)

### Features

- **(memory):** Add support to store tool history in redis ([93d3223](https://github.com/juspay/neurolink/commit/93d32236475bfbd9f3c4017ee47c54729f681350))

## [7.37.1](https://github.com/juspay/neurolink/compare/v7.37.0...v7.37.1) (2025-09-13)

### Bug Fixes

- **(tools):** resolve MCP tool execution and parameter validation failures ([2aa2ef7](https://github.com/juspay/neurolink/commit/2aa2ef7db1293e158e5dd34f63050a87aa302ddf))

## [7.37.0](https://github.com/juspay/neurolink/compare/v7.36.0...v7.37.0) (2025-09-10)

### Features

- **(sdk):** Add advanced orchestration of model and providers BZ-43839 ([840d697](https://github.com/juspay/neurolink/commit/840d697aa6ef3e5e4c511a9482fc7e80006d2534))

## [7.36.0](https://github.com/juspay/neurolink/compare/v7.35.0...v7.36.0) (2025-09-10)

### Features

- **(image):** added support for multimodality(image) in cli and sdk ([678b61b](https://github.com/juspay/neurolink/commit/678b61bfef3d0622029d40b8ab06dca9836bcb6c))

## [7.35.0](https://github.com/juspay/neurolink/compare/v7.34.0...v7.35.0) (2025-09-09)

### Features

- **(cli):** Add interactive provider setup wizard ([50ee963](https://github.com/juspay/neurolink/commit/50ee9631ea88e63cb2d39c1ab792fc015402bb49))

## [7.34.0](https://github.com/juspay/neurolink/compare/v7.33.4...v7.34.0) (2025-09-09)

### Features

- **(cli):** expose memory commands to cli from sdk ([b9eb802](https://github.com/juspay/neurolink/commit/b9eb802c0ecfa521327e0423b5a9167119ac2fca))
- **(cli):** Implement interactive loop mode ([89b5012](https://github.com/juspay/neurolink/commit/89b5012ff44bac58e01846834d05ea50fe37cd35))
- **(memory):** Add Redis Support for conversation History ([28e2f86](https://github.com/juspay/neurolink/commit/28e2f86b4aa5b6e43d2bc71a86885cca40851e44))
- **(tool):** Optimize tool discovery and add conversation tutorial ([56c7a3f](https://github.com/juspay/neurolink/commit/56c7a3fac9713cdd17f3f719f793e41fce39259b))

## [7.33.4](https://github.com/juspay/neurolink/compare/v7.33.3...v7.33.4) (2025-09-04)

### Bug Fixes

- **(azure):** resolve provider initialization and streaming issues ([f35114b](https://github.com/juspay/neurolink/commit/f35114bcf29ee23c3b9abefcb99c49f7a0533507))

## [7.33.3](https://github.com/juspay/neurolink/compare/v7.33.2...v7.33.3) (2025-09-04)

## [7.33.2](https://github.com/juspay/neurolink/compare/v7.33.1...v7.33.2) (2025-09-04)

### Bug Fixes

- **(latency):** Reduced Tool Latency via Concurrent Server Init ([eb36fc9](https://github.com/juspay/neurolink/commit/eb36fc9a0ba32bb9b23c0ea163aadf2aa918d323))

## [7.33.1](https://github.com/juspay/neurolink/compare/v7.33.0...v7.33.1) (2025-09-03)

## [7.33.0](https://github.com/juspay/neurolink/compare/v7.32.0...v7.33.0) (2025-09-03)

### Features

- **(provider):** refactor generate method to use streamText for improved performance and consistency ([a118300](https://github.com/juspay/neurolink/commit/a11830088376b899725bcb1dc2467cb73f44f5b9))

## [7.32.0](https://github.com/juspay/neurolink/compare/v7.31.0...v7.32.0) (2025-09-03)

### Features

- **(sdk):** Add Speech to Speech agents implementation ([a8bf953](https://github.com/juspay/neurolink/commit/a8bf953993a16303d3c4a5b3a94d5ea5b6bd83d7))

## [7.31.0](https://github.com/juspay/neurolink/compare/v7.30.1...v7.31.0) (2025-09-01)

### Features

- **(core):** implement global middleware architecture ([8eb711a](https://github.com/juspay/neurolink/commit/8eb711ae827773c3fbc5339402d6cbee4e0bc8d4))

## [7.30.1](https://github.com/juspay/neurolink/compare/v7.30.0...v7.30.1) (2025-08-31)

### Bug Fixes

- **(bedrock):** migrate from ai-sdk to native AWS SDK implementation ([e5d8a4c](https://github.com/juspay/neurolink/commit/e5d8a4c85144ed558167f5083abd89d125576ab0))

## [7.30.0](https://github.com/juspay/neurolink/compare/v7.29.3...v7.30.0) (2025-08-29)

### Features

- **(SDK):** Integrate context summarization with conversation memory BZ-43344 ([a2316ff](https://github.com/juspay/neurolink/commit/a2316ff6df55107316892d33365455e6ebdcbbd9))

## [7.29.3](https://github.com/juspay/neurolink/compare/v7.29.2...v7.29.3) (2025-08-29)

### Bug Fixes

- **(build):** resolve ESLint compliance and TypeScript compilation errors ([c9030f2](https://github.com/juspay/neurolink/commit/c9030f20b080b359ab5cdd014cecaf15a8b68789))

## [7.29.2](https://github.com/juspay/neurolink/compare/v7.29.1...v7.29.2) (2025-08-29)

### Bug Fixes

- **(providers):** enable drop-in replacement for bedrock-mcp-connector ([9b67d23](https://github.com/juspay/neurolink/commit/9b67d233c2e8400a401759e34ffaf46a9a9c77a8))

## [7.29.1](https://github.com/juspay/neurolink/compare/v7.29.0...v7.29.1) (2025-08-28)

### Bug Fixes

- **(vertex):** restored support for adc ([238666a](https://github.com/juspay/neurolink/commit/238666ab907fc16945d5de6c5f79637be128f4e6))

## [7.29.0](https://github.com/juspay/neurolink/compare/v7.28.1...v7.29.0) (2025-08-26)

### Features

- **(guardrails):** added guardrails as a middleware ([ac60f6b](https://github.com/juspay/neurolink/commit/ac60f6b143a58f86e17481ddb3e067e5307391cf))

## [7.28.1](https://github.com/juspay/neurolink/compare/v7.28.0...v7.28.1) (2025-08-26)

### Bug Fixes

- **(cli):** resolve ESM interop and spawn synchronization issues ([4983221](https://github.com/juspay/neurolink/commit/49832210cd56df14e7cb77925fcc89c1cc72c046))
- **(security):** prevent command injection in ollama pull ([27e6088](https://github.com/juspay/neurolink/commit/27e6088aa9e2d7dddaa1839d777e6b642e095549))

## [7.28.0](https://github.com/juspay/neurolink/compare/v7.27.0...v7.28.0) (2025-08-25)

### Features

- **(proxy):** comprehensive proxy support for all AI providers ([332974a](https://github.com/juspay/neurolink/commit/332974ae73e9ccc84a8dbbea65f10bc3262fecd5))

## [7.27.0](https://github.com/juspay/neurolink/compare/v7.26.1...v7.27.0) (2025-08-24)

### Features

- **(History):** Added the functionality to export the conversation history for debugging purpose ([71cec7e](https://github.com/juspay/neurolink/commit/71cec7e30154d80c123cae022806dfea58edbe69))

## [7.26.1](https://github.com/juspay/neurolink/compare/v7.26.0...v7.26.1) (2025-08-21)

## [7.26.0](https://github.com/juspay/neurolink/compare/v7.25.0...v7.26.0) (2025-08-21)

### Features

- **(core):** implement provider performance metrics and optimization system ([caa68e7](https://github.com/juspay/neurolink/commit/caa68e7fd44d5a15dd48605063b093279b6f82ae))

## [7.25.0](https://github.com/juspay/neurolink/compare/v7.24.1...v7.25.0) (2025-08-21)

### Features

- **(middleware):** add custom middleware development guide ([ffd0343](https://github.com/juspay/neurolink/commit/ffd0343a589b267a5b8349a06cdfe2664a942e4c))

## [7.24.1](https://github.com/juspay/neurolink/compare/v7.24.0...v7.24.1) (2025-08-21)

## [7.24.0](https://github.com/juspay/neurolink/compare/v7.23.0...v7.24.0) (2025-08-20)

### Features

- **(deploy):** Added a configurable force-rebuild flag for the deploy command. ([e5a81d4](https://github.com/juspay/neurolink/commit/e5a81d4df2ff3dd6a1b81d74beb0bca50015f207))

## [7.23.0](https://github.com/juspay/neurolink/compare/v7.22.0...v7.23.0) (2025-08-19)

### Features

- **(docs):** modernize api examples ([c77706b](https://github.com/juspay/neurolink/commit/c77706b427c2ea781269c6d0c2dc7ca2511128cb))

## [7.22.0](https://github.com/juspay/neurolink/compare/v7.21.0...v7.22.0) (2025-08-19)

### Features

- **(memory):** Add conversation memory test suite for NeuroLink stream functionality ([b896bef](https://github.com/juspay/neurolink/commit/b896bef43fb0d743f5d9a7196ecf5ca4e39aa8a0))

## [7.21.0](https://github.com/juspay/neurolink/compare/v7.20.0...v7.21.0) (2025-08-19)

### Features

- **(provider):** add env-based fallback for available models (BZ-43348) ([4b6cee3](https://github.com/juspay/neurolink/commit/4b6cee3c19b2b2512b8d236a49b29e2091343195))

## [7.20.0](https://github.com/juspay/neurolink/compare/v7.19.0...v7.20.0) (2025-08-19)

### Features

- **(cli):** add --version flag to display package version ([632eb7c](https://github.com/juspay/neurolink/commit/632eb7ca93024dd055dc626951c5a05153d4eda7))

## [7.19.0](https://github.com/juspay/neurolink/compare/v7.18.0...v7.19.0) (2025-08-19)

### Features

- **(docs):** HUMAN IN THE LOOP - User consent for some tools execution ([3f8db51](https://github.com/juspay/neurolink/commit/3f8db51d3f2ab4a35ee361cb867af5047f178178))

## [7.18.0](https://github.com/juspay/neurolink/compare/v7.17.0...v7.18.0) (2025-08-19)

### Features

- **(dev-experience):** add pre-commit hook for automated quality checks ([7d26726](https://github.com/juspay/neurolink/commit/7d267269e3b2168f3a38c736712beab02777df5c))

## [7.17.0](https://github.com/juspay/neurolink/compare/v7.16.0...v7.17.0) (2025-08-19)

### Features

- **(proxy):** implement comprehensive enterprise proxy support with testing ([0dd124b](https://github.com/juspay/neurolink/commit/0dd124b75826f4581a608e4d62acc05e827cbc1d))

## [7.16.0](https://github.com/juspay/neurolink/compare/v7.15.0...v7.16.0) (2025-08-19)

### Features

- **(cli):** Add validate provider config support in CLI ([2e8d6ad](https://github.com/juspay/neurolink/commit/2e8d6ad6475bf24f67f61a76d33689f323821b70))

## [7.15.0](https://github.com/juspay/neurolink/compare/v7.14.8...v7.15.0) (2025-08-19)

### Features

- **(tools):** add websearch tool using Gemini AI for Google search integration BZ-43347 ([bcd5160](https://github.com/juspay/neurolink/commit/bcd516019db8a6b89ba6ecb39037b257fd955df0))

## [7.14.8](https://github.com/juspay/neurolink/compare/v7.14.7...v7.14.8) (2025-08-19)

### Bug Fixes

- **(mcp):** implement generic error handling for all MCP server response formats ([5aa707a](https://github.com/juspay/neurolink/commit/5aa707aa9874ed76ab067a1f7fb6e8301519ce7f))

## [7.14.7](https://github.com/juspay/neurolink/compare/v7.14.6...v7.14.7) (2025-08-18)

### Bug Fixes

- **(core):** add validation for tool registration ([caed431](https://github.com/juspay/neurolink/commit/caed431ca1a025599ae8f901a4f4cb36b970379c))

## [7.14.6](https://github.com/juspay/neurolink/compare/v7.14.5...v7.14.6) (2025-08-18)

### Bug Fixes

- **(docs):** improve and update cli guide ([4039044](https://github.com/juspay/neurolink/commit/40390444950f763f4e360783f99256b16eb9aab0))

## [7.14.5](https://github.com/juspay/neurolink/compare/v7.14.4...v7.14.5) (2025-08-18)

### Bug Fixes

- **(mcp):** prevent memory leak from uncleared interval timer in MCPCircuitBreaker ([1f2ae47](https://github.com/juspay/neurolink/commit/1f2ae4743dc8657baac9ba28a053c4e9d199cdbc))

## [7.14.4](https://github.com/juspay/neurolink/compare/v7.14.3...v7.14.4) (2025-08-18)

### Bug Fixes

- **(docs):** use pnpm in setup script and correct modelServer run command BZ-43341 ([fcfa465](https://github.com/juspay/neurolink/commit/fcfa465ef5af7656dc066fd5901c738588609d4e))

## [7.14.3](https://github.com/juspay/neurolink/compare/v7.14.2...v7.14.3) (2025-08-16)

### Bug Fixes

- **(typescript):** eliminate all TypeScript any types for improved type safety ([45043cb](https://github.com/juspay/neurolink/commit/45043cb1e671bdec07cf93ddd8005d18df2f0de0))

## [7.14.2](https://github.com/juspay/neurolink/compare/v7.14.1...v7.14.2) (2025-08-16)

### Bug Fixes

- **(sdk):** add generateText backward compatibility and fix formatting consistency ([93ff23c](https://github.com/juspay/neurolink/commit/93ff23c766ca71cbe7f77821b35cf5156bbe9d1f))

## [7.14.1](https://github.com/juspay/neurolink/compare/v7.14.0...v7.14.1) (2025-08-15)

### Bug Fixes

- **(mcp):** implement external MCP server integration with real tool execution ([9427a95](https://github.com/juspay/neurolink/commit/9427a95599a829f82e697eaf30388a8f3c899d4f))

## [7.14.0](https://github.com/juspay/neurolink/compare/v7.13.0...v7.14.0) (2025-08-14)

### Features

- **(external-mcp):** add external MCP server integration support ([c03dee8](https://github.com/juspay/neurolink/commit/c03dee8dd7a2e06e78bc743d7b3a5cff858395de))

## [7.13.0](https://github.com/juspay/neurolink/compare/v7.12.0...v7.13.0) (2025-08-14)

### Features

- **(SDK):** Add context summarizer for conversation BZ-43204 ([38231c4](https://github.com/juspay/neurolink/commit/38231c475b7546c16db741010173794251a7dbaa))

## [7.12.0](https://github.com/juspay/neurolink/compare/v7.11.1...v7.12.0) (2025-08-14)

### Features

- **(memory):** Added support for Conversation History ([5cf3650](https://github.com/juspay/neurolink/commit/5cf36507ec12fca525df652c1c15acc8c1c71297))

## [7.11.1](https://github.com/juspay/neurolink/compare/v7.11.0...v7.11.1) (2025-08-14)

### Bug Fixes

- **(ci):** add external contributor detection to GitHub Copilot PR Review workflow ([c7d9f2c](https://github.com/juspay/neurolink/commit/c7d9f2cf8d1d0079b34e443a935a84d4a53adf9a))

## [7.11.0](https://github.com/juspay/neurolink/compare/v7.10.3...v7.11.0) (2025-08-14)

### Features

- **(providers):** consolidate provider logic to BaseProvider for consistency and performance ([a5da739](https://github.com/juspay/neurolink/commit/a5da73982523f4cee57bbdf108b54a339a62d9b3))

## [7.10.3](https://github.com/juspay/neurolink/compare/v7.10.2...v7.10.3) (2025-08-13)

### Bug Fixes

- **(ci):** make comment posting non-blocking for external contributor PRs ([f40b3f7](https://github.com/juspay/neurolink/commit/f40b3f75a8162df41461ef5ca1b2bb97d62719c2))

## [7.10.2](https://github.com/juspay/neurolink/compare/v7.10.1...v7.10.2) (2025-08-13)

### Bug Fixes

- **(ci):** prevent external contributor PR failures due to comment permissions ([ac76270](https://github.com/juspay/neurolink/commit/ac7627032084f1920bea03ba3a661fb038bbf9cf))

## [7.10.1](https://github.com/juspay/neurolink/compare/v7.10.0...v7.10.1) (2025-08-13)

### Bug Fixes

- **(ci):** resolve external contributor PR failures in single commit policy validation ([0536828](https://github.com/juspay/neurolink/commit/0536828f89cad869dc1474b4bd80f7f0fde292da)), closes [#60](https://github.com/juspay/neurolink/issues/60)

## [7.10.0](https://github.com/juspay/neurolink/compare/v7.9.0...v7.10.0) (2025-08-12)

### Features

- **(build):** implement comprehensive build rule enforcement system ([7648cad](https://github.com/juspay/neurolink/commit/7648cadde1676fa20ef74c555919e036bc559ad5))

## [7.9.0](https://github.com/juspay/neurolink/compare/v7.8.0...v7.9.0) (2025-08-11)

### Features

- **(core):** add EventEmitter functionality for real-time event monitoring ([fd8b6b0](https://github.com/juspay/neurolink/commit/fd8b6b075ca46df4f35a58d26ad6cd4839fe2361))

### Bug Fixes

- **(ci):** add semantic-release configuration with dependencies and testing ([d48e274](https://github.com/juspay/neurolink/commit/d48e274bed6473df28403ae440d7109656216307))
- **(ci):** configure semantic-release to handle ticket prefixes with proper JSON escaping ([6d575dc](https://github.com/juspay/neurolink/commit/6d575dcf90611ad6a9854daff551dade3f06e001))
- **(ci):** correct JSON escaping in semantic-release configuration ([b9bbe50](https://github.com/juspay/neurolink/commit/b9bbe50461771f82e19cdbbb413ca6af6f28c31d))
- **(cli):** missing model name in analytics output ([416c5b7](https://github.com/juspay/neurolink/commit/416c5b74745776d1b3742557add4f501669f06f9))
- **(providers):** respect VERTEX_MODEL environment variable in model selection ([40eddb1](https://github.com/juspay/neurolink/commit/40eddb1d52a61891dec7fab5998b840f233352ee))

# [7.8.0](https://github.com/juspay/neurolink/compare/v7.7.1...v7.8.0) (2025-08-11)

### Bug Fixes

- exclude \_site directory from ESLint ([c0e5f1d](https://github.com/juspay/neurolink/commit/c0e5f1dce46e91ee76cd1a4954190569b4a8d1d9))

### Features

- **providers:** add comprehensive Amazon SageMaker provider integration ([9ef4ebe](https://github.com/juspay/neurolink/commit/9ef4ebeeda520a71a7461ca5f4f34a83c2062356))

## [7.7.1](https://github.com/juspay/neurolink/compare/v7.7.0...v7.7.1) (2025-08-11)

### Bug Fixes

- **providers:** resolve ESLint errors and improve validation in Vertex AI health checker ([a5822ee](https://github.com/juspay/neurolink/commit/a5822eee3f8b6beaf3d2168ebb8888a6beaa5cb4))

# [7.7.0](https://github.com/juspay/neurolink/compare/v7.6.1...v7.7.0) (2025-08-10)

### Features

- **tools:** add Lighthouse compatibility with unified registerTools API ([5200da2](https://github.com/juspay/neurolink/commit/5200da22b130b57c6b235346bd9db80970703900))

## [7.6.1](https://github.com/juspay/neurolink/compare/v7.6.0...v7.6.1) (2025-08-09)

### Bug Fixes

- **docs:** resolve documentation deployment and broken links ([e78d7e8](https://github.com/juspay/neurolink/commit/e78d7e8da6ff16ee266a88beec70a26b67145da2))

# [7.6.0](https://github.com/juspay/neurolink/compare/v7.5.0...v7.6.0) (2025-08-09)

### Features

- **openai-compatible:** add OpenAI Compatible provider with intelligent model auto-discovery ([3041d26](https://github.com/juspay/neurolink/commit/3041d26fb33881e5962cb1f13d3d06f021f642f2))

# [7.5.0](https://github.com/juspay/neurolink/compare/v7.4.0...v7.5.0) (2025-08-06)

### Features

- **providers:** add LiteLLM provider integration with access to 100+ AI models ([8918f8e](https://github.com/juspay/neurolink/commit/8918f8efc853a2fa42b75838259b22d8022f02b3))

# [7.4.0](https://github.com/juspay/neurolink/compare/v7.3.8...v7.4.0) (2025-08-06)

### Features

- add Bitbucket MCP server integration ([239ca6d](https://github.com/juspay/neurolink/commit/239ca6df81be5474d983df95998f90e2e6d633b9))

## [7.3.8](https://github.com/juspay/neurolink/compare/v7.3.7...v7.3.8) (2025-08-05)

### Bug Fixes

- **lint:** improve linting ([580130a](https://github.com/juspay/neurolink/commit/580130aa33700b67f9d99de60dbe3d0c7415adfc))

## [7.3.7](https://github.com/juspay/neurolink/compare/v7.3.6...v7.3.7) (2025-08-04)

### Bug Fixes

- **docs:** configure pymdownx.emoji to properly render Material Design icons ([09ba764](https://github.com/juspay/neurolink/commit/09ba764e0cb57eac3d365d53754d32ef7a178bcf))

## [7.3.6](https://github.com/juspay/neurolink/compare/v7.3.5...v7.3.6) (2025-08-04)

### Bug Fixes

- **docs:** trigger fresh deployment after GitHub Pages source change ([e9c5975](https://github.com/juspay/neurolink/commit/e9c5975bcfb2ba7e53a29282bf9a5b45cc0d0034))

## [7.3.5](https://github.com/juspay/neurolink/compare/v7.3.4...v7.3.5) (2025-08-04)

### Bug Fixes

- **docs:** force fresh deployment after GitHub Pages source change to GitHub Actions ([b4b498f](https://github.com/juspay/neurolink/commit/b4b498f436986e6c017b1552af218837ad9b510e))

## [7.3.4](https://github.com/juspay/neurolink/compare/v7.3.3...v7.3.4) (2025-08-04)

### Bug Fixes

- **docs:** retry deployment to apply .nojekyll fix for MkDocs Material theme ([ce0afab](https://github.com/juspay/neurolink/commit/ce0afab3791dc9aa10c468ba5f48783301d092cf))

## [7.3.3](https://github.com/juspay/neurolink/compare/v7.3.2...v7.3.3) (2025-08-04)

### Bug Fixes

- **docs:** add .nojekyll file to prevent Jekyll processing ([a2f28b2](https://github.com/juspay/neurolink/commit/a2f28b2accbae0c280fcd43907d7774d92d9895f))

## [7.3.2](https://github.com/juspay/neurolink/compare/v7.3.1...v7.3.2) (2025-08-04)

### Bug Fixes

- **docs:** update copyright year and set dark theme as default ([bf1973d](https://github.com/juspay/neurolink/commit/bf1973d40298554c8cab508c109decf81cd9c519))

## [7.3.1](https://github.com/juspay/neurolink/compare/v7.3.0...v7.3.1) (2025-08-04)

### Bug Fixes

- **docs:** resolve GitHub Actions workflow YAML parsing errors ([182416d](https://github.com/juspay/neurolink/commit/182416d03e1887c35619013a6a92cf3337d604a1))

# [7.3.0](https://github.com/juspay/neurolink/compare/v7.2.0...v7.3.0) (2025-08-04)

### Features

- **docs:** implement comprehensive documentation website infrastructure ([77c81f4](https://github.com/juspay/neurolink/commit/77c81f41bc8533252a7dfc2265790bc37225450b))

# [7.2.0](https://github.com/juspay/neurolink/compare/v7.1.0...v7.2.0) (2025-08-04)

### Features

- **core:** complete NeuroLink Phase 1-4 implementation with comprehensive verification ([37d5cb1](https://github.com/juspay/neurolink/commit/37d5cb1a494850cd564d6fbce68895997939886f))

# [7.1.0](https://github.com/juspay/neurolink/compare/v7.0.0...v7.1.0) (2025-08-03)

### Features

- **core:** major CLI optimization and comprehensive core functionality overhaul ([66ad664](https://github.com/juspay/neurolink/commit/66ad6649163c21c1f5cf7dcb936af8903abc4a17))

# [7.0.0](https://github.com/juspay/neurolink/compare/v6.2.1...v7.0.0) (2025-07-31)

### Code Refactoring

- **structure:** standardize all filenames and directories to camelCase ([656d094](https://github.com/juspay/neurolink/commit/656d094ac5f6caeecb4aebbfbe3f49f75f1adc4a))

### BREAKING CHANGES

- **structure:** None - all functionality preserved, only naming conventions updated

## [6.2.1](https://github.com/juspay/neurolink/compare/v6.2.0...v6.2.1) (2025-07-31)

### Bug Fixes

- **logging:** consolidate MCP logging and add debug flag control ([ea0132d](https://github.com/juspay/neurolink/commit/ea0132dd954966cb42238dc3736f6cee9cc7b18d))

# [6.2.0](https://github.com/juspay/neurolink/compare/v6.1.0...v6.2.0) (2025-07-30)

### Features

- systematic dead code elimination across entire codebase ([571060a](https://github.com/juspay/neurolink/commit/571060a6146dc13e486da22610122d599420fcb2))

# [6.1.0](https://github.com/juspay/neurolink/compare/v6.0.0...v6.1.0) (2025-07-24)

### Features

- **github:** enhance GitHub project configuration and community features ([deb1407](https://github.com/juspay/neurolink/commit/deb1407cb8c7be7eff4baf365f6600da33ac4255))

# [6.0.0](https://github.com/juspay/neurolink/compare/v5.3.0...v6.0.0) (2025-07-24)

### Features

- **types:** eliminate all TypeScript any usage across entire codebase ([777c3cd](https://github.com/juspay/neurolink/commit/777c3cda582cbefcf01480a12d13a2adb7c140c8))

### BREAKING CHANGES

- **types:** Complete removal of TypeScript 'any' types for enhanced type safety

This comprehensive refactor eliminates all TypeScript 'any' usage across the entire
NeuroLink codebase, affecting 140+ files with systematic type safety improvements:

- NEW: src/lib/types/common.ts - Unknown, UnknownRecord, JsonValue utility types
- NEW: src/lib/types/tools.ts - Tool system types (ToolArgs, ToolResult, ToolDefinition)
- NEW: src/lib/types/providers.ts - Provider-specific types (ProviderConfig, AnalyticsData)
- NEW: src/lib/types/cli.ts - CLI command types and interfaces
- NEW: src/lib/types/index.ts - Centralized type exports

- Export NeuroLinkSDK interface from baseProvider for proper typing
- Fix all provider constructors: anthropic, azureOpenai, googleAiStudio, googleVertex, mistral
- Update functionCalling-provider with proper type casting
- Enhanced analytics-helper with comprehensive type guards
- Fix timeout-wrapper and all provider error handling

- Fix directToolsServer: inputSchema and execution result types
- Fix aiCoreServer: provider factory and result access types
- Fix transport-manager: HTTP client transport constructor types
- Fix unified-registry: server configuration type compatibility
- Update all MCP adapters, clients, managers, and orchestrators
- Fix tool integration, registry, and session management
- Enhanced error handling and recovery systems

- Update baseProvider with proper abstract method signatures
- Fix serviceRegistry with type-safe service management
- Enhanced factory pattern with proper generic constraints
- Update evaluation system with strict typing
- Fix analytics core with proper data flow types

- Fix all CLI commands with proper argument typing
- Update command factory with type-safe command creation
- Enhanced tool extension and registration with strict interfaces
- Fix SDK integration with proper type boundaries

- Update all test files with proper type assertions
- Fix test helpers with generic constraints
- Enhanced integration tests with type safety
- Update performance and streaming tests
- Fix all provider-specific test suites

- Update eslint.config.js for enhanced type checking
- Fix logger with proper structured logging types
- Update provider validation with type guards
- Enhanced proxy and networking layers
- Fix telemetry service with proper event typing

- Update tsconfig.json for stricter type checking
- Enhanced build pipeline compatibility
- Fix package exports and type definitions

- ESLint violations: 14 → 0 (100% elimination)
- TypeScript compilation: ✅ PASSING
- Build pipeline: ✅ PASSING
- All tests: ✅ PASSING
- Runtime behavior: ✅ PRESERVED

This change maintains complete backward compatibility while establishing
a foundation for enhanced developer experience and code reliability.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>

# [5.3.0](https://github.com/juspay/neurolink/compare/v5.2.0...v5.3.0) (2025-07-23)

### Features

- **mcp:** enhance MCP integration with comprehensive testing infrastructure and tool ecosystem improvements ([a38d845](https://github.com/juspay/neurolink/commit/a38d845032133eee098de10b966cbdd3a329fdfd))

# [5.2.0](https://github.com/juspay/neurolink/compare/v5.1.0...v5.2.0) (2025-07-22)

### Features

- **core:** implement comprehensive factory pattern architecture with full MCP integration and provider unification ([b13963a](https://github.com/juspay/neurolink/commit/b13963aaf6f95233be8b1e9bdc69ce1b65604cdf))

# [5.1.0](https://github.com/juspay/neurolink/compare/v5.0.0...v5.1.0) (2025-07-13)

### Features

- **core:** complete unified multimodal AI platform architecture with generate/stream unification ([846e409](https://github.com/juspay/neurolink/commit/846e409a4a77024ddee9961c9b5049bc99f8335e))

# [5.0.0](https://github.com/juspay/neurolink/compare/v4.2.0...v5.0.0) (2025-07-11)

- refactor(cli)!: remove agent-generate command, unify CLI to single generate command ([9c034b7](https://github.com/juspay/neurolink/commit/9c034b7b5a8df3b861fccae0e617c5aa4c85a903))

### Bug Fixes

- **scripts:** update docs:generate to use docs:validate instead of removed docs:sync ([3277bab](https://github.com/juspay/neurolink/commit/3277bab3eb1cec24a60fe28bf3897fce63d83d3a))

### BREAKING CHANGES

- agent-generate command has been removed

The agent-generate command has been completely removed from the CLI. All
functionality is now available through the enhanced generate command with
tools enabled by default.

### Changes Made:

- Delete src/cli/commands/agent-generate.ts command implementation
- Remove agent-generate import and registration from src/cli/index.ts
- Update docs/CLI-GUIDE.md to remove agent-generate documentation
- Update memory-bank documentation files to reflect unified approach
- Remove agent-generate test cases from scripts/corrected-functionality-test.js

### Migration Guide:

- Replace `neurolink agent-generate "prompt"` with `neurolink generate "prompt"`
- Tools are enabled by default in generate command
- Use `--disable-tools` flag if tool-calling is not desired
- All previous agent-generate functionality available in generate command

### Technical Impact:

- Simplified CLI interface with single text generation command
- Reduced codebase complexity and maintenance overhead
- Enhanced generate command provides all tool-calling capabilities
- Zero breaking changes to core functionality
- Clean TypeScript compilation and documentation consistency

# [4.2.0](https://github.com/juspay/neurolink/compare/v4.1.1...v4.2.0) (2025-07-11)

### Features

- **mcp:** comprehensive MCP system enhancements with timeout management ([1d35b5e](https://github.com/juspay/neurolink/commit/1d35b5e12d03ce60bcdf0608749a1b99e8565567))

## [4.1.1](https://github.com/juspay/neurolink/compare/v4.1.0...v4.1.1) (2025-07-10)

### Bug Fixes

- **format:** fix formatting for all follow ([a49a94b](https://github.com/juspay/neurolink/commit/a49a94bf4d2e02cf1b1f7d4b555c3c71e25a0ea5))

# [4.1.0](https://github.com/juspay/neurolink/compare/v4.0.0...v4.1.0) (2025-07-09)

### Features

- **mcp:** comprehensive MCP system overhaul with GitHub PR fixes ([c0d8114](https://github.com/juspay/neurolink/commit/c0d8114ef1ab2d5dd3162c369f234d0de17397f7))

# [4.0.0](https://github.com/juspay/neurolink/compare/v3.0.1...v4.0.0) (2025-07-06)

- feat(core)!: transform NeuroLink into enterprise AI analytics platform ([74c88d6](https://github.com/juspay/neurolink/commit/74c88d6484bbd983aba9119929481e655d62eab3))

### BREAKING CHANGES

- Major architectural enhancement from basic AI SDK
  to comprehensive enterprise platform with analytics, evaluation,
  real-time services, and business intelligence capabilities.

Core Features Added:

- Analytics System: Usage tracking, cost estimation, performance monitoring
- Evaluation Framework: AI-powered quality assessment and scoring
- Enterprise Config: Backup/restore, validation, provider management
- Real-time Services: Chat, streaming, websocket capabilities
- Telemetry: OpenTelemetry integration for production monitoring
- Documentation: Complete business and technical documentation overhaul
- Examples: Comprehensive demo library with 30+ working examples
- Provider Integration: Analytics helper integrated across all 9 providers

Technical Implementation:

- NEW: src/lib/core/analytics.ts - Real usage tracking engine
- NEW: src/lib/core/evaluation.ts - AI quality assessment framework
- NEW: src/lib/config/configManager.ts - Enterprise configuration management
- NEW: src/lib/chat/ - Complete chat service infrastructure (7 files)
- NEW: src/lib/services/ - Streaming and WebSocket architecture
- NEW: src/lib/telemetry/ - OpenTelemetry integration
- NEW: examples/ - Comprehensive demo ecosystem (30+ examples)
- NEW: docs/ - Complete documentation overhaul (15+ guides)
- ENHANCED: All 9 providers with analytics integration
- ENHANCED: CLI with professional analytics display
- ENHANCED: Testing infrastructure with new test suites

Files Changed: 127 files (+20,542 additions, -6,142 deletions)
Backward Compatibility: 100% maintained - existing functionality preserved
New Features: Opt-in via --enable-analytics --enable-evaluation flags

Business Impact:

- Production Monitoring: Real-time performance and cost tracking
- Quality Assurance: AI-powered response evaluation and scoring
- Cost Optimization: Usage analytics and provider comparison
- Risk Management: Backup systems and error recovery
- Developer Experience: Professional CLI and comprehensive examples
- Enterprise Readiness: OpenTelemetry observability and operational excellence

Performance Metrics:

- Analytics: Real token counts (299-768), response times (2-10s)
- Evaluation: Quality scores (8-10/10), sub-6s processing
- Providers: All 9 providers enhanced with zero breaking changes
- CLI: Professional output with debug diagnostics

## [3.0.1](https://github.com/juspay/neurolink/compare/v3.0.0...v3.0.1) (2025-07-01)

### Bug Fixes

- **cli:** honor --model parameter in CLI commands ([467ea85](https://github.com/juspay/neurolink/commit/467ea8548688a9db6046c98dbfd268ecd297605c))

# [3.0.0](https://github.com/juspay/neurolink/compare/v2.1.0...v3.0.0) (2025-07-01)

### Features

- **proxy:** add comprehensive enterprise proxy support across all providers ([9668e67](https://github.com/juspay/neurolink/commit/9668e67dfaa27831ba85d45fdf5b7739de902b28))

### BREAKING CHANGES

- **proxy:** None - fully backward compatible

Files modified:

- docs/ENTERPRISE-PROXY-SETUP.md (NEW) - Comprehensive enterprise proxy guide
- docs/PROVIDER-CONFIGURATION.md - Added proxy configuration section
- docs/CLI-GUIDE.md - Added proxy environment variables documentation
- docs/ENVIRONMENT-VARIABLES.md - Added proxy configuration examples
- docs/TROUBLESHOOTING.md - Added proxy troubleshooting procedures
- .env.example - Added proxy environment variables
- memory-bank/ - Updated with proxy implementation milestone
- .clinerules - Added proxy success patterns
- CHANGELOG.md - Added v2.2.0 proxy support entry
- package.json - Updated description with enterprise features
- README.md - Removed outdated content

# [2.1.0](https://github.com/juspay/neurolink/compare/v2.0.0...v2.1.0) (2025-06-29)

### Features

- **timeout:** add comprehensive timeout support for all AI providers ([8610f4a](https://github.com/juspay/neurolink/commit/8610f4ade418345b0395ab72af6e675f6eec6f93))

# [2.0.0](https://github.com/juspay/neurolink/compare/v1.11.3...v2.0.0) (2025-06-28)

### Features

- **cli:** add command variations and stream agent support ([5fc4c26](https://github.com/juspay/neurolink/commit/5fc4c26b23bd189be52272521bdd2ca40dd55837))

### BREAKING CHANGES

- **cli:** 'generate-text' command is deprecated and will be removed in v2.0

## [1.11.3](https://github.com/juspay/neurolink/compare/v1.11.2...v1.11.3) (2025-06-22)

### Bug Fixes

- resolve MCP external tools returning raw JSON instead of human-readable responses ([921a12b](https://github.com/juspay/neurolink/commit/921a12b5b31ca96bbfe3f1db05001ddb84470e14))

## [1.11.2](https://github.com/juspay/neurolink/compare/v1.11.1...v1.11.2) (2025-06-22)

### Bug Fixes

- **ci:** refactor auto-converted Node.js scripts ([4088888](https://github.com/juspay/neurolink/commit/408888863f8223e64269423412f5c79a35ddfe36))

## [1.11.1](https://github.com/juspay/neurolink/compare/v1.11.0...v1.11.1) (2025-06-21)

### Bug Fixes

- add backward compatiblity for gemini ([5e84dab](https://github.com/juspay/neurolink/commit/5e84dab598156a5b77d05b343d0d69ecf91f31b0))

# [1.11.0](https://github.com/juspay/neurolink/compare/v1.10.0...v1.11.0) (2025-06-21)

### Features

- finalize MCP ecosystem and resolve all TypeScript errors ([605d8b2](https://github.com/juspay/neurolink/commit/605d8b2ea10c824077e1379ac47a0c065f0a8095))

# [1.10.0](https://github.com/juspay/neurolink/compare/v1.9.0...v1.10.0) (2025-06-21)

### Features

- **cli:** improve provider status accuracy and error handling ([523e845](https://github.com/juspay/neurolink/commit/523e84566fee5d9afa3638186f90c628e20e4894))

# 1.9.0 (2025-06-20)

- 🎉 feat: Enhanced multi-provider support with production infrastructure ([#16](https://github.com/juspay/neurolink/issues/16)) ([55eb81a](https://github.com/juspay/neurolink/commit/55eb81a4a7e88c94f6017565b14633b254a15197))

### Bug Fixes

- **cli:** prevent debug log persistence in production deployments ([#14](https://github.com/juspay/neurolink/issues/14)) ([7310a4c](https://github.com/juspay/neurolink/commit/7310a4cb405e1f35bcc5b22559f3da87a1d793f4))
- production-ready CLI logging system and enhanced provider fallback ([#13](https://github.com/juspay/neurolink/issues/13)) ([a7e8122](https://github.com/juspay/neurolink/commit/a7e8122393f09cd85e473e5711fbfff05343025e))

### Features

- 🚀 MCP automatic tool discovery + dynamic models + AI function calling ([781b4e5](https://github.com/juspay/neurolink/commit/781b4e5c6e4886acb44a986f7b204eff346427e1))
- add Google AI Studio integration and restructure documentation ([#11](https://github.com/juspay/neurolink/issues/11)) ([346fed2](https://github.com/juspay/neurolink/commit/346fed2ad458da07b80158f084afed8f3b804f06))
- add Google AI Studio, fix CLI dependencies, and add LICENSE file ([#12](https://github.com/juspay/neurolink/issues/12)) ([c234bcb](https://github.com/juspay/neurolink/commit/c234bcb65ab1d07cb079ee9ffe9d61841aa945fb))
- implement AI Development Workflow Tools and comprehensive visual documentation ([#10](https://github.com/juspay/neurolink/issues/10)) ([b0ae179](https://github.com/juspay/neurolink/commit/b0ae179d0b31936e4aa8c53c8e8a234cd467e7c3))
- implement comprehensive CLI tool with visual documentation and … ([#4](https://github.com/juspay/neurolink/issues/4)) ([9991edb](https://github.com/juspay/neurolink/commit/9991edba7dbe7b9b33bd3b4e2b30186a81b40391))

### BREAKING CHANGES

- Enhanced provider architecture with MCP integration

* ✨ MCP automatic tool discovery - detects 82+ tools from connected servers
* 🎯 AI function calling - seamless tool execution with Vercel AI SDK
* 🔧 Dynamic model configuration via config/models.json
* 🤖 Agent-based generation with automatic tool selection
* 📡 Real-time MCP server management and monitoring

* Added MCPEnhancedProvider for automatic tool integration
* Implemented function calling for Google AI, OpenAI providers
* Created unified tool registry for MCP and built-in tools
* Enhanced CLI with `agent-generate` and MCP management commands
* Added comprehensive examples and documentation

* Automatic .mcp-config.json discovery across platforms
* Session-based context management for tool execution
* Graceful fallback when MCP servers unavailable
* Performance optimized tool discovery (<1ms per tool)

* Added 5 new comprehensive guides (MCP, troubleshooting, dynamic models)
* Created practical examples for all integration patterns
* Updated API reference with new capabilities
* Enhanced memory bank with implementation details

Resolves: Enhanced AI capabilities with real-world tool integration

- None - 100% backward compatibility maintained

Closes: Enhanced multi-provider support milestone
Ready for: Immediate production deployment
Impact: Most comprehensive AI provider ecosystem (9 providers)

Co-authored-by: sachin.sharma <sachin.sharma@juspay.in>

# @juspay/neurolink

## 1.8.0

### 🎯 Major Feature: Dynamic Model Configuration System

- **⚡ Revolutionary Model Management**: Introduced dynamic model configuration system replacing static enums
  - **Self-Updating Models**: New models automatically available without code updates
  - **Cost Optimization**: Automatic selection of cheapest models for tasks
  - **Smart Resolution**: Fuzzy matching, aliases, and capability-based search
  - **Multi-Source Loading**: Configuration from API → GitHub → local with fallback

- **💰 Cost Intelligence**: Built-in cost optimization and model selection algorithms
  - **Current Leader**: Gemini 2.0 Flash at $0.000075/1K input tokens
  - **Capability Mapping**: Find models by features (functionCalling, vision, code-execution)
  - **Real-Time Pricing**: Always current model costs and performance data
  - **Budget Controls**: Maximum price filtering and cost-aware selection

- **🔧 Production-Ready Infrastructure**: Complete system with validation and monitoring
  - **Model Configuration Server**: REST API with search capabilities (`scripts/model-server.js`)
  - **Zod Schema Validation**: Type-safe runtime configuration validation
  - **Comprehensive Testing**: Full test suite for all dynamic model functionality
  - **Documentation**: Complete guide with examples and best practices

- **🏷️ Smart Model Features**: Advanced model resolution and aliasing
  - **Aliases**: Use friendly names like "claude-latest", "best-coding", "fastest"
  - **Default Models**: Provider-specific defaults when no model specified
  - **Fuzzy Matching**: "opus" → resolves to "claude-3-opus"
  - **Deprecation Handling**: Automatically exclude deprecated models

### Technical Implementation

- **New Module**: `src/lib/core/dynamicModels.ts` - Core dynamic model provider
- **Configuration**: `config/models.json` - Structured model definitions with metadata
- **Integration**: Updated `AIProviderFactory` to use dynamic models by default
- **Testing**: Comprehensive test suite (`test-dynamicModels.js`, `test-complete-integration.js`)
- **Server**: Fake hosted server for testing and development (`scripts/model-server.js`)

### API Enhancements

- **Environment Variables**: Added `GOOGLE_AI_API_KEY` for better compatibility
- **New Scripts**: `npm run model-server`, `npm run test:dynamicModels`
- **Model Search API**: RESTful endpoints for model discovery and filtering
- **Performance**: Sub-millisecond provider creation with intelligent caching

### Current Model Inventory

- **10 Active Models**: Across Anthropic, OpenAI, Google, and Bedrock
- **Cost Range**: $0.000075 - $0.075 per 1K input tokens (100x cost difference)
- **Capabilities**: Function-calling (9 models), Vision (7 models), Code-execution (1 model)
- **Deprecation Tracking**: 1 deprecated model (GPT-4 Turbo) automatically excluded

### Breaking Changes

- **MCP Default**: MCP tools now enabled by default in `AIProviderFactory.createProvider`
- **Environment**: Added `GOOGLE_AI_API_KEY` requirement for Google AI Studio
- **Model Resolution**: Some edge cases in model name resolution may behave differently

### Migration Notes

- **Backward Compatible**: Existing code continues to work with improved functionality
- **Optional Features**: Dynamic model features are additive and optional
- **Configuration**: No changes required to existing `.env` files
- **Performance**: Improved provider creation speed and reliability

## 1.7.1

### Bug Fixes - MCP System Restoration

- **🔧 Fixed Built-in Tool Loading**: Resolved critical circular dependency issues preventing default tools from loading
  - **Root Cause**: Circular dependency between `config.ts` and `unified-registry.ts` preventing proper initialization
  - **Solution**: Implemented dynamic imports and restructured initialization chain
  - **Result**: Built-in tools restored from 0 → 3 tools (100% recovery rate)

- **⏰ Fixed Time Tool Functionality**: Time tool now properly available and returns accurate real-time data
  - Fixed tool registration and execution pathway
  - Proper timezone handling and formatting
  - Verified accuracy against system time

- **🔍 Enhanced External Tool Discovery**: 58+ external MCP tools now discoverable via comprehensive auto-discovery
  - Auto-discovery across VS Code, Claude Desktop, Cursor, Windsurf
  - Proper placeholder system for lazy activation
  - Unified registry integration

- **🏗️ Unified Registry Architecture**: Centralized tool management system now fully operational
  - Seamless integration of built-in and external tools
  - Proper initialization sequence and dependency management
  - Enhanced debugging and status reporting

### Technical Changes

- Fixed circular dependency between core MCP modules
- Updated `initialize.ts` to use dynamic imports preventing startup issues
- Enhanced `loadDefaultRegistryTools()` to ensure proper built-in server registration
- Temporarily disabled AI core server to resolve complex dependencies (utility server fully working)
- Improved error handling and logging throughout MCP system

### Validation Results

- **Built-in Tools**: 3/3 working (get-current-time, calculate-date-difference, format-number)
- **External Discovery**: 58+ tools discovered across multiple MCP sources
- **Tool Execution**: Real-time AI tool calling verified and working
- **System Integration**: Full CLI and SDK integration operational

### Breaking Changes

- None - all changes are backward compatible improvements

### Migration Notes

- Existing MCP configurations continue to work
- Built-in tools now work automatically without additional setup
- External tools require proper MCP server configuration (as before)

## 1.7.0

### Patch Changes

- **🔧 Version Bump**: Updated version to 1.7.0 to publish the three-provider implementation
  - All code changes were already included in 1.6.0 but not published
  - This version publishes the complete implementation to npm

## 1.6.0

### Major Changes

- **🎉 Universal AI Provider Support**: Expanded from 6 to 9 AI providers with support for open source models, local AI, and European compliance
  - **🆕 Hugging Face Provider**: Access to 100,000+ open source models with community-driven AI ecosystem
  - **🆕 Ollama Provider**: 100% local AI execution with complete data privacy and no internet required
  - **🆕 Mistral AI Provider**: European GDPR-compliant AI with competitive pricing and multilingual models

### Features

- **🛠️ Enhanced CLI with Ollama Commands**: New Ollama-specific management commands
  - `neurolink ollama list-models` - List installed local models
  - `neurolink ollama pull <model>` - Download models locally
  - `neurolink ollama remove <model>` - Remove installed models
  - `neurolink ollama status` - Check Ollama service health
  - `neurolink ollama start/stop` - Manage Ollama service
  - `neurolink ollama setup` - Interactive setup wizard

- **📚 Comprehensive Documentation**: Complete documentation for all new providers
  - **OLLAMA-SETUP.md**: Platform-specific installation guides
  - **PROVIDER-COMPARISON.md**: Detailed provider comparison matrix
  - Updated all documentation to reflect 9 providers
  - Enhanced provider configuration guides

### Technical Implementation

- **Provider Files**: `huggingFace.ts`, `ollama.ts`, `mistralAI.ts`
- **Dependencies**: Added `@huggingface/inference`, `@ai-sdk/mistral`, `inquirer`
- **MCP Integration**: All 10 MCP tools support new providers
- **Demo Updates**: Enhanced demo to showcase all 9 providers
- **CLI Enhancement**: Ollama command structure with 7 subcommands
- **Provider Priority**: Updated auto-selection to include new providers

### Provider Comparison

| Provider     | Best For      | Setup Time | Privacy | Cost    |
| ------------ | ------------- | ---------- | ------- | ------- |
| OpenAI       | General use   | 2 min      | Cloud   | $$$     |
| Ollama       | Privacy       | 5 min      | Local   | Free    |
| Hugging Face | Open source   | 2 min      | Cloud   | Free/$$ |
| Mistral      | EU compliance | 2 min      | Cloud   | $$      |

### Bug Fixes

- **🔧 Local Provider Fallback**: Implemented no-fallback policy for Ollama
  - When explicitly requesting `--provider ollama`, no cloud fallback occurs
  - Preserves user privacy intent when using local providers
  - Auto-selection still maintains intelligent fallback

### Breaking Changes

- None - 100% backward compatibility maintained

## 1.5.3

### Patch Changes

- **🔧 CLI Debug Log Persistence Fix**: Fixed unwanted debug logs appearing in production deployments
  - **Issue**: CLI showed debug logs even when `--debug` flag was not provided, cluttering production output
  - **Root Cause**: CLI middleware had logical gap where `NEUROLINK_DEBUG` wasn't explicitly set to `'false'` when no debug flag provided, allowing inherited environment variables to persist
  - **Solution**: Updated middleware to always set `NEUROLINK_DEBUG = 'false'` when debug mode not enabled
  - **Impact**: **Deterministic logging behavior** - debug logs only appear when explicitly requested with `--debug` flag

### Technical Changes

- **Clean Production Output**: No debug logs in deployed CLI unless `--debug` flag explicitly provided
- **Deterministic Behavior**: Logging controlled by CLI flags, not inherited environment variables
- **Backward Compatible**: Debug mode still works perfectly when `--debug` flag is used
- **Environment Independence**: CLI output no longer affected by external `NEUROLINK_DEBUG` settings

### CLI Behavior Fix

```bash
# Before Fix (Problematic)
neurolink generate-text "test"
# Could show debug logs if NEUROLINK_DEBUG was set in environment

# After Fix (Clean)
neurolink generate-text "test"
# Output: ⠋ 🤖 Generating text... ✔ ✅ Text generated successfully! [content]

# Debug still works when requested
neurolink generate-text "test" --debug
# Output: [debug logs] + spinner + success + content
```

## 1.5.2

### Patch Changes

- **🔧 Production-Ready CLI Logging System**: Fixed critical logging system for clean production output
  - **Issue**: CLI showed excessive debug output during normal operation, breaking demo presentations
  - **Root Cause**: Mixed console.log statements bypassed conditional logger system
  - **Solution**: Systematic replacement of all console.log with logger.debug across codebase
  - **Impact**: **Clean CLI output by default** with conditional debug available via `NEUROLINK_DEBUG=true`

- **🔄 Enhanced Provider Fallback Logic**: Fixed incomplete provider fallback coverage
  - **Issue**: Provider fallback only attempted 4 of 6 providers (missing Anthropic & Azure)
  - **Root Cause**: Incomplete provider array in NeuroLink class fallback logic
  - **Solution**: Updated to include all 6 providers: `['openai', 'vertex', 'bedrock', 'anthropic', 'azure', 'google-ai']`
  - **Impact**: **100% provider coverage** with comprehensive fallback for maximum reliability

- **🧹 Console Statement Cleanup**: Systematic cleanup of debug output across entire codebase
  - **Files Updated**: `src/lib/neurolink.ts`, `src/lib/core/factory.ts`, `src/lib/providers/openAI.ts`, `src/lib/mcp/servers/aiProviders/aiCoreServer.ts`
  - **Pattern**: Replaced 200+ `console.log()` statements with `logger.debug()` calls
  - **Result**: Professional CLI behavior suitable for production deployment and demos

### Technical Changes

- **Production CLI Output**: Clean spinner → success → content (zero debug noise)
- **Debug Mode Available**: Full debug logging with `NEUROLINK_DEBUG=true` environment variable
- **Complete Provider Support**: All 6 AI providers now included in automatic fallback
- **Error Handling**: Provider-level error logs preserved for troubleshooting
- **Conditional Logging**: Debug messages only appear when explicitly enabled
- **Demo Ready**: CLI output suitable for presentations and production use

### CLI Behavior

```bash
# Production/Demo Mode (Clean Output)
node dist/cli/cli/index.js generate-text "test" --max-tokens 5
# Output: ⠋ 🤖 Generating text... ✔ ✅ Text generated successfully! [content]

# Debug Mode (Full Logging)
NEUROLINK_DEBUG=true node dist/cli/cli/index.js generate-text "test" --max-tokens 5
# Output: [debug logs] + spinner + success + content
```

### Backward Compatibility

- **100% API Compatible**: No breaking changes to public interfaces
- **Environment Variables**: `NEUROLINK_DEBUG=true` works as documented
- **Provider Selection**: All existing provider configurations continue working
- **CLI Commands**: All commands maintain same functionality with cleaner output

## 1.5.1

### Patch Changes

- **🔧 Critical CLI Dependency Fix**: Removed peer dependencies to ensure zero-friction CLI usage
  - **Issue**: CLI commands failed when provider-specific SDK packages were peer dependencies
  - **Root Cause**: `npx` doesn't install peer dependencies, causing missing module errors
  - **Solution**: Moved ALL AI provider SDKs to regular dependencies
  - **Impact**: **100% reliable CLI** - all providers work immediately with `npx @juspay/neurolink`
  - **Dependencies**: All AI SDK packages now bundled automatically (@ai-sdk/openai, @ai-sdk/bedrock, @ai-sdk/vertex, @ai-sdk/google)

- **📄 Critical Legal Compliance**: Added missing MIT LICENSE file
  - **Issue**: Package claimed MIT license but had no LICENSE file in repository
  - **Legal Risk**: Without explicit license file, users had no legal permission to use the software
  - **Solution**: Added proper MIT License file with Juspay Technologies copyright (2025)
  - **Impact**: **Full legal compliance** - users now have explicit permission to use, modify, and distribute
  - **Files**: Added `LICENSE` file with standard MIT license text

### Technical Changes

- **Dependency Structure**: Eliminated peer dependencies entirely for CLI compatibility
- **Provider Support**: All 5 AI providers (OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic) now work out-of-the-box
- **Zero Setup**: No manual dependency installation required for any provider
- **Repository Structure**: LICENSE file now included in package distribution
- **Legal Clarity**: Explicit copyright and permission statements
- **Compliance**: Matches industry standards for open source software licensing
- **Package Files**: LICENSE included in NPM package distribution
- **Backward Compatibility**: 100% compatible with existing code and configurations

## 1.5.0

### Major Changes

- **🧠 Google AI Studio Integration**: Added Google AI Studio as 5th AI provider with Gemini models
  - **🔧 New Provider**: Complete GoogleAIStudio provider with Gemini 1.5/2.0 Flash/Pro models
  - **🆓 Free Tier Access**: Leverage Google's generous free tier for development and testing
  - **🖥️ CLI Support**: Full `--provider google-ai` integration across all commands
  - **⚡ Auto-Selection**: Included in automatic provider selection algorithm
  - **🔑 Simple Setup**: Single `GOOGLE_AI_API_KEY` environment variable configuration

### Features

- **📚 Documentation Architecture Overhaul**: Complete README.md restructuring for better UX
  - **75% Size Reduction**: Transformed from 800+ lines to ~200 lines focused on quick start
  - **Progressive Disclosure**: Clear path from basic → intermediate → advanced documentation
  - **Specialized Documentation**: Created 4 dedicated docs files for different audiences
  - **Cross-References**: Complete navigation system between all documentation files

### New Documentation Structure

```
docs/
├── AI-ANALYSIS-TOOLS.md          # AI optimization and analysis tools
├── AI-WORKFLOW-TOOLS.md          # Development lifecycle tools
├── mcp-foundation.md             # Technical MCP architecture
└── GOOGLE-AI-STUDIO-INTEGRATION-ARCHIVE.md  # Integration details
```

### Google AI Studio Provider

```typescript
// New Google AI Studio usage
import { createBestAIProvider } from "@juspay/neurolink";

const provider = createBestAIProvider(); // Auto-includes Google AI Studio
const result = await provider.generateText("Hello, Gemini!");
```

```bash
# Quick setup with Google AI Studio (free tier)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-key"
npx @juspay/neurolink generate-text "Hello, AI!" --provider google-ai
```

### Enhanced Visual Content

- **Google AI Studio Demos**: Complete visual documentation for new provider
- **CLI Demonstrations**: Updated CLI videos showing google-ai provider
- **Professional Quality**: 6 new videos and asciinema recordings

### Technical Implementation

- **Provider Integration**: `src/lib/providers/googleAIStudio.ts`
- **Models Supported**: Gemini 1.5 Pro/Flash, Gemini 2.0 Flash/Pro
- **Authentication**: Simple API key authentication via Google AI Studio
- **Testing**: Complete test coverage including provider and CLI tests

### Bug Fixes

- **🔧 CLI Dependencies**: Moved essential dependencies (`ai`, `zod`) from peer to regular dependencies
  - **Issue**: `npx @juspay/neurolink` commands failed due to missing dependencies
  - **Solution**: CLI now works out-of-the-box without manual dependency installation
  - **Impact**: Zero-friction CLI usage for all users

### Breaking Changes

- None - 100% backward compatibility maintained

## 1.4.0

### Major Changes

- **📚 MCP Documentation Master Plan**: Complete external server connectivity documentation
  - **🔧 MCP Integration Guide**: 400+ line comprehensive setup and usage guide
  - **📖 CLI Documentation**: Complete MCP commands section with workflows
  - **🧪 Demo Integration**: 5 MCP API endpoints for testing and demonstration
  - **⚙️ Configuration Templates**: .env.example and .mcp-servers.example.json
  - **📋 API Reference**: Complete MCP API documentation with examples

### Features

- **External Server Connectivity**: Full MCP (Model Context Protocol) support
- **65+ Compatible Servers**: Filesystem, GitHub, databases, web browsing, search
- **Professional CLI**: Complete server lifecycle management
- **Demo Server Integration**: Live MCP API endpoints
- **Configuration Management**: Templates and examples for all deployment scenarios

### MCP Server Support

```bash
# Install and manage external servers
neurolink mcp install filesystem
neurolink mcp install github
neurolink mcp test filesystem
neurolink mcp list --status
neurolink mcp execute filesystem read_file --path="/path/to/file"
```

### MCP API Endpoints

```typescript
// Demo server includes 5 MCP endpoints
GET  /api/mcp/servers          # List configured servers
POST /api/mcp/test/:server     # Test server connectivity
GET  /api/mcp/tools/:server    # Get available tools
POST /api/mcp/execute          # Execute MCP tools
POST /api/mcp/install/:server  # Install new servers
```

### Documentation Updates

- **README.md**: Complete MCP section with real-world examples
- **docs/MCP-INTEGRATION.md**: 400+ line comprehensive MCP guide
- **docs/CLI-GUIDE.md**: MCP commands section with workflow examples
- **docs/API-REFERENCE.md**: Complete MCP API documentation
- **docs/README.md**: Updated documentation index with MCP references

### Configuration

- **.env.example**: MCP environment variables section
- **.mcp-servers.example.json**: Complete server configuration template
- **package.json**: Updated description highlighting MCP capabilities

### Breaking Changes

- None - 100% backward compatibility maintained

## 1.3.0

### Major Changes

- **🎉 MCP Foundation (Model Context Protocol)**: NeuroLink transforms from AI SDK to Universal AI Development Platform
  - **🏭 MCP Server Factory**: Lighthouse-compatible server creation with `createMCPServer()`
  - **🧠 Context Management**: Rich context with 15+ fields + tool chain tracking
  - **📋 Tool Registry**: Discovery, registration, execution + statistics
  - **🎼 Tool Orchestration**: Single tools + sequential pipelines + error handling
  - **🤖 AI Provider Integration**: Core AI tools with schema validation
  - **🔗 Integration Tests**: 27/27 tests passing (100% success rate)

### Features

- **Factory-First Architecture**: MCP tools work internally, users see simple factory methods
- **Lighthouse Compatible**: 99% compatible with existing Lighthouse MCP patterns
- **Enterprise Ready**: Rich context, permissions, tool orchestration, analytics
- **Production Tested**: <1ms tool execution, comprehensive error handling

### Performance

- **Test Execution**: 1.23s for 27 comprehensive tests
- **Tool Execution**: 0-11ms per tool (well under 100ms target)
- **Pipeline Performance**: 22ms for 2-step sequential pipeline
- **Memory Efficiency**: Clean context management with automatic cleanup

### Technical Implementation

```typescript
src/lib/mcp/
├── factory.ts                  # createMCPServer() - Lighthouse compatible
├── context-manager.ts          # Rich context (15+ fields) + tool chain tracking
├── registry.ts                 # Tool discovery, registration, execution + statistics
├── orchestrator.ts             # Single tools + sequential pipelines + error handling
└── servers/aiProviders/       # AI Core Server with 3 tools integrated
    └── aiCoreServer.ts       # generate-text, select-provider, check-provider-status
```

### Breaking Changes

- None - 100% backward compatibility maintained

## 1.2.4

### Patch Changes

- 95d8ee6: Set up automated version bumping and publishing workflow with changesets integration
