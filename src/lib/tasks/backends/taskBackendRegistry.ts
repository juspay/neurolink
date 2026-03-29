/**
 * TaskBackendRegistry — registration point for all task backend implementations.
 * Follows the same pattern as ProviderRegistry: dynamic imports, lazy registration.
 */

import { logger } from "../../utils/logger.js";
import { TaskError } from "../errors.js";
import type {
  TaskBackendName,
  TaskBackendFactoryFn,
  TaskManagerConfig,
  TaskBackend,
} from "../../types/taskTypes.js";

export class TaskBackendRegistry {
  private static factories = new Map<string, TaskBackendFactoryFn>();
  private static registered = false;

  /**
   * Register a backend factory function.
   * Can be called externally to add custom backends (e.g., "pg-boss").
   */
  static register(name: string, factory: TaskBackendFactoryFn): void {
    TaskBackendRegistry.factories.set(name, factory);
    logger.debug(`[TaskBackendRegistry] Registered backend: ${name}`);
  }

  /**
   * Register the built-in backends (BullMQ, NodeTimeout).
   * Idempotent — safe to call multiple times.
   */
  static registerDefaults(): void {
    if (TaskBackendRegistry.registered) {
      return;
    }
    TaskBackendRegistry.registered = true;

    // BullMQ backend (production, Redis-backed)
    TaskBackendRegistry.register(
      "bullmq",
      async (config: TaskManagerConfig) => {
        const { BullMQBackend } = await import("./bullmqBackend.js");
        return new BullMQBackend(config);
      },
    );

    // NodeTimeout backend (development, in-process timers)
    TaskBackendRegistry.register(
      "node-timeout",
      async (config: TaskManagerConfig) => {
        const { NodeTimeoutBackend } = await import("./nodeTimeoutBackend.js");
        return new NodeTimeoutBackend(config);
      },
    );

    logger.debug("[TaskBackendRegistry] Registered default backends");
  }

  /**
   * Create a backend instance by name.
   */
  static async create(
    name: TaskBackendName | string,
    config: TaskManagerConfig,
  ): Promise<TaskBackend> {
    TaskBackendRegistry.registerDefaults();

    const factory = TaskBackendRegistry.factories.get(name);
    if (!factory) {
      const available = Array.from(TaskBackendRegistry.factories.keys());
      throw TaskError.create(
        "BACKEND_UNKNOWN",
        `Unknown task backend: "${name}". Available: ${available.join(", ")}`,
      );
    }

    return factory(config);
  }

  /**
   * Check if a backend is registered.
   */
  static has(name: string): boolean {
    TaskBackendRegistry.registerDefaults();
    return TaskBackendRegistry.factories.has(name);
  }

  /**
   * List all registered backend names.
   */
  static getAvailable(): string[] {
    TaskBackendRegistry.registerDefaults();
    return Array.from(TaskBackendRegistry.factories.keys());
  }
}
