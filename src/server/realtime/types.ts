export type UserInfo = {
  nick: string;
  socketId: string;
  joinedAt: string;
  icon_id: number;
  icon_ver: number;
};

export type ChatMessageInput = {
  type?: "message" | "system";
  message: string;
  tts_hash?: string;
};

export type ChatMessage = {
  type: "message" | "system";
  message: string;
  name: string;
  time: string;
  icon_id: number;
  icon_ver: number;
};

export type QueueInput = {
  dj?: string;
  video_id: string;
  is_twitch?: boolean;
};

export type QueueItem = {
  id: string;
  dj: string;
  video_id: string;
  is_twitch: boolean;
  queuedAt: string;
};

export type PlaybackState = {
  currentDj: string;
  videoId: string;
  title: string;
  isTwitch: boolean;
  startedAt: string | null;
};

export type ServerToClientEvents = {
  "server:hello": (payload: { socketId: string; message: string }) => void;
  login: (payload: { ok: boolean; nick: string; users: UserInfo[] }) => void;
  chat_update: (message: ChatMessage) => void;
  users: (users: UserInfo[]) => void;
  djs: (djs: string[]) => void;
  queue_list: (queue: QueueItem[]) => void;
  playing: (state: PlaybackState) => void;
  pong: () => void;
};

export type ClientToServerEvents = {
  ping: () => void;
  login: (nick: string, ack?: (payload: { ok: boolean; nick: string }) => void) => void;
  chat_newUser: () => void;
  chat_message: (message: ChatMessageInput) => void;
  users: () => void;
  djs: () => void;
  refresh: () => void;
  dj_enter: () => void;
  dj_quit: () => void;
  queue: (item: QueueInput) => void;
  queue_list: () => void;
  playing: () => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  nick?: string;
};
