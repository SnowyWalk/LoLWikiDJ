import { loadConfig } from "@/lib/config";
import { getCachedLolwikiImage } from "@/lib/images/cache";
import { ImagePolicyError } from "@/lib/images/policy";
import { ensureStoragePaths } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceUrl = url.searchParams.get("url");
  if (!sourceUrl) {
    return Response.json({ error: "Missing url parameter." }, { status: 400 });
  }

  try {
    const config = loadConfig();
    await ensureStoragePaths(config);
    const cached = await getCachedLolwikiImage(config, sourceUrl);

    return new Response(toBodyInit(cached.body), {
      headers: {
        "content-type": cached.contentType,
        "cache-control": "public, max-age=86400",
        "x-lolwikidj-cache": cached.cacheStatus,
        "x-lolwikidj-cache-file": cached.fileName,
      },
    });
  } catch (error) {
    if (error instanceof ImagePolicyError) {
      return Response.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return Response.json({ error: "Image cache fetch failed." }, { status: 502 });
  }
}

function toBodyInit(buffer: Buffer) {
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);
  return body;
}
