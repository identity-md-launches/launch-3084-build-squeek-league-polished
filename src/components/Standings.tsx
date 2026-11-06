import { useMemo, useState } from 'react';
import { Bot, Check, Crown, ListChecks, Share2, Trophy } from 'lucide-react';
import { playerPick } from '../chain';
import { CHAIN_ID } from '../config';
import { dateLabel, dayAt, dayStart, endRound, pickLabel, seasonAt, type PlayerPick } from '../game';
import { explainError } from '../errors';
import { mapLimited } from '../rpc';
import { useSeason, type useLeague } from '../useLeague';
import type { Wallet } from '../wallet';
import { Address, ErrorNotice, Loading } from './Shared';
import type { ShareResult } from './Share';
export function Standings({ data, wallet, now, onShare }: { data: ReturnType<typeof useLeague>; wallet: Wallet; now: number; onShare: (result: ShareResult) => void }) {
  const currentSeason = seasonAt(dayAt(now));
  const [chosenSeason, setChosenSeason] = useState<number>();
  const season = chosenSeason ?? currentSeason;
  const { data: standings, error } = useSeason(season, data.events, data.updated);
  const [scoreError, setScoreError] = useState('');
  const [checking, setChecking] = useState(false);
  const [batch, setBatch] = useState<PlayerPick[]>();
  const first = season * 7;
  const last = first + 6;
  const busy = wallet.tx?.state === 'wallet' || wallet.tx?.state === 'pending';
  const needsWallet = !wallet.account;
  // A failed scan proves nothing about who played, so empty claims wait for a current, successful one.
  const logsCurrent = !!data.events && !data.eventsError;
  const next = data.overview?.next;
  const canSettle = next !== undefined && dayAt(now) > next && data.frontier !== undefined && data.frontier >= endRound(next);
  const candidates = useMemo(() => (data.events ?? []).filter(e => e.name === 'PicksLocked' && e.day! >= first && e.day! <= last && next !== undefined && e.day! < next), [data.events, first, last, next]);
  const prepareScore = async () => {
    setScoreError(''); setChecking(true); setBatch(undefined);
    try {
      // Re-read pickOf immediately before each batch. Events identify players, never scored status.
      for (const day of [...new Set(candidates.map(c => c.day!))].sort((a, b) => a - b)) {
        const picks = await mapLimited([...new Set(candidates.filter(e => e.day === day).map(e => e.player!))], p => playerPick(day, p));
        const pending = picks.filter(p => p.locked && !p.scored).slice(0, 8);
        if (pending.length) { setBatch(pending); return; }
      }
      setScoreError('All known settled picks in this season are already scored. Refresh for new picks.');
    } catch (e) { setScoreError(explainError(e)); } finally { setChecking(false); }
  };
  const scoreBatch = async () => {
    if (!batch?.length) return;
    if (needsWallet) { wallet.setOpen(true); return; }
    setChecking(true); setScoreError('');
    try {
      const verified = (await mapLimited(batch, p => playerPick(p.day, p.player))).filter(p => p.locked && !p.scored).slice(0, 8);
      if (!verified.length) { setBatch(undefined); setScoreError('This batch is already scored. Check for the next batch.'); return; }
      void wallet.transact('scorePicks', [verified[0].day, verified.map(p => p.player)], 'Picks scored', () => { setBatch(undefined); void data.refresh(); });
    } catch (e) { setScoreError(explainError(e)); } finally { setChecking(false); }
  };
  const myPicks = (data.events ?? []).filter(e => e.name === 'PicksLocked' && e.player?.toLowerCase() === wallet.account?.toLowerCase()).sort((a, b) => b.day! - a.day!);
  const crownable = next !== undefined && next > last && now >= dayStart(last + 1) && standings?.pending === 0 && !standings.crowned;
  const action = (name: string, args: unknown[], label: string) => { if (needsWallet) wallet.setOpen(true); else void wallet.transact(name, args, label, () => { void data.refresh(); }); };
  return <><div className="page-heading"><div><h1>A small, spirited rivalry.</h1><p>Seven daily matches. One season. Every tied leader shares the title.</p></div><Trophy className="page-icon" size={34}/></div>
    <div className="section-heading season-heading"><label className="inline-label">Season<select value={season} onChange={e => { setChosenSeason(Number(e.target.value)); setBatch(undefined); }}>{Array.from({ length: currentSeason + 1 }, (_, n) => n).reverse().map(s => <option key={s} value={s}>Season {s + 1}</option>)}</select></label><span className="small muted">{dateLabel(first)} – {dateLabel(last, true)}</span></div>
    {(error || data.error) && <ErrorNotice retry={() => void data.refresh()}>{error || data.error}</ErrorNotice>}{data.eventsError && <ErrorNotice retry={() => void data.refresh()}>{data.events ? 'Player logs could not refresh. Showing the last complete scan.' : 'Player history unavailable. Player logs could not load.'} {data.eventsError}</ErrorNotice>}
    {!standings ? !error && <Loading text="Reading season scores from the contract…"/> : <>
    <div className="stats-strip"><div><span>Leading score</span><strong>{standings.top} <small>points</small></strong></div><div><span>Players with picks</span><strong>{data.events ? standings.points.length : '—'}</strong></div><div><span>Season status</span><strong>{standings.crowned ? 'Crowned' : crownable ? 'Ready to crown' : 'In play'}</strong></div></div>
    <section className="panel leaderboard"><div className="section-heading"><h2>Season {season + 1} standings</h2><span className="small muted">{data.events ? 'Contract scores' : data.eventsError ? 'Player history unavailable' : 'Loading player logs…'}</span></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable match and player table"><table><thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Title</th></tr></thead><tbody>{standings.points.map(row => { const leader = standings.leaders.some(a => a.toLowerCase() === row.player.toLowerCase()); return <tr key={row.player} className={row.player.toLowerCase() === wallet.account?.toLowerCase() ? 'personal-row' : ''}><td>{1 + standings.points.filter(p => p.points > row.points).length}</td><td><Address address={row.player} me={wallet.account}/></td><td className="points-cell">{row.points}</td><td>{leader ? <span className="inline-flex"><Crown size={16}/>{standings.crowned ? 'Champion' : 'Leading'}</span> : '—'}</td></tr>; })}<tr className="bot-row"><td>—</td><td><span className="inline-flex"><Bot size={18}/> House Bot</span><span className="small muted bot-row-note">Statistical rule · never crowned</span></td><td className="points-cell">{standings.bot}</td><td>—</td></tr></tbody></table></div>{standings.points.length === 0 && logsCurrent && <p className="empty-state">The league is just waking up. Lock a pick to join this season.</p>}{!data.events && !data.eventsError && <Loading text={data.eventsProgress}/>}</section>
    <section className="settlement-section" id="settle"><div><h2>Keep the league moving</h2><p>Anyone can settle, score, and close a season. Only testnet gas is needed.</p></div><div className="maintenance-grid"><div><span className="action-icon"><Check size={20}/></span><h3>Settle day</h3><p>{next === undefined ? data.error ? 'Next match unavailable. Refresh data to retry.' : 'Checking the next day…' : canSettle ? `Match ${next + 1} is certified and ready.` : dayAt(now) <= next ? `Match ${next + 1} must finish first.` : data.frontier === undefined ? 'Certification status unavailable. Refresh data to retry.' : `Waiting for Squeekchain to certify match ${next + 1}.`}</p><button className="secondary" disabled={!canSettle || busy || (!!wallet.account && wallet.chain !== CHAIN_ID)} onClick={() => action('settleDay', [next], 'Day settled')}>Settle day</button></div><div><span className="action-icon"><ListChecks size={20}/></span><h3>Score picks</h3><p>{standings.pending} {standings.pending === 1 ? 'pick' : 'picks'} pending in this season. Batches contain at most 8 players.</p><button className="secondary" disabled={checking || busy || !data.events || candidates.length === 0} onClick={() => void prepareScore()}>{checking ? 'Checking picks…' : 'Score picks'}</button></div><div><span className="action-icon"><Crown size={20}/></span><h3>Crown champion</h3><p>{standings.crowned ? 'Season closed. Tied titles are shared.' : 'All 7 days must settle and every pick must be scored.'}</p><button className="secondary" disabled={!crownable || busy || (!!wallet.account && wallet.chain !== CHAIN_ID)} onClick={() => action('crownChampion', [season], 'Season crowned')}>Crown champion</button></div></div>
      {scoreError && <p className="inline-error" role="status">{scoreError}</p>}{batch && <div className="batch-preview"><h3>Ready to score match {batch[0].day + 1}</h3><p className="small muted">This transaction scores {batch.length} unscored {batch.length === 1 ? 'player' : 'players'}.</p><ul>{batch.map(p => <li key={p.player} className="full-address">{p.player}</li>)}</ul><button className="primary" disabled={busy || checking || (!!wallet.account && wallet.chain !== CHAIN_ID)} onClick={() => void scoreBatch()}>Score this batch</button></div>}
    </section>
    </>}
    <section className="personal-history"><h2>Your match history</h2>{!wallet.account ? <p className="muted">Connect a wallet to see your public picks and scored results.</p> : myPicks.length === 0 && data.eventsError ? <p className="muted">Player history unavailable. <button className="text-button" onClick={() => void data.refresh()}>Retry</button></p> : !data.events ? <Loading text={data.eventsProgress}/> : myPicks.length === 0 ? <p className="muted">No picks found for this wallet yet. Your first draft starts the story.</p> : <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable match and player table"><table><thead><tr><th>Match</th><th>UTC picks</th><th>Points</th><th>Result</th></tr></thead><tbody>{myPicks.map(p => { const result = data.events?.find(e => e.name === 'Scored' && e.day === p.day && e.player?.toLowerCase() === p.player?.toLowerCase()); const pick = { slots: p.sleep ? [] : p.slots!, sleep: !!p.sleep }; return <tr key={p.day}><td><a href={`#replay/${p.day}`}>{dateLabel(p.day!)}</a></td><td>{pickLabel(pick)}</td><td>{result?.points ?? 'Unscored'}</td><td>{result && <button className="icon-button" aria-label={`Share match ${p.day! + 1} result`} onClick={() => onShare({ day: p.day!, pick, points: result.points!, simulated: false })}><Share2 size={16}/></button>}</td></tr>; })}</tbody></table></div>}</section>
  </>;
}
