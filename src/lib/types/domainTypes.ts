/**
 * Domain Types for Factory Pattern Implementation
 * Provides type-safe domain configuration and factory pattern support
 */

import type { JsonObject } from "./common.js";

/**
 * Supported domain types for factory configuration
 */
export type DomainType =
  | "healthcare"
  | "finance"
  | "analytics"
  | "ecommerce"
  | "education"
  | "legal"
  | "technology"
  | "generic";

/**
 * Domain evaluation criteria interface
 */
export interface DomainEvaluationCriteria {
  accuracyWeight: number;
  completenessWeight: number;
  relevanceWeight: number;
  terminologyWeight: number;
  domainSpecificRules: string[];
  failurePatterns: string[];
  successPatterns: string[];
}

/**
 * Domain configuration interface
 */
export interface DomainConfig {
  domainType: DomainType;
  domainName: string;
  description: string;
  evaluationCriteria: DomainEvaluationCriteria;
  customData?: JsonObject;
  metadata?: {
    version: string;
    createdAt: number;
    updatedAt: number;
  };
}

/**
 * Domain template for factory registration
 */
export interface DomainTemplate {
  domainType: DomainType;
  template: Partial<DomainConfig>;
  isDefault?: boolean;
}

/**
 * Domain validation rule
 */
export interface DomainValidationRule {
  ruleName: string;
  ruleType: "required" | "pattern" | "range" | "custom";
  validation: (value: unknown) => boolean;
  errorMessage: string;
}

/**
 * Domain configuration options for factory
 */
export interface DomainConfigOptions {
  domainType: DomainType;
  customConfig?: Partial<DomainConfig>;
  validateDomainData?: boolean;
  includeDefaults?: boolean;
}
