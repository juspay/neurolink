---
title: Audit Trails & Compliance Logging
description: Comprehensive audit logging for regulatory compliance and security monitoring
keywords: audit trails, compliance logging, GDPR Article 30, SOC2 CC7, security, transparency
---

# Audit Trails & Compliance Logging

**Comprehensive logging and audit trails for regulatory compliance, security monitoring, and operational transparency**

---

## Overview

Enterprise audit trails provide complete visibility into AI operations for compliance, security, and debugging. NeuroLink supports comprehensive logging of all AI interactions with structured audit trails suitable for SOC2, GDPR, HIPAA, and other regulatory frameworks.

### What You'll Learn

- Configure comprehensive audit logging
- Meet compliance requirements (GDPR, SOC2, HIPAA)
- Implement user consent tracking
- Store and query audit logs
- Integrate with SIEM systems
- Manage data retention policies
- Generate compliance reports

### Why Audit Trails Matter

| Requirement            | Without Audit Trails  | With Audit Trails                |
| ---------------------- | --------------------- | -------------------------------- |
| **GDPR Article 30**    | ❌ Non-compliant      | ✅ Processing records maintained |
| **SOC2 Security**      | ❌ No audit evidence  | ✅ Complete audit trail          |
| **HIPAA § 164.312(b)** | ❌ No activity logs   | ✅ Full audit and accountability |
| **Security Incidents** | ❌ No forensic data   | ✅ Complete investigation trail  |
| **Debugging**          | ❌ Limited visibility | ✅ Full request history          |

---

## Quick Start

### Basic Audit Logging

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createLogger, transports, format } from "winston";

const logger = createLogger({
  level: "info",
  format: format.json(),
  transports: [
    new transports.File({ filename: "audit.log" }),
    new transports.File({ filename: "error.log", level: "error" }),
  ],
});

const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      config: { apiKey: process.env.OPENAI_API_KEY },
    },
  ],

  // Audit logging configuration
  auditLog: {
    enabled: true,
    level: "detailed", // 'minimal' | 'standard' | 'detailed'

    onLog: (event) => {
      logger.info("AI Audit Event", {
        eventId: event.id,
        timestamp: event.timestamp,
        userId: event.userId,
        action: event.action,
        provider: event.provider,
        model: event.model,
        status: event.status,
        latency: event.latency,
        cost: event.cost,
        tokens: event.tokens,
        ip: event.ip,
        userAgent: event.userAgent,
      });
    },
  },
});

