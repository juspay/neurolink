---
title: Compliance & Security Guide
description: GDPR, SOC2, HIPAA compliance with enterprise security controls for AI applications
keywords: GDPR, SOC2, HIPAA, compliance, security, data privacy, enterprise
---

# Compliance & Security Guide

**Implement GDPR, SOC2, HIPAA, and enterprise security controls for AI applications**

---

## Overview

Enterprise AI deployments require strict compliance with regulations like GDPR, SOC2, and HIPAA. This guide provides concrete implementation patterns for meeting regulatory requirements, securing AI data pipelines, and maintaining audit trails.

### Supported Compliance Frameworks

| Framework     | Use Case             | NeuroLink Support | Key Requirements                       |
| ------------- | -------------------- | ----------------- | -------------------------------------- |
| **GDPR**      | EU data protection   | ✅ Full           | Data residency, consent, erasure       |
| **SOC2**      | Security trust       | ✅ Full           | Access control, encryption, audit logs |
| **HIPAA**     | Healthcare data      | ✅ Full           | PHI protection, BAA, encryption        |
| **CCPA**      | California privacy   | ✅ Full           | Data rights, opt-out, disclosure       |
| **ISO 27001** | Information security | ✅ Full           | ISMS, risk management, controls        |

### Compliance Features

- **🌍 Data Residency**: Route EU data to EU providers
- **🔒 Encryption**: End-to-end encryption at rest and in transit
- **📝 Audit Logging**: Complete request/response trails
- **🔐 Access Control**: Role-based permissions
- **⏰ Data Retention**: Configurable retention policies
- **🗑️ Data Deletion**: Right to erasure (GDPR Article 17)
- **📊 Consent Management**: Track user consent

---

## Quick Start

### GDPR-Compliant Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  compliance: {
    framework: "GDPR",
    dataResidency: "EU", // Keep data in EU
    enableAuditLog: true, // Required for accountability
    dataRetention: "30-days", // Auto-delete after 30 days
    anonymization: true, // Anonymize sensitive data
  },
  providers: [
    {
      name: "mistral", // EU-based provider
      priority: 1,
      config: {
        apiKey: process.env.MISTRAL_API_KEY,
        region: "eu", // Enforce EU region
      },
    },
    {
      name: "openai", // Fallback (check DPA)
      priority: 2,
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        region: "eu", // Use EU endpoint if available
      },
    },
  ],
});

// GDPR-compliant request
const result = await ai.generate({
  input: { text: "Analyze customer feedback" },
  metadata: {
    userId: hashUserId(user.id), // Anonymize user ID
    legalBasis: "consent", // GDPR Article 6(1)(a)
    purpose: "service-improvement", // Purpose limitation
    userConsent: true, // Explicit consent
  },
});
```

---

## GDPR Compliance

### Data Residency (Article 44-50)

Ensure EU data stays in EU.

```typescript
// EU data residency enforcement
const ai = new NeuroLink({
  providers: [
    {
      name: "mistral",
      priority: 1,
      config: {
        apiKey: process.env.MISTRAL_API_KEY,
        region: "eu",
        dataCenter: "eu-west-1", // France
      },
      condition: (req) => req.userRegion === "EU",
    },
    {
      name: "google-ai",
      priority: 2,
      config: {
        apiKey: process.env.GOOGLE_AI_KEY,
        // Google AI Studio data processed in EU for EU users
      },
      condition: (req) => req.userRegion === "EU",
    },
  ],
  compliance: {
    enforceDataResidency: true, // Block non-EU providers for EU data
    rejectThirdCountry: true, // Reject inadequate countries
  },
});

// Detect user region
function getUserRegion(ip: string): "EU" | "US" | "OTHER" {
  // Use IP geolocation service
  const country = geolocate(ip);

  const euCountries = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
  ];

  if (euCountries.includes(country)) return "EU";
  if (country === "US") return "US";
  return "OTHER";
}

// Usage
const result = await ai.generate({
  input: { text: userQuery },
  metadata: {
    userRegion: getUserRegion(req.ip), // Routes to EU provider
  },
});
```

### Consent Management (Article 6, 7)

```typescript
class ConsentManager {
  private consents = new Map<
    string,
    {
      hasConsent: boolean;
      purpose: string[];
      timestamp: Date;
      expiresAt: Date;
    }
  >();

  async checkConsent(userId: string, purpose: string): Promise<boolean> {
    const consent = this.consents.get(userId);

    if (!consent) return false;
    if (!consent.hasConsent) return false;
    if (new Date() > consent.expiresAt) return false; // Consent expired
    if (!consent.purpose.includes(purpose)) return false; // Wrong purpose

    return true;
  }

