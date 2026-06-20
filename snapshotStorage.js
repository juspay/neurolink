/**
 * S3 storage helpers for snapshot pulls.
 * Credentials are resolved via the default AWS provider chain (IRSA on EKS,
 * ECS task role, EC2 instance profile, env vars, or ~/.aws/credentials).
 *
 * Env vars (match the names already defined in lighthouse/Jenkinsfile):
 *   S3_BUCKET      — e.g. "atoms-sdk"
 *   S3_BASE_PATH   — e.g. "lighthouse"
 *   S3_EXTRA_PATH  — e.g. "client"
 *   AWS_REGION     — e.g. "ap-south-1"
 */

import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const { S3_BUCKET, S3_BASE_PATH, S3_EXTRA_PATH, AWS_REGION } = process.env;

// ---------------------------------------------------------------------------
// Bucket
// ---------------------------------------------------------------------------

/** @returns {string} */
export function bucketName() {
  const name = (S3_BUCKET && S3_BUCKET.trim()) || "";
  if (!name) throw new Error("S3_BUCKET must be set");
  return name;
}

// ---------------------------------------------------------------------------
// Storage key helpers
// ---------------------------------------------------------------------------

/** @param {string} snapshotId */
export function storageKey(snapshotId) {
  if (!S3_BASE_PATH || !S3_EXTRA_PATH) throw new Error("S3_BASE_PATH and S3_EXTRA_PATH must be set");
  return `${S3_BASE_PATH}/${S3_EXTRA_PATH}/snapshots/${snapshotId}`.replace(/\/+/g, "/");
}

/** @returns {string} */
export function snapshotsPrefix() {
  if (!S3_BASE_PATH || !S3_EXTRA_PATH) throw new Error("S3_BASE_PATH and S3_EXTRA_PATH must be set");
  return `${S3_BASE_PATH}/${S3_EXTRA_PATH}/snapshots/`.replace(/\/+/g, "/");
}

// ---------------------------------------------------------------------------
// Snapshot resolution — always returns the latest snapshot for a repo
// ---------------------------------------------------------------------------

/**
 * Resolve the snapshot id for a given repo.
 *
 * Naming convention: {repoName}-snapshot-latest.tar.gz
 * A single snapshot per repo, overwritten on every beta build.
 *
 * @param {{ repoName: string }} params
 * @returns {Promise<string>} snapshotId e.g. "lighthouse-snapshot-latest.tar.gz"
 */
export async function resolveSnapshotId({ repoName }) {
  if (!repoName || typeof repoName !== "string" || repoName.trim() === "") {
    throw new Error("repoName is required");
  }

  const snapshotId = `${repoName.trim()}-snapshot-latest.tar.gz`;
  const Key = storageKey(snapshotId);
  const Bucket = bucketName();

  try {
    await s3().send(new HeadObjectCommand({ Bucket, Key }));
  } catch (err) {
    const notFound = err && (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404);
    if (notFound) {
      throw new Error(`No snapshot found for repo '${repoName}' (expected key: s3://${Bucket}/${Key})`);
    }
    throw err;
  }

  return snapshotId;
}

// ---------------------------------------------------------------------------
// Lazy S3 client
// ---------------------------------------------------------------------------

/** @type {S3Client | null} */
let _s3 = null;

/** @returns {S3Client} */
export function s3() {
  if (!_s3) {
    /** @type {import("@aws-sdk/client-s3").S3ClientConfig} */
    const config = {};
    if (AWS_REGION) config.region = AWS_REGION;
    // When an endpoint override is set (e.g. MinIO or another S3-compatible
    // server for local testing), switch to path-style addressing. Real AWS
    // S3 accepts both, so this flag is safe in production too.
    if (process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL) {
      config.forcePathStyle = true;
    }
    _s3 = new S3Client(config);
  }
  return _s3;
}

// ---------------------------------------------------------------------------
// Download a snapshot object as a Node.js Readable stream (for piping to disk)
// ---------------------------------------------------------------------------

/**
 * @param {string} snapshotId
 * @returns {Promise<NodeJS.ReadableStream>}
 */
export async function getSnapshotStream(snapshotId) {
  const Key = storageKey(snapshotId);
  const Bucket = bucketName();
  const res = await s3().send(new GetObjectCommand({ Bucket, Key }));
  if (!res.Body) throw new Error(`S3 GetObject returned empty body for s3://${Bucket}/${Key}`);
  // In Node.js, the SDK v3 Body is a Readable stream.
  return /** @type {NodeJS.ReadableStream} */ (res.Body);
}