// Make request with user context
const result = await ai.generate({
  input: { text: "Analyze customer feedback" },
  provider: "openai",
  model: "gpt-4o",

  // Audit context
  auditContext: {
    userId: "user-12345",
    sessionId: "sess-abc-789",
    action: "customer-feedback-analysis",
    purpose: "Business intelligence",
    dataClassification: "internal",
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  },
});
```

**Audit Log Output:**

```json
{
  "eventId": "evt_8x7k2m9p",
  "timestamp": "2025-01-15T14:32:11.234Z",
  "userId": "user-12345",
  "sessionId": "sess-abc-789",
  "action": "customer-feedback-analysis",
  "purpose": "Business intelligence",
  "dataClassification": "internal",
  "provider": "openai",
  "model": "gpt-4o",
  "status": "success",
  "latency": 1243,
  "cost": 0.0045,
  "tokens": {
    "input": 150,
    "output": 320,
    "total": 470
  },
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Compliance Frameworks

### GDPR Compliance (Article 30)

GDPR requires maintaining records of processing activities. Audit trails provide the necessary evidence.

```typescript
// GDPR-compliant audit configuration
const gdprAI = new NeuroLink({
  providers: [
    { name: "mistral", config: { apiKey: process.env.MISTRAL_API_KEY } },
  ],

  compliance: {
    framework: "GDPR",
    dataResidency: "EU",
    enableAuditLog: true,

    // GDPR-specific settings
    gdpr: {
      recordProcessingActivities: true, // Article 30
      dataSubjectRights: true, // Articles 15-22
      consentTracking: true, // Article 7
      dataRetention: "30-days", // Storage limitation
      anonymization: true, // Data minimization
    },
  },

  auditLog: {
    enabled: true,
    level: "detailed",

    // GDPR audit fields
    includeFields: [
      "userId",
      "consentId",
      "legalBasis", // Article 6 legal basis
      "purpose", // Article 5(1)(b) purpose limitation
      "dataCategory", // Personal data category
      "retention", // Retention period
      "processors", // Third-party processors (AI providers)
    ],

    onLog: async (event) => {
      await auditDatabase.insert({
        ...event,
        gdprCompliance: {
          legalBasis: event.legalBasis || "consent",
          dataSubjectId: event.userId,
          processingPurpose: event.purpose,
          dataCategory: event.dataCategory,
          retentionPeriod: event.retention || "30-days",
          thirdPartyProcessors: [event.provider],
        },
      });
    },
  },
});

// Make request with GDPR context
const result = await gdprAI.generate({
  input: { text: prompt },

  auditContext: {
    userId: "user-12345",
    consentId: "consent-xyz-789", // Article 7: consent proof
    legalBasis: "consent", // Article 6: legal basis
    purpose: "personalized-recommendations",
    dataCategory: "behavioral-data",
    retention: "30-days",
  },
});
```

**GDPR Audit Report Generation:**

```typescript
// Generate Article 30 processing records
async function generateGDPRReport(startDate: Date, endDate: Date) {
  const records = await auditDatabase.query({
    timestamp: { $gte: startDate, $lte: endDate },
    "gdprCompliance.legalBasis": { $exists: true },
  });

  return {
    reportType: "GDPR Article 30 - Records of Processing Activities",
    period: { start: startDate, end: endDate },
    controller: "Your Organization",

    processingActivities: records.map((r) => ({
      purpose: r.gdprCompliance.processingPurpose,
      legalBasis: r.gdprCompliance.legalBasis,
      dataCategories: r.gdprCompliance.dataCategory,
      dataSubjects: "customers",
      recipients: r.gdprCompliance.thirdPartyProcessors,
      transfers: r.provider === "mistral" ? "EU" : "third-country",
      retention: r.gdprCompliance.retentionPeriod,
      security: "encryption, access control, audit logging",
    })),
  };
}
```

---

### SOC2 Security Compliance

SOC2 requires audit logs for security monitoring and incident response.

```typescript
// SOC2-compliant configuration
const soc2AI = new NeuroLink({
  providers: [
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],

  compliance: {
    framework: "SOC2",

    soc2: {
      // CC7.2: System operations - monitoring
      enableMonitoring: true,

      // CC7.3: System operations - log retention
      logRetention: "365-days",

      // CC6.1: Logical access - audit trail
      auditTrail: true,

      // CC7.4: System operations - incident detection
      incidentDetection: true,
    },
  },

  auditLog: {
    enabled: true,
    level: "detailed",

    // SOC2 required fields
    includeFields: [
      "userId",
      "action",
      "timestamp",
      "ip",
      "userAgent",
      "status",
      "errorCode",
      "securityEvents",
    ],

    // Immutable audit log storage
    storage: {
      type: "append-only",
      encryption: "AES-256",
      integrityCheck: "SHA-256",
    },

    onLog: async (event) => {
      // Store in tamper-proof audit log
      await appendOnlyAuditLog.write({
        ...event,
        hash: calculateHash(event),
        previousHash: await appendOnlyAuditLog.getLastHash(),
      });

      // Detect suspicious activity
      if (await detectAnomalousActivity(event)) {
        await securityIncidentManager.create({
          type: "anomalous-ai-usage",
          severity: "medium",
          event: event,
        });
      }
    },
  },
});
```

**SOC2 Audit Trail Query:**

```typescript
// CC6.1: Verify audit trail completeness
async function verifySoc2AuditTrail() {
  const logs = await appendOnlyAuditLog.getAll();

  // Verify chain integrity
  for (let i = 1; i < logs.length; i++) {
    const expectedHash = calculateHash(logs[i - 1]);
    if (logs[i].previousHash !== expectedHash) {
      throw new Error("Audit trail integrity violation detected");
    }
  }

  return {
    totalEvents: logs.length,
    integrityVerified: true,
    retentionCompliance: logs.every(
      (l) =>
        Date.now() - new Date(l.timestamp).getTime() <=
        365 * 24 * 60 * 60 * 1000,
    ),
  };
}
```

---

### HIPAA Compliance (§ 164.312(b))

HIPAA requires audit controls and activity logs for PHI access.

```typescript
// HIPAA-compliant audit configuration
const hipaaAI = new NeuroLink({
  providers: [
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],

  compliance: {
    framework: "HIPAA",

    hipaa: {
      // § 164.312(b): Audit controls
      auditControls: true,

      // § 164.308(a)(1)(ii)(D): Information system activity review
      activityReview: true,

      // § 164.528: Accounting of disclosures
      accountingOfDisclosures: true,

      // § 164.312(a)(2)(i): Unique user identification
      uniqueUserIdentification: true,
    },
  },

  auditLog: {
    enabled: true,
    level: "detailed",

    // HIPAA-required fields
    includeFields: [
      "userId",
      "patientId",
      "action",
      "timestamp",
      "phiAccessed",
      "disclosure",
      "purpose",
      "authorization",
    ],

    onLog: async (event) => {
      // § 164.528: Accounting of PHI disclosures
      if (event.phiAccessed || event.disclosure) {
        await phiDisclosureLog.insert({
          date: event.timestamp,
          recipient: event.provider,
          description: event.action,
          purpose: event.purpose,
          patientId: event.patientId,
          userId: event.userId,
          authorization: event.authorization,
        });
      }

      // Store in encrypted, tamper-proof audit log
      await hipaaAuditLog.write(encrypt(event));
    },
  },
});

// Make request with HIPAA context
const result = await hipaaAI.generate({
  input: { text: "Summarize patient chart" },

  auditContext: {
    userId: "dr-smith-456",
    patientId: "patient-123",
    action: "chart-summarization",
    purpose: "treatment", // § 164.506: permitted use
    phiAccessed: true,
    authorization: "auth-789-xyz",
    disclosure: false,
  },
});
```

**HIPAA Disclosure Accounting:**

```typescript
// § 164.528: Generate accounting of disclosures
async function generateHIPAADisclosureAccounting(
  patientId: string,
  startDate: Date,
) {
  const disclosures = await phiDisclosureLog.query({
    patientId: patientId,
    timestamp: { $gte: startDate },
    disclosure: true,
  });

  return disclosures.map((d) => ({
    date: d.timestamp,
    recipient: d.recipient,
    description: d.description,
    purpose: d.purpose,
    authorization: d.authorization,
  }));
}
```

---

## Audit Log Storage

### Database Storage (PostgreSQL)

```typescript
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  database: "neurolink_audit",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: true,
});

// Create audit log table
await pool.query(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    latency INTEGER,
    cost DECIMAL(10, 6),
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    ip INET,
    user_agent TEXT,
    audit_context JSONB,
    compliance_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
  CREATE INDEX idx_audit_user ON audit_logs(user_id);
  CREATE INDEX idx_audit_action ON audit_logs(action);
  CREATE INDEX idx_audit_provider ON audit_logs(provider);
`);

