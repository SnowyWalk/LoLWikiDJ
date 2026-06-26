import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config";
import { getHealth } from "./health";
import { ensureStoragePaths } from "./storage";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { force: true, recursive: true })));
});

describe("getHealth", () => {
  it("reports ok when storage and realtime are writable and ready", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "lolwikidj-health-"));
    tempRoots.push(dataDir);
    const config = loadConfig({
      NODE_ENV: "test",
      DATA_DIR: dataDir,
    });
    await ensureStoragePaths(config);

    const health = await getHealth(config, { ready: true, clients: 2 });

    expect(health.status).toBe("ok");
    expect(health.storage.cacheWritable).toBe(true);
    expect(health.storage.chatUploadWritable).toBe(true);
    expect(health.storage.lolwikiUploadWritable).toBe(true);
    expect(health.realtime.clients).toBe(2);
  });

  it("reports degraded when realtime is not ready", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "lolwikidj-health-"));
    tempRoots.push(dataDir);
    const config = loadConfig({
      NODE_ENV: "test",
      DATA_DIR: dataDir,
    });
    await ensureStoragePaths(config);

    const health = await getHealth(config, { ready: false, clients: 0 });

    expect(health.status).toBe("degraded");
  });
});
