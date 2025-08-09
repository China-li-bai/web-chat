# Gemini Proxy Worker

This Worker proxies requests to Google Generative Language (Gemini) API and injects the API key server-side, so clients don’t send keys over the wire. It also supports optional shared-secret auth and CORS.

## Quick Start

- cd cf-worker/gemini-proxy
- npx wrangler login
- npx wrangler secret put GEMINI_API_KEY
- (optional) npx wrangler secret put WORKER_SHARED_SECRET
- (optional) npx wrangler deploy --var ALLOWED_ORIGIN=http://localhost:1420
- npx wrangler deploy

Copy the deployed URL (e.g. https://gemini-proxy.<your-subdomain>.workers.dev) to your backend .env as GEMINI_PROXY_URL and set USE_GEMINI_PROXY=true. If you set WORKER_SHARED_SECRET in Cloudflare, also set the same value in your backend .env.

## Endpoints

- POST /v1beta/models/gemini-2.5-flash-preview-tts:generateContent
  - Body: same JSON structure as Google Generative Language API
  - Headers: Content-Type: application/json
  - Optional header: X-Internal-Auth: <WORKER_SHARED_SECRET>

## Notes
- The API key is stored only in Cloudflare via `wrangler secret`.
- CORS defaults to http://localhost:1420; configure ALLOWED_ORIGIN as needed.
- You can add routes in wrangler.toml to bind a custom domain if desired.

