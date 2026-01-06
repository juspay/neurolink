# Security Policy

## Supported Versions

We release security updates for the following versions of NeuroLink:

| Version | Supported          | Status              |
| ------- | ------------------ | ------------------- |
| 8.x     | :white_check_mark: | Active development  |
| 7.x     | :warning:          | Security fixes only |
| < 7.0   | :x:                | No longer supported |

## Reporting a Vulnerability

### DO NOT create public issues for security vulnerabilities

If you discover a security vulnerability in NeuroLink, please report it responsibly. We take all security reports seriously and will respond promptly.

### How to Report

**Email:** security@juspay.in

Please include the following information in your report:

1. **Description of the vulnerability**
   - Type of issue (e.g., authentication bypass, injection, etc.)
   - Location of the affected code (file path, line number if possible)

2. **Steps to reproduce**
   - Detailed steps to demonstrate the vulnerability
   - Proof of concept code (if applicable)

3. **Potential impact**
   - What can an attacker do with this vulnerability?
   - What data or systems are at risk?

4. **Suggested fix (optional)**
   - If you have ideas on how to fix the vulnerability

### Response Timeline

We are committed to responding to security reports in a timely manner:

- **Initial acknowledgment:** Within 24 hours
- **Initial assessment:** Within 72 hours
- **Fix timeline:** Based on severity (see below)
- **Public disclosure:** After fix is released and users have had time to update

### Severity Levels and Fix Timeline

| Severity | Description                            | Fix Timeline       |
| -------- | -------------------------------------- | ------------------ |
| Critical | Affects all users, active exploitation | 1-7 days           |
| High     | Affects most users, easy to exploit    | 7-14 days          |
| Medium   | Limited impact or difficult to exploit | 14-30 days         |
| Low      | Minimal impact                         | Next release cycle |

## Security Best Practices for Users

When using NeuroLink in production, follow these security best practices:

### API Key Management

- **Never commit API keys** to version control
- Use environment variables for all sensitive credentials
- Rotate API keys regularly
- Use separate keys for development and production
- Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)

### Human-in-the-Loop (HITL) Security

NeuroLink includes a production-ready HITL system for high-stakes operations:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "drop", "truncate", "execute"],
    timeout: 30000, // 30 seconds for user confirmation
    autoApproveOnTimeout: false, // Reject on timeout for safety
    allowArgumentModification: true, // Allow users to modify tool arguments
    auditLogging: true, // Enable audit logs for compliance
  },
});

// Listen for confirmation requests using events
const emitter = neurolink.getEventEmitter();
emitter.on("hitl:confirmation-request", async (event) => {
  const { confirmationId, toolName, arguments: args } = event.payload;

  // Integrate with your approval system
  const approved = await yourApprovalSystem.requestReview({
    tool: toolName,
    arguments: args,
  });

  // Respond with confirmation
  emitter.emit("hitl:confirmation-response", {
    type: "hitl:confirmation-response",
    payload: {
      confirmationId,
      approved,
      metadata: { timestamp: new Date().toISOString() },
    },
  });
});
```

**Use HITL for:**

- Financial transactions
- Data modifications
- Code execution
- Email/notification sending
- Database operations in production

### Redis Security

If using Redis for conversation memory:

- **Enable authentication:** Always set a strong Redis password
- **Use TLS:** Enable TLS/SSL for production Redis connections
- **Network isolation:** Keep Redis on a private network
- **Regular updates:** Keep Redis version up to date

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redis: {
      host: "redis.example.com",
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      tls: true, // Always enable for production
    },
  },
});
```

### Middleware Security

When implementing custom middleware:

- **Validate all inputs:** Never trust user input
- **Sanitize outputs:** Clean data before logging or displaying
- **Rate limiting:** Implement rate limits to prevent abuse
- **Error handling:** Don't leak sensitive information in error messages

### Provider Security

- **Use least privilege:** Grant minimum necessary permissions to provider API keys
- **Monitor usage:** Track API usage for anomalies
- **Budget limits:** Set spending limits on provider accounts
- **Audit logs:** Enable audit logging for all provider interactions

## Security Features in NeuroLink

NeuroLink includes enterprise-grade security features:

### Audit Trail

Full audit logging for compliance (HIPAA, SOC2, GDPR):

```typescript
const neurolink = new NeuroLink({
  enableAnalytics: true, // Captures full request/response data
  hitl: {
    enabled: true,
    auditLogging: true, // Logs all approval decisions
  },
});
```

### Guardrails Middleware

Built-in content filtering and safety using the MiddlewareFactory:

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

// Create middleware factory with guardrails configuration
const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: {
          enabled: true,
          list: ["harmful", "dangerous", "unsafe"],
        },
        modelFilter: {
          enabled: true,
        },
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          evaluationModel: "gpt-4",
          thresholds: {
            safetyScore: 7,
            appropriatenessScore: 6,
          },
        },
      },
    },
  },
});

// Use in your NeuroLink instance
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  middleware: factory,
});
```

## Previous Security Advisories

We maintain a list of all security advisories:

- [GitHub Security Advisories](https://github.com/juspay/neurolink/security/advisories)

No security advisories have been published as of this document's creation.

## Security Updates

Subscribe to security updates:

- Watch the [NeuroLink repository](https://github.com/juspay/neurolink) for security announcements
- Follow [@juspay](https://twitter.com/juspay) on Twitter
- Subscribe to release notifications

## Bug Bounty Program

At this time, we do not have a formal bug bounty program. However, we greatly appreciate security researchers who report vulnerabilities responsibly and will acknowledge their contributions in our release notes (with permission).

## Contact

For general security questions or concerns:

- Email: security@juspay.in
- For non-security issues: [Create a GitHub issue](https://github.com/juspay/neurolink/issues)

## Attribution

Thank you to all security researchers who have helped make NeuroLink more secure.
