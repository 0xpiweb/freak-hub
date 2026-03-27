// Upstash Redis REST API — single-command POST format.
// POST {url}  body: ["COMMAND", "arg1", "arg2", ...]
// Response:   { "result": "value", "error": null }

async function upstash(cmd: unknown[]): Promise<unknown> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[kv] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set');
    throw new Error('Upstash env vars missing');
  }
  const res  = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  const json = await res.json();
  if (json.error) throw new Error(`Upstash: ${json.error}`);
  return json.result;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await upstash(['GET', key]) as string | null;
    console.log(`[kv] GET "${key}" →`, raw ? raw.slice(0, 120) : 'null');
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[kv] GET "${key}" failed:`, err);
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    const result = await upstash(['SET', key, JSON.stringify(value)]);
    console.log(`[kv] SET "${key}" →`, result);
  } catch (err) {
    console.error(`[kv] SET "${key}" failed:`, err);
  }
}
