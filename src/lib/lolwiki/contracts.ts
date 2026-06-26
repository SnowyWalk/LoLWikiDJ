export type LocalImageRef = {
  id: string;
  url: string;
  fileName: string;
  contentType: string;
  bytes: number;
};

export type LolwikiArticleSummary = {
  postSeq: number;
  title: string;
  nickname: string;
  date: string;
  imageUrl?: string;
};

export type LolwikiArticleDetail = LolwikiArticleSummary & {
  body: string;
  replies: LolwikiReply[];
};

export type LolwikiReply = {
  replySeq: number;
  nickname: string;
  body: string;
  imageUrl?: string;
};

export type LolwikiWritePayload = {
  subject: string;
  body: string;
  youtubeUrl: string;
  image?: LocalImageRef;
};

export type LolwikiReplyPayload = {
  postSeq: number;
  body: string;
  image?: LocalImageRef;
};

export type LolwikiIconChangePayload = {
  image: LocalImageRef;
};