// Audit log writer
const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
  ],

  auditLog: {
    enabled: true,
    level: "detailed",

    onLog: async (event) => {
      await pool.query(
        `
        INSERT INTO audit_logs (
          event_id, timestamp, user_id, session_id, action,
          provider, model, status, latency, cost,
          input_tokens, output_tokens, total_tokens,
          ip, user_agent, audit_context, compliance_data, error_message
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18
        )
      `,
        [
          event.id,
          event.timestamp,
          event.userId,
          event.sessionId,
          event.action,
          event.provider,
          event.model,
          event.status,
          event.latency,
          event.cost,
          event.tokens?.input,
          event.tokens?.output,
          event.tokens?.total,
          event.ip,
          event.userAgent,
          JSON.stringify(event.auditContext),
          JSON.stringify(event.complianceData),
          event.errorMessage,
        ],
      );
    },
  },
});
```

---

### Time-Series Storage (InfluxDB)

For high-volume audit logs with time-based queries:

```typescript
import { InfluxDB, Point } from "@influxdata/influxdb-client";

const influxDB = new InfluxDB({
  url: "http://localhost:8086",
  token: process.env.INFLUX_TOKEN,
});

const writeApi = influxDB.getWriteApi("neurolink", "audit_logs", "ms");

const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
  ],

  auditLog: {
    enabled: true,
    level: "detailed",

    onLog: async (event) => {
      const point = new Point("ai_audit")
        .tag("provider", event.provider)
        .tag("model", event.model)
        .tag("status", event.status)
        .tag("action", event.action)
        .tag("user_id", event.userId)
        .floatField("latency", event.latency)
        .floatField("cost", event.cost)
        .intField("input_tokens", event.tokens?.input || 0)
        .intField("output_tokens", event.tokens?.output || 0)
        .intField("total_tokens", event.tokens?.total || 0)
        .stringField("ip", event.ip)
        .timestamp(new Date(event.timestamp));

      writeApi.writePoint(point);
      await writeApi.flush();
    },
  },
});

