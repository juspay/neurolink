import { logger } from "../../utils/logger.js";
import type { InfraRegistryEntry } from "../../types/index.js";

export abstract class BaseRegistry<TItem, TMetadata = unknown> {
  protected items = new Map<string, InfraRegistryEntry<TItem, TMetadata>>();
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
    id: string,
    factory: () => Promise<TItem>,
    aliases: string[] = [],
    options?: { metadata: TMetadata },
  ): void {
    const metadata = options?.metadata ?? ({} as TMetadata);
    this.items.set(id, { factory, metadata });
    for (const alias of aliases) {
      this.items.set(alias.toLowerCase(), { factory, metadata });
    }
    logger.debug(`Registered ${id} in registry`);
  }

  async get(id: string): Promise<TItem | undefined> {
    await this.ensureInitialized();
    const entry = this.items.get(id);
    if (!entry) {
      return undefined;
    }
    if (!entry.instance) {
      entry.instance = await entry.factory();
    }
    return entry.instance;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  list(): Array<{ id: string; metadata: TMetadata }> {
    return Array.from(this.items.entries()).map(([id, entry]) => ({
      id,
      metadata: entry.metadata,
    }));
  }

  clear(): void {
    this.items.clear();
    this.initialized = false;
    this.initPromise = null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
