import { AlertCircle, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import { shortAddress } from '../config';
export function ErrorNotice({ children, retry }: { children: React.ReactNode; retry?: () => void }) {
  return <div className="notice error-notice" role="alert"><AlertCircle size={18} aria-hidden="true"/><div><p>{children}</p>{retry && <button className="text-button" onClick={retry}><RefreshCw size={14}/> Retry</button>}</div></div>;
}
export function Loading({ text = 'Reading the testnet…' }: { text?: string }) { return <div className="loading-state" role="status"><span className="loading-pixel"/>{text}</div>; }
export function Address({ address, me }: { address: string; me?: string }) {
  return <details className="address-details"><summary aria-label={`Show full address ${address}`}><span className="address-value">{shortAddress(address)}</span>{address.toLowerCase() === me?.toLowerCase() && <span className="you-tag">You</span>}<ChevronDown size={12} aria-hidden="true"/></summary><span className="full-address">{address}</span></details>;
}
export function Faucets() { return <div className="faucets"><p>Need test ETH for gas?</p><a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer">Google faucet <ExternalLink size={12}/></a><a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noreferrer">Alchemy faucet <ExternalLink size={12}/></a></div>; }

// Keep Tab within the modal even when the browser would otherwise move focus to its chrome.
// showModal() still supplies background inertness, initial focus, Escape, and focus restoration.
export function containDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}
