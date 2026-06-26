import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("treats empty optional environment values as unset", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      PORT: "3000",
      PUBLIC_ORIGIN: "",
      CACHE_DIR: "",
      UPLOAD_DIR: "",
    });

    expect(config.publicOrigin).toBeUndefined();
    expect(config.paths.cacheDir).toContain("data");
    expect(config.paths.uploadDir).toContain("data");
  });

  it("requires PUBLIC_ORIGIN in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        PORT: "3000",
        PUBLIC_ORIGIN: "",
      }),
    ).toThrow(/PUBLIC_ORIGIN/);
  });

  it("requires production cache and upload directories to stay under DATA_DIR", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        PUBLIC_ORIGIN: "https://lolwikidj.example.com",
        DATA_DIR: "/app/data",
        CACHE_DIR: "/tmp/cache",
      }),
    ).toThrow(/CACHE_DIR/);
  });

  it("normalizes and enforces PUBLIC_ORIGIN as an origin-only URL", () => {
    expect(
      loadConfig({
        NODE_ENV: "production",
        PUBLIC_ORIGIN: "https://lolwikidj.example.com/",
      }).publicOrigin,
    ).toBe("https://lolwikidj.example.com");

    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        PUBLIC_ORIGIN: "https://lolwikidj.example.com/path",
      }),
    ).toThrow(/origin-only/);
  });
});
