import { describe, expect, it } from "vitest";
import { RealtimeState } from "./state";

describe("RealtimeState", () => {
  it("tracks login, DJ queue membership, and disconnect cleanup", () => {
    const state = new RealtimeState();

    const user = state.login("socket-1", "  alice  ");
    state.enterDj(user.nick);

    expect(user.nick).toBe("alice");
    expect(state.getUsers()).toHaveLength(1);
    expect(state.getDjs()).toEqual(["alice"]);

    state.disconnect("socket-1");

    expect(state.getUsers()).toEqual([]);
    expect(state.getDjs()).toEqual([]);
  });

  it("starts playback from the first queued item", () => {
    const state = new RealtimeState();
    state.login("socket-1", "alice");

    const item = state.enqueue({ video_id: "abc123" }, state.getNick("socket-1"));
    const playback = state.getPlayback();

    expect(item).not.toBeNull();
    expect(item!.dj).toBe("alice");
    expect(playback.videoId).toBe("abc123");
    expect(playback.currentDj).toBe("alice");
    expect(state.getQueue()).toHaveLength(1);
  });

  it("uses the authenticated socket nick instead of client-supplied DJ names", () => {
    const state = new RealtimeState();

    const item = state.enqueue({ video_id: "abc123", dj: "mallory" }, "alice");

    expect(item?.dj).toBe("alice");
  });

  it("rejects empty queue items and caps stored video ids", () => {
    const state = new RealtimeState();

    expect(state.enqueue({ video_id: "   " }, "alice")).toBeNull();

    const item = state.enqueue({ video_id: "x".repeat(300) }, "alice");
    expect(item?.video_id).toHaveLength(256);
  });
});