// Query audit logs
async function queryAuditLogs(startTime: string, endTime: string) {
  const queryApi = influxDB.getQueryApi("neurolink");

  const query = `
    from(bucket: "audit_logs")
      |> range(start: ${startTime}, stop: ${endTime})
      |> filter(fn: (r) => r._measurement == "ai_audit")
  `;

  const results = [];
  for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
    results.push(tableMeta.toObject(values));
  }

  return results;
}
```

---

### Append-Only Storage (Blockchain-Inspired)

For tamper-proof audit trails:

```typescript
import crypto from "crypto";

interface AuditBlock {
  index: number;
  timestamp: string;
  data: AuditEvent;
  previousHash: string;
  hash: string;
}

class AuditBlockchain {
  private chain: AuditBlock[] = [];

  constructor() {
    this.chain.push(this.createGenesisBlock());
  }

  private createGenesisBlock(): AuditBlock {
    return {
      index: 0,
      timestamp: new Date().toISOString(),
      data: {} as AuditEvent,
      previousHash: "0",
      hash: this.calculateHash(0, new Date().toISOString(), {}, "0"),
    };
  }

  private calculateHash(
    index: number,
    timestamp: string,
    data: any,
    previousHash: string,
  ): string {
    return crypto
      .createHash("sha256")
      .update(index + timestamp + JSON.stringify(data) + previousHash)
      .digest("hex");
  }

  addBlock(data: AuditEvent): AuditBlock {
    const previousBlock = this.chain[this.chain.length - 1];
    const newBlock: AuditBlock = {
      index: previousBlock.index + 1,
      timestamp: new Date().toISOString(),
      data: data,
      previousHash: previousBlock.hash,
      hash: "",
    };

    newBlock.hash = this.calculateHash(
      newBlock.index,
      newBlock.timestamp,
      newBlock.data,
      newBlock.previousHash,
    );

    this.chain.push(newBlock);
    return newBlock;
  }

  verifyIntegrity(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      const calculatedHash = this.calculateHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.data,
        currentBlock.previousHash,
      );

      if (currentBlock.hash !== calculatedHash) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }

    return true;
  }
}

const auditChain = new AuditBlockchain();

const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
  ],

  auditLog: {
    enabled: true,
    level: "detailed",

    onLog: async (event) => {
      const block = auditChain.addBlock(event);

      // Persist to database
      await database.insert("audit_blockchain", {
        blockIndex: block.index,
        blockHash: block.hash,
        previousHash: block.previousHash,
        data: block.data,
        timestamp: block.timestamp,
      });
    },
  },
});
```

---

## User Consent Tracking

GDPR Article 7 requires proof of consent. Track user consent alongside audit logs.

```typescript
interface ConsentRecord {
  consentId: string;
  userId: string;
  purpose: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  consentText: string;
  granted: boolean;
  revoked?: boolean;
  revokedAt?: Date;
}

