import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { loadConfig } from "../lib/config";
import { getHealth } from "../lib/health";
import { ensureStoragePaths } from "../lib/storage";
import { attachRealtime } from "./realtime/index";

async function main() {
  const config = loadConfig();
  await ensureStoragePaths(config);

  const app = next({ dev: config.isDev, hostname: config.host, port: config.port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    if (req.url === "/healthz") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url === "/readyz") {
      const body = await getHealth(config, realtime.getHealth());
      res.statusCode = body.status === "ok" ? 200 : 503;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ status: body.status }));
      return;
    }

    const parsedUrl = parse(req.url ?? "/", true);
    await handle(req, res, parsedUrl);
  });

  const realtime = attachRealtime(server);

  server.listen(config.port, config.host, () => {
    console.log(`LoLWikiDJ2 ready on http://${config.host}:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
