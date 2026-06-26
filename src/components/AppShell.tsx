"use client";

import { FormEvent, useState } from "react";
import { LolwikiPanel } from "@/components/lolwiki/LolwikiPanel";
import { useRealtime } from "@/hooks/useRealtime";
import { useThemeMode } from "@/hooks/useThemeMode";

const tabs = ["Chat", "DJ", "Recent", "Option"] as const;
type Tab = (typeof tabs)[number];

export function AppShell() {
  const realtime = useRealtime();
  const { theme, toggleTheme } = useThemeMode();
  const [activeTab, setActiveTab] = useState<Tab>("Chat");
  const [nickInput, setNickInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [videoInput, setVideoInput] = useState("");

  function submitLogin(event: FormEvent) {
    event.preventDefault();
    realtime.login(nickInput);
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    realtime.sendMessage(chatInput);
    setChatInput("");
  }

  function submitQueue(event: FormEvent) {
    event.preventDefault();
    realtime.queueVideo(videoInput);
    setVideoInput("");
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold">LoLWikiDJ2</h1>
            <div className="text-xs text-[var(--muted)]">
              {realtime.connected ? "connected" : "offline"} {realtime.nick ? `/ ${realtime.nick}` : ""}
            </div>
          </div>
          <button
            className="rounded border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--hover)]"
            type="button"
            onClick={toggleTheme}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>

        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[360px_1fr]">
          <aside className="grid min-h-0 grid-rows-[auto_auto_1fr] border-r border-[var(--line)] bg-[var(--panel)]">
            <form className="grid gap-2 border-b border-[var(--line)] p-3" onSubmit={submitLogin}>
              <input
                className="rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 outline-none focus:border-cyan-500"
                onChange={(event) => setNickInput(event.target.value)}
                placeholder="닉네임"
                value={nickInput}
              />
              <button className="rounded bg-cyan-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-cyan-400">
                Login
              </button>
            </form>

            <nav className="grid grid-cols-4 border-b border-[var(--line)]">
              {tabs.map((tab) => (
                <button
                  className={`border-r border-[var(--line)] px-2 py-3 text-sm last:border-r-0 ${
                    activeTab === tab ? "bg-[var(--selected)] font-semibold" : "hover:bg-[var(--hover)]"
                  }`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </nav>

            <section className="min-h-0 overflow-auto p-3">
              {activeTab === "Chat" ? (
                <div className="grid gap-2">
                  {realtime.messages.map((message, index) => (
                    <div className="rounded border border-[var(--line)] bg-[var(--surface)] p-2" key={`${message.time}-${index}`}>
                      <div className="flex justify-between gap-2 text-xs text-[var(--muted)]">
                        <span>{message.name}</span>
                        <span>{message.time}</span>
                      </div>
                      <div className="mt-1 break-words text-sm">{message.message}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeTab === "DJ" ? (
                <div className="grid gap-4">
                  <div>
                    <div className="mb-2 text-sm font-semibold">Users</div>
                    <ul className="grid gap-1 text-sm">
                      {realtime.users.map((user) => (
                        <li className="rounded bg-[var(--surface)] px-2 py-1" key={user.socketId}>
                          {user.nick}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-semibold">DJ Queue</div>
                    <ul className="grid gap-1 text-sm">
                      {realtime.djs.map((dj) => (
                        <li className="rounded bg-[var(--surface)] px-2 py-1" key={dj}>
                          {dj}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 rounded border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--hover)]" onClick={realtime.enterDj} type="button">
                      Enter
                    </button>
                    <button className="flex-1 rounded border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--hover)]" onClick={realtime.quitDj} type="button">
                      Quit
                    </button>
                  </div>
                </div>
              ) : null}

              {activeTab === "Recent" ? <RecentList /> : null}
              {activeTab === "Option" ? <OptionsPanel /> : null}
            </section>
          </aside>

          <section className="grid min-h-0 grid-rows-[1fr_auto] bg-[var(--app-bg)]">
            <div className="grid min-h-0 grid-rows-[1fr_auto]">
              <div className="grid place-items-center border-b border-[var(--line)] p-4">
                <div className="w-full max-w-3xl">
                  <div className="aspect-video rounded border border-[var(--line)] bg-black" />
                  <div className="mt-3 grid gap-2">
                    <form className="flex gap-2" onSubmit={submitQueue}>
                      <input
                        className="min-w-0 flex-1 rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 outline-none focus:border-cyan-500"
                        onChange={(event) => setVideoInput(event.target.value)}
                        placeholder="YouTube/Twitch ID"
                        value={videoInput}
                      />
                      <button className="rounded bg-[var(--button)] px-4 py-2 font-semibold text-[var(--button-fg)] hover:opacity-90">
                        Queue
                      </button>
                    </form>
                    <QueueList items={realtime.queue} />
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 gap-3 p-3 lg:grid-cols-2">
                <PlaylistPanel />
                <LolwikiPanel />
              </div>
            </div>

            <form className="flex gap-2 border-t border-[var(--line)] bg-[var(--panel)] p-3" onSubmit={submitChat}>
              <input
                className="min-w-0 flex-1 rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 outline-none focus:border-cyan-500"
                disabled={!realtime.nick}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={realtime.nick ? "채팅 메시지" : "로그인 후 채팅"}
                value={chatInput}
              />
              <button className="rounded bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-50" disabled={!realtime.nick}>
                Send
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function QueueList({ items }: { items: Array<{ id: string; video_id: string; dj: string }> }) {
  return (
    <div className="max-h-32 overflow-auto rounded border border-[var(--line)] bg-[var(--panel)]">
      {items.length === 0 ? (
        <div className="p-3 text-sm text-[var(--muted)]">대기열이 비어 있습니다.</div>
      ) : (
        <ol className="divide-y divide-[var(--line)]">
          {items.map((item) => (
            <li className="flex justify-between gap-3 p-2 text-sm" key={item.id}>
              <span className="truncate">{item.video_id}</span>
              <span className="text-[var(--muted)]">{item.dj}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RecentList() {
  return <div className="rounded border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">최근 영상 없음</div>;
}

function OptionsPanel() {
  return (
    <div className="grid gap-2 text-sm">
      <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface)] p-2">
        <input type="checkbox" defaultChecked />
        <span>멘션 알림</span>
      </label>
      <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface)] p-2">
        <input type="checkbox" defaultChecked />
        <span>TTS 자동 재생</span>
      </label>
    </div>
  );
}

function PlaylistPanel() {
  return (
    <section className="min-h-48 rounded border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Playlist</h2>
        <button className="rounded border border-[var(--line)] px-2 py-1 text-sm hover:bg-[var(--hover)]" type="button">
          New
        </button>
      </div>
      <div className="text-sm text-[var(--muted)]">재생목록을 선택하세요.</div>
    </section>
  );
}
