import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import winston from "winston";
import path from "path";

// Configure audit logger
const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "neurolink-enterprise" },
  transports: [
    new winston.transports.File({
      filename: process.env.AUDIT_LOG_PATH || "./logs/audit.log",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30, // Keep 30 days
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

type AuditEntry = {
  timestamp: string;
  requestId: string;
  userId: string | null;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
};

export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${randomUUID()}`;

  // Attach audit context to request
  (req as any).audit = {
    requestId,
    log: (action: string, metadata?: Record<string, any>) => {
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        userId: (req as any).userId || null,
        action,
        resource: req.path,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("user-agent") || "unknown",
        metadata,
      };

      auditLogger.info("audit_event", entry);
    },
  };

  // Log request
  (req as any).audit.log("request_received", {
    body: sanitizeBody(req.body),
    query: req.query,
  });

  // Capture response
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;

    (req as any).audit.log("request_completed", {
      statusCode: res.statusCode,
      duration,
      contentLength: res.get("content-length"),
    });

    return originalEnd(chunk, encoding, callback);
  };

  next();
}

// Sanitize sensitive data from request body
function sanitizeBody(body: any): any {
  if (!body) return body;

  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "authorization",
  ];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

// Compliance-specific audit functions
export const complianceAudit = {
  // HIPAA audit event
  logPHIAccess: (req: Request, dataType: string, patientId?: string) => {
    (req as any).audit.log("phi_access", {
      compliance: "HIPAA",
      dataType,
      patientId: patientId ? "[REDACTED]" : undefined,
      accessType: "read",
    });
  },

  // SOC2 audit event
  logDataChange: (
    req: Request,
    resourceType: string,
    changeType: string,
    resourceId: string,
  ) => {
    (req as any).audit.log("data_change", {
      compliance: "SOC2",
      resourceType,
      changeType,
      resourceId,
    });
  },

  // GDPR audit event
  logDataSubjectRequest: (
    req: Request,
    requestType: "access" | "deletion" | "portability",
    subjectId: string,
  ) => {
    (req as any).audit.log("data_subject_request", {
      compliance: "GDPR",
      requestType,
      subjectId: "[HASHED]",
    });
  },
};
