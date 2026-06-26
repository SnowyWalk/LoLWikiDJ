# Deployment

LoLWikiDJ2 runs as one HTTP-only Next.js container. TLS termination and public ingress stay outside the app container, normally in Nginx, Caddy, Traefik, or a cloud load balancer.

## Local Docker

```sh
cp .env.example .env
docker compose up --build
```

The app listens on `APP_PORT` on the host and port `3000` inside the container. Liveness is available at `/healthz`; readiness is available at `/readyz` and verifies writable cache/upload storage plus realtime readiness.
The reference Compose file binds the host port to `127.0.0.1` so public traffic reaches the app through the reverse proxy.
`PUBLIC_ORIGIN` is required in production and must match the browser-visible HTTPS origin exactly.

## Persistent Data

The compose file mounts the named volume `lolwikidj_data` at `/app/data`.

- `/app/data/cache/lolwiki`: cached remote LoLWiki images served through `/api/image-cache`
- `/app/data/uploads/chat`: chat blob uploads served through `/api/uploads/chat/...`
- `/app/data/uploads/lolwiki`: LoLWiki write/reply/icon uploads served through `/api/uploads/lolwiki/...`

Keep this volume when updating the image if cached files and uploads should survive deploys.
Run one writer container against this volume. Multi-container horizontal scaling is not supported by the local filesystem storage contract; use shared/object storage before scaling app replicas.

## Reverse Proxy

Use `deploy/nginx/lolwikidj.conf` as the Nginx reference. The important contract is:

- terminate HTTPS in the proxy, not in the Node container
- forward `Host`, `X-Forwarded-*`, `Upgrade`, and `Connection`
- use HTTP/1.1 upstream proxying for Socket.IO websocket upgrades
- set `PUBLIC_ORIGIN` in `.env` to the public HTTPS origin used by browsers

Replace `lolwikidj.example.com` and certificate paths before deploying.
