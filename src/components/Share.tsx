import { useEffect, useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { dateLabel, pickLabel, type Pick } from '../game';
import { containDialogFocus } from './Shared';
export type ShareResult = { day: number; pick: Pick; points: number; simulated: boolean };
export function ShareDialog({ result, onClose }: { result?: ShareResult; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!result) { dialog.current?.close(); return; }
    dialog.current?.showModal(); setMessage('');
    const c = canvas.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
    ctx.fillStyle = '#f5f4ec'; ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#224c35'; ctx.fillRect(0, 0, 24, 630);
    ctx.font = '40px "Pixelify Sans", sans-serif'; ctx.fillText('Squeek League', 72, 91);
    ctx.font = '28px "DM Sans", sans-serif'; ctx.fillText(`${result.simulated ? 'What-if result' : 'Certified match result'} · ${dateLabel(result.day, true)}`, 72, 158);
    ctx.font = 'bold 180px "DM Sans", sans-serif'; ctx.fillText(String(result.points), 65, 360);
    const scoreWidth = ctx.measureText(String(result.points)).width;
    ctx.font = '32px "DM Sans", sans-serif'; ctx.fillText('points', 85 + scoreWidth, 354);
    ctx.fillStyle = '#e2e9cf'; ctx.fillRect(72, 405, 1056, 80); ctx.fillStyle = '#224c35'; ctx.font = '32px "DM Sans", sans-serif'; ctx.fillText(result.pick.sleep ? 'Sleep call' : `${pickLabel(result.pick)} UTC`, 100, 456);
    ctx.fillStyle = '#5b655a'; ctx.font = '23px "DM Sans", sans-serif'; ctx.fillText('Community game · Sepolia testnet · No money, no prizes', 72, 566);
  }, [result]);
  const download = () => { if (!canvas.current || !result) return; const a = document.createElement('a'); a.download = `squeek-league-${result.simulated ? 'what-if-' : ''}${dateLabel(result.day).replace(/\s/g, '-')}.png`; a.href = canvas.current.toDataURL('image/png'); a.click(); setMessage('Result card downloaded.'); };
  const share = async () => {
    if (!canvas.current || !result) return;
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.current!.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error();
      const file = new File([blob], 'squeek-league-result.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'Squeek League', text: `${result.simulated ? 'What-if: ' : ''}${result.points} points on ${dateLabel(result.day)}. No money, no prizes.`, files: [file] });
      else download();
    } catch (e) { if ((e as Error).name !== 'AbortError') setMessage('Sharing is unavailable here. Use Download card instead.'); }
  };
  return <dialog ref={dialog} onKeyDown={containDialogFocus} className="share-dialog" aria-labelledby="share-title" onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="dialog-content"><div className="section-heading"><h2 id="share-title">Share your result</h2><button className="icon-button" aria-label="Close share dialog" onClick={onClose}><X size={20}/></button></div><canvas ref={canvas} width="1200" height="630" aria-label={result ? `${result.simulated ? 'What-if' : 'Certified'} result: ${result.points} points, ${dateLabel(result.day)}, ${pickLabel(result.pick)}` : 'Result card'}/><div className="button-row"><button className="primary" onClick={() => void share()}><Share2 size={16}/> Share card</button><button className="secondary" onClick={download}><Download size={16}/> Download</button></div><p role="status" className="small">{message}</p></div></dialog>;
}
