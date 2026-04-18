/**
 * Route Deprecation Middleware
 * Adds RFC 8594 deprecation headers to responses for deprecated routes
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8594 - The 'Deprecation' HTTP Header Field
 */

import type {
  DeprecatedRouteInfo,
  DeprecationConfig,
  MiddlewareDefinition,
  RouteDefinition,
} from "../../types/index.js";

/**
 * Build a lookup map of deprecated routes
 * Key format: "METHOD:path" (e.g., "GET:/api/v1/users")
 */
function buildDeprecatedRoutesMap(
  routes: RouteDefinition[],
): Map<string, DeprecatedRouteInfo> {
  const map = new Map<string, DeprecatedRouteInfo>();

  for (const route of routes) {
    if (route.deprecated?.enabled) {
      const key = `${route.method}:${route.path}`;
      map.set(key, {
        method: route.method,
        path: route.path,
        deprecation: route.deprecated,
      });
    }
  }

  return map;
}

/**
 * Normalize a path with parameters to match against route patterns
 * Converts "/users/123" to match "/users/:id" pattern
 */
function normalizePathForMatching(
  actualPath: string,
  routePatterns: string[],
): string | null {
  // Try exact match first
  if (routePatterns.includes(actualPath)) {
    return actualPath;
  }

  // Try pattern matching for parameterized routes
  for (const pattern of routePatterns) {
    if (matchesRoutePattern(actualPath, pattern)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Check if an actual path matches a route pattern with parameters
 */
function matchesRoutePattern(actualPath: string, pattern: string): boolean {
  const patternParts = pattern.split("/");
  const actualParts = actualPath.split("/");

  if (patternParts.length !== actualParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const actualPart = actualParts[i];

    // Parameter parts start with ":"
    if (patternPart.startsWith(":")) {
      continue; // Parameter matches any value
    }

    if (patternPart !== actualPart) {
      return false;
    }
  }

  return true;
}

/**
 * Format a date for the Deprecation header (RFC 7231 HTTP-date format)
 * Example: "Sun, 06 Nov 1994 08:49:37 GMT"
 */
function formatHttpDate(date: Date): string {
  return date.toUTCString();
}

/**
 * Parse a version string to estimate a sunset date
 * This is a simple heuristic - in production you'd want actual dates
 */
function estimateSunsetDate(removeIn?: string): Date | null {
  if (!removeIn) {
    return null;
  }

  // Default to 6 months from now if version specified
  const sunsetDate = new Date();
  sunsetDate.setMonth(sunsetDate.getMonth() + 6);
  return sunsetDate;
}

/**
 * Create deprecation middleware
 *
 * This middleware adds RFC 8594 compliant deprecation headers to responses
 * for routes marked as deprecated:
 *
 * - `Deprecation`: RFC 8594 header indicating the route is deprecated
 * - `Sunset`: RFC 8594 header indicating when the route will be removed
 * - `Link`: Header pointing to the alternative route (rel="successor-version")
 * - `X-Deprecation-Notice`: Custom header with a human-readable message
 *
 * @example
 * ```typescript
 * const routes: RouteDefinition[] = [
 *   {
 *     method: "GET",
 *     path: "/api/v1/users",
 *     handler: handleUsers,
 *     deprecated: {
 *       enabled: true,
 *       since: "2.0.0",
 *       removeIn: "3.0.0",
 *       alternative: "/api/v2/users",
 *       message: "Use /api/v2/users instead",
 *     },
 *   },
 * ];
 *
 * const deprecationMiddleware = createDeprecationMiddleware({ routes });
 * server.registerMiddleware(deprecationMiddleware);
 * ```
 */
export function createDeprecationMiddleware(
  config: DeprecationConfig,
): MiddlewareDefinition {
  const {
    routes,
    noticeHeader = "X-Deprecation-Notice",
    includeLink = true,
  } = config;

  // Build lookup map of deprecated routes
  const deprecatedRoutes = buildDeprecatedRoutesMap(routes);

  // Extract route patterns for matching (key format is "METHOD:path")
  // We need to handle paths that may contain ":" for parameters
  const routePatterns = Array.from(deprecatedRoutes.keys()).map((key) => {
    const colonIndex = key.indexOf(":");
    return key.slice(colonIndex + 1);
  });

  return {
    name: "deprecation",
    order: 100, // Run late, after route handling
    handler: async (ctx, next) => {
      // Execute the route handler first
      const result = await next();

      // Check if current route is deprecated
      const matchedPattern = normalizePathForMatching(ctx.path, routePatterns);
      if (!matchedPattern) {
        return result;
      }

      const routeKey = `${ctx.method}:${matchedPattern}`;
      const deprecatedRoute = deprecatedRoutes.get(routeKey);

      if (!deprecatedRoute) {
        return result;
      }

      const { deprecation } = deprecatedRoute;

      // Initialize response headers if not present
      ctx.responseHeaders = ctx.responseHeaders || {};

      // Add RFC 8594 Deprecation header
      // Value is either "true" or an HTTP-date when deprecated
      if (deprecation.since) {
        // Use a date representation if we have version info
        ctx.responseHeaders["Deprecation"] = "true";
      } else {
        ctx.responseHeaders["Deprecation"] = "true";
      }

      // Add Sunset header if removeIn is specified
      if (deprecation.removeIn) {
        const sunsetDate = estimateSunsetDate(deprecation.removeIn);
        if (sunsetDate) {
          ctx.responseHeaders["Sunset"] = formatHttpDate(sunsetDate);
        }
      }

      // Add Link header for alternative route
      if (includeLink && deprecation.alternative) {
        // RFC 8594 recommends rel="successor-version" for replacement resources
        ctx.responseHeaders["Link"] =
          `<${deprecation.alternative}>; rel="successor-version"`;
      }

      // Add custom deprecation notice header
      let notice = "This endpoint is deprecated";
      if (deprecation.since) {
        notice += ` since version ${deprecation.since}`;
      }
      if (deprecation.removeIn) {
        notice += ` and will be removed in version ${deprecation.removeIn}`;
      }
      if (deprecation.message) {
        notice = deprecation.message;
      }
      ctx.responseHeaders[noticeHeader] = notice;

      // Store deprecation info in metadata for logging/telemetry
      ctx.metadata.deprecation = {
        route: matchedPattern,
        method: ctx.method,
        since: deprecation.since,
        removeIn: deprecation.removeIn,
        alternative: deprecation.alternative,
      };

      return result;
    },
  };
}
