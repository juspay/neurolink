#!/usr/bin/env tsx

/**
 * Continuous Test Suite — FileDetector image/archive magic bytes.
 *
 * Run with: npx tsx test/continuous-test-suite-file-detector-magic-bytes.ts
 */

import { FileDetector } from "../src/lib/utils/fileDetector.js";
import { ImageProcessor } from "../src/lib/utils/imageProcessor.js";
import { getMimeTypeForExtension } from "../src/lib/processors/config/mimeConstants.js";
import { assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite(
  "FileDetector Image/Archive Magic Bytes",
);

type DetectionSnapshot = {
  type: string;
  mimeType: string;
  extension: string | null;
  source: string;
  confidence: number | undefined;
};

const HEIC_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
] as const;

/**
 * First ftyp box from Nokia's real crowd_1440x960.heic conformance sample:
 * https://raw.githubusercontent.com/nokiatech/heif/gh-pages/content/images/crowd_1440x960.heic
 */
const NOKIA_HEIF_SAMPLE_PREFIX = Buffer.from(
  "00000018667479706d696631000000006d69663168656963",
  "hex",
);

/**
 * Real BMP prefix published in Microsoft's Bitmap Storage example:
 * https://learn.microsoft.com/en-us/windows/win32/gdi/bitmap-storage
 */
const MICROSOFT_BMP_SAMPLE_PREFIX = Buffer.from(
  "424d7602000000000000760000002800",
  "hex",
);

/**
 * Real big- and little-endian prefixes from LibTIFF's upstream test images:
 * https://gitlab.com/libtiff/libtiff/-/raw/master/test/images/test_float64_predictor2_be_lzw.tif
 * https://gitlab.com/libtiff/libtiff/-/raw/master/test/images/test_float64_predictor2_le_lzw.tif
 */
const LIBTIFF_BIG_ENDIAN_SAMPLE_PREFIX = Buffer.from(
  "4d4d002a00000008000c010000030000",
  "hex",
);
const LIBTIFF_LITTLE_ENDIAN_SAMPLE_PREFIX = Buffer.from(
  "49492a00080000000c00000103000100",
  "hex",
);

/**
 * Real prefix from docs-site/static/img/favicon.ico in this repository. The
 * ICONDIR layout is documented by Microsoft:
 * https://devblogs.microsoft.com/oldnewthing/20101018-00/?p=12513
 */
const NEUROLINK_ICO_SAMPLE_PREFIX = Buffer.from(
  "000001000300101000000100200068040000360000002020000001002000a810",
  "hex",
);

/**
 * Real archive start header from 7-Zip's own recovery documentation:
 * https://www.7-zip.org/recover.html
 */
const SEVEN_ZIP_SAMPLE_PREFIX = Buffer.from(
  "377abcaf271c00045b38bef9590e00000000000023000000000000007a6368fd",
  "hex",
);

function makeFtyp(
  majorBrand: string,
  compatibleBrands: readonly string[] = [],
): Buffer {
  const size = 16 + compatibleBrands.length * 4;
  const buffer = Buffer.alloc(size);
  buffer.writeUInt32BE(size, 0);
  buffer.write("ftyp", 4, 4, "latin1");
  buffer.write(majorBrand, 8, 4, "latin1");
  buffer.writeUInt32BE(0, 12);
  compatibleBrands.forEach((brand, index) => {
    buffer.write(brand, 16 + index * 4, 4, "latin1");
  });
  return buffer;
}

async function detect(input: Buffer | string): Promise<DetectionSnapshot> {
  const result = await FileDetector.detect(input, { timeout: 1 });
  return {
    type: result.type,
    mimeType: result.mimeType,
    extension: result.extension,
    source: result.source,
    confidence: result.metadata.confidence,
  };
}