class ConsentManager {
  async recordConsent(data: Omit<ConsentRecord, "consentId">): Promise<string> {
    const consentId = `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await database.insert("user_consents", {
      consentId,
      ...data,
    });

    return consentId;
  }

  async checkConsent(userId: string, purpose: string): Promise<boolean> {
    const consent = await database.findOne("user_consents", {
      userId,
      purpose,
      granted: true,
      revoked: { $ne: true },
    });

    return !!consent;
  }

  async revokeConsent(consentId: string): Promise<void> {
    await database.update(
      "user_consents",
      { consentId },
      { revoked: true, revokedAt: new Date() },
    );
  }
}

const consentManager = new ConsentManager();

// Check consent before AI request
app.post("/api/generate", async (req, res) => {
  const hasConsent = await consentManager.checkConsent(
    req.user.id,
    "personalized-recommendations",
  );

  if (!hasConsent) {
    return res.status(403).json({
      error: "Consent required",
      message: "User has not consented to AI processing (GDPR Article 6)",
    });
  }

  const result = await ai.generate({
    input: { text: req.body.prompt },
    auditContext: {
      userId: req.user.id,
      consentId: hasConsent.consentId,
      legalBasis: "consent",
    },
  });

  res.json({ content: result.content });
});
```

---

## SIEM Integration

### Splunk Integration

```typescript
import SplunkLogger from "splunk-logging";

const splunkLogger = new SplunkLogger({
  token: process.env.SPLUNK_TOKEN,
  url: "https://splunk.example.com:8088",
});

const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
  ],

  auditLog: {
    enabled: true,
    level: "detailed",

    onLog: async (event) => {
      splunkLogger.send({
        message: event,
        severity: event.status === "error" ? "error" : "info",
        source: "neurolink-ai",
        sourcetype: "ai-audit-log",
        index: "main",
      });
    },
  },
});
```

### Datadog Integration

```typescript
import { client as ddClient } from "dd-trace";

ddClient.init({
  hostname: "datadog.example.com",
  service: "neurolink-ai",
  env: "production",
});

const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
  ],

  auditLog: {
    enabled: true,
    level: "detailed",

    onLog: async (event) => {
      ddClient.dogstatsd.increment("ai.requests", 1, [
        `provider:${event.provider}`,
        `status:${event.status}`,
      ]);
      ddClient.dogstatsd.histogram("ai.latency", event.latency, [
        `provider:${event.provider}`,
      ]);
      ddClient.dogstatsd.histogram("ai.cost", event.cost, [
        `provider:${event.provider}`,
      ]);

      ddClient.logger.info("AI Audit Event", event);
    },
  },
});
```

---

## Querying Audit Logs

### SQL Queries

```sql
-- Find all requests by user
SELECT * FROM audit_logs
WHERE user_id = 'user-12345'
ORDER BY timestamp DESC
LIMIT 100;

-- Calculate cost per user
SELECT
  user_id,
  COUNT(*) as total_requests,
  SUM(cost) as total_cost,
  AVG(latency) as avg_latency,
  SUM(total_tokens) as total_tokens
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost DESC;

-- Detect anomalous activity
SELECT
  user_id,
  COUNT(*) as requests_per_hour,
  AVG(cost) as avg_cost_per_request
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 100  -- More than 100 requests/hour
ORDER BY requests_per_hour DESC;

-- Compliance report: GDPR consent tracking
SELECT
  al.user_id,
  al.action,
  al.timestamp,
  uc.consent_id,
  uc.granted,
  uc.revoked
FROM audit_logs al
LEFT JOIN user_consents uc
  ON al.audit_context->>'consentId' = uc.consent_id
WHERE al.timestamp >= NOW() - INTERVAL '90 days'
ORDER BY al.timestamp DESC;

-- Error rate by provider
SELECT
  provider,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
  ROUND(100.0 * SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY provider
ORDER BY error_rate DESC;
```

### TypeScript Query API

```typescript
class AuditLogQuery {
  async getUserActivity(userId: string, limit: number = 100) {
    return await database.query(
      "audit_logs",
      {
        user_id: userId,
      },
      {
        sort: { timestamp: -1 },
        limit,
      },
    );
  }

  async getCostByUser(startDate: Date, endDate: Date) {
    return await database.aggregate("audit_logs", [
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$user_id",
          totalRequests: { $sum: 1 },
          totalCost: { $sum: "$cost" },
          avgLatency: { $avg: "$latency" },
          totalTokens: { $sum: "$total_tokens" },
        },
      },
      {
        $sort: { totalCost: -1 },
      },
    ]);
  }

  async detectAnomalies(threshold: number = 100) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return await database.aggregate("audit_logs", [
      {
        $match: {
          timestamp: { $gte: oneHourAgo },
        },
      },
      {
        $group: {
          _id: "$user_id",
          requestsPerHour: { $sum: 1 },
          avgCost: { $avg: "$cost" },
        },
      },
      {
        $match: {
          requestsPerHour: { $gt: threshold },
        },
      },
      {
        $sort: { requestsPerHour: -1 },
      },
    ]);
  }

  async getComplianceReport(
    framework: "GDPR" | "SOC2" | "HIPAA",
    days: number = 90,
  ) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await database.query(
      "audit_logs",
      {
        timestamp: { $gte: startDate },
        "compliance_data.framework": framework,
      },
      {
        sort: { timestamp: -1 },
      },
    );
  }
}

const auditQuery = new AuditLogQuery();

// Usage
const userActivity = await auditQuery.getUserActivity("user-12345");
const costReport = await auditQuery.getCostByUser(
  new Date("2025-01-01"),
  new Date("2025-01-31"),
);
const anomalies = await auditQuery.detectAnomalies(100);
const gdprReport = await auditQuery.getComplianceReport("GDPR", 90);
```

---

## Data Retention Policies

```typescript
// Automated retention policy enforcement
class RetentionPolicyManager {
  private policies = {
    GDPR: 30, // 30 days
    SOC2: 365, // 1 year
    HIPAA: 2555, // 7 years
    default: 90, // 90 days
  };

  async enforceRetention(framework: keyof typeof this.policies = "default") {
    const retentionDays = this.policies[framework];
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    // Archive old logs
    const logsToArchive = await database.query("audit_logs", {
      timestamp: { $lt: cutoffDate },
    });

    if (logsToArchive.length > 0) {
      // Move to cold storage
      await archiveStorage.insert(logsToArchive);

      // Delete from active database
      await database.delete("audit_logs", {
        timestamp: { $lt: cutoffDate },
      });

      console.log(
        `Archived ${logsToArchive.length} logs older than ${retentionDays} days`,
      );
    }
  }
}

const retentionManager = new RetentionPolicyManager();

// Run daily
setInterval(
  () => {
    retentionManager.enforceRetention("SOC2");
  },
  24 * 60 * 60 * 1000,
);
```

---

## Best Practices

### 1. **Log Everything Critical**

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
  ],

