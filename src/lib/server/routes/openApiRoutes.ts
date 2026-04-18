/**
 * OpenAPI Routes
 * Endpoints for OpenAPI specification and documentation
 */

import { logger } from "../../utils/logger.js";
import { OpenAPIGenerator } from "../openapi/generator.js";
import type { RouteDefinition, RouteGroup } from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";

/**
 * Create OpenAPI documentation routes
 *
 * Generates three endpoints for API documentation:
 * - GET /api/openapi.json - OpenAPI 3.1 specification in JSON format
 * - GET /api/openapi.yaml - OpenAPI 3.1 specification in YAML format
 * - GET /api/docs - Interactive Swagger UI documentation
 *
 * IMPORTANT: The `getRoutes` callback is required to document your custom routes.
 * If not provided, the OpenAPI spec will only include default endpoint definitions.
 *
 * @param basePath - Base path for API routes (default: "/api")
 * @param getRoutes - Callback to get registered routes for the OpenAPI spec.
 *                    This callback is invoked at request time, so routes registered
 *                    after creating the OpenAPI route group will be included.
 *                    If not provided, the generator will use default endpoint definitions.
 * @returns RouteGroup containing OpenAPI documentation endpoints
 *
 * @example
 * ```typescript
 * // RECOMMENDED: Use registerAllRoutes which automatically binds getRoutes
 * registerAllRoutes(server, "/api", { enableSwagger: true });
 *
 * // Or manually provide the routes callback
 * const openApiRoutes = createOpenApiRoutes("/api", () => server.listRoutes());
 * server.registerRouteGroup(openApiRoutes);
 * ```
 */
export function createOpenApiRoutes(
  basePath: string = "/api",
  getRoutes?: () => RouteDefinition[],
): RouteGroup {
  // Log a warning if getRoutes is not provided at creation time
  if (!getRoutes) {
    logger.debug(
      "[OpenAPI] createOpenApiRoutes called without getRoutes callback. " +
        "Custom routes will not be documented in the OpenAPI spec.",
    );
  }

  return {
    prefix: `${basePath}/openapi`,
    routes: [
      {
        method: "GET",
        path: `${basePath}/openapi.json`,
        handler: async () =>
          withSpan(
            {
              name: "neurolink.http.openapi.json",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/openapi.json`,
                "openapi.format": "json",
              },
            },
            async (span) => {
              const routes = getRoutes?.() ?? [];

              if (!getRoutes) {
                logger.warn(
                  "[OpenAPI] No getRoutes callback provided. OpenAPI spec will use default endpoint definitions. " +
                    "Use registerAllRoutes(server, basePath, { enableSwagger: true }) to automatically include your routes.",
                );
              } else if (routes.length === 0) {
                logger.debug(
                  "[OpenAPI] getRoutes returned empty array. No custom routes will be documented.",
                );
              }

              span.setAttribute("openapi.route_count", routes.length);

              const generator = new OpenAPIGenerator({
                basePath,
                routes,
              });
              return generator.generate();
            },
          ),
        description: "Get OpenAPI specification as JSON",
        tags: ["openapi", "documentation"],
      },
      {
        method: "GET",
        path: `${basePath}/openapi.yaml`,
        handler: async () =>
          withSpan(
            {
              name: "neurolink.http.openapi.yaml",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/openapi.yaml`,
                "openapi.format": "yaml",
              },
            },
            async (span) => {
              const routes = getRoutes?.() ?? [];

              if (!getRoutes) {
                logger.warn(
                  "[OpenAPI] No getRoutes callback provided. OpenAPI spec will use default endpoint definitions. " +
                    "Use registerAllRoutes(server, basePath, { enableSwagger: true }) to automatically include your routes.",
                );
              } else if (routes.length === 0) {
                logger.debug(
                  "[OpenAPI] getRoutes returned empty array. No custom routes will be documented.",
                );
              }

              span.setAttribute("openapi.route_count", routes.length);

              const generator = new OpenAPIGenerator({
                basePath,
                routes,
              });
              return {
                _raw: true,
                contentType: "text/yaml",
                body: generator.toYAML(),
              };
            },
          ),
        description: "Get OpenAPI specification as YAML",
        tags: ["openapi", "documentation"],
      },
      {
        method: "GET",
        path: `${basePath}/docs`,
        handler: async () =>
          withSpan(
            {
              name: "neurolink.http.openapi.docs",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/docs`,
              },
            },
            async () => {
              const html = `<!DOCTYPE html>
<html>
<head>
  <title>NeuroLink API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "${basePath}/openapi.json",
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;
              return {
                _raw: true,
                contentType: "text/html",
                body: html,
              };
            },
          ),
        description: "Swagger UI documentation page",
        tags: ["openapi", "documentation"],
      },
    ],
  };
}
