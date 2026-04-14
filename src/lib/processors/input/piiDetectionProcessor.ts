/**
 * PII Detection Processor
 *
 * Detects and optionally redacts personally identifiable information
 * from input data before sending to the LLM.
 *
 * @module piiDetectionProcessor
 */

import type { JsonObject } from "../../types/index.js";
import type {
  InputProcessor,
  InputProcessorData,
  PIIDetectionConfig,
  PIIType,
  ProcessorIssue,
  ProcessorResult,
} from "../../types/index.js";

/**
 * Built-in PII patterns for common data types
 */
const PII_PATTERNS: Record<PIIType, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  address:
    /\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct)\b/gi,
  name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  date_of_birth:
    /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  driver_license: /\b[A-Z]{1,2}\d{5,8}\b/g,
};

/**
 * Default PII types to detect
 */
const DEFAULT_PII_TYPES: PIIType[] = ["email", "phone", "ssn", "credit_card"];

/**
 * Detected PII instance
 */
type DetectedPII = {
  type: string;
  matches: string[];
  positions: Array<{ start: number; end: number }>;
};

/**
 * Detect PII in text using a regex pattern
 */
function detectPIIWithPattern(
  text: string,
  type: string,
  pattern: RegExp,
): DetectedPII | null {
  // Clone the regex to avoid issues with global flag
  const regex = new RegExp(pattern.source, pattern.flags);
  const matches: string[] = [];
  const positions: Array<{ start: number; end: number }> = [];

  let match = regex.exec(text);
  while (match !== null) {
    matches.push(match[0]);
    positions.push({ start: match.index, end: match.index + match[0].length });

    // Prevent infinite loop for zero-width matches
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
    match = regex.exec(text);
  }

  if (matches.length > 0) {
    return { type, matches, positions };
  }
  return null;
}

/**
 * Redact PII in text
 */
function redactPII(
  text: string,
  detected: DetectedPII[],
  redactionText: string,
): string {
  let result = text;

  // Sort positions in reverse order to maintain correct indices during replacement
  const allPositions = detected.flatMap((d) =>
    d.positions.map((p) => ({ ...p, type: d.type })),
  );
  allPositions.sort((a, b) => b.start - a.start);

  for (const pos of allPositions) {
    result = result.slice(0, pos.start) + redactionText + result.slice(pos.end);
  }

  return result;
}

/**
 * Create a PII Detection Processor
 *
 * @param defaultConfig - Default configuration
 * @returns InputProcessor instance
 *
 * @example
 * ```typescript
 * const piiProcessor = createPIIDetectionProcessor({
 *   detectTypes: ["email", "phone", "ssn"],
 *   action: "redact",
 *   redactionText: "[REDACTED]",
 * });
 *
 * const result = await piiProcessor.process(inputData);
 * ```
 */
export function createPIIDetectionProcessor(
  defaultConfig?: PIIDetectionConfig,
): InputProcessor<PIIDetectionConfig> {
  return {
    id: "pii-detection",
    name: "PII Detection",
    description:
      "Detects and optionally redacts personally identifiable information",
    priority: 85,

    async process(
      data: InputProcessorData,
      config?: PIIDetectionConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        detectTypes = DEFAULT_PII_TYPES,
        action = "warn",
        redactionText = "[REDACTED]",
        customPatterns = [],
        allowList = [],
      } = mergedConfig;

      const detectedPII: DetectedPII[] = [];
      let textToScan = data.text || "";

      // Also scan message content
      const messageTexts = data.messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n");
      textToScan = `${textToScan}\n${messageTexts}`.trim();

      if (!textToScan) {
        return {
          action: "continue",
          data,
          metadata: { piiDetected: false, piiScanned: true },
        };
      }

      // Detect standard PII types
      for (const piiType of detectTypes) {
        // Skip if in allow list
        if (allowList.some((item) => item.type === piiType)) {
          continue;
        }

        const pattern = PII_PATTERNS[piiType];
        if (pattern) {
          const detected = detectPIIWithPattern(textToScan, piiType, pattern);
          if (detected) {
            detectedPII.push(detected);
          }
        }
      }

      // Detect custom patterns
      for (const custom of customPatterns) {
        const detected = detectPIIWithPattern(
          textToScan,
          custom.name,
          custom.pattern,
        );
        if (detected) {
          detectedPII.push(detected);
        }
      }

      // No PII found
      if (detectedPII.length === 0) {
        return {
          action: "continue",
          data,
          metadata: { piiDetected: false, piiScanned: true },
        };
      }

      // Build issues list
      const issues: ProcessorIssue[] = detectedPII.map((pii) => ({
        category: "pii_detection",
        severity: action === "abort" ? "critical" : "warning",
        message: `Detected ${pii.type}: ${pii.matches.length} occurrence(s)`,
        context: {
          type: pii.type,
          count: pii.matches.length,
          // Don't include actual matches in context for security
        } as JsonObject,
      }));

      // Handle based on action
      if (action === "abort") {
        return {
          action: "abort",
          feedback: `PII detected in input: ${detectedPII.map((p) => `${p.type} (${p.matches.length})`).join(", ")}. Request blocked for security.`,
          issues,
          metadata: {
            piiDetected: true,
            piiTypes: detectedPII.map((p) => p.type),
          },
        };
      }

      // For redact action, modify the data
      if (action === "redact") {
        let redactedText = data.text;
        if (redactedText) {
          redactedText = redactPII(redactedText, detectedPII, redactionText);
        }

        // Also redact in messages
        const redactedMessages = data.messages.map((message) => {
          if (message.role === "user") {
            return {
              ...message,
              content: redactPII(message.content, detectedPII, redactionText),
            };
          }
          return message;
        });

        return {
          action: "continue",
          data: {
            ...data,
            text: redactedText,
            messages: redactedMessages,
          },
          issues,
          metadata: {
            piiDetected: true,
            piiRedacted: true,
            piiTypes: detectedPII.map((p) => p.type),
            redactionCount: detectedPII.reduce(
              (acc, p) => acc + p.matches.length,
              0,
            ),
          },
        };
      }

      // For warn action, continue with original data
      return {
        action: "continue",
        data,
        issues,
        metadata: {
          piiDetected: true,
          piiTypes: detectedPII.map((p) => p.type),
          piiWarned: true,
        },
      };
    },

    validateConfig(config: PIIDetectionConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (
        config.action &&
        !["abort", "redact", "warn"].includes(config.action)
      ) {
        errors.push(
          `Invalid action: ${config.action}. Must be 'abort', 'redact', or 'warn'`,
        );
      }

      if (config.detectTypes) {
        const validTypes = Object.keys(PII_PATTERNS);
        for (const type of config.detectTypes) {
          if (!validTypes.includes(type)) {
            errors.push(
              `Invalid PII type: ${type}. Valid types: ${validTypes.join(", ")}`,
            );
          }
        }
      }

      if (config.customPatterns) {
        for (const pattern of config.customPatterns) {
          if (!pattern.name || !pattern.pattern) {
            errors.push(
              "Custom patterns must have 'name' and 'pattern' properties",
            );
          }
        }
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Pre-configured PII processor with default settings
 */
export const piiDetectionProcessor = createPIIDetectionProcessor();
