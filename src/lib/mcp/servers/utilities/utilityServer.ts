/**
 * NeuroLink Utility Server
 * Provides general utility tools following standard patterns
 */

import { z } from "zod";
import type { Unknown } from "../../../types/common.js";
import { createMCPServer } from "../../factory.js";
import type { NeuroLinkExecutionContext, ToolResult } from "../../factory.js";
import { logger } from "../../../utils/logger.js";

/**
 * Utility Server - General utility tools
 */
export const utilityServer = createMCPServer({
  id: "neurolink-utility",
  title: "NeuroLink Utility Server",
  description: "Provides general utility tools for common operations",
  category: "integrations",
  version: "1.0.0",
});

/**
 * Get Current Time Input Schema
 */
const GetCurrentTimeSchema = z.object({
  format: z
    .enum(["ISO", "UTC", "local"])
    .default("local")
    .optional()
    .describe("Output format. If 'local', uses the specified timezone."),
  timezone: z
    .string()
    .default("Asia/Kolkata")
    .optional()
    .describe("Timezone for 'local' format (e.g., Asia/Kolkata, UTC)."),
});

/**
 * Register Get Current Time Tool
 */
utilityServer.registerTool({
  name: "get-current-time",
  description:
    "Get the current time in the specified timezone. Defaults to Indian Standard Time (IST/Asia/Kolkata).",
  category: "time",
  inputSchema: GetCurrentTimeSchema,
  isImplemented: true,
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedInput = GetCurrentTimeSchema.parse(params);
      const { format, timezone } = validatedInput;

      logger.debug(
        `[Utility] Getting current time with format: ${format}, timezone: ${timezone}`,
      );

      const now = new Date();
      const resultData: Record<string, string | number | undefined> = {
        isoTime: now.toISOString(),
        utcTime: now.toUTCString(),
        timestamp: now.getTime(),
        requestedFormat: format,
        requestedTimezone: timezone,
      };

      let effectiveTimezone = timezone;

      if (format === "local") {
        try {
          resultData.localTime = now.toLocaleString("en-US", {
            timeZone: timezone,
          });
          resultData.actualTimezone = timezone;
        } catch (tzError) {
          const fallbackTimezone = "Asia/Kolkata";
          logger.warn(
            `[Utility] Invalid timezone '${timezone}', falling back to ${fallbackTimezone}`,
          );
          resultData.localTime = now.toLocaleString("en-US", {
            timeZone: fallbackTimezone,
          });
          resultData.actualTimezone = fallbackTimezone;
          resultData.timezoneError = `Invalid timezone: ${timezone}. Fell back to ${fallbackTimezone}.`;
          effectiveTimezone = fallbackTimezone;
        }
      }

      // Add human-readable display string
      const displayDateString = now.toLocaleString("en-US", {
        timeZone: effectiveTimezone,
      });
      resultData.displayString = `The current time is ${displayDateString} in ${effectiveTimezone}`;

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[Utility] Time retrieved successfully in ${executionTime}ms`,
      );

      return {
        success: true,
        data: resultData,
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "get-current-time",
          serverId: "neurolink-utility",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[Utility] Get current time failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "get-current-time",
          serverId: "neurolink-utility",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Calculate Date Difference Schema
 */
const CalculateDateDifferenceSchema = z.object({
  date1: z.string().describe("First date in ISO format or parseable string"),
  date2: z.string().describe("Second date in ISO format or parseable string"),
  unit: z
    .enum(["seconds", "minutes", "hours", "days", "weeks", "months", "years"])
    .default("days")
    .optional()
    .describe("Unit for the difference calculation"),
});

/**
 * Register Calculate Date Difference Tool
 */
utilityServer.registerTool({
  name: "calculate-date-difference",
  description: "Calculate the difference between two dates in various units",
  category: "time",
  inputSchema: CalculateDateDifferenceSchema,
  isImplemented: true,
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedInput = CalculateDateDifferenceSchema.parse(params);
      const { date1, date2, unit } = validatedInput;

      logger.debug(
        `[Utility] Calculating date difference between ${date1} and ${date2} in ${unit}`,
      );

      const d1 = new Date(date1);
      const d2 = new Date(date2);

      if (isNaN(d1.getTime())) {
        throw new Error(`Invalid date format for date1: ${date1}`);
      }
      if (isNaN(d2.getTime())) {
        throw new Error(`Invalid date format for date2: ${date2}`);
      }

      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      let difference: number;

      switch (unit) {
        case "seconds":
          difference = diffMs / 1000;
          break;
        case "minutes":
          difference = diffMs / (1000 * 60);
          break;
        case "hours":
          difference = diffMs / (1000 * 60 * 60);
          break;
        case "days":
          difference = diffMs / (1000 * 60 * 60 * 24);
          break;
        case "weeks":
          difference = diffMs / (1000 * 60 * 60 * 24 * 7);
          break;
        case "months":
          difference = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average month
          break;
        case "years":
          difference = diffMs / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
          break;
        default:
          difference = diffMs / (1000 * 60 * 60 * 24); // Default to days
      }

      const resultData = {
        date1: d1.toISOString(),
        date2: d2.toISOString(),
        difference: Math.round(difference * 100) / 100, // Round to 2 decimal places
        unit,
        milliseconds: diffMs,
        displayString: `The difference between ${d1.toLocaleDateString()} and ${d2.toLocaleDateString()} is ${Math.round(difference * 100) / 100} ${unit}`,
      };

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[Utility] Date difference calculated successfully in ${executionTime}ms`,
      );

      return {
        success: true,
        data: resultData,
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "calculate-date-difference",
          serverId: "neurolink-utility",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        `[Utility] Calculate date difference failed: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "calculate-date-difference",
          serverId: "neurolink-utility",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Format Number Schema
 */
const FormatNumberSchema = z.object({
  number: z.number().describe("Number to format"),
  style: z
    .enum(["decimal", "currency", "percent"])
    .default("decimal")
    .optional()
    .describe("Formatting style"),
  currency: z
    .string()
    .default("USD")
    .optional()
    .describe("Currency code when style is 'currency'"),
  locale: z
    .string()
    .default("en-US")
    .optional()
    .describe("Locale for formatting"),
  minimumFractionDigits: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe("Minimum number of decimal places"),
  maximumFractionDigits: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe("Maximum number of decimal places"),
});

/**
 * Register Format Number Tool
 */
utilityServer.registerTool({
  name: "format-number",
  description:
    "Format numbers in various styles (decimal, currency, percent, scientific)",
  category: "formatting",
  inputSchema: FormatNumberSchema,
  isImplemented: true,
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedInput = FormatNumberSchema.parse(params);
      const {
        number,
        style,
        currency,
        locale,
        minimumFractionDigits,
        maximumFractionDigits,
      } = validatedInput;

      logger.debug(
        `[Utility] Formatting number ${number} with style: ${style}, locale: ${locale}`,
      );

      const options: Intl.NumberFormatOptions = {
        style,
      };

      if (style === "currency") {
        options.currency = currency;
      }

      if (minimumFractionDigits !== undefined) {
        options.minimumFractionDigits = minimumFractionDigits;
      }

      if (maximumFractionDigits !== undefined) {
        options.maximumFractionDigits = maximumFractionDigits;
      }

      const formatter = new Intl.NumberFormat(locale, options);
      const formatted = formatter.format(number);

      const resultData = {
        original: number,
        formatted,
        style,
        locale,
        currency: style === "currency" ? currency : undefined,
        displayString: `${number} formatted as ${formatted}`,
      };

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[Utility] Number formatted successfully in ${executionTime}ms`,
      );

      return {
        success: true,
        data: resultData,
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "format-number",
          serverId: "neurolink-utility",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[Utility] Format number failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "format-number",
          serverId: "neurolink-utility",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

// Log successful server creation
logger.debug(
  "[Utility] NeuroLink Utility Server v1.0.0 created with 3 tools:",
  Object.keys(utilityServer.tools),
);
