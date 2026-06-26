export function toLocalLolwikiImageUrl(sourceUrl: string) {
  if (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://")) {
    return sourceUrl;
  }

  return `/api/image-cache?url=${encodeURIComponent(sourceUrl)}`;
}

export async function uploadLolwikiImage(file: File) {
  const form = new FormData();
  form.set("scope", "lolwiki");
  form.set("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed with ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    url: string;
    fileName: string;
    contentType: string;
    bytes: number;
  };
}
