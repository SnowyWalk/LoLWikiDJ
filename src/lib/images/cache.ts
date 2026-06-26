import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "@/lib/config";
import { withAsyncLock } from "@/lib/asyncLock";
import {
  assertAllowedImageMime,
  assertAllowedImageSize,
  assertAllowedLolwikiImageUrl,
  CACHE_FETCH_TIMEOUT_MS,
  imageExtensionFromMime,
  MAX_CACHE_BYTES,
  MAX_CACHE_DIRECTORY_BYTES,
  normalizeSafeFileName,
} from "./policy";
import { writeFileAtomic } from "./storage";

export type CachedImage = {
  body: Buffer;
  contentType: string;
  cacheStatus: "hit" | "miss";
  fileName: string;
  sourceUrl: string;
};

export async function getCachedLolwikiImage(config: AppConfig, rawUrl: string): Promise<CachedImage> {
  const sourceUrl = assertAllowedLolwikiImageUrl(rawUrl);
  const key = crypto.createHash("sha256").update(sourceUrl).digest("hex");
  const manifestPath = path.join(config.paths.lolwikiCacheDir, `${key}.json`);

  const cached = await readManifest(manifestPath);
  if (cached) {
    try {
      const body = await fs.readFile(path.join(config.paths.lolwikiCacheDir, cached.fileName));
      return {
        body,
        contentType: cached.contentType,
        cacheStatus: "hit",
        fileName: cached.fileName,
        sourceUrl,
      };
    } catch (error) {
      if (!isNodeError(error, "ENOENT")) {
        throw error;
      }
      await fs.rm(manifestPath, { force: true });
    }
  }

  const response = await fetch(sourceUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(CACHE_FETCH_TIMEOUT_MS),
    headers: {
      "user-agent": "LoLWikiDJ2 image-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Image origin returned ${response.status}`);
  }

  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    throw new Error("Image origin redirects are not allowed.");
  }

  const contentType = assertAllowedImageMime(response.headers.get("content-type"));
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_CACHE_BYTES) {
    throw new Error("Image origin payload exceeds the configured limit.");
  }

  const body = await readResponseWithLimit(response, MAX_CACHE_BYTES);
  assertAllowedImageSize(body.byteLength, MAX_CACHE_BYTES);

  const fileName = `${key}.${imageExtensionFromMime(contentType)}`;
  await withAsyncLock(`cache:${config.paths.lolwikiCacheDir}`, async () => {
    await fs.mkdir(config.paths.lolwikiCacheDir, { recursive: true });
    await pruneCacheDirectory(config.paths.lolwikiCacheDir, MAX_CACHE_DIRECTORY_BYTES - body.byteLength);
    await writeFileAtomic(path.join(config.paths.lolwikiCacheDir, fileName), body);
    await writeFileAtomic(
      manifestPath,
      Buffer.from(JSON.stringify({ sourceUrl, fileName, contentType, bytes: body.byteLength, cachedAt: new Date().toISOString() })),
    );
  });

  return {
    body,
    contentType,
    cacheStatus: "miss",
    fileName,
    sourceUrl,
  };
}

async function readManifest(manifestPath: string) {
  try {
    const text = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(text) as {
      fileName: string;
      contentType: string;
    };
    if (!parsed.fileName || !parsed.contentType) {
      return null;
    }

    return {
      fileName: normalizeSafeFileName(parsed.fileName),
      contentType: assertAllowedImageMime(parsed.contentType),
    };
  } catch (error) {
    if (isNodeError(error, "ENOENT")) {
      return null;
    }
    throw error;
  }
}

async function readResponseWithLimit(response: Response, maxBytes: number) {
  if (!response.body) {
    throw new Error("Image origin returned an empty response body.");
  }

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error("Image origin payload exceeds the configured limit.");
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, total);
}

function isNodeError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function pruneCacheDirectory(directory: string, targetBytes: number) {
  if (targetBytes <= 0) {
    throw new Error("Image cache quota is smaller than the incoming image.");
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        const stat = await fs.stat(fullPath);
        return { fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
      }),
  );

  let total = files.reduce((sum, file) => sum + file.size, 0);
  const deleted = new Set<string>();
  for (const file of files.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
    if (total <= targetBytes) {
      break;
    }
    if (deleted.has(file.fullPath)) {
      continue;
    }

    await fs.rm(file.fullPath, { force: true });
    deleted.add(file.fullPath);
    total -= file.size;

    if (!file.fullPath.endsWith(".json")) {
      const stem = file.fullPath.replace(/\.(jpg|png|gif|webp)$/u, "");
      const pairedManifest = `${stem}.json`;
      await fs.rm(pairedManifest, { force: true });
      deleted.add(pairedManifest);
    } else {
      const stem = file.fullPath.replace(/\.json$/u, "");
      for (const extension of ["jpg", "png", "gif", "webp"]) {
        const pairedImage = `${stem}.${extension}`;
        await fs.rm(pairedImage, { force: true });
        deleted.add(pairedImage);
      }
    }
  }
}
