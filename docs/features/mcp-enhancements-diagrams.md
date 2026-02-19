---
title: MCP Enhancement Architecture Diagrams
description: Visual architecture diagrams for NeuroLink MCP enhancement modules
---

# MCP Enhancement Architecture Diagrams

Visual guides for understanding the MCP enhancement architecture, data flows, and component interactions.

> **Main documentation**: For API reference, configuration options, and code examples, see [MCP Enhancements](mcp-enhancements.md).

## Overall Architecture

The MCP enhancement system is organized into five layers, each serving a distinct role in tool management, routing, and execution across multiple MCP servers.

```mermaid
graph TD
    subgraph "Integration Layer"
        AE[Agent Exposure]
        TI[Tool Integration]
    end

    subgraph "Discovery Layer"
        ETD[Enhanced Tool Discovery]
        MRC[MCP Registry Client]
    end

    subgraph "Server Layer"
        MSB[MCP Server Base]
        MSM[Multi-Server Manager]
        SC[Server Capabilities]
    end

    subgraph "Protocol Layer"
        EM[Elicitation Manager]
        TA[Tool Annotations]
        TC[Tool Converter]
        EP[Elicitation Protocol]
    end

    subgraph "Core Layer"
        TR[Tool Router]
        TCA[Tool Cache]
        RB[Request Batcher]
    end

    AE --> ETD
    TI --> TR
    TI --> TCA
    TI --> RB

    ETD --> MSM
    ETD --> MRC
    MRC --> SC

    MSM --> TR
    MSM --> MSB
    MSB --> SC

    TR --> TA
    TR --> TC
    EM --> EP

    TR --> TCA
    TR --> RB
```

## Tool Router Flow

The Tool Router selects the best server for each tool call using a multi-step decision process. It checks session affinity first, then narrows candidates by category and annotation, and finally applies the configured strategy.

```mermaid
flowchart TD
    A[Tool Call Arrives] --> B{Affinity Enabled?}

    B -- Yes --> C{Session/User\nAffinity Match?}
    B -- No --> E

    C -- Match Found --> D{Server Healthy?}
    C -- No Match --> E

    D -- Healthy --> Z[Return Affinity Server]
    D -- Unhealthy --> E[Get Candidate Servers]

    E --> F{Tool Has\nSpecific Server?}
    F -- Yes --> G{Server Healthy?}
    F -- No --> H{Tool Has Category?}

    G -- Healthy --> Z2[Use Specific Server]
    G -- Unhealthy --> H

    H -- Yes --> I[Filter by Category Mapping]
    H -- No --> J[Filter by Annotations]

    I --> K{Candidates Found?}
    K -- Yes --> L
    K -- No --> J

    J --> L[Apply Routing Strategy]

    L --> M{Strategy Type}

    M -- Round-Robin --> N[Select Next in Rotation]
    M -- Least-Loaded --> O[Select Server with\nLowest Active Load]
    M -- Capability-Based --> P[Score by Weight\nand Category Match]
    M -- Priority --> Q[Select Highest\nWeight Server]
    M -- Random --> R[Random Selection]

    N --> S[Set Affinity if Enabled]
    O --> S
    P --> S
    Q --> S
    R --> S

    S --> T[Emit Route Decision Event]
    T --> U[Return Routing Decision]
```

## Tool Cache Strategy

The Tool Cache intercepts tool calls before execution. On a cache hit the stored result is returned immediately. On a miss the tool executes, and the result is stored. When the cache reaches capacity, the configured eviction strategy selects which entry to remove.

```mermaid
flowchart TD
    A[Tool Call with Args] --> B[Generate Cache Key\nSHA-256 of tool + args]
    B --> C{Key in Cache?}

    C -- Yes --> D{Entry Expired?}
    C -- No --> H

    D -- Not Expired --> E[Update Access Metadata]
    D -- Expired --> F[Delete Expired Entry]
    F --> H

    E --> G[Return Cached Result]
    G --> G2[Emit Cache Hit Event]
    G2 --> DONE[Done]

    H[Cache Miss] --> H2[Emit Cache Miss Event]
    H2 --> I[Execute Tool Call]
    I --> J{Cache at\nMax Capacity?}

    J -- Yes --> K[Evict One Entry]
    J -- No --> L

    K --> K2{Eviction Strategy}
    K2 -- LRU --> K3[Remove Least\nRecently Accessed]
    K2 -- FIFO --> K4[Remove Oldest\nCreated Entry]
    K2 -- LFU --> K5[Remove Least\nFrequently Accessed]

    K3 --> L[Store Result in Cache]
    K4 --> L
    K5 --> L

    L --> M[Return Result]
    M --> DONE

    N[Auto-Cleanup Timer] -.-> O[Scan All Entries]
    O -.-> P[Delete Expired Entries]
```

## Request Batcher Flow

