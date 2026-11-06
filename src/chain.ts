import { AbiCoder, id, isAddress, type Result } from 'ethers';
import { CORE_ABI, DEPLOY_BLOCK, ECONOMY_API, LEAGUE, STATUS_API, coreInterface, leagueInterface } from './config';
import { cached, forget, persist } from './storage';
import { hex, mapLimited, rpc } from './rpc';
import type { ActiveHistory, PlayerPick } from './game';

export async function read(name: string, args: unknown[] = []): Promise<Result> {
  const data = await rpc<string>('eth_call', [{ to: LEAGUE, data: leagueInterface.encodeFunctionData(name, args) }, 'latest']);
  return leagueInterface.decodeFunctionResult(name, data);
}
export async function scalar<T = bigint>(name: string, args: unknown[] = []): Promise<T> { return (await read(name, args))[0] as T; }
export async function apiCore(): Promise<string> {
  const response = await fetch(ECONOMY_API, { signal: AbortSignal.timeout(15000), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
  if (!response.ok) throw new Error('Squeekchain API unavailable.');
  const data = await response.json();
  const address: unknown = data?.deployment?.components?.core?.address;
  if (typeof address !== 'string' || !isAddress(address)) throw new Error('Squeekchain core address unavailable.');
  return address;
}
export type LiveWheel = { state: 'running' | 'idle' | 'offline' | 'unknown'; observed?: string };
export async function liveWheel(): Promise<LiveWheel> {
  const response = await fetch(STATUS_API, { signal: AbortSignal.timeout(12000), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
  if (!response.ok) throw new Error('Wheel status unavailable.');
  const data = await response.json();
  const m = data?.measurement;
  if (!m || (m.freshness === 'online' && (!Number.isFinite(Number(m.rpmMilli)) || Number(m.rpmMilli) < 0))) return { state: 'unknown' };
  return { state: m?.freshness !== 'online' ? 'offline' : Number(m.rpmMilli) > 0 ? 'running' : 'idle', observed: m?.observedAt };
}
export async function frontierOf(core: string): Promise<number> {
  // state() has a static tuple. Only its first ABI word, settledThroughRound,
  // is decoded; no assumptions about later economic fields are needed.
  const data = await rpc<string>('eth_call', [{ to: core, data: id('state()').slice(0, 10) }, 'latest']);
  const [frontier] = AbiCoder.defaultAbiCoder().decode(['uint64'], data);
  const value = Number(frontier);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid certified frontier.');
  return value;
}
export async function roundPage(core: string, after: number, through: number) {
  if (through - after > 16 || through < after) throw new Error('Round page span exceeds 16.');
  const raw = await rpc<string>('eth_call', [{ to: core, data: coreInterface.encodeFunctionData('roundPage', [after, through, 16]) }, 'latest']);
  const result = coreInterface.decodeFunctionResult('roundPage', raw)[0];
  if (Number(result.certifiedThroughRound) < through) throw new Error('Page is not certified through the requested round.');
  return { frontier: Number(result.certifiedThroughRound), active: Array.from(result.rounds, (round: Result) => Number(round.roundId)) };
}
export async function loadHistory(core: string, onProgress: (done: number, total: number) => void): Promise<ActiveHistory> {
  const frontier = await frontierOf(core);
  const prefix = `sl:history:v1:${core.toLowerCase()}:`;
  const exact = cached<ActiveHistory>(`${prefix}${frontier}`);
  const valid = (v: ActiveHistory | undefined) => v && typeof v.core === 'string' && v.core.toLowerCase() === core.toLowerCase() && Number.isInteger(v.frontier) && v.frontier >= 0 && v.frontier <= frontier && Array.isArray(v.active) && v.active.every(r => Number.isInteger(r) && r > 0 && r <= v.frontier);
  if (valid(exact) && exact!.frontier === frontier) { onProgress(frontier, frontier); return exact!; }
  const previous = cached<ActiveHistory>(`${prefix}latest`);
  const base = valid(previous) ? previous! : { core, frontier: 0, active: [] };
  const spans: [number, number][] = [];
  for (let after = base.frontier; after < frontier; after += 16) spans.push([after, Math.min(after + 16, frontier)]);
  let done = base.frontier;
  onProgress(done, frontier);
  const pages = await mapLimited(spans, async ([after, through]) => {
    const key = `${prefix}page:${after}:${through}`;
    const saved = cached<number[]>(key);
    const result = Array.isArray(saved) && saved.every(r => Number.isInteger(r) && r > after && r <= through) ? saved : (await roundPage(core, after, through)).active;
    persist(key, result);
    done += through - after; onProgress(done, frontier);
    return result;
  });
  const history = { core, frontier, active: [...new Set([...base.active, ...pages.flat()])].sort((a, b) => a - b) };
  persist(`${prefix}${frontier}`, history); persist(`${prefix}latest`, history);
  if (base.frontier !== frontier) forget(`${prefix}${base.frontier}`);
  for (const [after, through] of spans) forget(`${prefix}page:${after}:${through}`);
  return history;
}
export type ChainEvent = { name: string; block: number; index: number; tx: string; day?: number; player?: string; slots?: number[]; sleep?: boolean; points?: number; counts?: number[]; season?: number; topScore?: number; champions?: number };
type RawLog = { topics: string[]; data: string; blockNumber: string; logIndex: string; transactionHash: string; removed?: boolean };
const logCacheKey = `sl:logs:v2:${LEAGUE.toLowerCase()}`;
export function decodeLog(log: RawLog): ChainEvent | undefined {
  if (log.removed) return;
  const event = leagueInterface.parseLog({ topics: log.topics, data: log.data });
  if (!event) return;
  const base = { name: event.name, block: Number(log.blockNumber), index: Number(log.logIndex), tx: log.transactionHash };
  const a = event.args;
  if (event.name === 'PicksLocked') return { ...base, day: Number(a.day), player: String(a.player), slots: Array.from(a.slots, Number), sleep: a.sleep };
  if (event.name === 'DaySettled') return { ...base, day: Number(a.day), counts: Array.from(a.counts, Number) };
  if (event.name === 'Scored') return { ...base, day: Number(a.day), player: String(a.player), points: Number(a.points) };
  if (event.name === 'ChampionCrowned') return { ...base, season: Number(a.season), player: String(a.player), points: Number(a.points) };
  if (event.name === 'SeasonClosed') return { ...base, season: Number(a.season), topScore: Number(a.topScore), champions: Number(a.champions) };
}
async function getLogRange(from: number, to: number): Promise<RawLog[]> {
  if (from > to) return [];
  if (to - from + 1 > 5000) throw new Error('Log range exceeds 5000 blocks.');
  try { return await rpc<RawLog[]>('eth_getLogs', [{ address: LEAGUE, fromBlock: hex(from), toBlock: hex(to), topics: [[...['PicksLocked','DaySettled','Scored','ChampionCrowned','SeasonClosed'].map(name => leagueInterface.getEvent(name)!.topicHash)]] }], true); }
  catch (error) {
    if (to - from < 50) throw error;
    const mid = Math.floor((from + to) / 2);
    return [...await getLogRange(from, mid), ...await getLogRange(mid + 1, to)];
  }
}
export async function loadEvents(onProgress: (text: string) => void): Promise<ChainEvent[]> {
  const tip = Number(await rpc<string>('eth_blockNumber', [], true));
  const safeTip = Math.max(DEPLOY_BLOCK - 1, tip - 12);
  const saved = cached<{ through: number; events: ChainEvent[] }>(logCacheKey);
  let through = saved && Number.isInteger(saved.through) && saved.through >= DEPLOY_BLOCK - 1 && saved.through <= safeTip && Array.isArray(saved.events) ? saved.through : DEPLOY_BLOCK - 1;
  const stable = through === saved?.through ? [...saved.events] : [];
  for (let from = through + 1; from <= safeTip; from += 5000) {
    const to = Math.min(from + 4999, safeTip);
    onProgress(`Reading league events, blocks ${from.toLocaleString()}–${to.toLocaleString()}`);
    const logs = await getLogRange(from, to);
    stable.push(...logs.map(decodeLog).filter((event): event is ChainEvent => !!event));
    through = to;
    persist(logCacheKey, { through, events: stable });
  }
  const recent = (await getLogRange(Math.max(DEPLOY_BLOCK, safeTip + 1), tip)).map(decodeLog).filter((event): event is ChainEvent => !!event);
  return [...new Map([...stable, ...recent].map(event => [`${event.tx}:${event.index}`, event])).values()].sort((a, b) => a.block - b.block || a.index - b.index);
}
export async function playerPick(day: number, player: string): Promise<PlayerPick> {
  const pick = await read('pickOf', [day, player]);
  return { day, player, locked: pick.locked, sleep: pick.sleep, scored: pick.scored, slots: pick.sleep ? [] : [Number(pick.a), Number(pick.b), Number(pick.c)] };
}
export async function settledCounts(events: ChainEvent[]): Promise<Map<number, number[]>> {
  const days = [...new Set(events.filter(e => e.name === 'DaySettled').map(e => e.day!))];
  const values = await mapLimited(days, async day => {
    const event = events.find(e => e.name === 'DaySettled' && e.day === day)!;
    const key = `sl:counts:v1:${LEAGUE.toLowerCase()}:${day}:${event.tx}`;
    const saved = cached<number[]>(key);
    const counts = saved && saved.length === 24 && saved.every(n => Number.isInteger(n) && n >= 0 && n <= 6) ? saved : Array.from(await scalar<Result>('slotCounts', [day]), Number);
    persist(key, counts);
    return [day, counts] as const;
  });
  return new Map(values);
}
export const coreAbiForDocs = CORE_ABI;
