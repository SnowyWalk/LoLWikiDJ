import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_ORIGIN: emptyStringToUndefined(z.string().url().optional()),
  DATA_DIR: z.string().default("data"),
  CACHE_DIR: emptyStringToUndefined(z.string().optional()),
  UPLOAD_DIR: emptyStringToUndefined(z.string().optional()),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);
  const publicOrigin = parsed.PUBLIC_ORIGIN ? normalizeOrigin(parsed.PUBLIC_ORIGIN) : undefined;
  if (parsed.NODE_ENV === "production" && !publicOrigin) {
    throw new Error("PUBLIC_ORIGIN is required in production.");
  }

  const dataDir = resolveAppPath(parsed.DATA_DIR);
  const cacheDir = resolveAppPath(parsed.CACHE_DIR ?? path.join(dataDir, "cache"));
  const uploadDir = resolveAppPath(parsed.UPLOAD_DIR ?? path.join(dataDir, "uploads"));
  if (parsed.NODE_ENV === "production") {
    assertPathUnder(dataDir, cacheDir, "CACHE_DIR");
    assertPathUnder(dataDir, uploadDir, "UPLOAD_DIR");
  }

  return {
    env: parsed.NODE_ENV,
    isDev: parsed.NODE_ENV !== "production",
    host: parsed.HOST,
    port: parsed.PORT,
    publicOrigin,
    paths: {
      dataDir,
      cacheDir,
      uploadDir,
      lolwikiCacheDir: path.join(cacheDir, "lolwiki"),
      chatUploadDir: path.join(uploadDir, "chat"),
      lolwikiUploadDir: path.join(uploadDir, "lolwiki"),
    },
  };
}

function resolveAppPath(value: string) {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function assertPathUnder(parent: string, child: string, label: string) {
  const parentPath = path.resolve(parent);
  const childPath = path.resolve(child);
  const relative = path.relative(parentPath, childPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be under DATA_DIR in production.`);
  }
}

function normalizeOrigin(rawOrigin: string) {
  const url = new URL(rawOrigin);
  if (url.origin !== rawOrigin.replace(/\/$/u, "")) {
    throw new Error("PUBLIC_ORIGIN must be an origin-only URL.");
  }
  return url.origin;
}

function emptyStringToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}
