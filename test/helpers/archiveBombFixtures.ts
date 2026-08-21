/**
 * Archives built to expand far beyond their own size.
 *
 * These exist to prove a bound holds, so they are constructed rather than
 * checked in: a real zip bomb in the repo is a file every scanner flags and
 * every clone downloads.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

export const MB = 1024 * 1024;

/**
 * Inflated size of every bomb fixture, in MB.
 *
 * Shared by the suite and the probe child so the assertion thresholds and the
 * payload they are calibrated against cannot drift apart.
 */
export const BOMB_MB = 400;

/**
 * Compress `inflateMb` of zeros through `compressor` and return the result.
 *
 * Fed in chunks rather than as one buffer: these fixtures exist to prove a
 * payload is never materialised, so building them must not materialise it
 * either. `deflateRawSync(Buffer.alloc(400 * MB))` spikes the test process by
 * the full uncompressed size and can exhaust a small CI runner.
 */
async function compressZeros(
  compressor: zlib.Gzip | zlib.DeflateRaw,
  inflateMb: number,
): Promise<Buffer> {
  const parts: Buffer[] = [];
  compressor.on("data", (c: Buffer) => parts.push(c));
  const done = new Promise<void>((resolve) =>
    compressor.on("end", () => resolve()),
  );
  const chunk = Buffer.alloc(4 * MB, 0);
  for (let written = 0; written < inflateMb * MB; written += chunk.length) {
    if (!compressor.write(chunk)) {
      await new Promise((r) => compressor.once("drain", r));
    }
  }
  compressor.end();
  compressor.resume();
  await done;
  return Buffer.concat(parts);
}

/** A gzip stream that inflates to `inflateMb`, as bytes. */
export async function buildGzBomb(inflateMb: number): Promise<Buffer> {
  return compressZeros(zlib.createGzip(), inflateMb);
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}

/** A gzip bomb on disk: kilobytes stored, `inflateMb` once decompressed. */
export async function writeGzBomb(
  target: string,
  inflateMb: number,
): Promise<string> {
  if (fs.existsSync(target)) {
    return target;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, await buildGzBomb(inflateMb));
  return target;
}

/**
 * A ZIP whose entry declares an uncompressed size of 0 while its DEFLATE
 * stream inflates to `inflateMb`.
 *
 * The declared size is the attack. A guard that compares against it lets the
 * entry through (`0 > limit` is false), and adm-zip arms its own
 * `maxOutputLength` only when that field is positive — so one attacker-chosen
 * number disables both layers at once. CRC is declared 0 too, which is what an
 * empty buffer hashes to, so the mismatch never surfaces either.
 */
export async function writeZeroDeclaredZip(
  target: string,
  inflateMb: number,
): Promise<string> {
  if (fs.existsSync(target)) {
    return target;
  }
  const name = Buffer.from("payload.txt", "ascii");
  const deflated = await compressZeros(zlib.createDeflateRaw(), inflateMb);
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    u32(0),
    u16(name.length),
    u16(0),
    name,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(0),
    u32(deflated.length),
    u32(0),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    name,
  ]);
  const centralOffset = local.length + deflated.length;
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    u32(central.length),
    u32(centralOffset),
    u16(0),
  ]);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([local, deflated, central, end]));
  return target;
}

/**
 * A single-entry ZIP storing `text` uncompressed (method 0).
 *
 * Hand-built because adm-zip's `addFile` writes method 8 whatever compression
 * level it is given, so a fixture made with it silently exercises the DEFLATE
 * path while appearing to cover STORED.
 *
 * `corruptCrc` declares a CRC the content does not hash to, which is what a
 * truncated or damaged archive looks like.
 */
