# Feature Documentation Matrix (Q4 2025)

## High Priority Features (Customer-Facing, Undocumented)

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

## Recently Documented Features (Q3 2025)

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
| Mem0 Conversational Memory            | Y           | Partial | N             | N        | Y        | Partial         | N               | **MEDIUM** |
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
