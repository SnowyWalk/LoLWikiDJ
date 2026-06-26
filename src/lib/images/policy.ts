export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_CACHE_BYTES = 16 * 1024 * 1024;
export const MAX_UPLOAD_DIRECTORY_BYTES = 1024 * 1024 * 1024;
export const MAX_CACHE_DIRECTORY_BYTES = 512 * 1024 * 1024;
export const CACHE_FETCH_TIMEOUT_MS = 10_000;

const LOLWIKI_ALLOWED_HOSTS = new Set(["lolwiki.kr", "www.lolwiki.kr"]);
const LOLWIKI_ALLOWED_PREFIXES = [
  "/freeboard/uploads/files/",
  "/freeboard/uploads/doodlr/",
  "/freeboard/uploads/fixed_img/files/",
];

export type ImageScope = "chat" | "lolwiki";

export function assertAllowedLolwikiImageUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImagePolicyError("INVALID_URL", "Invalid image URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ImagePolicyError("INVALID_PROTOCOL", "Only HTTP(S) image URLs are allowed.");
  }

  if (!LOLWIKI_ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new ImagePolicyError("INVALID_HOST", "Only LoLWiki image hosts are allowed.");
  }

  if (!LOLWIKI_ALLOWED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new ImagePolicyError("INVALID_PATH", "The LoLWiki URL is outside allowed upload paths.");
  }

  url.hash = "";
  return url.toString();
}

export function assertAllowedImageMime(contentType: string | null) {
  const normalized = normalizeMime(contentType);
  if (!normalized || !ALLOWED_IMAGE_MIME_TYPES.has(normalized)) {
    throw new ImagePolicyError("INVALID_MIME", "Only jpeg, png, gif, and webp images are allowed.");
  }

  return normalized;
}

export function assertAllowedImageSize(bytes: number, maxBytes: number) {
  if (bytes <= 0) {
    throw new ImagePolicyError("EMPTY_IMAGE", "Image payload is empty.");
  }

  if (bytes > maxBytes) {
    throw new ImagePolicyError("IMAGE_TOO_LARGE", "Image payload exceeds the configured limit.");
  }
}

export function imageExtensionFromMime(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      throw new ImagePolicyError("INVALID_MIME", "Unsupported image MIME type.");
  }
}

export function parseImageScope(value: string | null): ImageScope {
  if (value === "chat" || value === "lolwiki") {
    return value;
  }

  throw new ImagePolicyError("INVALID_SCOPE", "Invalid image upload scope.");
}

export function normalizeSafeFileName(fileName: string) {
  if (!/^[a-f0-9]{64}\.(jpg|png|gif|webp)$/.test(fileName)) {
    throw new ImagePolicyError("INVALID_FILE_NAME", "Invalid stored image file name.");
  }

  return fileName;
}

export class ImagePolicyError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ImagePolicyError";
  }
}

function normalizeMime(contentType: string | null) {
  return contentType?.split(";")[0]?.trim().toLowerCase() || "";
}
