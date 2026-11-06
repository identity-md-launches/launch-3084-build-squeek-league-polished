import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result } from 'ethers';
import { apiCore, loadEvents, loadHistory, liveWheel, playerPick, read, scalar, settledCounts, type ChainEvent, type LiveWheel } from './chain';
import type { ActiveHistory, Pick, PlayerPick } from './game';
import { explainError } from './errors';
import { mapLimited } from './rpc';

export type Overview = { day: number; core: string; next: number; opens: number; closes: number; dayStart: number; sleepPoints: number; streamId: string; bot?: Pick };
export type Season = { points: { player: string; points: number }[]; bot: number; top: number; leaders: string[]; pending: number; crowned: boolean };
export function useLeague(day: number, account?: string) {
  const [overview, setOverview] = useState<Overview>();
  const [boundCore, setBoundCore] = useState<string>();
  const [verification, setVerification] = useState<'checking' | 'match' | 'mismatch' | 'unavailable'>('checking');
  const [apiAddress, setApiAddress] = useState<string>();
  const [wheel, setWheel] = useState<LiveWheel>({ state: 'unknown' });
  const [history, setHistory] = useState<ActiveHistory>();
  const [frontier, setFrontier] = useState<number>();
  const [historyProgress, setHistoryProgress] = useState({ done: 0, total: 0 });
  const [historyError, setHistoryError] = useState('');
  const [events, setEvents] = useState<ChainEvent[]>();
  const [eventsProgress, setEventsProgress] = useState('Reading league events');
  const [eventsError, setEventsError] = useState('');
  const [counts, setCounts] = useState<Map<number, number[]>>(new Map());
  const [pick, setPick] = useState<PlayerPick>();
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<number>();
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const pickRequest = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setRefreshing(true);
    const wheelRequest = liveWheel().then(v => { if (alive.current) setWheel(v); }).catch(() => { if (alive.current) setWheel({ state: 'unknown' }); });
    const eventRequest = loadEvents(setEventsProgress).then(async values => {
      const settled = await settledCounts(values);
      if (alive.current) { setEvents(values); setCounts(settled); setEventsError(''); }
    }).catch(e => { if (alive.current) setEventsError(explainError(e)); });
    try {
      const core = await scalar<string>('core');
      if (alive.current) setBoundCore(core);
      const verificationRequest = apiCore().then(api => {
        if (alive.current) { setApiAddress(api); setVerification(api.toLowerCase() === core.toLowerCase() ? 'match' : 'mismatch'); }
      }).catch(() => { if (alive.current) setVerification('unavailable'); });
      const historyRequest = loadHistory(core, (done, total) => { if (alive.current) { setHistoryProgress({ done, total }); setFrontier(total); } }).then(data => { if (alive.current) { setHistory(data); setHistoryError(''); } }).catch(e => { if (alive.current) setHistoryError(explainError(e)); });
      const [next, window, start, sleepPoints, streamId] = await Promise.all([
        scalar('nextDayToSettle'), read('lockWindow', [day]), scalar('dayStartTime', [day]), scalar('sleepPoints'), scalar<string>('streamId'),
      ]);
      let bot: Pick | undefined;
      if (day >= 2 && await scalar<boolean>('isSettled', [day - 2])) {
        const b = await read('botDraft', [day]);
        bot = { sleep: b.sleep, slots: b.sleep ? [] : Array.from(b.slots, Number) };
      }
      if (alive.current) { setOverview({ day, core, next: Number(next), opens: Number(window.opens), closes: Number(window.closes), dayStart: Number(start), sleepPoints: Number(sleepPoints), streamId, bot }); setError(''); setUpdated(Date.now()); }
      await Promise.allSettled([verificationRequest, historyRequest]);
    } catch (e) { if (alive.current) { setError(explainError(e)); } }
    await Promise.allSettled([wheelRequest, eventRequest]);
    busy.current = false;
    if (alive.current) setRefreshing(false);
  }, [day]);
  useEffect(() => { if (overview && overview.day !== day && !refreshing) void refresh(); }, [overview, day, refreshing, refresh]);
  useEffect(() => { void refresh(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000); return () => clearInterval(timer); }, [refresh]);
  const refreshPick = useCallback(async () => {
    const request = ++pickRequest.current;
    setPick(undefined);
    if (account) { try { const value = await playerPick(day, account); if (alive.current && request === pickRequest.current) setPick(value); } catch { /* The form shows that this pick could not be verified. */ } }
  }, [account, day]);
  useEffect(() => { void refreshPick(); }, [refreshPick, updated]);
  return { overview: overview?.day === day ? overview : undefined, boundCore, verification, apiAddress, wheel, history, frontier, historyProgress, historyError, events, eventsProgress, eventsError, counts, pick, error, updated, refreshing, refresh, refreshPick };
}
export function useSeason(season: number, events: ChainEvent[] | undefined, updated?: number) {
  const [data, setData] = useState<Season>();
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true; setData(undefined); setError('');
    const players = [...new Set((events ?? []).filter(e => (e.day !== undefined && Math.floor(e.day / 7) === season) && e.player).map(e => e.player!))];
    void Promise.all([
      mapLimited(players, async player => ({ player, points: Number(await scalar('seasonPoints', [season, player])) })),
      scalar('botPoints', [season]), scalar('topScore', [season]), scalar<Result>('leaders', [season]), scalar('pendingPicks', [season]), scalar<boolean>('crowned', [season]),
    ]).then(([points, bot, top, leaders, pending, crowned]) => {
      if (current) setData({ points: points.sort((a, b) => b.points - a.points || a.player.localeCompare(b.player)), bot: Number(bot), top: Number(top), leaders: Array.from(leaders, String), pending: Number(pending), crowned });
    }).catch(e => { if (current) setError(explainError(e)); });
    return () => { current = false; };
  }, [season, events, updated]);
  return { data, error };
}
