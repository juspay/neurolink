import { logger } from "../../utils/logger.js";

export type FactoryFunction<TInstance, TConfig> = (
  config?: TConfig,
) => Promise<TInstance>;

export type FactoryRegistration<TInstance, TConfig> = {
  factory: FactoryFunction<TInstance, TConfig>;
  aliases: string[];
  metadata?: Record<string, unknown>;
};

export abstract class BaseFactory<TInstance, TConfig = unknown> {
  protected items = new Map<string, FactoryRegistration<TInstance, TConfig>>();
  protected aliasMap = new Map<string, string>();
  protected initialized = false;
  protected initPromise: Promise<void> | null = null;

  protected abstract registerAll(): Promise<void>;

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.registerAll();
    await this.initPromise;
    this.initialized = true;
  }

  register(
    name: string,
    factory: FactoryFunction<TInstance, TConfig>,
    aliases: string[] = [],
    metadata?: Record<string, unknown>,
  ): void {
    this.items.set(name, { factory, aliases, metadata });
    for (const alias of aliases) {
      this.aliasMap.set(alias.toLowerCase(), name);
    }
    logger.debug(`Registered ${name} with aliases: ${aliases.join(", ")}`);
  }

  async create(nameOrAlias: string, config?: TConfig): Promise<TInstance> {
    await this.ensureInitialized();
    const name = this.resolveName(nameOrAlias);
    const registration = this.items.get(name);
    if (!registration) {
      throw new Error(`Unknown item: ${nameOrAlias}`);
    }
    return registration.factory(config);
  }

  resolveName(nameOrAlias: string): string {
    const lower = nameOrAlias.toLowerCase();
    return this.aliasMap.get(lower) || nameOrAlias;
  }

  has(nameOrAlias: string): boolean {
    const name = this.resolveName(nameOrAlias);
    return this.items.has(name);
  }

  getAvailable(): string[] {
    return Array.from(this.items.keys());
  }

  getAliases(): Map<string, string> {
    return new Map(this.aliasMap);
  }

  clear(): void {
    this.items.clear();
    this.aliasMap.clear();
    this.initialized = false;
    this.initPromise = null;
  }
}
