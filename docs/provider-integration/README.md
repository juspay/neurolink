# Provider Integration: free-claude-code → Neurolink

Implementation documentation for porting four providers from the
`free-claude-code` Python repository (the team's reference implementation)
into Neurolink:

| Provider      | Source path                         | Type                 | New / Existing                                            |
| ------------- | ----------------------------------- | -------------------- | --------------------------------------------------------- |
| DeepSeek      | `providers/deepseek/`               | Cloud, OpenAI-compat | **NEW**                                                   |
| NVIDIA NIM    | `providers/nvidia_nim/`             | Cloud, OpenAI-compat | **NEW**                                                   |
| LM Studio     | `providers/lmstudio/`               | Local, OpenAI-compat | **NEW**                                                   |
| llama.cpp     | `providers/llamacpp/`               | Local, OpenAI-compat | **NEW**                                                   |
| OpenRouter    | `providers/open_router/`            | Cloud aggregator     | already in `src/lib/providers/openRouter.ts` — skip       |
| OpenAI compat | `providers/openai_compat.py` (base) | Shared layer         | already in `src/lib/providers/openaiCompatible.ts` — skip |

## Read order

1. **`00-architecture.md`** — patterns this codebase uses (BaseProvider, factory + registry, providerConfig helpers, AI SDK wrappers). Read first.
2. **`01-shared-changes.md`** — every file outside `src/lib/providers/` that needs editing for ALL four new providers (enums, types, registry, CLI, env, context windows, vision, barrel exports). Read second; the per-provider docs reference back here.
3. **`02-deepseek.md`** — simplest cloud port. Read third — it validates the basic pattern.
4. **`04-lm-studio.md`** — simplest local port. Mirrors openaiCompatible.ts auto-discovery.
5. **`05-llamacpp.md`** — clone of LM Studio with different defaults.
6. **`03-nvidia-nim.md`** — most complex (extra body params, retry-on-400). Tackle last.
7. **`06-testing.md`** — test additions and validation strategy.
8. **`07-implementation-order.md`** — ordered task list, milestone gates, risk mitigations.

## Source-of-truth references

Throughout these docs, file paths starting with `/free-claude-code/...` refer to the upstream `free-claude-code` Python repo (the team's reference implementation). Paths starting with `src/`, `test/`, `.env.example` refer to this Neurolink repo. The local working copy of `free-claude-code` lives outside this checkout — clone it next to this one and adjust paths accordingly.

Recent commits used as templates:

- `3041d26f` — `feat(openai-compatible)`: minimal-comprehensive provider add (11 files). The cleanest reference.
- `8918f8ef` — `feat(providers): add LiteLLM`: full-treatment add (41 files including docs/examples/memory-bank). Use when shipping documentation alongside code.
- `9ef4ebee` — `feat(providers): add comprehensive Amazon SageMaker`: shows the multi-file `src/lib/providers/<provider>/` subdirectory pattern (only needed for very complex providers — NOT needed for any of our four).

## Status

| Task                           | Status                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| DeepSeek implementation        | ✅ Implemented · live in `src/lib/providers/deepseek.ts`                                    |
| NVIDIA NIM implementation      | ✅ Implemented · live in `src/lib/providers/nvidiaNim.ts`                                   |
| LM Studio implementation       | ✅ Implemented · live in `src/lib/providers/lmStudio.ts`                                    |
| llama.cpp implementation       | ✅ Implemented · live in `src/lib/providers/llamaCpp.ts`                                    |
| Shared changes (types/CLI/etc) | ✅ Implemented · see [`01-shared-changes.md`](/docs/provider-integration/01-shared-changes) |
| Tests                          | ✅ Implemented · `test/continuous-test-suite-new-providers.ts`                              |

Each per-provider doc lists:

1. Source-repo file references
2. Files to create / edit (with line numbers)
3. Code skeleton ready to copy-paste
4. Edge cases & error mapping
5. Smoke test commands
