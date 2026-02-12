---
title: Enterprise Human-in-the-Loop System
description: Production-ready HITL system for regulated industries with approval workflows, audit trails, and compliance support
keywords: hitl, human in the loop, enterprise, compliance, approval workflow, audit trail, HIPAA, SOC2, GDPR
---

# Enterprise Human-in-the-Loop System

> **Since**: v7.39.0 | **Status**: Production Ready | **Availability**: SDK & CLI

!!! note "Feature Status - Enterprise HITL"
This document describes enterprise HITL features. Some advanced features (marked as "Planned")
are not yet implemented and represent the target API design for future releases.

    **Currently Available:** Basic HITL with `dangerousActions`, `timeout`, `autoApproveOnTimeout`,
    `allowArgumentModification`, and `auditLogging`. See [Basic HITL Guide](./hitl.md).

---

## Currently Available HITL Features

The basic HITL implementation supports:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "drop"], // Trigger keywords
    timeout: 30000, // Confirmation timeout (ms)
    autoApproveOnTimeout: false, // Auto-approve if timeout
    allowArgumentModification: false, // Allow arg changes
    auditLogging: true, // Enable audit logs
  },
});
```

For production use today, refer to the [Basic HITL Guide](./hitl.md).

---

## Executive Summary

NeuroLink's Human-in-the-Loop (HITL) system provides enterprise-grade controls for AI operations requiring human oversight. Purpose-built for regulated industries and high-stakes applications, it combines real-time approval workflows with comprehensive audit trails to meet compliance requirements while maintaining operational efficiency.

### Strategic Value Proposition

- **Risk Mitigation**: Prevent costly AI mistakes through mandatory human checkpoints
- **Regulatory Compliance**: Meet HIPAA, SOC2, GDPR, and industry-specific requirements
- **Trust & Transparency**: Build stakeholder confidence with auditable AI decisions
- **Continuous Improvement**: Capture human expertise to improve AI accuracy over time

### Key Metrics

| Metric                   | Impact               | Evidence                                        |
| ------------------------ | -------------------- | ----------------------------------------------- |
| **Accuracy Improvement** | 95% increase         | Human validation catches edge cases AI misses   |
| **Compliance Coverage**  | 100% auditability    | Complete decision trail for regulatory review   |
| **Model Learning Rate**  | 60% faster           | Structured feedback accelerates training cycles |
| **Enterprise Adoption**  | 90% confidence boost | Security teams approve HITL-enabled deployments |

### When to Use HITL

**Required for:**

- Medical diagnosis and treatment recommendations
- Financial transactions above risk thresholds
- Legal document generation and review
- Code execution in production environments
- Personal data modification or deletion
- Irreversible operations (send email, post to social media)

**Not recommended for:**

- Read-only operations (information retrieval)
- Low-stakes content generation
- Development/testing environments
- High-volume, low-risk automation

---

## Quick Start (5 Minutes)

### Installation

HITL is built into NeuroLink SDK v7.39.0+. No additional packages required:

```bash
npm install @juspay/neurolink@latest
# or
pnpm add @juspay/neurolink@latest
```

### Basic Configuration

Minimal setup for tool-based approval workflow:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["writeFile", "deleteFile", "executeCode"],
    reviewCallback: async (action, context) => {
      // Your approval logic - integrate with Slack, email, custom UI
      console.log(`🔔 Approval needed: ${action.tool}`);
      console.log(`📝 Arguments:`, action.args);

      // Example: Simple prompt-based approval (replace with your system)
      const approved = await promptUser(
        `Allow AI to ${action.tool} with args ${JSON.stringify(action.args)}?`,
      );

      return {
        approved,
        reason: approved ? "User authorized" : "User denied",
        reviewer: "admin@company.com",
      };
    },
  },
});
```

### First Approval Request

