import { useMemo, useState } from 'react';
import { ArrowRight, ChartNoAxesCombined, Download, Info } from 'lucide-react';
import { dateLabel, dayStart, historyDays, hourLabel, hours, type HistoryDay } from '../game';
import type { useLeague } from '../useLeague';
import { ErrorNotice, Loading } from './Shared';
export function Activity({ data }: { data: ReturnType<typeof useLeague> }) {
  const [onlyFull, setOnlyFull] = useState(false);
  const [selected, setSelected] = useState<{ day: number; hour: number }>();
  const raw = useMemo(() => data.history ? historyDays(data.history) : [], [data.history]);
  const days = onlyFull ? raw.filter(d => d.complete) : raw;
  const totals = hours.map(hour => days.reduce((sum, d) => sum + d.counts[hour], 0));
  const busiest = [...hours].sort((a, b) => totals[b] - totals[a] || a - b).slice(0, 3).filter(h => totals[h] > 0);
  const selectedDay = days.find(d => d.day === selected?.day);
  const download = () => {
    const csv = 'date_utc,day,hour_utc,active_rounds,complete\n' + days.flatMap(d => hours.map(h => `${new Date(dayStart(d.day) * 1000).toISOString().slice(0,10)},${d.day},${h},${d.counts[h]},${d.complete}`)).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'squeek-league-certified-hours.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <><div className="page-heading"><div><h1>When does he run?</h1><p>A little history beats a lucky guess.</p></div><ChartNoAxesCombined className="page-icon" size={34}/></div>
    {data.historyError && <ErrorNotice retry={() => void data.refresh()}>{data.historyError}{data.history && ' Showing the last complete cache; refresh is pending.'}</ErrorNotice>}
    {!data.history ? !data.historyError && <Loading text={`Reading certified rounds${data.historyProgress.total ? ` · ${data.historyProgress.done}/${data.historyProgress.total}` : '…'}`}/> : <>
      <div className="stats-strip"><div><span>Certified through</span><strong>Round {data.history.frontier.toLocaleString()}</strong></div><div><span>Active rounds</span><strong>{data.history.active.length.toLocaleString()}</strong></div><div><span>Busiest UTC hours</span><strong>{busiest.length ? busiest.map(h => String(h).padStart(2, '0')).join(' · ') : 'No activity yet'}</strong></div></div>
      <section className="panel heatmap-panel"><div className="section-heading"><h2>The wheel, hour by hour</h2><button className="secondary compact" onClick={download}><Download size={15}/> Export CSV</button></div><div className="heatmap-controls"><label className="checkbox-label"><input type="checkbox" checked={onlyFull} onChange={e => setOnlyFull(e.target.checked)}/> Completed days only</label><span className="small muted">Every cell = 1 UTC hour</span></div>
        <div className="heatmap" tabIndex={0} role="group" aria-label="Daily certified activity by UTC hour"><div className="heatmap-header"><span>Date</span><div>{hours.map(h => <span key={h}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</span>)}</div></div>{days.map(day => <HeatRow key={day.day} day={day} selected={selected} choose={(hour) => setSelected({ day: day.day, hour })}/>)}</div>
        {days.length === 0 && <p className="empty-state">No full day is certified yet. Turn off the filter to see partial history.</p>}
        <div className="heatmap-footer"><p className="small" role="status">{selected && selectedDay ? `${dateLabel(selected.day)} · ${hourLabel(selected.hour)} UTC: ${selectedDay.counts[selected.hour]} active of 6 rounds${selectedDay.complete ? '' : ' (partial day)'}.` : 'Select a cell for its exact count.'}</p><div className="heat-legend"><span>Idle</span>{[0,1,2,3,4,5,6].map(n => <i key={n} className={`heat-${n}`}/>)}<span>6 active</span></div></div>
      </section>
      <div className="explain-line"><Info size={17}/><p>Only active rounds are returned by Squeekchain. Empty cells within the certified range are idle. Partial days are marked; future, uncertified hours are blank.</p></div><a className="secondary link-button" href="#backtest">Put a pattern to the test <ArrowRight size={16}/></a>
    </>}
  </>;
}
function HeatRow({ day, selected, choose }: { day: HistoryDay; selected?: { day: number; hour: number }; choose: (hour: number) => void }) {
  return <div className="heatmap-row"><span>{dateLabel(day.day)}{!day.complete && <span className="partial-mark" title="Partial day">*</span>}</span><div>{hours.map(hour => {
    const available = day.first <= (601 + day.day * 144) + hour * 6 + 5 && day.last >= (601 + day.day * 144) + hour * 6;
    return <button key={hour} disabled={!available} className={`heat-cell ${available ? `heat-${day.counts[hour]}` : 'uncertified'} ${selected?.day === day.day && selected.hour === hour ? 'heat-selected' : ''}`} aria-label={`${dateLabel(day.day)}, ${hourLabel(hour)} UTC: ${available ? `${day.counts[hour]} active rounds${!day.complete ? ', partial day' : ''}` : 'not certified'}`} title={`${hourLabel(hour)} · ${day.counts[hour]}/6 active`} onClick={() => choose(hour)}/>;
  })}</div></div>;
}
