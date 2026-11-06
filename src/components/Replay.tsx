import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, Film, Share2 } from 'lucide-react';
import { playerPick, read, roundPage, scalar } from '../chain';
import { dateLabel, endRound, hours, hourLabel, pickLabel, score, startRound, type Pick, type PlayerPick } from '../game';
import { explainError } from '../errors';
import { mapLimited } from '../rpc';
import type { useLeague } from '../useLeague';
import { Address, ErrorNotice, Loading } from './Shared';
import type { ShareResult } from './Share';
export function Replay({ data, day, account, onDay, onShare }: { data: ReturnType<typeof useLeague>; day?: number; account?: string; onDay: (day: number) => void; onShare: (result: ShareResult) => void }) {
  const [counts, setCounts] = useState<number[]>();
  const [active, setActive] = useState<Set<number>>();
  const [picks, setPicks] = useState<PlayerPick[]>();
  const [bot, setBot] = useState<Pick>();
  const [view, setView] = useState<string>('house');
  const [error, setError] = useState('');
  const [roundError, setRoundError] = useState('');
  const [retry, setRetry] = useState(0);
  const latest = data.overview ? data.overview.next - 1 : -1;
  const selectedDay = day ?? latest;
  const settledDays = useMemo(() => Array.from({ length: Math.max(0, latest + 1) }, (_, i) => i).reverse(), [latest]);
  useEffect(() => {
    let current = true; setCounts(undefined); setPicks(undefined); setActive(undefined); setBot(undefined); setError(''); setRoundError(''); setView('house');
    if (selectedDay < 0 || !data.overview || selectedDay > latest) return;
    void (async () => {
      if (!await scalar<boolean>('isSettled', [selectedDay])) throw new Error('DayNotSettled');
      const c = Array.from(await scalar<bigint[]>('slotCounts', [selectedDay]), Number);
      if (current) setCounts(c);
      if (selectedDay >= 2 && await scalar<boolean>('isSettled', [selectedDay - 2])) { const b = await read('botDraft', [selectedDay]); if (current) setBot({ sleep: b.sleep, slots: b.sleep ? [] : Array.from(b.slots, Number) }); }
      if (!data.events) return; // Player picks stay unknown until a log scan succeeds.
      const players = [...new Set(data.events.filter(e => e.name === 'PicksLocked' && e.day === selectedDay).map(e => e.player!))];
      const p = await mapLimited(players, player => playerPick(selectedDay, player));
      const scored = p.filter(p => p.locked).map(p => {
        const event = data.events?.find(e => e.name === 'Scored' && e.day === selectedDay && e.player?.toLowerCase() === p.player.toLowerCase());
        return { ...p, points: event?.points ?? score(p, c) };
      });
      if (current) { setPicks(scored); if (account && scored.some(p => p.player.toLowerCase() === account.toLowerCase())) setView(account.toLowerCase()); }
    })().catch(e => { if (current) setError(explainError(e)); });
    const spans: [number, number][] = [];
    for (let after = startRound(selectedDay) - 1; after < endRound(selectedDay); after += 16) spans.push([after, Math.min(after + 16, endRound(selectedDay))]);
    void mapLimited(spans, ([after, through]) => roundPage(data.overview!.core, after, through)).then(pages => { if (current) setActive(new Set(pages.flatMap(p => p.active))); }).catch(e => { if (current) setRoundError(explainError(e)); });
    return () => { current = false; };
  }, [selectedDay, latest, data.overview?.core, data.events, data.updated, account, retry]);
  const displayed = view === 'house' ? bot : picks?.find(p => p.player.toLowerCase() === view);
  const sharePick = (p: Pick, points: number) => onShare({ day: selectedDay, pick: p, points, simulated: false });
  return <><div className="page-heading"><div><h1>Every round tells a story.</h1><p>Replay a settled match, straight from the chain.</p></div><Film size={34} className="page-icon"/></div>
    {!data.overview ? data.error ? <ErrorNotice retry={() => void data.refresh()}>{data.error}</ErrorNotice> : <Loading/> : latest < 0 ? <div className="empty-state panel"><h2>The first replay is still ahead</h2><p>Match 1 starts November 8, 2026 UTC. Once a day ends and is settled, every player’s public picks and points appear here.</p><a className="secondary link-button" href="#backtest">Explore pre-league history</a></div> : <>
    <div className="replay-controls"><label>Settled match<select value={selectedDay} onChange={e => onDay(Number(e.target.value))}>{settledDays.map(d => <option key={d} value={d}>Match {d + 1} · {dateLabel(d, true)}</option>)}</select></label><label>Highlight picks<select value={view} onChange={e => setView(e.target.value)}><option value="house">House Bot</option>{picks?.map(p => <option key={p.player} value={p.player.toLowerCase()}>{p.player}{p.player.toLowerCase() === account?.toLowerCase() ? ' (you)' : ''}</option>)}</select></label></div>
    {selectedDay > latest && <ErrorNotice>This match has not settled yet. Choose a settled day.</ErrorNotice>}{error && <ErrorNotice retry={() => setRetry(n => n + 1)}>{error}</ErrorNotice>}
    {counts && <section className="panel replay-panel"><div className="section-heading"><h2>{dateLabel(selectedDay)} on the wheel</h2><span className="small muted">{counts.reduce((a, b) => a + b, 0)} active / 144 rounds</span></div><p className="small muted">{displayed ? `${view === 'house' ? 'House Bot' : 'Selected player'}: ${pickLabel(displayed)}${displayed.sleep ? '' : ' UTC'}` : 'No public House Bot preview for the first two matches. Choose a player to highlight their picks.'}</p>
      {roundError ? <ErrorNotice retry={() => setRetry(n => n + 1)}>Round detail unavailable. Hour counts below are certified contract totals. {roundError}</ErrorNotice> : !active && <Loading text="Reading all 144 round outcomes…"/>}
      <div className="replay-grid" aria-label="24 hours, six ten-minute rounds per hour">{hours.map(hour => {
        const drafted = displayed?.slots.includes(hour);
        const hit = drafted && counts[hour] > 0;
        return <div key={hour} className={`replay-hour ${drafted ? hit ? 'replay-hit' : 'replay-miss' : ''}`} aria-label={`${hourLabel(hour)} UTC, ${counts[hour]} active rounds${drafted ? hit ? ', drafted, hit' : ', drafted, miss' : ''}`}><div><span>{hourLabel(hour)}</span>{drafted && (hit ? <Check size={12}/> : <span className="small">×</span>)}</div><div className="rounds-six">{Array.from({ length: 6 }, (_, index) => { const round = startRound(selectedDay) + hour * 6 + index; return <span key={round} className={!active ? 'round-unknown' : active.has(round) ? 'round-active' : 'round-idle'} title={`Round ${round}: ${!active ? 'not loaded' : active.has(round) ? 'active' : 'idle'}`}/>; })}</div><span className="round-count small">{counts[hour]}/6 active</span></div>;
      })}</div><div className="replay-legend"><span><i className="round-active"/> Active round</span><span><i className="round-idle"/> Idle round</span><span><i className="replay-hit"/> Draft hit</span><span><i className="replay-miss"/> Draft miss</span></div>
    </section>}
    <section className="replay-players"><h2>Everyone’s calls</h2>{data.eventsError && <ErrorNotice retry={() => void data.refresh()}>{data.events ? 'Player logs could not refresh. Showing the last complete scan.' : 'Player history unavailable. Player logs could not load.'} {data.eventsError}</ErrorNotice>}{!data.events && !data.eventsError ? <Loading text={data.eventsProgress}/> : data.events && !picks && !error ? <Loading text="Reading public picks…"/> : <>
      {((bot && counts) || !!picks?.length) && <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable match and player table"><table><thead><tr><th>Player</th><th>UTC picks</th><th>Points</th><th>Result</th></tr></thead><tbody>{bot && counts && <tr><td><span className="inline-flex"><Bot size={17}/> House Bot</span></td><td>{pickLabel(bot)}</td><td>{score(bot, counts)}</td><td><span className="small muted">Virtual player</span></td></tr>}{picks?.map(p => <tr key={p.player}><td><Address address={p.player} me={account}/></td><td>{pickLabel(p)}</td><td>{p.points}{!p.scored && <span className="small muted"> · unscored</span>}</td><td>{p.scored && <button className="icon-button" aria-label={`Share result for ${p.player}`} onClick={() => sharePick(p, p.points!)}><Share2 size={16}/></button>}</td></tr>)}</tbody></table></div>}
      {picks?.length === 0 && !data.eventsError && <p className="empty-state">No player picks were locked for this day.</p>}{picks && <p className="small muted">Unscored points are calculated from certified counts and enter the standings after Score picks.</p>}</>}</section>
    </>}
  </>;
}
