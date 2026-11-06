import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Activity as ActivityIcon, ArrowUpRight, CircleHelp, Clock3, Film, FlaskConical, Moon, RefreshCw, Sun, Trophy, Wallet as WalletIcon, X } from 'lucide-react';
import { CHAIN_ID, LEAGUE, shortAddress } from './config';
import { draftDayAt } from './game';
import { useLeague } from './useLeague';
import { useWallet } from './wallet';
import { cached, persist } from './storage';
import { Draft } from './components/Draft';
import { Activity } from './components/Activity';
import { Backtest } from './components/Backtest';
import { Replay } from './components/Replay';
import { Standings } from './components/Standings';
import { Rules } from './components/Rules';
import { HamsterMark } from './components/PixelArt';
import { WalletDialog } from './components/WalletDialog';
import { ShareDialog, type ShareResult } from './components/Share';
function getRoute() {
  const [screen, day] = location.hash.slice(1).split('/');
  return { screen: ['draft', 'activity', 'backtest', 'replay', 'standings', 'rules'].includes(screen) ? screen : 'draft', day: day && /^\d+$/.test(day) ? Number(day) : undefined };
}
const nav = [{ id: 'draft', label: 'Draft', icon: Clock3 }, { id: 'activity', label: 'Activity', icon: ActivityIcon }, { id: 'backtest', label: 'What-if', icon: FlaskConical }, { id: 'replay', label: 'Replay', icon: Film }, { id: 'standings', label: 'League', icon: Trophy }];
export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => cached<'light' | 'dark'>('sl:theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [share, setShare] = useState<ShareResult>();
  const wallet = useWallet();
  const day = draftDayAt(now);
  const data = useLeague(day, wallet.account);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const changed = () => { setRoute(getRoute()); window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); };
    window.addEventListener('hashchange', changed); const clock = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => { window.removeEventListener('hashchange', changed); clearInterval(clock); };
  }, []);
  useLayoutEffect(() => {
    const suppression = document.createElement('style');
    suppression.textContent = '*,*::before,*::after{transition:none!important}';
    document.head.appendChild(suppression);
    document.documentElement.dataset.theme = theme;
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => suppression.remove());
    persist('sl:theme', theme);
    return () => suppression.remove();
  }, [theme]);
  const settle = () => {
    if (!data.overview) return;
    if (!wallet.account) { wallet.setOpen(true); return; }
    void wallet.transact('settleDay', [data.overview.next], 'Day settled', () => { void data.refresh(); });
  };
  return <><a href="#main" className="skip-link" onClick={e => { e.preventDefault(); main.current?.focus(); }}>Skip to game</a>
    {data.verification === 'mismatch' && <div className="redeploy-banner" role="alert"><strong>Squeekchain was redeployed - this league is closed</strong><span>New picks are disabled. Existing league history remains available.</span><details><summary>Show core addresses</summary><span className="full-address">League: {data.boundCore}</span><span className="full-address">Current Squeekchain: {data.apiAddress}</span></details></div>}
    <header className="site-header"><div className="header-inner"><a href="#draft" className="brand" aria-label="Squeek League home"><HamsterMark/><span>Squeek League<span className="brand-dot">.</span></span></a><div className="header-tools"><span className="network-label"><span className="status-dot"/> Sepolia testnet</span><button className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button><a href="#rules" className={`icon-button help-link ${route.screen === 'rules' ? 'is-active' : ''}`} aria-label="Read the rules"><CircleHelp size={19}/></a><button className="connect-button" onClick={() => wallet.account && wallet.chain !== CHAIN_ID ? void wallet.switchChain() : wallet.setOpen(true)}><WalletIcon size={15}/><span>{wallet.account ? wallet.chain !== CHAIN_ID ? 'Switch chain' : shortAddress(wallet.account) : 'Connect'}</span></button></div></div></header>
    <div className="nav-wrap"><nav className="main-nav" aria-label="Game screens">{nav.map(({ id, label, icon: Icon }) => <a key={id} className={route.screen === id ? 'active' : ''} href={`#${id}`} aria-current={route.screen === id ? 'page' : undefined}><Icon size={17}/><span>{label}</span></a>)}<span className="nav-note"><span className="tiny-square"/> A little league for a little legend.</span></nav></div>
    <div className="content-wrap"><div className="page-utilities"><span>Community-built <span className="dot-divider">/</span> No money, no prizes</span><button className="refresh-button" onClick={() => void data.refresh()} disabled={data.refreshing} aria-label="Refresh chain data"><RefreshCw size={13} className={data.refreshing ? 'refreshing' : ''}/><span>{data.refreshing ? 'Syncing testnet' : 'Refresh data'}</span></button></div>
    {wallet.tx && <div className={`transaction-notice notice tx-${wallet.tx.state}`} role="status"><div><strong>{wallet.tx.label}</strong><p>{wallet.tx.message}</p>{wallet.tx.hash && <details><summary>Transaction hash</summary><span className="full-address">{wallet.tx.hash}</span></details>}</div>{wallet.tx.state !== 'pending' && wallet.tx.state !== 'wallet' && <button className="icon-button" aria-label="Dismiss transaction status" onClick={() => wallet.setTx(undefined)}><X size={17}/></button>}</div>}
    <main id="main" ref={main} tabIndex={-1}>{route.screen === 'draft' && <Draft key={day} day={day} now={now} data={data} wallet={wallet} onSettle={settle}/>}{route.screen === 'activity' && <Activity data={data}/>}{route.screen === 'backtest' && <Backtest day={day} data={data} onShare={setShare}/>}{route.screen === 'replay' && <Replay data={data} day={route.day} account={wallet.account} onDay={day => { location.hash = `replay/${day}`; }} onShare={setShare}/>}{route.screen === 'standings' && <Standings data={data} wallet={wallet} now={now} onShare={setShare}/>}{route.screen === 'rules' && <Rules/>}</main>
    <footer><div className="footer-main"><a href="#draft" className="footer-brand"><HamsterMark/> Squeek League</a><span>Made for the community. Not made by the Squeekchain team.</span><a href="#rules">The rules <ArrowUpRight size={13}/></a></div><div className="footer-bottom"><span>Sepolia testnet only · No money, no prizes.</span><details><summary>Ownerless league contract</summary><span className="full-address">{LEAGUE}</span></details><span>No tracking. Just tiny paws.</span></div></footer></div>
    <WalletDialog wallet={wallet}/><ShareDialog result={share} onClose={() => setShare(undefined)}/>
  </>;
}
