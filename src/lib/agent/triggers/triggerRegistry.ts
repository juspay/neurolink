/**
 * TriggerRegistry
 *
 * A registry for TriggerAdapter implementations.
 * Allows dynamic registration and creation of trigger types.
 */

import type { TriggerAdapter } from "./triggerAdapter.js";
import { TimerTrigger, type TimerTriggerConfig } from "./timerTrigger.js";

/**
 * Factory function type for creating trigger adapters.
 */
export type TriggerAdapterFactory = (config: unknown) => TriggerAdapter;

/**
 * Registry for trigger adapter implementations.
 *
 * This follows the Factory + Registry pattern used throughout NeuroLink.
 * Users can register custom trigger types and resolve them by name.
 */
export class TriggerRegistry {
  private static adapters = new Map<string, TriggerAdapterFactory>();
  private static initialized = false;

  /**
   * Initialize the registry with built-in adapters.
   * Called automatically on first use.
   */
  private static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Register built-in adapters
    this.adapters.set(
      "timer",
      (config) => new TimerTrigger(config as TimerTriggerConfig),
    );

    this.initialized = true;
  }

  /**
   * Register a new trigger type.
   *
   * @param type - Unique identifier for this trigger type
   * @param factory - Factory function that creates the trigger
   *
   * @example
   * ```typescript
   * TriggerRegistry.register("rabbitmq", (config) => new RabbitMQTrigger(config));
   * ```
   */
  static register(type: string, factory: TriggerAdapterFactory): void {
    this.adapters.set(type, factory);
  }

  /**
   * Create a trigger adapter by type.
   *
   * @param type - The trigger type to create
   * @param config - Configuration object passed to the factory
   * @returns The created TriggerAdapter
   * @throws Error if the trigger type is not registered
   *
   * @example
   * ```typescript
   * const trigger = TriggerRegistry.create("timer", { intervalMs: 5000 });
   * ```
   */
  static create(type: string, config: unknown): TriggerAdapter {
    this.initialize();

    const factory = this.adapters.get(type);
    if (!factory) {
      const available = [...this.adapters.keys()].join(", ");
      throw new Error(
        `Unknown trigger type: "${type}". Available types: ${available}`,
      );
    }

    return factory(config);
  }

  /**
   * List all available trigger types.
   *
   * @returns Array of registered trigger type names
   */
  static available(): string[] {
    this.initialize();
    return [...this.adapters.keys()];
  }

  /**
   * Check if a trigger type is registered.
   *
   * @param type - The trigger type to check
   * @returns true if the type is registered
   */
  static has(type: string): boolean {
    this.initialize();
    return this.adapters.has(type);
  }

  /**
   * Unregister a trigger type.
   *
   * @param type - The trigger type to unregister
   * @returns true if the type was removed
   */
  static unregister(type: string): boolean {
    return this.adapters.delete(type);
  }

  /**
   * Clear all registered trigger types.
   * Use with caution - this removes built-in adapters too.
   */
  static clear(): void {
    this.adapters.clear();
    this.initialized = false;
  }
}
