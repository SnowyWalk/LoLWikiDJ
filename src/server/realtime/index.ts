import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { loadConfig } from "../../lib/config";
import { isAllowedSocketOrigin } from "./origin";
import { RealtimeState } from "./state";
import type {
  ChatMessage,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";

export type RealtimeServer = {
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  state: RealtimeState;
  getHealth: () => {
    ready: boolean;
    clients: number;
  };
};

export function attachRealtime(server: HttpServer): RealtimeServer {
  const config = loadConfig();
  const state = new RealtimeState();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    path: "/socket.io",
    cors: {
      origin: config.publicOrigin ?? false,
      credentials: Boolean(config.publicOrigin),
    },
    allowRequest: (request, callback) => {
      callback(null, isAllowedSocketOrigin(request.headers.origin, config));
    },
  });

  io.on("connection", (socket) => {
    socket.emit("server:hello", {
      socketId: socket.id,
      message: "LoLWikiDJ realtime boundary ready",
    });

    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("login", (nick, ack) => {
      const user = state.login(socket.id, nick);
      socket.data.nick = user.nick;
      ack?.({ ok: true, nick: user.nick });
      socket.emit("login", { ok: true, nick: user.nick, users: state.getUsers() });
      broadcastPresence(io, state);
    });

    socket.on("chat_newUser", () => {
      broadcastPresence(io, state);
    });

    socket.on("chat_message", (input) => {
      const nick = state.getNick(socket.id);
      if (!nick || !input?.message) {
        return;
      }

      const user = state.getUserBySocket(socket.id);
      const message: ChatMessage = {
        type: input.type ?? "message",
        message: String(input.message).slice(0, 2000),
        name: nick,
        time: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
        icon_id: user?.icon_id ?? 0,
        icon_ver: user?.icon_ver ?? 0,
      };

      io.emit("chat_update", message);
    });

    socket.on("users", () => {
      socket.emit("users", state.getUsers());
    });

    socket.on("djs", () => {
      socket.emit("djs", state.getDjs());
    });

    socket.on("refresh", () => {
      socket.emit("users", state.getUsers());
      socket.emit("djs", state.getDjs());
      socket.emit("queue_list", state.getQueue());
      socket.emit("playing", state.getPlayback());
    });

    socket.on("dj_enter", () => {
      const nick = state.getNick(socket.id);
      if (!nick) {
        return;
      }
      io.emit("djs", state.enterDj(nick));
    });

    socket.on("dj_quit", () => {
      const nick = state.getNick(socket.id);
      if (!nick) {
        return;
      }
      io.emit("djs", state.quitDj(nick));
    });

    socket.on("queue", (input) => {
      const nick = state.getNick(socket.id);
      if (!nick || !input?.video_id) {
        return;
      }

      const item = state.enqueue(input, nick);
      if (!item) {
        return;
      }

      io.emit("queue_list", state.getQueue());
      io.emit("playing", state.getPlayback());
    });

    socket.on("queue_list", () => {
      socket.emit("queue_list", state.getQueue());
    });

    socket.on("playing", () => {
      socket.emit("playing", state.getPlayback());
    });

    socket.on("disconnect", () => {
      state.disconnect(socket.id);
      broadcastPresence(io, state);
    });
  });

  return {
    io,
    state,
    getHealth: () => ({
      ready: true,
      clients: io.engine.clientsCount,
    }),
  };
}

function broadcastPresence(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  state: RealtimeState,
) {
  io.emit("users", state.getUsers());
  io.emit("djs", state.getDjs());
}
