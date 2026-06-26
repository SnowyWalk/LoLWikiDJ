# LoLWikiDJ2

Next.js, Tailwind CSS v4, and Socket.IO migration of the LoLWikiDJ app.

## Requirements

- Node.js 24 or compatible current LTS
- npm
- Docker or Docker Compose for container operation

## Local Development

```sh
npm install
npm run dev
```

The dev server uses the custom Node HTTP server at `http://localhost:3000` by default.

Useful checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP bind host |
| `PORT` | `3000` | HTTP bind port |
| `PUBLIC_ORIGIN` | required in production | Public HTTPS origin behind a reverse proxy; used as the browser origin trust boundary |
| `DATA_DIR` | `data` | Parent directory for cache and uploads |
| `CACHE_DIR` | `${DATA_DIR}/cache` | Remote image cache root |
| `UPLOAD_DIR` | `${DATA_DIR}/uploads` | Uploaded image root |

## Image Storage

- LoLWiki remote images are routed through `/api/image-cache?url=...` and cached locally under `CACHE_DIR/lolwiki`.
- Chat and LoLWiki uploaded images are stored under `UPLOAD_DIR` and served through `/api/uploads/:scope/:fileName`.
- Blob/base64 payloads should be uploaded first, then referenced by the returned local URL.

## Docker

```sh
cp .env.example .env
docker compose up --build
```

The app container listens on HTTP only. Put TLS termination in an external reverse proxy. See `docs/deployment.md` and `deploy/nginx/lolwikidj.conf`.

Docker deployment is intentionally single-writer stateful: one app container owns the mounted `/app/data` volume for cache and upload writes. Horizontal scaling requires moving cache/uploads to shared object storage or another coordinated storage layer first.

## Migration Status

Implemented:

- Next.js app router shell with Tailwind CSS v4
- Custom HTTP server with Socket.IO compatibility layer
- Local LoLWiki image cache
- Local upload storage for chat and LoLWiki image payloads
- Dockerfile, Compose, and Nginx reverse proxy reference

Known gaps:

- Legacy playlist, media playback, admin, and external service integrations are represented by the new UI/contracts but not fully feature-complete.
- Docker build could not be executed in this workspace because Docker/Podman CLI is not installed.
