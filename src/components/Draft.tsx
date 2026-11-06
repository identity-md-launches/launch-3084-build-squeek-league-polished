import { useState } from 'react';
import { ArrowRight, Bot, Check, Clock3, Info, LockKeyhole, Moon, ShieldCheck } from 'lucide-react';
import { CHAIN_ID } from '../config';
import { dateLabel, endRound, hourLabel, pickLabel, remaining, validPick, type Pick } from '../game';
import { cached, persist } from '../storage';
import type { useLeague } from '../useLeague';
import type { Wallet } from '../wallet';
import { HamsterMark, WheelScene } from './PixelArt';
import { SlotPicker } from './SlotPicker';
import { ErrorNotice, Faucets } from './Shared';
type Data = ReturnType<typeof useLeague>;
export function Draft({ day, now, data, wallet, onSettle }: { day: number; now: number; data: Data; wallet: Wallet; onSettle: () => void }) {
  const key = `sl:draft:${day}`;
  const [draft, setDraft] = useState<Pick>(() => { const saved = cached<Pick>(key); return saved && typeof saved.sleep === 'boolean' && Array.isArray(saved.slots) && (!saved.sleep || saved.slots.length === 0) && saved.slots.length <= 3 && saved.slots.every(h => Number.isInteger(h) && h >= 0 && h <= 23) && new Set(saved.slots).size === saved.slots.length ? saved : { slots: [], sleep: false }; });
  const [formError, setFormError] = useState('');
  const change = (pick: Pick) => { setDraft(pick); persist(key, pick); setFormError(''); };
  const { overview: o } = data;
  const locked = data.pick?.locked ?? false;
  const shown = locked ? data.pick! : draft;
  const before = !!o && now < o.opens;
  const closed = !!o && now >= o.closes;
  const waiting = !!o && !before && !closed && ((day >= 2 && o.next < day - 1) || (data.frontier !== undefined && data.frontier < endRound(day - 2)));
  const busy = wallet.tx?.state === 'pending' || wallet.tx?.state === 'wallet';
  const lockUnavailable = !o || data.verification !== 'match' || before || closed || locked || busy || waiting || (!!wallet.account && (!data.pick || wallet.chain !== CHAIN_ID));
  const lock = () => {
    if (!validPick(draft)) { setFormError('Pick exactly 3 different hours, or choose a Sleep call.'); document.querySelector<HTMLButtonElement>('[data-picker="draft"]')?.focus(); return; }
    if (!wallet.account) { wallet.setOpen(true); return; }
    if (!o || data.verification !== 'match' || now < o.opens || now >= o.closes) return;
    void wallet.transact(draft.sleep ? 'lockSleepCall' : 'lockPicks', draft.sleep ? [day] : [day, ...draft.slots], 'Picks locked', () => { void data.refreshPick(); void data.refresh(); });
  };
  return <>
    <div className="page-heading draft-heading"><div><h1>Know his next move.</h1><p>One hamster. Pick his next 3 wheel hours.</p></div><HamsterMark className="heading-hamster"/></div>
    <div className="draft-layout">
      <section className="draft-panel panel" aria-labelledby="draft-title">
        <div className="draft-top"><div><h2 id="draft-title">Your next daily draft</h2><p className="small muted">{dateLabel(day, true)} <span className="dot-divider">·</span> Match {day + 1}</p></div><span className={`lock-status ${locked ? 'locked' : ''}`}>{locked ? <Check size={14}/> : <span className="tiny-square"/>}{locked ? 'Locked in' : before ? 'Opens soon' : closed ? 'Draft closed' : o ? 'Draft open' : data.error ? 'Data unavailable' : 'Connecting'}</span></div>
        <SlotPicker day={day} pick={shown} onChange={change} disabled={locked || busy}/>
        <div className="draft-bottom"><div className="draft-summary"><span>{shown.sleep ? <Moon size={16}/> : <Clock3 size={16}/>}</span><span>{shown.sleep ? `All 24 hours idle = ${o?.sleepPoints ?? 25} points` : shown.slots.length ? `${shown.slots.map(hourLabel).join(' · ')} UTC` : 'Choose 3 UTC hours'}</span></div><div className="lock-clock"><span>{locked ? 'Saved on Sepolia' : before ? 'Opens in' : closed ? 'Lock window closed' : !o ? 'Checking window' : 'Locks in'}</span>{o && !locked && !closed && <strong>{remaining((before ? o.opens : o.closes) - now)}</strong>}</div></div>
        <button className="primary lock-button" onClick={lock} disabled={lockUnavailable}><LockKeyhole size={17}/><span>{locked ? 'Picks locked on-chain' : busy ? 'Check your wallet…' : 'Lock my picks'}</span>{!locked && !busy && <ArrowRight size={18}/>}</button>
        <p className="lock-caption small">{locked ? 'Public, final, and ready for match day.' : 'Lock once; picks are public and final.'}</p>
        <p className="inline-error" role="status">{formError}</p>
        {wallet.account && wallet.chain !== CHAIN_ID && <button className="secondary full-width" onClick={() => void wallet.switchChain()}>Switch to Sepolia</button>}
        {waiting && <div className="notice waiting-notice"><Clock3 size={18}/><div><p>Waiting for Squeekchain to certify the previous day, or press Settle.</p><button className="text-button" onClick={onSettle}>Settle day <ArrowRight size={14}/></button></div></div>}
        {data.verification === 'unavailable' && !data.error && <ErrorNotice retry={() => void data.refresh()}>The current Squeekchain deployment could not be checked. Locking is paused until it can be verified.</ErrorNotice>}
        {data.error && <ErrorNotice retry={() => void data.refresh()}>{data.error}</ErrorNotice>}
        {wallet.account && !data.pick && !data.error && <p className="small muted">Checking your existing pick… <button className="text-button" onClick={() => void data.refreshPick()}>Retry</button></p>}
        {wallet.account && wallet.balance === 0n && <Faucets/>}
      </section>
      <aside className="draft-aside">
        <div className="mobile-wheel-status"><span className="inline-flex"><span className="status-dot"/>{data.wheel.state === 'running' ? 'Squeektoshi is on the wheel' : data.wheel.state === 'idle' ? 'Squeektoshi is taking a breather' : data.wheel.state === 'offline' ? 'Wheel sensor offline' : 'Wheel status unavailable'}</span><span>Live sensor · never scored</span></div>
        <div className="wheel-panel"><div className="wheel-heading"><span>Squeektoshi’s corner</span><span className={`wheel-state ${data.wheel.state}`}><span className="status-dot"/>{data.wheel.state === 'running' ? 'On the wheel' : data.wheel.state === 'idle' ? 'Taking a breather' : data.wheel.state === 'offline' ? 'Sensor offline' : 'Status unavailable'}</span></div><WheelScene running={data.wheel.state === 'running'}/><div className="wheel-caption"><span>The world’s tiniest training schedule.</span><span className="small">Live sensor · decoration only</span></div></div>
        <section className="bot-section" aria-labelledby="bot-title"><div className="bot-avatar"><Bot size={25}/></div><div><h2 id="bot-title">Meet the House Bot</h2>{o?.bot ? <><p className="bot-picks">{pickLabel(o.bot)}{!o.bot.sleep && ' UTC'}</p><p className="small muted">The 3 busiest hours from prior settled days.</p></> : <p className="small muted">Pick revealed once match {Math.max(1, day - 1)} has settled.{day < 2 ? ' The first two matches have no public bot preview.' : ''}</p>}<a href="#rules" className="text-link small">A simple statistical rule <ArrowRight size={13}/></a></div></section>
      </aside>
    </div>
    <section className="how-strip" aria-label="How to play"><div><span className="step-number">01</span><div><h3>Learn his rhythm</h3><p>Find patterns in certified wheel history.</p><a href="#activity">Explore activity <ArrowRight size={14}/></a></div></div><div><span className="step-number">02</span><div><h3>Make your call</h3><p>Pick 3 UTC hours, or call a sleepy day.</p><a href="#backtest">Try a what-if <ArrowRight size={14}/></a></div></div><div><span className="step-number">03</span><div><h3>Beat the House Bot</h3><p>7 days. Shared titles for tied players.</p><a href="#standings">See the league <ArrowRight size={14}/></a></div></div></section>
    <div className="trust-line"><ShieldCheck size={15}/><span>Certified rounds on the Sepolia testnet</span><Info size={14}/><span>No money, no prizes.</span></div>
  </>;
}
