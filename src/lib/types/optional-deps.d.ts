/**
 * Type declarations for optional peer dependencies used by storage adapters.
 * These modules are dynamically imported and may not be installed.
 */

declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
    destroy(): void;
  }
  export class ListObjectsV2Command {
    constructor(input: { Bucket: string; Prefix?: string; ContinuationToken?: string; MaxKeys?: number });
  }
  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
  export class PutObjectCommand {
    constructor(input: {
      Bucket: string;
      Key: string;
      Body: string;
      ContentType?: string;
      ServerSideEncryption?: string;
      SSEKMSKeyId?: string;
    });
  }
  export class DeleteObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
  export class DeleteObjectsCommand {
    constructor(input: { Bucket: string; Delete: { Objects: Array<{ Key: string }> } });
  }
  export class HeadBucketCommand {
    constructor(input: { Bucket: string });
  }
}

declare module "better-sqlite3" {
  type Statement = {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };

  type Database = {
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  };

  type DatabaseConstructor = {
    new (filename: string, options?: Record<string, unknown>): Database;
  };

  const Database: DatabaseConstructor;
  export default Database;
}
