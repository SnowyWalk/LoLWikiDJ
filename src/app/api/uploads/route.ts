import { loadConfig } from "@/lib/config";
import { ImagePolicyError, MAX_UPLOAD_BYTES, parseImageScope } from "@/lib/images/policy";
import { storeUploadedImage } from "@/lib/images/storage";
import { isAllowedOrigin } from "@/lib/origin";
import { ensureStoragePaths } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let config: ReturnType<typeof loadConfig>;
    try {
      config = loadConfig();
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid server configuration.", code: "CONFIG_ERROR" },
        { status: 500 },
      );
    }

    if (!isAllowedOrigin(request.headers.get("origin") ?? undefined, config)) {
      return Response.json({ error: "Upload origin is not allowed.", code: "INVALID_ORIGIN" }, { status: 403 });
    }

    const rawContentLength = request.headers.get("content-length");
    if (!rawContentLength || !/^\d+$/.test(rawContentLength)) {
      return Response.json({ error: "Upload requires a valid Content-Length header.", code: "LENGTH_REQUIRED" }, { status: 411 });
    }

    const contentLength = Number(rawContentLength);
    if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
      return Response.json({ error: "Upload request is too large.", code: "IMAGE_TOO_LARGE" }, { status: 413 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file field." }, { status: 400 });
    }

    const scope = parseImageScope(stringValue(form.get("scope")));
    await ensureStoragePaths(config);
    const stored = await storeUploadedImage(config, scope, file);

    return Response.json(stored, { status: 201 });
  } catch (error) {
    if (error instanceof ImagePolicyError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.code === "IMAGE_TOO_LARGE" ? 413 : 400 });
    }

    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}
