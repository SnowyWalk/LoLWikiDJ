"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  ClientToServerEvents,
  QueueItem,
  ServerToClientEvents,
  UserInfo,
} from "@/server/realtime/types";

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useRealtime() {
  const socketRef = useRef<RealtimeSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [nick, setNick] = useState("");
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [djs, setDjs] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const nextSocket: RealtimeSocket = io({
      path: "/socket.io",
    });

    socketRef.current = nextSocket;

    nextSocket.on("connect", () => setConnected(true));
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("users", setUsers);
    nextSocket.on("djs", setDjs);
    nextSocket.on("queue_list", setQueue);
    nextSocket.on("chat_update", (message) => {
      setMessages((current) => [...current.slice(-199), message]);
    });

    return () => {
      nextSocket.close();
      socketRef.current = null;
    };
  }, []);

  const login = useCallback(
    (nextNick: string) => {
      const socket = socketRef.current;
      const cleanNick = nextNick.trim();
      if (!socket || !cleanNick) {
        return;
      }

      socket.emit("login", cleanNick, (ack) => {
        if (ack.ok) {
          setNick(ack.nick);
          socket.emit("refresh");
        }
      });
    },
    [],
  );

  const sendMessage = useCallback(
    (message: string) => {
      const socket = socketRef.current;
      if (!socket || !nick || !message.trim()) {
        return;
      }

      socket.emit("chat_message", {
        type: "message",
        message: message.trim(),
      });
    },
    [nick],
  );

  const enterDj = useCallback(() => socketRef.current?.emit("dj_enter"), []);
  const quitDj = useCallback(() => socketRef.current?.emit("dj_quit"), []);
  const queueVideo = useCallback(
    (videoId: string) => {
      const socket = socketRef.current;
      if (!socket || !videoId.trim()) {
        return;
      }

      socket.emit("queue", {
        dj: nick,
        video_id: videoId.trim(),
      });
    },
    [nick],
  );

  return useMemo(
    () => ({
      connected,
      nick,
      users,
      djs,
      queue,
      messages,
      login,
      sendMessage,
      enterDj,
      quitDj,
      queueVideo,
    }),
    [connected, djs, enterDj, login, messages, nick, queue, queueVideo, quitDj, sendMessage, users],
  );
}
