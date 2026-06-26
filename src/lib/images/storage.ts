import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "@/lib/config";
import { withAsyncLock } from "@/lib/asyncLock";
import {
  assertAllowedImageMime,
  assertAllowedImageSize,
  imageExtensionFromMime,
  ImagePolicyError,
  MAX_UPLOAD_DIRECTORY_BYTES,
  MAX_UPLOAD_BYTES,
  normalizeSafeFileName,
  type ImageScope,
} from "./policy";

export type StoredImage = {
  id: string;
  scope: ImageScope;
  fileName: string;
  contentType: string;
  bytes: number;
  url: string;
};

export async function storeUploadedImage(config: AppConfig, scope: ImageScope, file: File): Promise<StoredImage> {
  const contentType = assertAllowedImageMime(file.type);
  assertAllowedImageSize(file.size, MAX_UPLOAD_BYTES);
  const body = await readFileWithLimit(file, MAX_UPLOAD_BYTES);
  assertAllowedImageSize(body.byteLength, MAX_UPLOAD_BYTES);

  const hash = crypto.createHash("sha256").update(scope).update(body).digest("hex");
  const extension = imageExtensionFromMime(contentType);
  const fileName = `${hash}.${extension}`;
  const directory = uploadDirectoryForScope(config, scope);
  await withAsyncLock(`upload:${directory}`, async () => {
    await fs.mkdir(directory, { recursive: true });
    await assertDirectoryHasCapacity(directory, body.byteLength, MAX_UPLOAD_DIRECTORY_BYTES);
    await writeFileAtomic(path.join(directory, fileName), body);
  });

  return {
    id: hash,
    scope,
    fileName,
    contentType,
    bytes: body.byteLength,
    url: `/api/uploads/${scope}/${fileName}`,
  };
}

export async function readStoredImage(config: AppConfig, scope: ImageScope, rawFileName: string) {
  const fileName = normalizeSafeFileName(rawFileName);
  const fullPath = path.join(uploadDirectoryForScope(config, scope), fileName);
  const body = await fs.readFile(fullPath);
  return {
    body,
    contentType: contentTypeFromStoredFileName(fileName),
  };
}

export async function writeFileAtomic(targetPath: string, body: Buffer) {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempPath, body);
  await fs.rename(tempPath, targetPath);
}

async function readFileWithLimit(file: File, maxBytes: number) {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of file.stream() as AsyncIterable<Uint8Array>) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      throw new ImagePolicyError("IMAGE_TOO_LARGE", "Image payload exceeds the configured limit.");
    }
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks, total);
}

function uploadDirectoryForScope(config: AppConfig, scope: ImageScope) {
  return scope === "lolwiki" ? config.paths.lolwikiUploadDir : config.paths.chatUploadDir;
}

function contentTypeFromStoredFileName(fileName: string) {
  if (fileName.endsWith(".jpg")) return "image/jpeg";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".gif")) return "image/gif";
  return "image/webp";
}

async function assertDirectoryHasCapacity(directory: string, incomingBytes: number, maxBytes: number) {
  const currentBytes = await directoryBytes(directory);
  if (currentBytes + incomingBytes > maxBytes) {
    throw new ImagePolicyError("STORAGE_QUOTA_EXCEEDED", "Image storage quota exceeded.");
  }
}

async function directoryBytes(directory: string) {
  let total = 0;
  let entries: Array<{ name: string; isFile: () => boolean }>;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const stat = await fs.stat(path.join(directory, entry.name));
    total += stat.size;
  }

  return total;
}
