import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/lib/config";
import { getCachedLolwikiImage } from "./cache";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("getCachedLolwikiImage", () => {
  it("rejects non-lolwiki image URLs", async () => {
    const config = await createConfig();

    await expect(getCachedLolwikiImage(config, "https://example.com/image.png")).rejects.toMatchObject({
      code: "INVALID_HOST",
    });
  });

  it("fetches once and serves repeated requests from local cache", async () => {
    const config = await createConfig();
    const imageBytes = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    const url = "http://lolwiki.kr/freeboard/uploads/files/2024/test.png";
    const first = await getCachedLolwikiImage(config, url);
    const second = await getCachedLolwikiImage(config, url);

    expect(first.cacheStatus).toBe("miss");
    expect(second.cacheStatus).toBe("hit");
    expect(second.body.equals(Buffer.from(imageBytes))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects redirected origin responses", async () => {
    const config = await createConfig();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: "https://example.com/image.png",
        },
      }),
    );

    await expect(getCachedLolwikiImage(config, "http://lolwiki.kr/freeboard/uploads/files/2024/test.png")).rejects.toThrow(
      /302|redirect/i,
    );
  });
});

async function createConfig(): Promise<AppConfig> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lolwikidj-cache-"));
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