  auditLog: {
    enabled: true,
    level: "detailed",

    // Log all important fields
    includeFields: [
      "userId",
      "sessionId",
      "action",
      "provider",
      "model",
      "status",
      "latency",
      "cost",
      "tokens",
      "ip",
      "userAgent",
      "errorMessage",
    ],
  },
});
```

### 2. **Encrypt Sensitive Data**

```typescript
import crypto from "crypto";

function encryptPII(data: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes for AES-256
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data (all hex encoded)
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

auditLog: {
  onLog: async (event) => {
    await database.insert("audit_logs", {
      ...event,
      userId: encryptPII(event.userId),
      ip: encryptPII(event.ip),
    });
  };
}
```

### 3. **Implement Access Controls**

```typescript
// Role-based access to audit logs
app.get(
  "/api/audit-logs",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const logs = await auditQuery.getUserActivity(req.query.userId);
    res.json(logs);
  },
);
```

### 4. **Monitor Audit Log Health**

```typescript
// Alert if audit logging fails
auditLog: {
  onLog: async (event) => {
    try {
      await database.insert("audit_logs", event);
    } catch (error) {
      // Critical: audit logging failure
      await alerting.sendCriticalAlert({
        title: "Audit Logging Failure",
        message: `Failed to log audit event: ${error.message}`,
        severity: "critical",
      });
    }
  };
}
```

---

## Related Documentation

- [Compliance & Security Guide](./compliance.md) - Compliance frameworks
- [Monitoring & Observability](./monitoring.md) - Metrics and monitoring
- [Multi-Provider Failover](./multi-provider-failover.md) - High availability
- [Cost Optimization](./cost-optimization.md) - Cost tracking

---

## Summary

You've learned how to implement comprehensive audit trails for compliance and security:

✅ Configure detailed audit logging
✅ Meet GDPR, SOC2, HIPAA requirements
✅ Track user consent (GDPR Article 7)
✅ Store audit logs securely
✅ Query and analyze audit data
✅ Integrate with SIEM systems
✅ Enforce data retention policies

Enterprise audit trails provide the foundation for regulatory compliance, security monitoring, and operational transparency in production AI systems.
