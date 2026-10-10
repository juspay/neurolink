import { downloadAuditBytes } from "./network.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";

/** Verify actual bytes, reject animation/SVG/video, bound decoded pixels, strip metadata. */
export const prepareAuditImage = async (bytes: Buffer): Promise<Buffer> => {
  if (bytes.byteLength === 0 || bytes.byteLength > LIMITS.imageBytes) {
    throw new Error("Image exceeds the download size limit.");
  }
  const { default: sharp } = await import("sharp");
  const decoder = sharp(bytes, {
    limitInputPixels: LIMITS.imagePixels,
    failOn: "warning",
  });
  const metadata = await decoder.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new Error("Only static JPEG, PNG and WebP images are supported.");
  }
  const prepared = await decoder
    .rotate()
    .resize({
      width: LIMITS.imageEdge,
      height: LIMITS.imageEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
  if (prepared.byteLength > LIMITS.preparedImageBytes) {
    throw new Error("Prepared image exceeds the inference size limit.");
  }
  return prepared;
};

export const downloadAuditImage = (
  url: string,
  signal?: AbortSignal,
): Promise<Buffer> => downloadAuditBytes(url, LIMITS.imageBytes, signal);
