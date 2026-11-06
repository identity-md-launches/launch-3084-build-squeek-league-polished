// Only public chain data, preferences, and unsigned drafts are persisted.
export function cached<T>(key: string): T | undefined {
  try { const data = localStorage.getItem(key); return data ? JSON.parse(data) as T : undefined; } catch { return undefined; }
}
export function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private mode / storage quota: reads still work. */ }
}
export function forget(key: string) { try { localStorage.removeItem(key); } catch { /* Optional cache. */ } }
