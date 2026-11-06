import { DAY_SECONDS, DAY_ZERO, FIRST_ROUND, ROUND_EPOCH, ROUNDS_PER_DAY } from './config';

export type Pick = { slots: number[]; sleep: boolean };
export type PlayerPick = Pick & { day: number; player: string; locked: boolean; scored: boolean; points?: number };
export type HistoryDay = { day: number; counts: number[]; complete: boolean; source: 'rounds' | 'league'; first: number; last: number };
export type ActiveHistory = { core: string; frontier: number; active: number[] };
export const hours = Array.from({ length: 24 }, (_, i) => i);
export const dayStart = (day: number) => DAY_ZERO + day * DAY_SECONDS;
export const startRound = (day: number) => FIRST_ROUND + day * ROUNDS_PER_DAY;
export const endRound = (day: number) => startRound(day) + ROUNDS_PER_DAY - 1;
export const dayAt = (seconds: number) => Math.floor((seconds - DAY_ZERO) / DAY_SECONDS);
export const draftDayAt = (seconds: number) => Math.max(0, dayAt(seconds) + 1);
export const seasonAt = (day: number) => Math.floor(Math.max(0, day) / 7);
export const roundBucket = (round: number) => {
  if (!Number.isSafeInteger(round) || round < 0) throw new Error('Round must be a nonnegative integer.');
  const seconds = ROUND_EPOCH + round * 600;
  return { day: dayAt(seconds), slot: new Date(seconds * 1000).getUTCHours(), minute: new Date(seconds * 1000).getUTCMinutes() };
};
export function validPick(pick: Pick) {
  return pick.sleep ? pick.slots.length === 0 : pick.slots.length === 3 && new Set(pick.slots).size === 3 && pick.slots.every(x => Number.isInteger(x) && x >= 0 && x < 24);
}
export function score(pick: Pick, counts: readonly number[], sleepPoints = 25) {
  if (!validPick(pick)) throw new Error('Choose 3 distinct hours, or a Sleep call.');
  if (counts.length !== 24 || counts.some(x => !Number.isInteger(x) || x < 0 || x > 6)) throw new Error('Expected 24 certified hour counts from 0 to 6.');
  return pick.sleep ? (counts.every(x => x === 0) ? sleepPoints : 0) : Math.floor(100 * pick.slots.reduce((sum, slot) => sum + counts[slot], 0) / 18);
}
export function toggleSlot(pick: Pick, slot: number): Pick {
  if (!Number.isInteger(slot) || slot < 0 || slot > 23) return pick;
  const slots = pick.sleep ? [] : pick.slots;
  return { sleep: false, slots: slots.includes(slot) ? slots.filter(x => x !== slot) : slots.length < 3 ? [...slots, slot].sort((a, b) => a - b) : slots };
}
export function historyDays(history: ActiveHistory): HistoryDay[] {
  if (history.frontier < 1) return [];
  const firstDay = roundBucket(1).day;
  const lastDay = roundBucket(history.frontier).day;
  const map = new Map<number, HistoryDay>();
  for (let day = firstDay; day <= lastDay; day++) {
    const first = Math.max(1, startRound(day));
    const last = Math.min(endRound(day), history.frontier);
    map.set(day, { day, first, last, counts: Array(24).fill(0), complete: startRound(day) >= 1 && endRound(day) <= history.frontier, source: 'rounds' });
  }
  for (const round of new Set(history.active)) {
    if (round < 1 || round > history.frontier) continue;
    const { day, slot } = roundBucket(round);
    const entry = map.get(day);
    if (entry) entry.counts[slot]++;
  }
  return [...map.values()];
}
export function mergeHistory(raw: HistoryDay[], settled: Map<number, number[]>): HistoryDay[] {
  const all = new Map(raw.map(d => [d.day, d]));
  for (const [day, counts] of settled) all.set(day, { day, counts, complete: true, source: 'league', first: startRound(day), last: endRound(day) });
  return [...all.values()].sort((a, b) => a.day - b.day);
}
export function backtestDays(raw: HistoryDay[], settled: Map<number, number[]>) {
  return mergeHistory(raw.filter(d => d.day < 0 && d.complete), settled).filter(d => d.complete);
}
export function remaining(seconds: number) {
  seconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export const dateLabel = (day: number, long = false) => new Intl.DateTimeFormat('en', { month: long ? 'long' : 'short', day: 'numeric', timeZone: 'UTC', ...(long ? { year: 'numeric' } : {}) }).format(dayStart(day) * 1000);
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
export const localHour = (day: number, hour: number) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format((dayStart(day) + hour * 3600) * 1000);
export const pickLabel = (pick: Pick) => pick.sleep ? 'Sleep call' : pick.slots.map(hourLabel).join(' · ');