  async recordConsent(
    userId: string,
    purposes: string[],
    duration: number = 365,
  ) {
    this.consents.set(userId, {
      hasConsent: true,
      purpose: purposes,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + duration * 86400000), // days to ms
    });
  }

  async withdrawConsent(userId: string) {
    this.consents.set(userId, {
      hasConsent: false,
      purpose: [],
      timestamp: new Date(),
      expiresAt: new Date(),
    });
  }
}

// Usage
const consentManager = new ConsentManager();

// Before processing user data
const hasConsent = await consentManager.checkConsent(userId, "ai-processing");

if (!hasConsent) {
  throw new Error("User has not consented to AI processing (GDPR Article 6)");
}

const result = await ai.generate({
  input: { text: userInput },
  metadata: {
    userId: hashUserId(userId),
    legalBasis: "consent",
    purpose: "ai-processing",
    consentTimestamp: new Date().toISOString(),
  },
});
```

### Data Minimization (Article 5(1)(c))

Only process necessary data.

```typescript
// ❌ Bad: Send entire user object (excessive data)
const bad = await ai.generate({
  input: {
    text: `Analyze feedback from user: ${JSON.stringify(user)}`,
    // Includes: name, email, address, phone, SSN, etc.
  },
});

// ✅ Good: Only send necessary data
const good = await ai.generate({
  input: {
    text: `Analyze feedback: "${user.feedback}"`,
    // Only feedback text, no PII
  },
  metadata: {
    userId: hashUserId(user.id), // Hashed, not raw ID
  },
});
```

### Right to Erasure (Article 17)

Delete user data on request.

```typescript
class DataDeletionService {
  async deleteUserData(userId: string) {
    // 1. Delete from audit logs
    await auditLog.deleteByUserId(userId);

    // 2. Delete cached responses
    await cache.deleteByUserId(userId);

    // 3. Delete stored prompts/responses
    await database.delete("ai_requests", { userId });

    // 4. Log deletion (required for accountability)
    await auditLog.record({
      action: "DATA_DELETION",
      userId: hashUserId(userId),
      timestamp: new Date(),
      reason: "GDPR_RIGHT_TO_ERASURE",
    });

    console.log(`Deleted all data for user: ${hashUserId(userId)}`);
  }
}

// API endpoint for deletion requests
app.post("/api/delete-my-data", async (req, res) => {
  const { userId } = req.user;

  // Verify user identity
  await verifyIdentity(req);

  // Delete all user data
  await dataDeletionService.deleteUserData(userId);

  res.json({
    success: true,
    message: "All your data has been deleted",
  });
});
```

### Data Retention (Article 5(1)(e))

Auto-delete data after retention period.

```typescript
class RetentionPolicy {
  private retentionPeriod = 30 * 86400000; // 30 days in ms

  async enforceRetention() {
    const cutoff = new Date(Date.now() - this.retentionPeriod);

    // Delete audit logs older than retention period
    await database.delete("audit_logs", {
      timestamp: { $lt: cutoff },
    });

    // Delete cached responses
    await database.delete("ai_cache", {
      createdAt: { $lt: cutoff },
    });

    console.log(`Deleted data older than ${new Date(cutoff).toISOString()}`);
  }
}

// Run daily
const retentionPolicy = new RetentionPolicy();
setInterval(() => retentionPolicy.enforceRetention(), 86400000); // Daily
```

---

## SOC2 Compliance

### Access Control (CC6.1)

Role-based access control for AI features.

```typescript
enum Role {
  ADMIN = "admin",
  USER = "user",
  READONLY = "readonly",
}

class AccessControl {
  private permissions = {
    [Role.ADMIN]: ["read", "write", "delete", "configure"],
    [Role.USER]: ["read", "write"],
    [Role.READONLY]: ["read"],
  };

  canAccess(role: Role, action: string): boolean {
    return this.permissions[role].includes(action);
  }

  async checkAccess(userId: string, action: string) {
    const user = await getUser(userId);

    if (!this.canAccess(user.role, action)) {
      // Log access attempt for audit
      await auditLog.record({
        event: "UNAUTHORIZED_ACCESS_ATTEMPT",
        userId: hashUserId(userId),
        action,
        timestamp: new Date(),
      });

      throw new Error("Insufficient permissions");
    }
  }
}

// Usage
const acl = new AccessControl();

app.post("/api/ai/generate", async (req, res) => {
  await acl.checkAccess(req.user.id, "write");

  const result = await ai.generate({
    input: { text: req.body.prompt },
    metadata: {
      userId: hashUserId(req.user.id),
      role: req.user.role,
    },
  });

  res.json(result);
});
```

### Audit Logging (CC7.2)

Comprehensive audit trail for all AI operations.

```typescript
type AuditEntry = {
  timestamp: Date;
  userId: string;
  action: string;
  provider: string;
  model: string;
  inputHash: string; // Hash of input (not raw input for privacy)
  outputHash: string; // Hash of output
  tokensUsed: number;
  cost: number;
  latency: number;
  success: boolean;
  error?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
};

