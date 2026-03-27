const REST_URL   = 'UPSTASH_REDIS_REST_URL';
const REST_TOKEN = 'UPSTASH_REDIS_REST_TOKEN';

export async function kvGet<T>(key: string): Promise<T | null> {
  const url   = process.env[REST_URL];
  const token = process.env[REST_TOKEN];
  if (!url || !token) return null;
  try {
    const res  = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.result != null ? (JSON.parse(json.result) as T) : null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const url   = process.env[REST_URL];
  const token = process.env[REST_TOKEN];
  if (!url || !token) return;
  await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]]),
  });
}
