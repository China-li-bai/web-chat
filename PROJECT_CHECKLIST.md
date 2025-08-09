# Project Development Checklist

This checklist tracks ongoing work for Cloudflare Worker integration and related improvements. Items marked [x] are completed.

## Cloudflare Worker Proxy Integration
- [x] Create Cloudflare Worker project (wrangler.toml, src/index.ts)
- [x] Implement proxy to Gemini with server-side API key injection
- [x] Add CORS handling and optional X-Internal-Auth shared secret
- [x] Add health check endpoint (/health)
- [x] Add simple per-IP rate limiting (configurable via RATE_LIMIT_PER_MIN)
- [x] Add cf-worker/gemini-proxy/README.md with usage instructions
- [x] Document the setup and usage in DEPLOYMENT.md
- [ ] Deploy the Worker to Cloudflare (wrangler login, secrets, deploy)
- [ ] Bind custom domain or use workers.dev URL (optional)

## Backend Updates
- [x] Stop appending API key in URL when using proxy (USE_GEMINI_PROXY=true)
- [x] Support optional WORKER_SHARED_SECRET header to Worker
- [x] Expose config-check endpoint for runtime verification
- [x] Add environment validation on startup (warn if USE_GEMINI_PROXY=true but GEMINI_PROXY_URL missing)

## Frontend Updates
- [x] Make apiManager parse backend JSON (base64) and binary audio responses
- [ ] Add UI toggle to switch between direct SDK and backend (if not already clear)
- [ ] Surface meaningful error messages to users on TTS failures

## Testing & Verification
- [ ] Local E2E test: frontend -> backend -> Worker -> Gemini, confirm audio playback
- [ ] Add unit tests around apiManager backend parsing (JSON base64 path)
- [ ] Add integration test for /api/gemini-tts (mock Worker)

## CI/CD & Ops
- [ ] Add GitHub/GitLab CI job to lint and type-check Worker (if applicable)
- [x] Add deployment scripts for Worker (package.json worker:deploy, worker:health)
- [ ] Add deployment doc for Worker promotion (dev -> prod)
- [ ] Monitoring: set up Cloudflare Analytics/Logs or logs sampling for error rates

## Security & Hardening
- [ ] Enforce X-Internal-Auth in Worker (make required in production env)
- [ ] Restrict ALLOWED_ORIGIN to production domains in prod deployment
- [ ] Consider adding request body size limits and schema validation at Worker

## Documentation
- [x] Add Worker section to DEPLOYMENT.md
- [x] Add Worker README
- [ ] Update .env.example guidance for WORKER_SHARED_SECRET and GEMINI_PROXY_URL defaults

---

Notes:
- To mark an item complete, change [ ] to [x] and include a brief note/date if useful.