class AuditLogger {
  async log(entry: AuditEntry) {
    // Store in tamper-proof audit log
    await database.insert("audit_logs", {
      ...entry,
      hash: this.computeHash(entry), // Detect tampering
    });

    // Also send to external SIEM
    await siem.sendEvent(entry);
  }

  private computeHash(entry: AuditEntry): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify(entry));
    return hash.digest("hex");
  }

  async query(filters: any) {
    return await database.find("audit_logs", filters);
  }
}

// Usage
const auditLogger = new AuditLogger();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onRequest: async (req) => {
    await auditLogger.log({
      timestamp: new Date(),
      userId: hashUserId(req.userId),
      action: "AI_REQUEST_STARTED",
      provider: req.provider,
      model: req.model,
      inputHash: hashInput(req.input),
      tokensUsed: 0,
      cost: 0,
      latency: 0,
      success: false,
      ipAddress: req.ipAddress,
      userAgent: req.userAgent,
      requestId: req.requestId,
    });
  },
  onSuccess: async (result, req) => {
    await auditLogger.log({
      timestamp: new Date(),
      userId: hashUserId(req.userId),
      action: "AI_REQUEST_COMPLETED",
      provider: result.provider,
      model: result.model,
      inputHash: hashInput(req.input),
      outputHash: hashOutput(result.content),
      tokensUsed: result.usage.totalTokens,
      cost: result.cost,
      latency: result.latency,
      success: true,
      ipAddress: req.ipAddress,
      userAgent: req.userAgent,
      requestId: req.requestId,
    });
  },
});
```

### Encryption (CC6.7)

Encrypt data at rest and in transit.

```typescript
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

class EncryptionService {
  private algorithm = "aes-256-gcm";
  private key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

  encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    };
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, "hex"),
    );

    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

// Usage: Encrypt sensitive data before storage
const encryption = new EncryptionService();

async function storeSensitiveData(userId: string, data: any) {
  const { encrypted, iv, tag } = encryption.encrypt(JSON.stringify(data));

  await database.insert("encrypted_data", {
    userId: hashUserId(userId),
    encrypted,
    iv,
    tag,
    createdAt: new Date(),
  });
}

async function retrieveSensitiveData(userId: string) {
  const record = await database.findOne("encrypted_data", {
    userId: hashUserId(userId),
  });

  const decrypted = encryption.decrypt(record.encrypted, record.iv, record.tag);
  return JSON.parse(decrypted);
}
```

---

## HIPAA Compliance

### PHI Protection (§164.312)

Protect Protected Health Information.

```typescript
// Identify and redact PHI before sending to AI
function redactPHI(text: string): string {
  return (
    text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN-REDACTED]") // SSN
      // Phone: match (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1-xxx-xxx-xxxx
      .replace(
        /(\+1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
        "[PHONE-REDACTED]",
      )
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, "[EMAIL-REDACTED]") // Email
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[DATE-REDACTED]")
  ); // DOB
}

// HIPAA-compliant AI request
const result = await ai.generate({
  input: {
    text: redactPHI(medicalRecord), // Redact PHI first
  },
  metadata: {
    hipaaCompliant: true,
    phi: false, // Confirm no PHI in request
    baaRequired: true,
  },
});
```

### Business Associate Agreement (BAA)

Ensure providers have signed BAAs.

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      priority: 1,
      config: { apiKey: process.env.OPENAI_KEY },
      compliance: {
        hipaa: true,
        baa: true, // OpenAI offers BAA for Enterprise
        baaSignedDate: "2024-01-15",
      },
    },
    {
      name: "anthropic",
      priority: 2,
      config: { apiKey: process.env.ANTHROPIC_KEY },
      compliance: {
        hipaa: true,
        baa: true, // Anthropic offers BAA
        baaSignedDate: "2024-02-01",
      },
    },
  ],
  compliance: {
    framework: "HIPAA",
    requireBAA: true, // Only use providers with BAA
    encryption: {
      atRest: true,
      inTransit: true,
    },
  },
});
```

### Audit Controls (§164.312(b))

Track all PHI access.

