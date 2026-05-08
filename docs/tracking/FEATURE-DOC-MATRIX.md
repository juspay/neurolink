# Feature Documentation Matrix

_Last refreshed: May 2026 (v9.62.0). Tracks doc coverage across major features. Q3/Q4 2025 entries kept for historical reference._

## Recent Features (v9.x — needs ongoing audit)

| Feature                                                   | Implemented | README  | Feature Guide | CLI Docs | SDK Docs | Config  | Trouble | Priority |
| --------------------------------------------------------- | ----------- | ------- | ------------- | -------- | -------- | ------- | ------- | -------- |
| **Multi-provider Voice (TTS/STT/realtime)** v9.62.0       | Y           | Y       | Y             | Y        | Y        | Y       | N       | **HIGH** |
| **DeepSeek / NVIDIA NIM / LM Studio / llama.cpp** v9.60.0 | Y           | Y       | Y             | Y        | Y        | Y       | Partial | **HIGH** |
| **ModelAccessDeniedError + checkCredentials()** v9.59.0   | Y           | Y       | Y             | Partial  | Y        | N/A     | Y       | **HIGH** |
| **providerFallback + modelChain** v9.58.0                 | Y           | Y       | Y             | N        | Y        | Y       | N       | **HIGH** |
| **AutoResearch** v9.53.0                                  | Y           | Y       | Y             | Y        | Y        | Y       | N       | MEDIUM   |
| **Per-Request Credentials** v9.52.0                       | Y           | Y       | Y             | N/A      | Y        | Y       | N       | MEDIUM   |
| **Sharp image compression** v9.50.0                       | Y           | N       | N             | N/A      | Partial  | N       | N       | LOW      |
| **Redis URL/TLS** v9.49.0                                 | Y           | N       | N             | N/A      | Partial  | Partial | N       | LOW      |
| **TaskManager (scheduled tasks)** v9.41.0                 | Y           | N       | Partial       | N        | Y        | Partial | N       | MEDIUM   |
| **Multi-user memory retrieval** v9.40.0                   | Y           | N       | Y             | N        | Y        | Y       | N       | MEDIUM   |
| **Evaluation scoring (14 scorers)** v9.37.0               | Y           | Partial | Y             | Y        | Y        | Y       | N       | MEDIUM   |
| **Browser-compatible bundle** v9.34.0                     | Y           | N       | N             | N/A      | Partial  | N       | N       | MEDIUM   |
| **Per-call memory control** v9.33.0                       | Y           | N       | Partial       | N        | Y        | N       | N       | LOW      |

## High Priority Features (Customer-Facing, Undocumented — historical)

| Feature                                | Implemented | README | Feature Guide | CLI Docs | SDK Docs | Config Coverage | Troubleshooting | Priority   |
| -------------------------------------- | ----------- | ------ | ------------- | -------- | -------- | --------------- | --------------- | ---------- |
| **Human-in-the-Loop (HITL) Workflows** | Y           | N      | N             | N        | Partial  | N               | N               | **HIGH**   |
| **Guardrails Middleware**              | Y           | N      | N             | N        | Partial  | Partial         | N               | **HIGH**   |
| **Context Summarization**              | Y           | N      | N             | N        | Partial  | N               | N               | **HIGH**   |
| **Speech-to-Speech Agents**            | Y           | N      | N             | N        | Partial  | N               | N               | **MEDIUM** |
| **CLI Validate Command**               | Y           | N      | N             | Partial  | N/A      | N               | N               | **MEDIUM** |
| **Web Search Tool (Gemini)**           | Y           | N      | N             | N        | Partial  | N               | N               | **MEDIUM** |
| **External MCP Server Integration**    | Y           | N      | N             | N        | Partial  | N               | N               | **MEDIUM** |
| **Provider Performance Metrics**       | Y           | N      | N             | N        | N        | N               | N               | **LOW**    |
| **Custom Middleware Development**      | Y           | N      | N             | N        | Partial  | N               | N               | **MEDIUM** |

## Earlier Documented Features (Q3 2025 — historical)

| Feature                            | Implemented | README | Feature Guide | CLI Docs | SDK Docs | Config Coverage | Troubleshooting | Priority   |
| ---------------------------------- | ----------- | ------ | ------------- | -------- | -------- | --------------- | --------------- | ---------- |
| Multimodal Chat UI & SDK           | Y           | Y      | Y             | Y        | Y        | Partial         | Y               | Low (done) |
| Auto Evaluation Engine             | Y           | Y      | Y             | Y        | Y        | Y               | Y               | Low (done) |
| Regional Streaming Controls        | Y           | Y      | Y             | Partial  | Y        | Y               | Partial         | Low (done) |
| CLI Loop Mode & Session Manager    | Y           | Y      | Y             | Y        | Partial  | Partial         | Y               | Low (done) |
| Provider/Model Orchestration Brain | Y           | Y      | Y             | N        | Partial  | Partial         | Partial         | Medium     |

## Partially Documented Features (Needs Completion)

| Feature                               | Implemented | README  | Feature Guide | CLI Docs | SDK Docs | Config Coverage | Troubleshooting | Priority   |
| ------------------------------------- | ----------- | ------- | ------------- | -------- | -------- | --------------- | --------------- | ---------- |
| Redis Conversation History Export     | Y           | Partial | N             | Partial  | Partial  | Y               | Partial         | **MEDIUM** |
| CLI Redis Auto-Detect                 | Y           | Y       | N             | Partial  | N/A      | Y               | Partial         | **MEDIUM** |
| Interactive Provider Setup Wizard     | Y           | Partial | N             | Partial  | N/A      | Partial         | N               | **MEDIUM** |
| MCP Auto Tool Discovery               | Y           | Partial | N             | N        | Partial  | N               | N               | **MEDIUM** |
| Conversation Memory Streaming Support | Y           | Partial | N             | N        | Partial  | N               | N               | **LOW**    |
| Enterprise Proxy & Config Validation  | Y           | N       | N             | N        | Partial  | Partial         | N               | **MEDIUM** |

## Mature/Stable Features (Low Priority for Docs Updates)

| Feature                     | Implemented | README | Feature Guide | CLI Docs | SDK Docs | Config Coverage | Troubleshooting | Priority |
| --------------------------- | ----------- | ------ | ------------- | -------- | -------- | --------------- | --------------- | -------- |
| LiteLLM 100+ Model Hub      | Y           | Y      | Y             | Partial  | Y        | Y               | Partial         | Low      |
| SageMaker Custom Deployment | Y           | Y      | Y             | N        | Y        | Y               | N               | Low      |
| GitHub Project Automations  | Y           | N      | N             | N        | N        | N               | N               | Low      |

> **Legend**:
>
> - "Y" = Comprehensive documentation exists
> - "Partial" = Scattered mentions without dedicated guide
> - "N" = No documentation
> - Priority based on: customer impact × documentation gap × recency
> - **HIGH** = Customer-facing, recently shipped, zero/minimal docs
> - **MEDIUM** = Partial docs or niche use case
> - **LOW** = Fully documented or internal-only