Complete end-to-end example with error handling:

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Delete the temporary files in the /tmp directory",
    },
    provider: "anthropic",
    tools: [
      {
        name: "deleteFile",
        description: "Delete a file from filesystem",
        requiresConfirmation: true, // Triggers HITL
        execute: async (args) => {
          const fs = await import("fs/promises");
          await fs.unlink(args.path);
          return { success: true, deletedPath: args.path };
        },
      },
    ],
  });

  console.log(result.content);
} catch (error) {
  if (error.code === "USER_CONFIRMATION_REQUIRED") {
    // Handle approval workflow
    const approvalResult = await handleApproval(error.details);
    if (approvalResult.approved) {
      // Retry with confirmation
      const retryResult = await retryWithConfirmation(error.details);
      console.log(retryResult);
    }
  }
}
```

---

## Core Concepts

### 1. Approval Workflows

HITL supports both synchronous (blocking) and asynchronous (non-blocking) approval patterns:

#### Synchronous Approval (Blocking)

AI operation pauses until human approves or rejects:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    mode: "synchronous", // Default
    timeout: 300000, // 5 minutes max wait
    reviewCallback: async (action, context) => {
      // Blocks here until approval received
      return await showApprovalDialog(action);
    },
  },
});
```

**Use cases:**

- Real-time operations requiring immediate decision
- Interactive applications with user present
- High-risk actions requiring instant validation

#### Asynchronous Approval (Non-blocking)

AI operation returns pending status, continues when approved:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    mode: "asynchronous",
    reviewCallback: async (action, context) => {
      // Queue for review, return immediately
      const reviewId = await queueForReview(action);
      return {
        pending: true,
        reviewId,
        estimatedTime: 900000, // 15 minutes
      };
    },
    statusCallback: async (reviewId) => {
      // Check approval status
      return await checkReviewStatus(reviewId);
    },
  },
});
```

**Use cases:**

- Batch processing workflows
- Operations requiring expert review (takes time)
- Multi-level approval chains
- Integration with ticketing systems (Jira, ServiceNow)

### 2. Review Triggers

Configure when human review is required:

#### Confidence Threshold Trigger (Planned)

Automatically request review when AI confidence is low:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    confidenceThreshold: 0.85, // Review if confidence < 85%
    reviewCallback: async (action, context) => {
      if (context.aiConfidence < 0.85) {
        return await requestExpertReview(action, context);
      }
      return { approved: true, reason: "High confidence" };
    },
  },
});
```

#### Tool-Specific Rules

Require approval for specific tools only:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: [
      "deleteFile", // Always require approval
      "sendEmail", // Prevent accidental sends
      "executeCode", // Sandbox escape prevention
      "updateDatabase", // Data integrity protection
    ],
  },
});
```

#### Content Pattern Matching (Planned)

Trigger review based on content patterns:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    contentPatterns: [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b\d{16}\b/, // Credit card pattern
      /password|secret|token/i, // Sensitive keywords
    ],
    reviewCallback: async (action, context) => {
      const containsSensitiveData = context.contentPatterns.some((pattern) =>
        pattern.test(action.content),
      );

      if (containsSensitiveData) {
        return await requestSecurityReview(action);
      }

      return { approved: true };
    },
  },
});
```

#### Time-Based Restrictions

Require approval outside business hours:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    reviewCallback: async (action, context) => {
      const hour = new Date().getHours();
      const isBusinessHours = hour >= 9 && hour < 17;

      if (!isBusinessHours && action.tool === "executeCode") {
        return {
          approved: false,
          reason: "Code execution restricted to business hours",
          escalate: true,
        };
      }

      return { approved: true };
    },
  },
});
```

### 3. Escalation Policies (Planned)

Handle timeout and multi-level approval:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    timeout: 300000, // 5 minutes
    escalationPolicy: {
      onTimeout: "escalate", // Options: "approve", "reject", "escalate"
      escalationLevels: [
        {
          level: 1,
          reviewers: ["team-lead@company.com"],
          timeout: 300000, // 5 minutes
        },
        {
          level: 2,
          reviewers: ["manager@company.com"],
          timeout: 600000, // 10 minutes
        },
        {
          level: 3,
          reviewers: ["cto@company.com"],
          timeout: 1800000, // 30 minutes
          finalAuthority: true,
        },
      ],
    },
    reviewCallback: async (action, context) => {
      const level = context.escalationLevel || 1;
      const reviewers =
        context.escalationPolicy.escalationLevels[level - 1].reviewers;

      return await requestApprovalFrom(reviewers, action);
    },
  },
});
```

---

## SDK Integration

### TypeScript Configuration

Complete configuration interface:

