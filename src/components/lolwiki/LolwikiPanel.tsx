"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import type {
  LocalImageRef,
  LolwikiArticleDetail,
  LolwikiArticleSummary,
  LolwikiIconChangePayload,
  LolwikiReplyPayload,
  LolwikiWritePayload,
} from "@/lib/lolwiki/contracts";
import { toLocalLolwikiImageUrl, uploadLolwikiImage } from "@/lib/lolwiki/images";

const sampleArticles: LolwikiArticleSummary[] = [
  {
    postSeq: 1001,
    title: "오늘의 재생목록",
    nickname: "system",
    date: "2026-06-26",
    imageUrl: "http://lolwiki.kr/freeboard/uploads/files/2024/sample.png",
  },
  {
    postSeq: 1002,
    title: "이미지 캐시 테스트",
    nickname: "system",
    date: "2026-06-26",
  },
];

export function LolwikiPanel() {
  const [selectedSeq, setSelectedSeq] = useState(sampleArticles[0]?.postSeq ?? 0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [writeImage, setWriteImage] = useState<LocalImageRef | null>(null);
  const [replyImage, setReplyImage] = useState<LocalImageRef | null>(null);
  const [iconImage, setIconImage] = useState<LocalImageRef | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [lastPayload, setLastPayload] = useState<LolwikiWritePayload | LolwikiReplyPayload | LolwikiIconChangePayload | null>(null);

  const selected = useMemo<LolwikiArticleDetail>(() => {
    const article = sampleArticles.find((item) => item.postSeq === selectedSeq) ?? sampleArticles[0];
    return {
      ...article,
      body: "LoLWiki article detail surface",
      replies: [
        {
          replySeq: 1,
          nickname: "system",
          body: "reply image payloads use local URLs",
        },
      ],
    };
  }, [selectedSeq]);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, setter: (image: LocalImageRef) => void) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setStatus("uploading");
    try {
      setter(await uploadLolwikiImage(file));
      setStatus("uploaded");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "upload failed");
      setStatus("error");
    } finally {
      event.target.value = "";
    }
  }

  function submitWrite(event: FormEvent) {
    event.preventDefault();
    const payload: LolwikiWritePayload = {
      subject,
      body,
      youtubeUrl,
      image: writeImage ?? undefined,
    };
    setLastPayload(payload);
    setStatus("write-ready");
  }

  function submitReply(event: FormEvent) {
    event.preventDefault();
    const payload: LolwikiReplyPayload = {
      postSeq: selected.postSeq,
      body: reply,
      image: replyImage ?? undefined,
    };
    setLastPayload(payload);
    setStatus("reply-ready");
  }

  function submitIconChange() {
    if (!iconImage) {
      setError("아이콘 이미지를 먼저 업로드하세요.");
      return;
    }

    setLastPayload({ image: iconImage });
    setStatus("icon-ready");
  }

  return (
    <section className="grid min-h-48 gap-3 rounded border border-[var(--line)] bg-[var(--panel)] p-3 lg:grid-cols-[220px_1fr]">
      <div className="min-h-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">LoLWiki</h2>
          <span className="text-xs text-[var(--muted)]">{status}</span>
        </div>
        <div className="grid gap-2">
          {sampleArticles.map((article) => (
            <button
              className={`rounded border border-[var(--line)] p-2 text-left text-sm ${
                selectedSeq === article.postSeq ? "bg-[var(--selected)]" : "bg-[var(--surface)] hover:bg-[var(--hover)]"
              }`}
              key={article.postSeq}
              onClick={() => setSelectedSeq(article.postSeq)}
              type="button"
            >
              <div className="font-semibold">{article.title}</div>
              <div className="text-xs text-[var(--muted)]">
                {article.nickname} / {article.date}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <article className="rounded border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex justify-between gap-3">
            <h3 className="font-semibold">{selected.title}</h3>
            <span className="text-xs text-[var(--muted)]">#{selected.postSeq}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{selected.body}</p>
          {selected.imageUrl ? (
            <div className="relative mt-3 h-28 overflow-hidden rounded border border-[var(--line)]">
              <Image alt="" className="object-cover" fill sizes="(min-width: 1024px) 40vw, 100vw" src={toLocalLolwikiImageUrl(selected.imageUrl)} unoptimized />
            </div>
          ) : null}
        </article>

        <form className="grid gap-2 rounded border border-[var(--line)] p-3" onSubmit={submitWrite}>
          <input className="rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 text-sm" onChange={(event) => setSubject(event.target.value)} placeholder="제목" value={subject} />
          <textarea className="min-h-20 rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 text-sm" onChange={(event) => setBody(event.target.value)} placeholder="본문" value={body} />
          <input className="rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 text-sm" onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="YouTube URL" value={youtubeUrl} />
          <ImageUploadRow image={writeImage} label="post image" onChange={(event) => uploadImage(event, setWriteImage)} />
          <button className="rounded bg-[var(--button)] px-3 py-2 text-sm font-semibold text-[var(--button-fg)]">Write</button>
        </form>

        <form className="grid gap-2 rounded border border-[var(--line)] p-3" onSubmit={submitReply}>
          <textarea className="min-h-16 rounded border border-[var(--line)] bg-[var(--input)] px-3 py-2 text-sm" onChange={(event) => setReply(event.target.value)} placeholder="댓글" value={reply} />
          <ImageUploadRow image={replyImage} label="reply image" onChange={(event) => uploadImage(event, setReplyImage)} />
          <button className="rounded border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--hover)]">Reply</button>
        </form>

        <div className="grid gap-2 rounded border border-[var(--line)] p-3">
          <ImageUploadRow image={iconImage} label="icon image" onChange={(event) => uploadImage(event, setIconImage)} />
          <button className="rounded border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--hover)]" onClick={submitIconChange} type="button">
            Icon
          </button>
        </div>

        {error ? <div className="rounded border border-red-500/60 bg-red-950/40 p-2 text-sm text-red-200">{error}</div> : null}
        {lastPayload ? (
          <pre className="max-h-40 overflow-auto rounded border border-[var(--line)] bg-[var(--input)] p-2 text-xs text-[var(--muted)]">
            {JSON.stringify(lastPayload, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}

function ImageUploadRow({
  image,
  label,
  onChange,
}: {
  image: LocalImageRef | null;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-[var(--muted)]">
      <span>{label}</span>
      <input accept="image/png,image/jpeg,image/gif,image/webp" className="text-sm" onChange={onChange} type="file" />
      {image ? <span className="truncate">{image.url}</span> : null}
    </label>
  );
}