function assertSnapshot(
  actual: DetectionSnapshot,
  expected: DetectionSnapshot,
  context = "detection",
): void {
  assertEqual(actual.type, expected.type, `${context}: file type`);
  assertEqual(actual.mimeType, expected.mimeType, `${context}: MIME type`);
  assertEqual(actual.extension, expected.extension, `${context}: extension`);
  assertEqual(actual.source, expected.source, `${context}: source`);
  assertEqual(actual.confidence, expected.confidence, `${context}: confidence`);
}

await runSuite(async () => {
  await test("HEIC major and sequence brands detect as image/heic", async () => {
    for (const brand of HEIC_BRANDS) {
      assertSnapshot(
        await detect(makeFtyp(brand, ["mif1"])),
        {
          type: "image",
          mimeType: "image/heic",
          extension: null,
          source: "buffer",
          confidence: 95,
        },
        brand,
      );
    }
  });

  await test("real Nokia mif1+heic sample and msf1+hevx resolve as image/heif", async () => {
    assertSnapshot(await detect(NOKIA_HEIF_SAMPLE_PREFIX), {
      type: "image",
      mimeType: "image/heif",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
    assertSnapshot(await detect(makeFtyp("msf1", ["hevx"])), {
      type: "image",
      mimeType: "image/heif",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("mif1/msf1 with AVIF compatibility and no HEIC brand resolve as image/avif", async () => {
    for (const majorBrand of ["mif1", "msf1"]) {
      assertSnapshot(await detect(makeFtyp(majorBrand, ["miaf", "avif"])), {
        type: "image",
        mimeType: "image/avif",
        extension: null,
        source: "buffer",
        confidence: 95,
      });
    }
  });

  await test("mif1 with both HEIC and AVIF compatible brands prefers image/heif", async () => {
    assertSnapshot(await detect(makeFtyp("mif1", ["avif", "heic"])), {
      type: "image",
      mimeType: "image/heif",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("direct AVIF brands remain image/avif even when mif1 is compatible", async () => {
    for (const majorBrand of ["avif", "avis", "avio"]) {
      assertSnapshot(await detect(makeFtyp(majorBrand, ["mif1", "heic"])), {
        type: "image",
        mimeType: "image/avif",
        extension: null,
        source: "buffer",
        confidence: 95,
      });
    }
  });

  await test("BMP detects from a real Microsoft sample prefix", async () => {
    assertSnapshot(await detect(MICROSOFT_BMP_SAMPLE_PREFIX), {
      type: "image",
      mimeType: "image/bmp",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("TIFF detects both real byte-order sample prefixes", async () => {
    for (const sample of [
      LIBTIFF_LITTLE_ENDIAN_SAMPLE_PREFIX,
      LIBTIFF_BIG_ENDIAN_SAMPLE_PREFIX,
    ]) {
      assertSnapshot(await detect(sample), {
        type: "image",
        mimeType: "image/tiff",
        extension: null,
        source: "buffer",
        confidence: 95,
      });
    }
  });

  await test("ICO detects from the repository's real favicon prefix", async () => {
    assertSnapshot(await detect(NEUROLINK_ICO_SAMPLE_PREFIX), {
      type: "image",
      mimeType: "image/x-icon",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("murdore repro: 256-byte HEIC ftyp box remains image/heic", async () => {
    const compatibleBrands = [
      "mif1",
      ...Array.from(
        { length: 59 },
        (_, index) => `h${index.toString().padStart(3, "0")}`,
      ),
    ];
    const heic = makeFtyp("heic", compatibleBrands);

    assertEqual(heic.length, 256, "repro ftyp box size");
    assertSnapshot(await detect(heic), {
      type: "image",
      mimeType: "image/heic",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
    assertEqual(ImageProcessor.detectImageType(heic), "image/heic");
  });

  await test("second collision class: 256-byte AVIF ftyp box remains image/avif", async () => {
    const compatibleBrands = [
      "mif1",
      ...Array.from(
        { length: 59 },
        (_, index) => `a${index.toString().padStart(3, "0")}`,
      ),
    ];
    const avif = makeFtyp("avif", compatibleBrands);

    assertEqual(avif.length, 256, "second collision ftyp box size");
    assertSnapshot(await detect(avif), {
      type: "image",
      mimeType: "image/avif",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
    assertEqual(ImageProcessor.detectImageType(avif), "image/avif");
  });

  await test("real ICO remains image/x-icon after the ftyp collision guard", async () => {
    assertSnapshot(await detect(NEUROLINK_ICO_SAMPLE_PREFIX), {
      type: "image",
      mimeType: "image/x-icon",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
    assertEqual(
      ImageProcessor.detectImageType(NEUROLINK_ICO_SAMPLE_PREFIX),
      "image/x-icon",
    );
  });

  await test("255-byte and 257-byte ftyp boundaries remain image/heic", async () => {
    for (const declaredBoxSize of [255, 257]) {
      const heic = Buffer.alloc(declaredBoxSize);
      heic.writeUInt32BE(declaredBoxSize, 0);
      heic.write("ftyp", 4, 4, "latin1");
      heic.write("heic", 8, 4, "latin1");
      heic.writeUInt32BE(0, 12);

      assertSnapshot(
        await detect(heic),
        {
          type: "image",
          mimeType: "image/heic",
          extension: null,
          source: "buffer",
          confidence: 95,
        },
        `${declaredBoxSize}-byte ftyp`,
      );
      assertEqual(
        ImageProcessor.detectImageType(heic),
        "image/heic",
        `${declaredBoxSize}-byte ImageProcessor ftyp`,
      );
    }
  });

  await test("7Z detects from 7-Zip's documented real archive header", async () => {
    assertSnapshot(await detect(SEVEN_ZIP_SAMPLE_PREFIX), {
      type: "archive",
      mimeType: "application/x-7z-compressed",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("HEIC and HEIF extension paths map to image MIME types", async () => {
    assertSnapshot(await detect("photo.heic"), {
      type: "image",
      mimeType: "image/heic",
      extension: "heic",
      source: "path",
      confidence: 85,
    });
    assertSnapshot(await detect("photo.heif"), {
      type: "image",
      mimeType: "image/heif",
      extension: "heif",
      source: "path",
      confidence: 85,
    });
    assertEqual(getMimeTypeForExtension(".heic"), "image/heic");
    assertEqual(getMimeTypeForExtension(".heif"), "image/heif");
  });

  await test("ImageProcessor recognizes HEIC/HEIF then rejects them as truthfully unsupported", async () => {
    const heic = makeFtyp("heic", ["mif1"]);
    assertEqual(ImageProcessor.detectImageType(heic), "image/heic");
    assertEqual(
      ImageProcessor.detectImageType(NOKIA_HEIF_SAMPLE_PREFIX),
      "image/heif",
    );

    let errorMessage = "";
    try {
      await ImageProcessor.process(heic);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    assertEqual(
      errorMessage,
      "Invalid MIME type: image/heic is not in allowed list",
    );
  });

  await test("ImageProcessor recognizes ICO then rejects it as truthfully unsupported", async () => {
    assertEqual(
      ImageProcessor.detectImageType(NEUROLINK_ICO_SAMPLE_PREFIX),
      "image/x-icon",
    );

    let errorMessage = "";
    try {
      await ImageProcessor.process(NEUROLINK_ICO_SAMPLE_PREFIX);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    assertEqual(
      errorMessage,
      "Invalid MIME type: image/x-icon is not in allowed list",
    );
  });

  await test("M4A ftyp remains audio/mp4", async () => {
    assertSnapshot(await detect(makeFtyp("M4A ", ["isom"])), {
      type: "audio",
      mimeType: "audio/mp4",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("QuickTime ftyp remains video/quicktime", async () => {
    assertSnapshot(await detect(makeFtyp("qt  ")), {
      type: "video",
      mimeType: "video/quicktime",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("unknown ftyp brand remains terminal video/mp4 fallback", async () => {
    assertSnapshot(await detect(makeFtyp("isom", ["mp42"])), {
      type: "video",
      mimeType: "video/mp4",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("mif1 without image codec compatibility remains video/mp4 fallback", async () => {
    assertSnapshot(await detect(makeFtyp("mif1", ["miaf"])), {
      type: "video",
      mimeType: "video/mp4",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  await test("compatible-brand scan stays inside the declared ftyp box", async () => {
    const outsideBox = Buffer.concat([makeFtyp("mif1"), Buffer.from("heic")]);
    assertSnapshot(await detect(outsideBox), {
      type: "video",
      mimeType: "video/mp4",
      extension: null,
      source: "buffer",
      confidence: 95,
    });
  });

  // FD-010 completeness: one explicit assertion for every issue-listed format.
  await test("FD-010 HEIC — added magic-byte detection", async () => {
    assertEqual((await detect(makeFtyp("heic"))).mimeType, "image/heic");
  });
  await test("FD-010 AVIF — existing magic-byte support asserted", async () => {
    assertEqual((await detect(makeFtyp("avif"))).mimeType, "image/avif");
  });
  await test("FD-010 BMP — added magic-byte detection", async () => {
    assertEqual(
      (await detect(MICROSOFT_BMP_SAMPLE_PREFIX)).mimeType,
      "image/bmp",
    );
  });
  await test("FD-010 TIFF — added magic-byte detection", async () => {
    assertEqual(
      (await detect(LIBTIFF_LITTLE_ENDIAN_SAMPLE_PREFIX)).mimeType,
      "image/tiff",
    );
  });
  await test("FD-010 ICO — added magic-byte detection", async () => {
    assertEqual(
      (await detect(NEUROLINK_ICO_SAMPLE_PREFIX)).mimeType,
      "image/x-icon",
    );
  });
  await test("FD-010 JSON — existing content heuristic asserted", async () => {
    assertSnapshot(await detect(Buffer.from('{"status":"supported"}')), {
      type: "text",
      mimeType: "application/json",
      extension: null,
      source: "buffer",
      confidence: 75,
    });
  });
  await test("FD-010 YAML — existing content heuristic asserted", async () => {
    assertSnapshot(
      await detect(Buffer.from("---\nstatus: supported\nphase: two\n")),
      {
        type: "text",
        mimeType: "application/yaml",
        extension: null,
        source: "buffer",
        confidence: 70,
      },
    );
  });
  await test("FD-010 XML — existing content heuristic asserted", async () => {
    assertSnapshot(await detect(Buffer.from("<status>supported</status>")), {
      type: "text",
      mimeType: "application/xml",
      extension: null,
      source: "buffer",
      confidence: 70,
    });
  });
  await test("FD-010 ZIP — existing magic-byte support asserted", async () => {
    assertSnapshot(await detect(Buffer.from("504b030414000000", "hex")), {
      type: "archive",
      mimeType: "application/zip",
      extension: null,
      source: "buffer",
      confidence: 70,
    });
  });
  await test("FD-010 GZIP — existing magic-byte support asserted", async () => {
    assertSnapshot(await detect(Buffer.from("1f8b080000000000", "hex")), {
      type: "archive",
      mimeType: "application/gzip",
      extension: null,
      source: "buffer",
      confidence: 90,
    });
  });
  await test("FD-010 7Z — added magic-byte detection", async () => {
    assertEqual(
      (await detect(SEVEN_ZIP_SAMPLE_PREFIX)).mimeType,
      "application/x-7z-compressed",
    );
  });
  await test("FD-010 DOCX — extension mapping asserted; OOXML sniffing is out of slice", async () => {
    assertEqual((await detect("report.docx")).type, "docx");
  });
  await test("FD-010 XLSX — extension mapping asserted; OOXML sniffing is out of slice", async () => {
    assertEqual((await detect("report.xlsx")).type, "xlsx");
  });
  await test("FD-010 PPTX — extension mapping asserted; OOXML sniffing is out of slice", async () => {
    assertEqual((await detect("report.pptx")).type, "pptx");
  });
});
