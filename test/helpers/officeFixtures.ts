/**
 * Synthesised Office fixtures (DOCX / XLSX) for the office suite.
 *
 * Built in memory rather than committed. A .docx is a ZIP of XML parts and a
 * .xlsx is written by the same exceljs the processor reads back, so both can be
 * minted deterministically — and a generated fixture cannot drift out of sync
 * with the format the processor expects the way a checked-in binary can.
 *
 * `exceljs` and `mammoth` are optionalDependencies, exactly as the processors
 * treat them, so callers must skip when they are absent instead of failing.
 * `adm-zip` is a direct dependency and always present.
 */

import AdmZip from "adm-zip";

/**
 * True when an optional package can actually be loaded.
 *
 * Only a genuine "this package is not installed" counts as absent. Swallowing
 * every import failure would turn an installed-but-broken dependency — a
 * syntax error, a bad ESM/CJS interop, a missing transitive dep — into a quiet
 * SKIP, which is precisely the regression these suites exist to catch. Anything
 * else rethrows so the suite fails loudly.
 */
export async function hasPackage(name: string): Promise<boolean> {
  try {
    await import(/* @vite-ignore */ name);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    const isMissing =
      (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") &&
      (err instanceof Error
        ? err.message.includes(`'${name}'`) || err.message.includes(`"${name}"`)
        : false);
    if (isMissing) {
      return false;
    }
    throw err;
  }
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

/**
 * Build a minimal but genuinely valid .docx containing the given paragraphs.
 *
 * The three parts below are the smallest set Word and mammoth both accept:
 * the content-type map, the package relationship pointing at the main part,
 * and the document body itself.
 */
export function makeDocx(paragraphs: string[]): Buffer {
  const body = paragraphs
    .map(
      (text) =>
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`,
    )
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;

  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from(CONTENT_TYPES, "utf8"));
  zip.addFile("_rels/.rels", Buffer.from(ROOT_RELS, "utf8"));
  zip.addFile("word/document.xml", Buffer.from(documentXml, "utf8"));
  return zip.toBuffer();
}

/** Build a real .xlsx via exceljs, normalising its CJS/ESM interop. */
export async function makeXlsx(
  sheets: Record<string, unknown[][]>,
): Promise<Buffer> {
  const mod = (await import("exceljs")) as unknown as {
    Workbook?: new () => unknown;
    default?: { Workbook: new () => unknown };
  };
  const Workbook = mod.Workbook ?? mod.default?.Workbook;
  if (!Workbook) {
    throw new Error("exceljs Workbook constructor unresolved");
  }
  const wb = new Workbook() as {
    addWorksheet: (n: string) => { addRow: (r: unknown[]) => void };
    xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
  };
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name);
    for (const row of rows) {
      ws.addRow(row);
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/**
 * Build a .docx whose `word/document.xml` is the given raw XML string,
 * byte-for-byte — no escaping.
 *
 * `makeDocx()` escapes its input because it exists to carry ordinary text; an
 * XXE/billion-laughs payload needs a literal `<!DOCTYPE …>`/`<!ENTITY …>`
 * prologue ahead of `<w:document>`, which escaping would turn into inert text.
 * The surrounding parts ([Content_Types].xml, _rels/.rels) are the same
 * well-formed shell `makeDocx()` uses — only the main part is attacker
 * controlled, matching a real attachment where everything except the
 * document body is boilerplate.
 */
export function makeDocxRaw(documentXml: string): Buffer {
  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from(CONTENT_TYPES, "utf8"));
  zip.addFile("_rels/.rels", Buffer.from(ROOT_RELS, "utf8"));
  zip.addFile("word/document.xml", Buffer.from(documentXml, "utf8"));
  return zip.toBuffer();
}

/**
 * Build a real, structurally valid .xlsx via exceljs (correct
 * `[Content_Types].xml`, `xl/workbook.xml`, relationships, styles, …), then
 * overwrite `xl/worksheets/sheet1.xml` with a raw, attacker-controlled XML
 * string.
 *
 * exceljs's own writer escapes anything written through its row/cell API, so
 * it cannot be used to embed a literal `<!DOCTYPE …>` — the injection has to
 * happen by patching the zip entry after the fact, which is also what a real
 * attacker modifying a legitimate spreadsheet would do.
 */
export async function makeXlsxRaw(sheetXml: string): Promise<Buffer> {
  const base = await makeXlsx({ Sheet1: [["placeholder"]] });
  const zip = new AdmZip(base);
  zip.updateFile("xl/worksheets/sheet1.xml", Buffer.from(sheetXml, "utf8"));
  return zip.toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