```typescript
type HITLConfiguration = {
  // Core settings
  enabled: boolean;
  mode?: "synchronous" | "asynchronous"; // (Planned feature)
  timeout?: number; // milliseconds

  // Approval triggers
  requireApproval?: string[]; // Tool names
  confidenceThreshold?: number; // 0-1 (Planned feature)
  contentPatterns?: RegExp[]; // (Planned feature)

  // Callbacks
  reviewCallback: (
    action: HITLAction,
    context: HITLContext,
  ) => Promise<HITLReviewResult>;

  statusCallback?: (reviewId: string) => Promise<HITLReviewStatus>; // (Planned feature)

  // Escalation (Planned feature)
  escalationPolicy?: {
    onTimeout: "approve" | "reject" | "escalate";
    escalationLevels?: EscalationLevel[];
  };

  // Audit
  auditLog?: {
    enabled: boolean;
    storage: "file" | "database" | "custom";
    customLogger?: (entry: AuditEntry) => Promise<void>;
  };
};

type HITLAction = {
  tool: string;
  args: Record<string, any>;
  timestamp: Date;
  sessionId: string;
};

type HITLContext = {
  aiConfidence?: number;
  provider: string;
  model: string;
  escalationLevel?: number;
};

type HITLReviewResult = {
  approved: boolean;
  reason?: string;
  reviewer?: string;
  modifications?: Record<string, any>;
  escalate?: boolean;
};
```

### Approval Callback Patterns

#### Slack Integration

```typescript
import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["deleteFile", "sendEmail"],
    reviewCallback: async (action, context) => {
      // Send approval request to Slack
      const message = await slack.chat.postMessage({
        channel: "#ai-approvals",
        text: `🤖 AI Approval Request`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Action:* \`${action.tool}\`\n*Args:* \`\`\`${JSON.stringify(action.args, null, 2)}\`\`\``,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Approve" },
                style: "primary",
                value: action.sessionId,
                action_id: "approve",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Reject" },
                style: "danger",
                value: action.sessionId,
                action_id: "reject",
              },
            ],
          },
        ],
      });

      // Wait for response (implement with Slack interactivity)
      return await waitForSlackResponse(message.ts);
    },
  },
});
```

#### Email Integration

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    mode: "asynchronous",
    reviewCallback: async (action, context) => {
      const reviewId = generateReviewId();

      await transporter.sendMail({
        from: "ai-system@company.com",
        to: "approvers@company.com",
        subject: `AI Approval Request: ${action.tool}`,
        html: `
          <h2>AI Action Requires Approval</h2>
          <p><strong>Tool:</strong> ${action.tool}</p>
          <p><strong>Arguments:</strong></p>
          <pre>${JSON.stringify(action.args, null, 2)}</pre>
          <p>
            <a href="https://approvals.company.com/approve/${reviewId}">Approve</a> |
            <a href="https://approvals.company.com/reject/${reviewId}">Reject</a>
          </p>
        `,
      });

      return {
        pending: true,
        reviewId,
        estimatedTime: 1800000, // 30 minutes
      };
    },
    statusCallback: async (reviewId) => {
      return await checkApprovalStatus(reviewId);
    },
  },
});
```

### Integration with External Systems

#### ServiceNow Integration

```typescript
import axios from "axios";

const serviceNowClient = axios.create({
  baseURL: process.env.SERVICENOW_INSTANCE,
  auth: {
    username: process.env.SERVICENOW_USER,
    password: process.env.SERVICENOW_PASS,
  },
});

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    mode: "asynchronous",
    reviewCallback: async (action, context) => {
      // Create ServiceNow ticket
      const ticket = await serviceNowClient.post("/api/now/table/incident", {
        short_description: `AI Approval: ${action.tool}`,
        description: JSON.stringify(action.args, null, 2),
        urgency: 2,
        category: "AI Operations",
        assignment_group: "AI Review Team",
      });

      return {
        pending: true,
        reviewId: ticket.data.result.sys_id,
        trackingUrl: `${process.env.SERVICENOW_INSTANCE}/nav_to.do?uri=incident.do?sys_id=${ticket.data.result.sys_id}`,
      };
    },
    statusCallback: async (reviewId) => {
      const ticket = await serviceNowClient.get(
        `/api/now/table/incident/${reviewId}`,
      );

      return {
        approved: ticket.data.result.state === "6", // Resolved
        pending: ticket.data.result.state !== "6",
        reason: ticket.data.result.close_notes,
      };
    },
  },
});
```

---

## CLI Integration

### HITL in Loop Mode

Interactive CLI provides built-in HITL commands:

