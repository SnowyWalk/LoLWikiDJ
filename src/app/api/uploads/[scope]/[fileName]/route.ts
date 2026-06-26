import { loadConfig } from "@/lib/config";
import { ImagePolicyError, parseImageScope } from "@/lib/images/policy";
import { readStoredImage } from "@/lib/images/storage";
import { ensureStoragePaths } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    scope: string;
    fileName: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;

  try {
    const config = loadConfig();
    await ensureStoragePaths(config);
    const stored = await readStoredImage(config, parseImageScope(params.scope), params.fileName);

    return new Response(toBodyInit(stored.body), {
      headers: {
        "content-type": stored.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof ImagePolicyError) {
      const status = error.code === "INVALID_SCOPE" || error.code === "INVALID_FILE_NAME" ? 404 : 400;
      return Response.json({ error: error.message, code: error.code }, { status });
    }

    return Response.json({ error: "Image not found." }, { status: 404 });
  }
}

function toBodyInit(buffer: Buffer) {
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);
  return body;
}
