import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "@/lib/config";
import { readStoredImage, storeUploadedImage } from "./storage";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("uploaded image storage", () => {
  it("stores valid images and returns a stable local URL", async () => {
    const config = await createConfig();
    const file = new File([new Uint8Array([1, 2, 3])], "sample.png", { type: "image/png" });

    const stored = await storeUploadedImage(config, "chat", file);
    const read = await readStoredImage(config, "chat", stored.fileName);

    expect(stored.url).toBe(`/api/uploads/chat/${stored.fileName}`);
    expect(stored.contentType).toBe("image/png");
    expect(read.contentType).toBe("image/png");
    expect(read.body.equals(Buffer.from([1, 2, 3]))).toBe(true);
  });

  it("rejects non-image uploads", async () => {
    const config = await createConfig();
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    await expect(storeUploadedImage(config, "chat", file)).rejects.toMatchObject({
      code: "INVALID_MIME",
    });
  });
});

async function createConfig(): Promise<AppConfig> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lolwikidj-upload-"));
  tempDirs.push(root);

  return {
    env: "test",
    isDev: true,
    host: "127.0.0.1",
    port: 0,
    publicOrigin: undefined,
    paths: {
      dataDir: root,
      cacheDir: path.join(root, "cache"),
      uploadDir: path.join(root, "uploads"),
      lolwikiCacheDir: path.join(root, "cache", "lolwiki"),
      chatUploadDir: path.join(root, "uploads", "chat"),
      lolwikiUploadDir: path.join(root, "uploads", "lolwiki"),
    },
  };
}