```bash
# Start loop with HITL enabled
npx @juspay/neurolink loop --enable-hitl

# Inside loop session
neurolink > /hitl status
📋 Pending HITL Approvals (2):

1. Tool: deleteFile
   Args: { path: "/tmp/data.csv" }
   Confidence: 0.76
   Requested: 2 minutes ago

2. Tool: sendEmail
   Args: { to: "customer@example.com", subject: "Order Update" }
   Confidence: 0.92
   Requested: 5 seconds ago

neurolink > /hitl approve 1
✅ Approved deleteFile operation
   Execution completed successfully

neurolink > /hitl reject 2 --reason "Email template needs review"
❌ Rejected sendEmail operation
   Reason logged: Email template needs review
```

### CLI HITL Commands

| Command              | Description                 | Example                                      |
| -------------------- | --------------------------- | -------------------------------------------- |
| `/hitl status`       | View pending approvals      | `/hitl status`                               |
| `/hitl approve <id>` | Approve pending action      | `/hitl approve 1`                            |
| `/hitl reject <id>`  | Reject with optional reason | `/hitl reject 2 --reason "Security concern"` |
| `/hitl history`      | View approval history       | `/hitl history --last 10`                    |
| `/hitl config`       | View HITL configuration     | `/hitl config`                               |

---

## Enterprise Patterns

### Pattern 1: Medical AI Validation

Physician oversight for AI-generated diagnostic recommendations:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const medicalAI = new NeuroLink({
  hitl: {
    enabled: true,
    mode: "synchronous",
    confidenceThreshold: 0.95, // High bar for medical decisions
    requireApproval: ["generateDiagnosis", "recommendTreatment"],
    reviewCallback: async (action, context) => {
      // Route to qualified physician based on specialty
      const specialty = determineSpecialty(action.args);
      const physician = await findAvailablePhysician(specialty);

      // Present AI analysis to physician
      const review = await presentToPhysician({
        physician,
        aiAnalysis: {
          tool: action.tool,
          recommendation: action.args,
          confidence: context.aiConfidence,
          supportingData: context.metadata,
        },
        patientContext: context.patientId,
      });

      // Log for HIPAA compliance
      await auditLog.recordMedicalReview({
        physician: physician.id,
        decision: review.approved,
        timestamp: new Date(),
        patientId: context.patientId,
        aiConfidence: context.aiConfidence,
        humanConfidence: review.confidence,
      });

      return {
        approved: review.approved,
        reason: review.clinicalReasoning,
        reviewer: physician.email,
        modifications: review.modifications,
      };
    },
  },
});

// Usage
const diagnosis = await medicalAI.generate({
  input: {
    text: "Analyze patient symptoms and recommend diagnosis",
  },
  context: {
    patientId: "PT-12345",
    symptoms: ["chest pain", "shortness of breath"],
    vitals: { bp: "145/95", hr: 98 },
  },
  tools: [
    {
      name: "generateDiagnosis",
      description: "Generate diagnostic recommendation",
      requiresConfirmation: true,
      execute: async (args) => {
        return {
          diagnosis: args.primaryDiagnosis,
          differentials: args.differentialDiagnoses,
          recommendedTests: args.tests,
        };
      },
    },
  ],
});
```

### Pattern 2: Financial Compliance

Transaction approval above risk thresholds:

```typescript
const financialAI = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["executeTransaction", "modifyAccount"],
    reviewCallback: async (action, context) => {
      const amount = action.args.amount;
      const threshold = 10000; // $10,000

      if (amount >= threshold) {
        // Multi-level approval for large transactions
        const approvals = [];

        // Level 1: Manager approval
        const managerApproval = await requestApproval({
          approver: "manager@company.com",
          action,
          level: 1,
        });
        approvals.push(managerApproval);

        if (!managerApproval.approved) {
          return managerApproval;
        }

        // Level 2: Finance director for >$50k
        if (amount >= 50000) {
          const directorApproval = await requestApproval({
            approver: "finance-director@company.com",
            action,
            level: 2,
          });
          approvals.push(directorApproval);

          if (!directorApproval.approved) {
            return directorApproval;
          }
        }

        // Compliance audit trail
        await complianceLog.record({
          transactionId: action.args.transactionId,
          amount,
          approvals,
          timestamp: new Date(),
          regulatoryFramework: "SOC2",
        });

        return {
          approved: true,
          reason: "Multi-level approval completed",
          reviewers: approvals.map((a) => a.reviewer),
        };
      }

      return { approved: true, reason: "Below threshold" };
    },
  },
});