The Request Batcher collects individual tool calls into batches, groups them by server, and executes each group in parallel. Results are distributed back to the original callers through their individual promises.

```mermaid
sequenceDiagram
    participant C1 as Caller 1
    participant C2 as Caller 2
    participant C3 as Caller 3
    participant RB as Request Batcher
    participant Q as Batch Queue
    participant EX as Batch Executor
    participant S1 as Server A
    participant S2 as Server B

    C1->>RB: add("readFile", args, "serverA")
    RB->>Q: Queue request (1/10)
    RB-->>C1: Promise<Result>

    C2->>RB: add("writeFile", args, "serverA")
    RB->>Q: Queue request (2/10)
    RB-->>C2: Promise<Result>

    C3->>RB: add("query", args, "serverB")
    RB->>Q: Queue request (3/10)
    RB-->>C3: Promise<Result>

    Note over RB,Q: Batch threshold reached (size or timeout)

    RB->>Q: Select batch by server group
    Q-->>RB: Server A requests [C1, C2]

    RB->>EX: Execute batch (Server A)
    EX->>S1: readFile(args)
    EX->>S1: writeFile(args)
    S1-->>EX: [result1, result2]

    EX-->>RB: Batch results
    RB-->>C1: Resolve with result1
    RB-->>C2: Resolve with result2

    RB->>Q: Select next batch
    Q-->>RB: Server B requests [C3]

    RB->>EX: Execute batch (Server B)
    EX->>S2: query(args)
    S2-->>EX: [result3]

    EX-->>RB: Batch results
    RB-->>C3: Resolve with result3
```

## Elicitation Protocol

The Elicitation Protocol enables MCP tools to request interactive user input mid-execution. This sequence shows how a tool pauses, requests confirmation or data from the user, and resumes once a response arrives.

```mermaid
sequenceDiagram
    participant AI as AI Model
    participant NL as NeuroLink
    participant TL as Tool Execution
    participant EM as Elicitation Manager
    participant UI as User Interface
    participant U as User

    AI->>NL: Call tool "deleteFile"
    NL->>TL: Execute deleteFile(path)

    TL->>EM: confirm("Delete /data/report.csv?")
    EM->>EM: Create request (UUID)
    EM->>EM: Start timeout timer

    EM->>UI: Elicitation request (type: confirmation)
    UI->>U: "Delete /data/report.csv?"

    alt User Confirms
        U->>UI: Clicks "Confirm"
        UI->>EM: Response (value: true)
        EM->>EM: Clear timeout
        EM->>TL: ElicitationResponse (responded: true)
        TL->>TL: Proceed with deletion
        TL->>NL: Tool result (file deleted)
    else User Cancels
        U->>UI: Clicks "Cancel"
        UI->>EM: Response (value: false)
        EM->>TL: ElicitationResponse (responded: true, value: false)
        TL->>NL: Tool result (operation cancelled)
    else Timeout
        EM->>EM: Timeout fires
        EM->>TL: ElicitationResponse (timedOut: true)
        TL->>NL: Tool result (timed out, used default)
    end

    NL->>AI: Return tool result
```

## Multi-Server Topology

The Multi-Server Manager organizes MCP servers into groups, applies per-group load balancing strategies, and maintains health metrics for routing decisions. This diagram shows a typical deployment with server groups, health monitoring, and failover paths.

```mermaid
graph TD
    subgraph "Multi-Server Manager"
        SM[Server Manager]
        HM[Health Monitor]
        LB[Load Balancer]
        TP[Tool Preferences]
    end

    subgraph "Group: Data Servers"
        direction LR
        DS1[db-server-1<br/>weight: 70]
        DS2[db-server-2<br/>weight: 30]
    end

    subgraph "Group: AI Servers"
        direction LR
        AS1[ai-primary<br/>priority: 1]
        AS2[ai-secondary<br/>priority: 2]
        AS3[ai-tertiary<br/>priority: 3]
    end

    subgraph "Standalone Servers"
        direction LR
        GH[github-server]
        FS[filesystem-server]
    end

    SM --> |"round-robin"| DS1
    SM --> |"round-robin"| DS2
    SM --> |"failover-only"| AS1
    SM -.-> |"failover"| AS2
    SM -.-> |"failover"| AS3
    SM --> GH
    SM --> FS

    HM --> |"health check"| DS1
    HM --> |"health check"| DS2
    HM --> |"health check"| AS1
    HM --> |"health check"| AS2
    HM --> |"health check"| AS3
    HM --> |"health check"| GH
    HM --> |"health check"| FS

    LB --> |"strategy per group"| SM
    TP --> |"tool -> server"| SM

    DS1 --> |"tools: query, insert"| T1[Unified Tool List]
    DS2 --> |"tools: query, insert"| T1
    AS1 --> |"tools: generate, embed"| T1
    GH --> |"tools: createPR, listIssues"| T1
    FS --> |"tools: readFile, writeFile"| T1
```
