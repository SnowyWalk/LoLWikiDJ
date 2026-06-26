import type { AppConfig } from "./config";
import { canWriteDirectory } from "./storage";

export type RealtimeHealth = {
  ready: boolean;
  clients: number;
};

export async function getHealth(config: AppConfig, realtime: RealtimeHealth) {
  const [cacheWritable, chatUploadWritable, lolwikiUploadWritable] = await Promise.all([
    canWriteDirectory(config.paths.lolwikiCacheDir),
    canWriteDirectory(config.paths.chatUploadDir),
    canWriteDirectory(config.paths.lolwikiUploadDir),
  ]);

  const healthy = cacheWritable && chatUploadWritable && lolwikiUploadWritable && realtime.ready;

  return {
    status: healthy ? "ok" : "degraded",
    app: {
      env: config.env,
      uptimeSeconds: Math.round(process.uptime()),
    },
    storage: {
      cacheWritable,
      chatUploadWritable,
      lolwikiUploadWritable,
    },
    realtime,
  };
}