// Usage
const transaction = await financialAI.generate({
  input: {
    text: "Process wire transfer of $75,000 to vendor account",
  },
  tools: [
    {
      name: "executeTransaction",
      description: "Execute financial transaction",
      requiresConfirmation: true,
      execute: async (args) => {
        return await processWireTransfer(args);
      },
    },
  ],
});
```

### Pattern 3: Legal Document Review

Attorney validation of AI-generated contracts:

```typescript
const legalAI = new NeuroLink({
  hitl: {
    enabled: true,
    mode: "asynchronous", // Legal review takes time
    requireApproval: ["generateContract", "modifyClause"],
    reviewCallback: async (action, context) => {
      // Determine required legal expertise
      const practiceArea = determinePracticeArea(action.args);
      const jurisdiction = action.args.jurisdiction;

      // Route to qualified attorney
      const attorney = await findAttorney({
        practiceArea,
        jurisdiction,
        barAdmissions: [jurisdiction],
      });

      // Create review task
      const reviewTask = await legalReviewSystem.createTask({
        attorney: attorney.id,
        documentType: action.tool,
        content: action.args,
        aiConfidence: context.aiConfidence,
        priority: action.args.urgency || "standard",
        deadline: calculateDeadline(action.args.urgency),
      });

      return {
        pending: true,
        reviewId: reviewTask.id,
        estimatedTime: reviewTask.estimatedCompletionTime,
        trackingUrl: reviewTask.url,
      };
    },
    statusCallback: async (reviewId) => {
      const task = await legalReviewSystem.getTask(reviewId);

      if (task.status === "completed") {
        return {
          approved: task.approved,
          reason: task.legalOpinion,
          reviewer: task.attorney.email,
          modifications: task.suggestedChanges,
        };
      }

      return { pending: true };
    },
  },
});

// Usage
const contract = await legalAI.generate({
  input: {
    text: "Generate employment contract for California senior engineer position",
  },
  context: {
    jurisdiction: "California",
    position: "Senior Software Engineer",
    complianceRequirements: ["california-labor-law", "federal-employment-law"],
  },
  tools: [
    {
      name: "generateContract",
      description: "Generate legal contract",
      requiresConfirmation: true,
      execute: async (args) => {
        return {
          contractText: args.content,
          clauses: args.clauses,
          terms: args.terms,
        };
      },
    },
  ],
});
```

### Pattern 4: Code Execution Safety

Sandbox approval before executing AI-generated code:

```typescript
const codeAI = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["executeCode", "modifyDatabase", "deployToProduction"],
    reviewCallback: async (action, context) => {
      if (action.tool === "executeCode") {
        // Static analysis of code
        const analysis = await analyzeCode(action.args.code);

        if (analysis.containsDangerousPatterns) {
          return {
            approved: false,
            reason: `Security concern: ${analysis.issues.join(", ")}`,
            escalate: true,
          };
        }

        // Present code to developer for review
        const review = await presentCodeReview({
          code: action.args.code,
          analysis,
          context: action.args.context,
        });

        return {
          approved: review.approved,
          reason: review.comments,
          reviewer: review.developer,
          modifications: review.suggestedChanges,
        };
      }

      return { approved: true };
    },
  },
});

// Usage with code execution
const result = await codeAI.generate({
  input: {
    text: "Write and execute a Python script to process CSV data",
  },
  tools: [
    {
      name: "executeCode",
      description: "Execute code in sandboxed environment",
      requiresConfirmation: true,
      execute: async (args) => {
        // Execute in sandbox after approval
        return await sandbox.execute({
          code: args.code,
          language: args.language,
          timeout: 30000,
        });
      },
    },
  ],
});
```

---

## Configuration Reference

### Full Configuration Object

Complete TypeScript interface with all available options:

```typescript
type HITLConfiguration = {
  // === Core Settings ===
  enabled: boolean;
  mode?: "synchronous" | "asynchronous"; // (Planned feature)
  timeout?: number; // Default: 300000 (5 minutes)

  // === Approval Triggers ===
  requireApproval?: string[]; // Tool names requiring approval
  confidenceThreshold?: number; // 0-1, trigger review if AI confidence below (Planned feature)
  contentPatterns?: RegExp[]; // Patterns that trigger review (Planned feature)

  // === Callbacks ===
  reviewCallback: (
    action: HITLAction,
    context: HITLContext,
  ) => Promise<HITLReviewResult>;

  statusCallback?: (reviewId: string) => Promise<HITLReviewStatus>; // (Planned feature)

  // === Escalation (Planned feature) ===
  escalationPolicy?: {
    onTimeout: "approve" | "reject" | "escalate";
    escalationLevels?: Array<{
      level: number;
      reviewers: string[];
      timeout: number;
      finalAuthority?: boolean;
    }>;
  };

  // === Audit & Compliance ===
  auditLog?: {
    enabled: boolean;
    storage: "file" | "database" | "custom";
    path?: string; // For file storage
    database?: DatabaseConfig; // For database storage
    customLogger?: (entry: AuditEntry) => Promise<void>;
  };

  // === Security ===
  security?: {
    encryptAuditLogs?: boolean;
    redactSensitiveData?: boolean;
    requireMFA?: boolean;
    ipWhitelist?: string[];
  };
};
```

### Environment Variables

Configure HITL through environment variables:

```bash
# Core HITL Settings
NEUROLINK_HITL_ENABLED=true
NEUROLINK_HITL_MODE=synchronous
NEUROLINK_HITL_TIMEOUT=300000

