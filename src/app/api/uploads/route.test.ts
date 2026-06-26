import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("POST /api/uploads", () => {
  it("requires a valid Content-Length header before parsing multipart data", async () => {
    mutableEnv().NODE_ENV = "test";
    const response = await POST(new Request("http://localhost/api/uploads", { method: "POST", body: new FormData() }));
    const body = await response.json();

    expect(response.status).toBe(411);
    expect(body.code).toBe("LENGTH_REQUIRED");
  });

  it("fails fast for production uploads when PUBLIC_ORIGIN is not configured", async () => {
    mutableEnv().NODE_ENV = "production";
    delete process.env.PUBLIC_ORIGIN;

    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        headers: {
          "content-length": "1",
          origin: "https://lolwikidj.example.com",
        },
        body: new FormData(),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("CONFIG_ERROR");
    expect(body.error).toContain("PUBLIC_ORIGIN");
  });
});

function mutableEnv() {
  return process.env as Record<string, string | undefined>;
}
