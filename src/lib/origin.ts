import type { AppConfig } from "./config";

export function isAllowedOrigin(origin: string | undefined, config: Pick<AppConfig, "env" | "publicOrigin">) {
  if (!config.publicOrigin) {
    return config.env !== "production";
  }

  return origin === config.publicOrigin;
}