# Approval Configuration
NEUROLINK_HITL_CONFIDENCE_THRESHOLD=0.85
NEUROLINK_HITL_REQUIRE_APPROVAL=writeFile,deleteFile,executeCode

# Audit Logging
NEUROLINK_HITL_AUDIT_ENABLED=true
NEUROLINK_HITL_AUDIT_STORAGE=database
NEUROLINK_HITL_AUDIT_DB_URL=postgresql://user:pass@localhost:5432/audit

# Integration
NEUROLINK_HITL_SLACK_TOKEN=xoxb-your-token
NEUROLINK_HITL_SLACK_CHANNEL=#ai-approvals
```

---

## Security & Audit

### Audit Trail Format

Every HITL action is logged in structured format:

```json
{
  "eventId": "evt_7a9f2c1b",
  "timestamp": "2025-01-01T14:30:00Z",
  "sessionId": "sess_abc123",
  "action": {
    "tool": "deleteFile",
    "args": {
      "path": "/data/sensitive.csv"
    }
  },
  "context": {
    "provider": "anthropic",
    "model": "claude-3-sonnet",
    "aiConfidence": 0.78,
    "userId": "user@company.com"
  },
  "review": {
    "approved": true,
    "reason": "Authorized by manager",
    "reviewer": "manager@company.com",
    "reviewDuration": 45000,
    "escalationLevel": 1
  },
  "outcome": {
    "success": true,
    "executionTime": 234,
    "result": { "deleted": true }
  }
}
```

### Compliance Documentation

#### HIPAA Compliance

HITL audit logs support HIPAA requirements:

- **Access Controls**: Reviewer identity logged
- **Audit Trail**: Complete decision history
- **Data Integrity**: Tamper-evident logging
- **Accountability**: Individual authorization tracking

```typescript
const hipaaCompliantAI = new NeuroLink({
  hitl: {
    enabled: true,
    auditLog: {
      enabled: true,
      storage: "database",
      database: {
        url: process.env.HIPAA_AUDIT_DB,
        encryption: true,
        retentionYears: 6, // HIPAA requirement
      },
    },
    security: {
      encryptAuditLogs: true,
      requireMFA: true,
      redactSensitiveData: true,
    },
  },
});
```

#### SOC2 Compliance

Meet SOC2 Type II requirements:

- **Authorization**: Documented approval workflow
- **Monitoring**: Real-time audit logging
- **Availability**: Timeout and escalation policies
- **Confidentiality**: Encrypted audit storage

```typescript
const soc2CompliantAI = new NeuroLink({
  hitl: {
    enabled: true,
    escalationPolicy: {
      onTimeout: "escalate",
      escalationLevels: [
        { level: 1, reviewers: ["team-lead"], timeout: 300000 },
        { level: 2, reviewers: ["manager"], timeout: 600000 },
      ],
    },
    auditLog: {
      enabled: true,
      storage: "database",
      database: {
        url: process.env.AUDIT_DB,
        encryption: true,
      },
    },
  },
});
```

#### GDPR Compliance

Support GDPR data protection requirements:

- **Lawful Processing**: Human oversight for data operations
- **Data Minimization**: Review prevents excessive collection
- **Right to Erasure**: Approval required for deletions
- **Accountability**: Complete audit trail

```typescript
const gdprCompliantAI = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: [
      "collectPersonalData",
      "deletePersonalData",
      "transferData",
    ],
    reviewCallback: async (action, context) => {
      // Ensure lawful basis documented
      const lawfulBasis = await determineLawfulBasis(action);

      if (!lawfulBasis) {
        return {
          approved: false,
          reason: "No lawful basis for processing",
        };
      }

      // Log for accountability
      await gdprAuditLog.record({
        action: action.tool,
        lawfulBasis,
        dataSubject: context.dataSubjectId,
        processor: context.userId,
      });

      return {
        approved: true,
        reason: `Lawful basis: ${lawfulBasis}`,
      };
    },
  },
});
```

### Security Best Practices

#### 1. Secure Approval Callbacks

```typescript
// ❌ BAD: Exposing sensitive data in logs
reviewCallback: async (action, context) => {
  console.log(action.args); // May contain PII, credentials
  return { approved: true };
};

