import fs from "node:fs/promises";
import type { AppConfig } from "./config";

export async function ensureStoragePaths(config: AppConfig) {
  await Promise.all([
    fs.mkdir(config.paths.dataDir, { recursive: true }),
    fs.mkdir(config.paths.lolwikiCacheDir, { recursive: true }),
    fs.mkdir(config.paths.chatUploadDir, { recursive: true }),
    fs.mkdir(config.paths.lolwikiUploadDir, { recursive: true }),
  ]);
}

export async function canWriteDirectory(directory: string) {
  const probePath = `${directory}/.write-test-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(probePath, "ok", "utf8");
    await fs.unlink(probePath);
    return true;
  } catch {
    return false;
  }
}