export function writeStoredZip(
  target: string,
  text: string,
  options: { corruptCrc?: boolean } = {},
): string {
  const payload = Buffer.from(text, "utf8");
  const realCrc = zlib.crc32(payload) >>> 0;
  const crc = options.corruptCrc ? (realCrc ^ 0xffff) >>> 0 : realCrc;
  const name = Buffer.from("stored.txt", "ascii");
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(crc),
    u32(payload.length),
    u32(payload.length),
    u16(name.length),
    u16(0),
    name,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(crc),
    u32(payload.length),
    u32(payload.length),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    name,
  ]);
  const centralOffset = local.length + payload.length;
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    u32(central.length),
    u32(centralOffset),
    u16(0),
  ]);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([local, payload, central, end]));
  return target;
}

/** A small, ordinary .gz carrying `token` in its content. */
export function writeNormalGz(target: string, token: string): string {
  if (!fs.existsSync(target)) {
    fs.writeFileSync(
      target,
      zlib.gzipSync(
        Buffer.from(
          `Quarterly report.\nThe access code is ${token}.\n`,
          "utf8",
        ),
      ),
    );
  }
  return target;
}

/**
 * A multi-entry ZIP, STORED (method 0) like `writeStoredZip`, generalized to
 * accept several named entries — so one fixture can carry both an ordinary
 * entry and one whose name is a path-traversal attempt
 * (`../../../etc/passwd`-shaped).
 *
 * Deliberately the same hand-rolled construction as `writeStoredZip` (correct
 * per-entry CRC/lengths, valid local + central-directory + EOCD records) —
 * `writeStoredZip`'s signature is untouched; this is a new function, not a
 * generalization of it in place.
 */
export function writeZipSlipZip(
  target: string,
  entries: ReadonlyArray<{ name: string; content: string }>,
): string {
  const built = entries.map(({ name, content }) => {
    const payload = Buffer.from(content, "utf8");
    const crc = zlib.crc32(payload) >>> 0;
    const nameBuf = Buffer.from(name, "utf8");
    return { nameBuf, payload, crc };
  });

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const { nameBuf, payload, crc } of built) {
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(payload.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      payload,
    ]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(payload.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(built.length),
    u16(built.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0),
  ]);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([...locals, centralBuf, end]));
  return target;
}

/**
 * A single-entry ZIP whose DEFLATE stream is real and its header sizes are
 * truthful — unlike `writeZeroDeclaredZip`, which lies about
 * `uncompressedSize` to bypass the ratio check entirely. This fixture exists
 * to trip `ArchiveProcessor`'s compression-ratio guard head-on: the entry
 * fills `inflateMb` megabytes with a repeating `marker` string (so a test can
 * assert the marker never appears in output — plain zeros would leave nothing
 * to assert against) and declares its actual compressed/uncompressed sizes in
 * both the local and central-directory records.
 *
 * `inflateMb` only needs to clear `MAX_COMPRESSION_RATIO` (100:1 in
 * `ArchiveProcessor.ts`) with margin; a short repeating string compresses at
 * several hundred:1, so 2 MB is enough without spiking the test process.
 */
export function writeRatioBombZip(
  target: string,
  inflateMb: number,
  marker = "ZIPBOMBMARKER_",
): string {
  const name = Buffer.from("bomb.txt", "ascii");
  const unit = Buffer.from(marker, "utf8");
  const totalBytes = inflateMb * MB;
  const reps = Math.floor(totalBytes / unit.length);
  const raw = Buffer.alloc(reps * unit.length);
  for (let i = 0; i < reps; i++) {
    unit.copy(raw, i * unit.length);
  }
  const deflated = zlib.deflateRawSync(raw);
  const crc = zlib.crc32(raw) >>> 0;

  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(crc),
    u32(deflated.length),
    u32(raw.length),
    u16(name.length),
    u16(0),
    name,
    deflated,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(crc),
    u32(deflated.length),
    u32(raw.length),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    name,
  ]);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    u32(central.length),
    u32(local.length),
    u16(0),
  ]);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([local, central, end]));
  return target;
}