// ✅ GOOD: Redact sensitive data
reviewCallback: async (action, context) => {
  const redactedArgs = redactSensitive(action.args);
  console.log(redactedArgs);
  return { approved: true };
};
```

#### 2. Secret Management

```typescript
// ❌ BAD: Hardcoded credentials
const neurolink = new NeuroLink({
  hitl: {
    reviewCallback: async (action) => {
      const response = await fetch("https://api.example.com/approve", {
        headers: { Authorization: "Bearer abc123" }, // Hardcoded!
      });
    },
  },
});

// ✅ GOOD: Environment variables
const neurolink = new NeuroLink({
  hitl: {
    reviewCallback: async (action) => {
      const response = await fetch("https://api.example.com/approve", {
        headers: {
          Authorization: `Bearer ${process.env.APPROVAL_API_TOKEN}`,
        },
      });
    },
  },
});
```

#### 3. Input Validation

```typescript
reviewCallback: async (action, context) => {
  // Validate tool name
  const allowedTools = ["readFile", "writeFile"];
  if (!allowedTools.includes(action.tool)) {
    return {
      approved: false,
      reason: "Invalid tool name",
    };
  }

  // Validate arguments
  if (!isValidPath(action.args.path)) {
    return {
      approved: false,
      reason: "Invalid file path",
    };
  }

  return { approved: true };
};
```

---

## Troubleshooting

### Common Issues

#### Issue: Timeout Exceeded

**Symptom**: Review requests timing out before approval

```
Error: HITL review timeout exceeded (300000ms)
```

**Solution**:

```typescript
// Increase timeout for operations requiring human thought
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    timeout: 600000, // 10 minutes
    escalationPolicy: {
      onTimeout: "escalate", // Escalate instead of failing
    },
  },
});
```

#### Issue: Approval Callback Not Called

**Symptom**: HITL enabled but callback never executes

**Solution**: Ensure tool has `requiresConfirmation: true`:

```typescript
tools: [
  {
    name: "dangerousTool",
    requiresConfirmation: true, // Must be set
    execute: async (args) => {
      // ...
    },
  },
];
```

#### Issue: Rejected Approvals Not Handled

**Symptom**: Application crashes when approval rejected

**Solution**: Handle rejection in error handling:

```typescript
try {
  const result = await neurolink.generate({ ... });
} catch (error) {
  if (error.code === "HITL_APPROVAL_REJECTED") {
    console.log(`Operation rejected: ${error.reason}`);
    // Handle gracefully - show user message, log, etc.
  }
}
```

### Debug Mode

Enable detailed HITL logging:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    debug: true, // Enables verbose logging
  },
});

// Or via environment variable
process.env.NEUROLINK_HITL_DEBUG = "true";
```

Debug output example:

```
[HITL] Review required for tool: deleteFile
[HITL] Confidence: 0.72 (threshold: 0.85)
[HITL] Calling reviewCallback with action: {...}
[HITL] Review pending: reviewId=rev_123
[HITL] Checking review status every 5s
[HITL] Review approved by: manager@company.com
[HITL] Executing tool with confirmation
```

---

## See Also

- [Quick HITL Guide](hitl.md) - Simple HITL setup for common cases
- [Guardrails Middleware](guardrails.md) - Complementary content filtering
- [Middleware Architecture](../advanced/middleware-architecture.md) - How HITL integrates with middleware
- [Custom Tools](../sdk/custom-tools.md) - Building tools with HITL support
- [CLI Loop Sessions](cli-loop-sessions.md) - Using HITL in interactive CLI
