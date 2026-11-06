import { useEffect, useRef } from 'react';
import { ArrowUpRight, ExternalLink, Wallet as WalletIcon, X } from 'lucide-react';
import { CHAIN_ID } from '../config';
import type { Wallet } from '../wallet';
import { containDialogFocus, Faucets } from './Shared';
export function WalletDialog({ wallet }: { wallet: Wallet }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (wallet.open && !dialog?.open) dialog?.showModal();
    else if (!wallet.open && dialog?.open) dialog.close();
  }, [wallet.open]);
  const current = location.href;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return <dialog className="wallet-dialog" ref={ref} onKeyDown={containDialogFocus} onCancel={() => wallet.setOpen(false)} onClick={e => { if (e.target === e.currentTarget) wallet.setOpen(false); }} aria-labelledby="wallet-heading" onClose={() => wallet.setOpen(false)}>
    <div className="dialog-content"><div className="section-heading"><h2 id="wallet-heading">{wallet.account ? 'Your wallet' : 'Connect a wallet'}</h2><button className="icon-button" aria-label="Close wallet dialog" onClick={() => wallet.setOpen(false)}><X size={20}/></button></div>
      <p className="muted">Sepolia testnet only. No money, no prizes.</p>
      {wallet.account ? <><p className="full-address">{wallet.account}</p><p>{wallet.chain === CHAIN_ID ? 'Connected to Sepolia' : 'Switch to Sepolia to play.'}</p>{wallet.chain !== CHAIN_ID && <button className="primary" onClick={() => void wallet.switchChain()}>Switch to Sepolia</button>}<button className="secondary full-width" onClick={wallet.disconnect}>Disconnect wallet</button></> : <>
      {wallet.options.map(option => <button key={option.id} className="wallet-row" disabled={!!wallet.busy} onClick={() => void wallet.connect(option)}>{option.icon ? <img src={option.icon} width="28" height="28" alt=""/> : <WalletIcon size={25}/>}<span>{option.name}{wallet.busy === option.id ? ' · opening…' : ''}</span><ArrowUpRight size={18}/></button>)}
      {wallet.options.length === 0 && <p>No browser wallet detected. {mobile ? 'Open this page inside your wallet app.' : 'Install a browser wallet, then reload, or open this page in a wallet on your phone.'}</p>}
      {mobile && <div className="mobile-wallets"><a className="wallet-row" href={`https://link.metamask.io/dapp/${current.replace(/^https?:\/\//, '')}`} rel="noreferrer"><WalletIcon size={25}/><span>Open in MetaMask</span><ExternalLink size={16}/></a><a className="wallet-row" href={`https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(current)}`} rel="noreferrer"><WalletIcon size={25}/><span>Open in Coinbase Wallet</span><ExternalLink size={16}/></a><p className="small muted">These links open your wallet app. The game itself contacts only Squeekchain, its two public RPCs, and your connected wallet.</p></div>}
      </>}
      <p className="inline-error" role="status">{wallet.error}</p>
      {wallet.account && wallet.balance === 0n && <Faucets/>}
      <p className="small muted">Picks are public and cannot be changed after locking. Connecting does not send a transaction.</p>
    </div>
  </dialog>;
}
