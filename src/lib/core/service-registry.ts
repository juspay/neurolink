/**
 * Service Registry for Dependency Injection
 * Breaks circular dependencies by providing lazy loading and centralized service management
 */

import { logger } from "../utils/logger.js";

export interface ServiceFactory<T = any> {
  (): T | Promise<T>;
}

export interface ServiceRegistration {
  factory: ServiceFactory;
  singleton: boolean;
  instance?: any;
}

export class ServiceRegistry {
  private static services = new Map<string, ServiceRegistration>();
  private static initializing = new Set<string>();

  /**
   * Register a service with optional singleton behavior
   */
  static register<T>(
    name: string,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {},
  ): void {
    if (this.services.has(name)) {
      logger.warn(`Service ${name} is already registered. Overwriting.`);
    }

    this.services.set(name, {
      factory,
      singleton: options.singleton ?? true,
      instance: undefined,
    });

    logger.debug(
      `Service registered: ${name} (singleton: ${options.singleton ?? true})`,
    );
  }

  /**
   * Get a service instance with circular dependency detection
   */
  static async get<T>(name: string): Promise<T> {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(
        `Service ${name} not registered. Available services: ${Array.from(this.services.keys()).join(", ")}`,
      );
    }

    // Check for circular dependency
    if (this.initializing.has(name)) {
      throw new Error(
        `Circular dependency detected: ${name} is already being initialized. Chain: ${Array.from(this.initializing).join(" -> ")} -> ${name}`,
      );
    }

    // Return existing singleton instance if available
    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance;
    }

    try {
      // Mark as initializing to detect circular dependencies
      this.initializing.add(name);
      logger.debug(`Initializing service: ${name}`);

      // Create new instance
      const instance = await registration.factory();

      // Store singleton instance
      if (registration.singleton) {
        registration.instance = instance;
      }

      logger.debug(`Service initialized: ${name}`);
      return instance as T;
    } catch (error) {
      logger.error(`Failed to initialize service ${name}:`, error);
      throw error;
    } finally {
      // Remove from initializing set
      this.initializing.delete(name);
    }
  }

  /**
   * Get a service synchronously (throws if async initialization required)
   */
  static getSync<T>(name: string): T {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(`Service ${name} not registered`);
    }

    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance;
    }

    // Try synchronous initialization
    const result = registration.factory();
    if (result instanceof Promise) {
      throw new Error(
        `Service ${name} requires asynchronous initialization. Use get() instead.`,
      );
    }

    if (registration.singleton) {
      registration.instance = result;
    }

    return result as T;
  }

  /**
   * Check if a service is registered
   */
  static has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  static clear(): void {
    this.services.clear();
    this.initializing.clear();
    logger.debug("Service registry cleared");
  }

  /**
   * Get all registered service names
   */
  static getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Register multiple services at once
   */
  static registerBatch(services: Record<string, ServiceFactory>): void {
    for (const [name, factory] of Object.entries(services)) {
      this.register(name, factory);
    }
  }
}

// Export singleton instance for convenience
export const serviceRegistry = ServiceRegistry;
