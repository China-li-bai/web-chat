export interface Env {
  GEMINI_API_KEY: string; // put via `wrangler secret put GEMINI_API_KEY`
  ALLOWED_ORIGIN?: string; // optional CORS allow origin
  WORKER_SHARED_SECRET?: string; // optional shared secret to accept backend calls
  RATE_LIMIT_PER_MIN?: string; // optional per-IP limit per minute (default 60)
}

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:1420';
const DEFAULT_RATE_LIMIT = 60;

function buildCorsHeaders(origin?: string) {
  const allowOrigin = origin || DEFAULT_ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Auth',
  };
}

// Best-effort in-memory rate limiter (per isolate)
const BUCKET = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string, limit: number) {
  const now = Date.now();
  const entry = BUCKET.get(ip);
  if (!entry || now > entry.reset) {
    BUCKET.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildCorsHeaders(env.ALLOWED_ORIGIN) });
    }

    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(env.ALLOWED_ORIGIN) },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: buildCorsHeaders(env.ALLOWED_ORIGIN),
      });
    }

    // optional internal auth from backend
    if (env.WORKER_SHARED_SECRET) {
      const token = request.headers.get('X-Internal-Auth');
      if (!token || token !== env.WORKER_SHARED_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(env.ALLOWED_ORIGIN) },
        });
      }
    }

    // rate limiting (best-effort)
    const limit = parseInt(env.RATE_LIMIT_PER_MIN || '') || DEFAULT_RATE_LIMIT;
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip, limit)) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(env.ALLOWED_ORIGIN) },
      });
    }

    // only forward Gemini generateContent paths
    // expected path example: /v1beta/models/gemini-2.5-flash-preview-tts:generateContent
    const upstreamPath = url.pathname;
    if (!/^\/v1beta\/models\/.+:generateContent$/.test(upstreamPath)) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(env.ALLOWED_ORIGIN) },
      });
    }

    const upstreamUrl = `https://generativelanguage.googleapis.com${upstreamPath}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

    // forward the JSON body as-is
    const body = await request.text();

    const resp = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'cf-worker-gemini-proxy',
      },
      body,
    });

    // pass through body and status; attach CORS
    const text = await resp.text();
    const headers = new Headers(resp.headers);
    const cors = buildCorsHeaders(env.ALLOWED_ORIGIN);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    // ensure JSON content-type if upstream lacks one
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    return new Response(text, { status: resp.status, headers });
  },
};

