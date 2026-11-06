import { useMemo, useState } from 'react';
import { ArrowRight, FlaskConical, Share2 } from 'lucide-react';
import { backtestDays, dateLabel, historyDays, pickLabel, score, validPick, type Pick } from '../game';
import type { useLeague } from '../useLeague';
import { SlotPicker } from './SlotPicker';
import { ErrorNotice, Loading } from './Shared';
import type { ShareResult } from './Share';
export function Backtest({ day, data, onShare }: { day: number; data: ReturnType<typeof useLeague>; onShare: (result: ShareResult) => void }) {
  const [pick, setPick] = useState<Pick>({ slots: [], sleep: false });
  const days = useMemo(() => backtestDays(data.history ? historyDays(data.history) : [], data.counts), [data.history, data.counts]);
  const ready = validPick(pick);
  const results = ready ? days.map(d => ({ ...d, points: score(pick, d.counts, data.overview?.sleepPoints ?? 25) })) : [];
  const average = results.length ? Math.floor(results.reduce((s, d) => s + d.points, 0) / results.length) : undefined;
  return <><div className="page-heading"><div><h1>What if you’d picked…</h1><p>Try any 3 hours. See every past result. No wallet needed.</p></div><FlaskConical size={34} className="page-icon"/></div><div className="backtest-layout"><section className="panel"><h2>Test your hunch</h2><p className="small muted">Change your hours to recalculate instantly.</p><SlotPicker id="backtest" day={day} pick={pick} onChange={setPick}/><div className="backtest-average"><span>Average per completed day</span><strong>{average === undefined ? '—' : average}<small> / 100</small></strong></div><p className="small muted">Sleep calls earn 25 only on a completely idle day.</p></section>
    <section className="backtest-results" aria-labelledby="results-title"><div className="section-heading"><h2 id="results-title">Your alternate history</h2><span className="small muted">{days.length} completed {days.length === 1 ? 'day' : 'days'}</span></div>
    {data.historyError && <ErrorNotice retry={() => void data.refresh()}>{data.historyError}</ErrorNotice>}{data.eventsError && <ErrorNotice retry={() => void data.refresh()}>League days could not be loaded. Pre-league history is still available.</ErrorNotice>}
    {!data.history && !data.historyError && <Loading text={`Loading certified history · ${data.historyProgress.done}/${data.historyProgress.total || '…'}`}/>}
    <div role="status" className="backtest-feedback">{ready ? `${pickLabel(pick)}${pick.sleep ? '' : ' UTC'} · ${results.length} results` : 'Choose 3 hours or a Sleep call to see your scores.'}</div>
    {ready && results.length === 0 && <div className="empty-state"><h3>No completed days available yet</h3><p>Only fully certified pre-league days and settled league days can be backtested.</p><button className="secondary" onClick={() => void data.refresh()}>Refresh history</button></div>}
    {results.map(d => <article className="result-row" key={d.day}><div><h3>{dateLabel(d.day, true)}</h3><span className="small muted">{d.source === 'league' ? `Settled match ${d.day + 1}` : 'Pre-league · certified rounds'}</span></div><div className="result-points"><strong>{d.points}</strong><span className="small muted">points</span></div><button className="icon-button" aria-label={`Share what-if result for ${dateLabel(d.day)}`} onClick={() => onShare({ day: d.day, pick, points: d.points, simulated: true })}><Share2 size={17}/></button></article>)}
    <p className="small muted result-note">These are what-if scores, never league points. Completed league days use the contract’s slotCounts; earlier days use roundPage.</p><a className="text-link" href="#draft">Ready to make it count? Draft next match <ArrowRight size={15}/></a></section></div></>;
}
