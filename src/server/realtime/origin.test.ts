import { describe, expect, it } from "vitest";
import { isAllowedSocketOrigin } from "./origin";

describe("isAllowedSocketOrigin", () => {
  it("allows local development when no public origin is configured", () => {
    expect(isAllowedSocketOrigin(undefined, { env: "development", publicOrigin: undefined })).toBe(true);
    expect(isAllowedSocketOrigin("http://localhost:3000", { env: "test", publicOrigin: undefined })).toBe(true);
  });

  it("allows only the configured public origin in production deployments", () => {
    const config = { env: "production" as const, publicOrigin: "https://lolwikidj.example.com" };

    expect(isAllowedSocketOrigin("https://lolwikidj.example.com", config)).toBe(true);
    expect(isAllowedSocketOrigin("https://evil.example.com", config)).toBe(false);
    expect(isAllowedSocketOrigin(undefined, config)).toBe(false);
  });

  it("fails closed in production when PUBLIC_ORIGIN is missing", () => {
    expect(isAllowedSocketOrigin("https://lolwikidj.example.com", { env: "production", publicOrigin: undefined })).toBe(false);
  });
});
