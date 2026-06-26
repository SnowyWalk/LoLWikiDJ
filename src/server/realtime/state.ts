import crypto from "node:crypto";
import type { PlaybackState, QueueInput, QueueItem, UserInfo } from "./types";

const MAX_QUEUE_ITEMS = 200;
const MAX_VIDEO_ID_LENGTH = 256;

export class RealtimeState {
  private readonly users = new Map<string, UserInfo>();
  private readonly socketToNick = new Map<string, string>();
  private readonly djs: string[] = [];
  private readonly queue: QueueItem[] = [];
  private playback: PlaybackState = {
    currentDj: "",
    videoId: "",
    title: "재생 중인 영상이 없습니다.",
    isTwitch: false,
    startedAt: null,
  };

  login(socketId: string, rawNick: string) {
    const nick = sanitizeNick(rawNick);
    const previousNick = this.socketToNick.get(socketId);
    if (previousNick && previousNick !== nick) {
      this.users.delete(previousNick);
      removeValue(this.djs, previousNick);
    }

    const user: UserInfo = {
      nick,
      socketId,
      joinedAt: new Date().toISOString(),
      icon_id: hashNick(nick),
      icon_ver: 0,
    };

    this.socketToNick.set(socketId, nick);
    this.users.set(nick, user);
    return user;
  }

  disconnect(socketId: string) {
    const nick = this.socketToNick.get(socketId);
    if (!nick) {
      return;
    }

    this.socketToNick.delete(socketId);
    this.users.delete(nick);
    removeValue(this.djs, nick);
  }

  getNick(socketId: string) {
    return this.socketToNick.get(socketId) ?? "";
  }

  getUserBySocket(socketId: string) {
    const nick = this.getNick(socketId);
    return nick ? this.users.get(nick) : undefined;
  }

  getUsers() {
    return [...this.users.values()].sort((a, b) => a.nick.localeCompare(b.nick));
  }

  getDjs() {
    return [...this.djs];
  }

  enterDj(nick: string) {
    if (!nick || this.djs.includes(nick)) {
      return this.getDjs();
    }

    this.djs.push(nick);
    return this.getDjs();
  }

  quitDj(nick: string) {
    removeValue(this.djs, nick);
    return this.getDjs();
  }

  enqueue(input: QueueInput, fallbackDj: string) {
    const videoId = String(input.video_id || "").trim().slice(0, MAX_VIDEO_ID_LENGTH);
    if (!videoId) {
      return null;
    }

    if (this.queue.length >= MAX_QUEUE_ITEMS) {
      this.queue.shift();
    }

    const item: QueueItem = {
      id: crypto.randomUUID(),
      dj: fallbackDj || "anonymous",
      video_id: videoId,
      is_twitch: Boolean(input.is_twitch),
      queuedAt: new Date().toISOString(),
    };

    this.queue.push(item);

    if (!this.playback.videoId) {
      this.playback = {
        currentDj: item.dj,
        videoId: item.video_id,
        title: item.video_id,
        isTwitch: item.is_twitch,
        startedAt: item.queuedAt,
      };
    }

    return item;
  }

  getQueue() {
    return [...this.queue];
  }

  getPlayback() {
    return { ...this.playback };
  }
}

function sanitizeNick(rawNick: string) {
  const nick = String(rawNick || "").trim().slice(0, 32);
  return nick || `guest-${crypto.randomUUID().slice(0, 8)}`;
}

function hashNick(nick: string) {
  const hash = crypto.createHash("sha1").update(nick).digest("hex");
  return Number.parseInt(hash.slice(0, 6), 16);
}

function removeValue(values: string[], value: string) {
  const index = values.indexOf(value);
  if (index >= 0) {
    values.splice(index, 1);
  }
}
