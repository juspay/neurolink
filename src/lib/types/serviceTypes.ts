/**
 * Service-related type definitions for NeuroLink
 * Service registry, dependency injection, and service management types
 */

import type { UnknownRecord } from "./common.js";

/**
 * Service factory function type
 */
export type ServiceFactory<T = unknown> = () => T | Promise<T>;

/**
 * Service registration configuration
 */
export type ServiceRegistration<T = unknown> = {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
};

/**
 * Service definition with metadata and status
 */
export type ServiceDefinition<T = UnknownRecord> = {
  name: string;
  version: string;
  instance: T;
  metadata: ServiceMetadata;
  status: ServiceStatus;
};

/**
 * Service metadata for describing service capabilities
 */
export type ServiceMetadata = {
  description: string;
  tags: string[];
  dependencies: string[];
  capabilities: string[];
};

/**
 * Service status enumeration
 */
export type ServiceStatus = "active" | "inactive" | "error" | "initializing";

/**
 * Service health information
 */
export type ServiceHealth = {
  status: ServiceStatus;
  lastChecked: Date;
  uptime: number;
  errorCount: number;
  dependencies: ServiceDependencyHealth[];
};

/**
 * Service dependency health status
 */
export type ServiceDependencyHealth = {
  name: string;
  status: ServiceStatus;
  lastChecked: Date;
  responseTime?: number;
};

/**
 * Service configuration options
 */
export type ServiceConfigOptions = {
  singleton?: boolean;
  lazy?: boolean;
  timeout?: number;
  retries?: number;
  dependencies?: string[];
};

/**
 * Service registry statistics
 */
export type ServiceRegistryStats = {
  totalServices: number;
  activeServices: number;
  failedServices: number;
  initializingServices: number;
  circularDependencies: string[][];
};
