import { LOG_RPC, RPC_URLS } from './config';
let requestId = 0;
export class RpcError extends Error {
  code: number; data?: string;
  constructor(error: { message: string; code: number; data?: string }) { super(error.message); this.name = 'RpcError'; this.code = error.code; this.data = error.data; }
}
export async function rpc<T>(method: string, params: unknown[], logs = false): Promise<T> {
  const endpoints: readonly string[] = logs ? [LOG_RPC] : RPC_URLS;
  let failure: unknown;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }), signal: AbortSignal.timeout(18000), credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error(`RPC ${response.status}`);
      const result = await response.json();
      if (result.error) throw new RpcError(result.error);
      if (result.result === undefined) throw new Error('RPC returned no result.');
      return result.result as T;
    } catch (error) { failure = error; if (error instanceof RpcError && (error.code === 3 || (typeof error.data === 'string' && error.data.startsWith('0x')))) throw error; }
  }
  throw failure;
}
export const hex = (n: number) => `0x${n.toString(16)}`;
export async function mapLimited<T, U>(items: T[], fn: (item: T, index: number) => Promise<U>, limit = 3): Promise<U[]> {
  const result: U[] = Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; result[index] = await fn(items[index], index); }
  }));
  return result;
}
