/**
 * Office documents built as real ZIPs, with and without a bomb inside.
 *
 * .docx, .xlsx, .pptx and .odt are all ZIP containers, which is why they share
 * the archive formats' exposure: the size that arrives is compressed, and the
 * parsing library expands it. Each builder here therefore produces a document
 * that a real parser accepts, so the same fixture can prove both halves — that
 * a bomb is refused, and that an ordinary file of the same shape still works.
 *
 * Everything is constructed rather than checked in: committing a zip bomb
 * means every clone downloads it and every scanner flags it.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const MB = 1024 * 1024;

const u16 = (n: number): Buffer => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};

const u32 = (n: number): Buffer => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
};

const METHOD_STORED = 0;
const METHOD_DEFLATED = 8;

/** One member of a ZIP under construction. */
type ZipMember = {
  readonly name: string;
  /** Literal content, stored uncompressed. */
  readonly text?: string;
  /** Build a bomb entry instead: this many MB of zeros, declaring size 0. */
  readonly bombMb?: number;
};

/**
 * Write a ZIP containing `members`, forging headers directly.
 *
 * adm-zip cannot build these fixtures. It writes an honest uncompressed size
 * for every entry, and the declared size is precisely the thing under test: an
 * entry claiming 0 slips past a `size > limit` check and simultaneously
 * disables adm-zip's own `maxOutputLength`, which it arms only for a positive
 * declaration. The CRC is declared 0 as well — what an empty buffer hashes to
 * — so a reader that trusts the header sees a consistent, empty, harmless
 * entry right up until it inflates it.
 */
export async function writeOfficeZip(
  target: string,
  members: readonly ZipMember[],
): Promise<string> {
  if (fs.existsSync(target)) {
    return target;
  }

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const member of members) {
    const name = Buffer.from(member.name, "ascii");
    const isBomb = typeof member.bombMb === "number";

    const payload = isBomb
      ? await deflateZeros(member.bombMb as number)
      : Buffer.from(member.text ?? "", "utf8");
    const method = isBomb ? METHOD_DEFLATED : METHOD_STORED;
    const crc = isBomb ? 0 : zlib.crc32(payload) >>> 0;
    // A bomb declares nothing about itself; an honest entry declares the truth.
    const uncompressed = isBomb ? 0 : payload.length;

    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(uncompressed),
      u16(name.length),
      u16(0),
      name,
    ]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(uncompressed),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);

    locals.push(local, payload);
    centrals.push(central);
    offset += local.length + payload.length;
  }

  const central = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(members.length),
    u16(members.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([...locals, central, end]));
  return target;
}

/**
 * `inflateMb` of zeros as a raw DEFLATE stream.
 *
 * Streamed so building the fixture does not allocate the payload the caller is
 * about to assert never gets allocated.
 */
async function deflateZeros(inflateMb: number): Promise<Buffer> {
  const deflate = zlib.createDeflateRaw();
  const parts: Buffer[] = [];
  deflate.on("data", (c: Buffer) => parts.push(c));
  const done = new Promise<void>((resolve) =>
    deflate.on("end", () => resolve()),
  );
  const chunk = Buffer.alloc(4 * MB, 0);
  for (let written = 0; written < inflateMb * MB; written += chunk.length) {
    if (!deflate.write(chunk)) {
      await new Promise((r) => deflate.once("drain", r));
    }
  }
  deflate.end();
  deflate.resume();
  await done;
  return Buffer.concat(parts);
}

const CONTENT_TYPES = (override: string): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${override}</Types>`;

const ROOT_RELS = (target: string, type: string): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${type}" Target="${target}"/></Relationships>`;

const OFFICE_DOC_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";

/** A .docx whose body is `token`, readable by mammoth. */
export function docxMembers(token: string): ZipMember[] {
  return [
    {
      name: "[Content_Types].xml",
      text: CONTENT_TYPES(
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      ),
    },
    {
      name: "_rels/.rels",
      text: ROOT_RELS("word/document.xml", OFFICE_DOC_REL),
    },
    {
      name: "word/document.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>The access code is ${token}.</w:t></w:r></w:p></w:body></w:document>`,
    },
  ];
}

/** A .pptx with one slide carrying `token`. */
export function pptxMembers(token: string): ZipMember[] {
  return [
    {
      name: "[Content_Types].xml",
      text: CONTENT_TYPES(
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
      ),
    },
    {
      name: "_rels/.rels",
      text: ROOT_RELS("ppt/presentation.xml", OFFICE_DOC_REL),
    },
    {
      name: "ppt/slides/slide1.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>The access code is ${token}.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
    },
  ];
}

/** An .odt whose content.xml carries `token`. */
export function odtMembers(token: string): ZipMember[] {
  return [
    { name: "mimetype", text: "application/vnd.oasis.opendocument.text" },
    {
      name: "content.xml",
      text: `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:p>The access code is ${token}.</text:p></office:text></office:body></office:document-content>`,
    },
  ];
}
