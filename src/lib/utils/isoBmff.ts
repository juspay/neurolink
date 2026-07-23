/**
 * Shared ISO-BMFF (`ftyp`) image-brand detection.
 *
 * FileDetector and ImageProcessor must use the same brand tables and declared
 * box boundary when classifying AVIF, HEIC, and structural HEIF brands. Keeping
 * the scan here prevents the two consumers from drifting as new brands are
 * added.
 */

export const AVIF_FTYP_BRANDS = new Set(["avif", "avis", "avio"]);
export const HEIC_FTYP_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
]);
export const HEIF_STRUCTURAL_FTYP_BRANDS = new Set(["mif1", "msf1"]);

/**
 * Whether the buffer starts with an ISO-BMFF `ftyp` box signature.
 */
export function hasFtypBoxSignature(input: Buffer): boolean {
  return (
    input.length >= 8 &&
    input[4] === 0x66 &&
    input[5] === 0x74 &&
    input[6] === 0x79 &&
    input[7] === 0x70
  );
}

/**
 * Read compatible brands without scanning past the declared `ftyp` box.
 */
export function getCompatibleFtypBrands(input: Buffer): Set<string> {
  const compatibleBrands = new Set<string>();
  if (input.length < 20) {
    return compatibleBrands;
  }

  const declaredBoxSize = input.readUInt32BE(0);
  const boxEnd =
    declaredBoxSize === 0
      ? input.length
      : Math.min(input.length, declaredBoxSize);
  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    compatibleBrands.add(input.toString("latin1", offset, offset + 4));
  }
  return compatibleBrands;
}

function hasFtypBrand(
  compatibleBrands: ReadonlySet<string>,
  candidates: ReadonlySet<string>,
): boolean {
  for (const brand of compatibleBrands) {
    if (candidates.has(brand)) {
      return true;
    }
  }
  return false;
}

/**
 * Return the image MIME type encoded by an ISO-BMFF `ftyp` box, or null when
 * the box belongs to a non-image ISO-BMFF flavor.
 */
export function detectIsoBmffImageMimeType(input: Buffer): string | null {
  if (input.length < 12 || !hasFtypBoxSignature(input)) {
    return null;
  }

  const brand = input.toString("latin1", 8, 12);
  if (AVIF_FTYP_BRANDS.has(brand)) {
    return "image/avif";
  }
  if (HEIC_FTYP_BRANDS.has(brand)) {
    return "image/heic";
  }
  if (!HEIF_STRUCTURAL_FTYP_BRANDS.has(brand)) {
    return null;
  }

  const compatibleBrands = getCompatibleFtypBrands(input);
  if (hasFtypBrand(compatibleBrands, HEIC_FTYP_BRANDS)) {
    return "image/heif";
  }
  if (hasFtypBrand(compatibleBrands, AVIF_FTYP_BRANDS)) {
    return "image/avif";
  }
  return null;
}
