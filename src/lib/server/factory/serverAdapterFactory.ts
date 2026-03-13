/**
 * Server Adapter Factory
 * Creates server adapters based on framework configuration
 * Follows NeuroLink's factory pattern for consistent instantiation
 */

import type { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import type { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type {
  ServerAdapterConfig,
  ServerAdapterFactoryOptions,
  ServerFramework,
} from "../types.js";

/**
 * Factory for creating server adapters
 * Supports multiple web frameworks with consistent API
 */
export class ServerAdapterFactory {
  private static adapters: Map<
    ServerFramework,
    new (
      neurolink: NeuroLink,
      config?: ServerAdapterConfig,
    ) => BaseServerAdapter
  > = new Map();

  /**
   * Register an adapter class for a framework
   */
  static registerAdapter(
    framework: ServerFramework,
    adapterClass: new (
      neurolink: NeuroLink,
      config?: ServerAdapterConfig,
    ) => BaseServerAdapter,
  ): void {
    ServerAdapterFactory.adapters.set(framework, adapterClass);
    logger.debug(
      `[ServerAdapterFactory] Registered adapter for framework: ${framework}`,
    );
  }

  /**
   * Create a server adapter for the specified framework
   * Uses dynamic imports to avoid bundling unused frameworks
   */
  static async create(
    options: ServerAdapterFactoryOptions,
  ): Promise<BaseServerAdapter> {
    const { framework, neurolink, config } = options;

    logger.info(
      `[ServerAdapterFactory] Creating adapter for framework: ${framework}`,
    );

    // Check if adapter is already registered
    const AdapterClass = ServerAdapterFactory.adapters.get(framework);
    if (AdapterClass) {
      return new AdapterClass(neurolink, config);
    }

    // Dynamically import the adapter based on framework
    switch (framework) {
      case "hono": {
        const { HonoServerAdapter } =
          await import("../adapters/honoAdapter.js");
        ServerAdapterFactory.adapters.set("hono", HonoServerAdapter);
        return new HonoServerAdapter(neurolink, config);
      }

      case "express": {
        const { ExpressServerAdapter } =
          await import("../adapters/expressAdapter.js");
        ServerAdapterFactory.adapters.set("express", ExpressServerAdapter);
        return new ExpressServerAdapter(neurolink, config);
      }

      case "fastify": {
        const { FastifyServerAdapter } =
          await import("../adapters/fastifyAdapter.js");
        ServerAdapterFactory.adapters.set("fastify", FastifyServerAdapter);
        return new FastifyServerAdapter(neurolink, config);
      }

      case "koa": {
        const { KoaServerAdapter } = await import("../adapters/koaAdapter.js");
        ServerAdapterFactory.adapters.set("koa", KoaServerAdapter);
        return new KoaServerAdapter(neurolink, config);
      }

      default:
        throw new Error(
          `Unknown framework: ${framework}. Supported frameworks: hono (recommended), express, fastify, koa`,
        );
    }
  }

  /**
   * Create a Hono server adapter (convenience method)
   * Hono is the recommended framework for its multi-runtime support
   */
  static async createHono(
    neurolink: NeuroLink,
    config?: ServerAdapterConfig,
  ): Promise<BaseServerAdapter> {
    return ServerAdapterFactory.create({
      framework: "hono",
      neurolink,
      config,
    });
  }

  /**
   * Create an Express server adapter (convenience method)
   */
  static async createExpress(
    neurolink: NeuroLink,
    config?: ServerAdapterConfig,
  ): Promise<BaseServerAdapter> {
    return ServerAdapterFactory.create({
      framework: "express",
      neurolink,
      config,
    });
  }

  /**
   * Create a Fastify server adapter (convenience method)
   * Fastify is known for high performance and low overhead
   */
  static async createFastify(
    neurolink: NeuroLink,
    config?: ServerAdapterConfig,
  ): Promise<BaseServerAdapter> {
    return ServerAdapterFactory.create({
      framework: "fastify",
      neurolink,
      config,
    });
  }

  /**
   * Create a Koa server adapter (convenience method)
   * Koa provides elegant middleware composition
   */
  static async createKoa(
    neurolink: NeuroLink,
    config?: ServerAdapterConfig,
  ): Promise<BaseServerAdapter> {
    return ServerAdapterFactory.create({
      framework: "koa",
      neurolink,
      config,
    });
  }

  /**
   * Check if a framework is supported
   */
  static isSupported(framework: string): framework is ServerFramework {
    return ["hono", "express", "fastify", "koa"].includes(framework);
  }

  /**
   * Get list of supported frameworks
   */
  static getSupportedFrameworks(): {
    framework: ServerFramework;
    status: "available";
    description: string;
  }[] {
    return [
      {
        framework: "hono",
        status: "available",
        description: "Multi-runtime support (Node.js, Bun, Deno, Edge)",
      },
      {
        framework: "express",
        status: "available",
        description:
          "Popular Node.js framework with extensive middleware ecosystem",
      },
      {
        framework: "fastify",
        status: "available",
        description: "High-performance framework with schema validation",
      },
      {
        framework: "koa",
        status: "available",
        description: "Elegant middleware composition with async/await",
      },
    ];
  }

  /**
   * Get recommended framework based on runtime
   */
  static getRecommendedFramework(): ServerFramework {
    // Hono is recommended because it supports multiple runtimes
    // (Node.js, Bun, Deno, Cloudflare Workers, etc.)
    return "hono";
  }
}

/**
 * Quick helper to create a server from NeuroLink instance
 * @example
 * ```typescript
 * const neurolink = new NeuroLink({ ... });
 * const server = await createServer(neurolink);
 * await server.initialize();
 * await server.start();
 * ```
 */
export async function createServer(
  neurolink: NeuroLink,
  options?: {
    framework?: ServerFramework;
    config?: ServerAdapterConfig;
  },
): Promise<BaseServerAdapter> {
  const framework =
    options?.framework ?? ServerAdapterFactory.getRecommendedFramework();
  return ServerAdapterFactory.create({
    framework,
    neurolink,
    config: options?.config,
  });
}