```typescript
type HIPAAAuditEntry = {
  timestamp: Date;
  userId: string;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE";
  resourceType: "PHI" | "MEDICAL_RECORD";
  resourceId: string;
  success: boolean;
  ipAddress: string;
  reasonForAccess: string;
};

class HIPAAAuditLogger {
  async logPHIAccess(entry: HIPAAAuditEntry) {
    // Store in immutable audit log
    await database.insert("hipaa_audit_logs", {
      ...entry,
      hash: hashEntry(entry), // Tamper detection
      retainUntil: new Date(Date.now() + 6 * 365 * 86400000), // 6 years
    });

    // Alert on suspicious access
    if (this.isSuspicious(entry)) {
      await alerting.sendAlert("Suspicious PHI access detected", entry);
    }
  }

  private isSuspicious(entry: HIPAAAuditEntry): boolean {
    // Detect anomalies
    const recentAccess = await this.getRecentAccess(entry.userId);

    // Too many accesses in short time
    if (recentAccess.length > 100) return true;

    // Access outside business hours
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) return true;

    return false;
  }
}
```

---

## Security Best Practices

### 1. ✅ Hash User IDs

```typescript
function hashUserId(userId: string): string {
  const hash = createHash("sha256");
  hash.update(userId + process.env.HASH_SALT);
  return hash.digest("hex");
}

// Never send raw user IDs to AI providers
const result = await ai.generate({
  input: { text: prompt },
  metadata: {
    userId: hashUserId(user.id), // ✅ Hashed
    // NOT: userId: user.id       // ❌ Raw
  },
});
```

### 2. ✅ Use HTTPS Only

```typescript
const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  security: {
    enforceHTTPS: true, // Reject HTTP connections
    tlsVersion: "1.3", // Minimum TLS version
    verifyCertificates: true,
  },
});
```

### 3. ✅ Implement Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests",
});

app.use("/api/ai", limiter);
```

### 4. ✅ Validate Inputs

```typescript
function validateInput(input: string): boolean {
  // Prevent prompt injection
  const forbidden = ["ignore previous instructions", "system:", "admin:"];

  for (const phrase of forbidden) {
    if (input.toLowerCase().includes(phrase)) {
      throw new Error("Potential prompt injection detected");
    }
  }

  // Limit length
  if (input.length > 10000) {
    throw new Error("Input too long");
  }

  return true;
}
```

### 5. ✅ Monitor for Anomalies

```typescript
class AnomalyDetector {
  private baseline = {
    avgRequestsPerHour: 100,
    avgTokensPerRequest: 500,
    avgCostPerRequest: 0.01,
  };

  detectAnomalies(metrics: any) {
    // Unusual spike in requests
    if (metrics.requestsThisHour > this.baseline.avgRequestsPerHour * 5) {
      alerting.sendAlert("Unusual spike in AI requests");
    }

    // Unusual token usage
    if (metrics.avgTokens > this.baseline.avgTokensPerRequest * 3) {
      alerting.sendAlert("Unusual token usage pattern");
    }

    // Unusual costs
    if (metrics.avgCost > this.baseline.avgCostPerRequest * 10) {
      alerting.sendAlert("Unusual AI costs detected");
    }
  }
}
```

---

## Compliance Checklist

### GDPR Compliance ✅

- [ ] Data residency enforced (EU data in EU)
- [ ] Explicit user consent collected and tracked
- [ ] Data minimization implemented
- [ ] Audit logging enabled
- [ ] Right to erasure implemented
- [ ] Data retention policy configured
- [ ] Privacy policy updated
- [ ] DPIA conducted for high-risk processing

### SOC2 Compliance ✅

- [ ] Access controls implemented
- [ ] Audit logging comprehensive
- [ ] Encryption at rest and in transit
- [ ] Security monitoring active
- [ ] Incident response plan documented
- [ ] Change management process
- [ ] Vendor management (provider assessments)
- [ ] Annual penetration testing

### HIPAA Compliance ✅

- [ ] BAA signed with all AI providers
- [ ] PHI redaction implemented
- [ ] Encryption enabled (AES-256)
- [ ] Audit controls active (6-year retention)
- [ ] Access controls enforced
- [ ] Risk assessment completed
- [ ] Security officer assigned
- [ ] Breach notification process documented

---

## Related Documentation

- **[Mistral AI Guide](../../getting-started/providers/mistral.md)** - GDPR-compliant EU provider
- **[Multi-Region Deployment](./multi-region.md)** - Geographic compliance
- **[Monitoring Guide](./monitoring.md)** - Security monitoring
- **[Audit Trails](./audit-trails.md)** - Comprehensive logging

---

## Additional Resources

- **[GDPR Official Text](https://gdpr-info.eu/)** - EU regulation
- **[SOC2 Framework](https://www.aicpa.org/soc)** - Trust services criteria
- **[HIPAA Rules](https://www.hhs.gov/hipaa)** - Healthcare privacy
- **[OpenAI BAA](https://openai.com/enterprise-privacy)** - Enterprise compliance

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
