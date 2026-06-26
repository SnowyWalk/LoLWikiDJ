import { describe, expect, it } from "vitest";
import { toLocalLolwikiImageUrl } from "./images";

describe("toLocalLolwikiImageUrl", () => {
  it("routes remote images through the local image cache endpoint", () => {
    const source = "http://lolwiki.kr/freeboard/uploads/files/2024/test.png";

    expect(toLocalLolwikiImageUrl(source)).toBe(`/api/image-cache?url=${encodeURIComponent(source)}`);
  });

  it("keeps already local image paths unchanged", () => {
    expect(toLocalLolwikiImageUrl("/api/uploads/lolwiki/a.png")).toBe("/api/uploads/lolwiki/a.png");
  });
});
