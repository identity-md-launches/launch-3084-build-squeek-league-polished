import { BrowserProvider, getAddress, type Eip1193Provider } from 'ethers';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAIN_HEX, CHAIN_ID, LEAGUE, RPC_URLS, leagueInterface } from './config';
import { cached, forget, persist } from './storage';
import { explainError } from './errors';

export interface WalletProvider extends Eip1193Provider {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}
export type WalletOption = { id: string; name: string; icon?: string; provider: WalletProvider };
declare global { interface Window { ethereum?: WalletProvider } }
export function useWallet() {
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [account, setAccount] = useState<string>();
  const [chain, setChain] = useState<number>();
  const [balance, setBalance] = useState<bigint>();
  const [provider, setProvider] = useState<WalletProvider>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tx, setTx] = useState<{ state: 'wallet' | 'pending' | 'success' | 'error'; label: string; hash?: string; message: string }>();
  const restored = useRef(false);
  const connect = useCallback(async (option: WalletOption, silent = false) => {
    setBusy(option.id); setError('');
    try {
      const addresses = await option.provider.request({ method: silent ? 'eth_accounts' : 'eth_requestAccounts' }) as string[];
      if (!addresses.length) return;
      const address = getAddress(addresses[0]);
      setProvider(option.provider); setAccount(address);
      const chainId = Number(await option.provider.request({ method: 'eth_chainId' })); setChain(chainId);
      persist('sl:wallet', option.id); setOpen(false);
      if (!silent && chainId !== CHAIN_ID) {
        try { await switchSepolia(option.provider); setChain(CHAIN_ID); } catch (e) { setError(explainError(e)); }
      }
    } catch (e) { setError(explainError(e)); }
    finally { setBusy(''); }
  }, []);
  useEffect(() => {
    const announce = (event: Event) => {
      const detail = (event as CustomEvent<{ info: { uuid: string; name: string; icon: string; rdns: string }; provider: WalletProvider }>).detail;
      if (!detail?.info?.uuid || !detail.provider?.request) return;
      const option = { id: detail.info.rdns || detail.info.uuid, name: detail.info.name, icon: detail.info.icon?.startsWith('data:image/') ? detail.info.icon : undefined, provider: detail.provider };
      setOptions(existing => [...existing.filter(x => x.id !== option.id && x.id !== 'browser'), option]);
    };
    window.addEventListener('eip6963:announceProvider', announce);
    if (window.ethereum) setOptions([{ id: 'browser', name: 'Browser wallet', provider: window.ethereum }]);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => window.removeEventListener('eip6963:announceProvider', announce);
  }, []);
  useEffect(() => {
    const saved = cached<string>('sl:wallet'); const found = options.find(o => o.id === saved);
    if (!restored.current && found) { restored.current = true; void connect(found, true); }
  }, [options, connect]);
  useEffect(() => {
    if (!provider) return;
    const accounts = (...args: unknown[]) => { const list = args[0] as string[]; setAccount(list[0] ? getAddress(list[0]) : undefined); setBalance(undefined); };
    const changed = (...args: unknown[]) => { setChain(Number(args[0])); setBalance(undefined); };
    provider.on?.('accountsChanged', accounts); provider.on?.('chainChanged', changed);
    return () => { provider.removeListener?.('accountsChanged', accounts); provider.removeListener?.('chainChanged', changed); };
  }, [provider]);
  const refreshBalance = useCallback(async () => {
    if (!provider || !account || chain !== CHAIN_ID) return;
    try { setBalance(BigInt(await provider.request({ method: 'eth_getBalance', params: [account, 'latest'] }) as string)); } catch { setBalance(undefined); }
  }, [provider, account, chain]);
  useEffect(() => { void refreshBalance(); }, [refreshBalance, tx?.state]);
  const switchChain = async () => {
    if (!provider) { setOpen(true); return; }
    setBusy('switch'); setError('');
    try { await switchSepolia(provider); setChain(CHAIN_ID); } catch (e) { setError(explainError(e)); } finally { setBusy(''); }
  };
  const disconnect = () => { setAccount(undefined); setProvider(undefined); setBalance(undefined); setChain(undefined); forget('sl:wallet'); setOpen(false); setError(''); };
  const transact = async (name: string, args: unknown[], label: string, onSuccess: () => void) => {
    if (!account || !provider) { setOpen(true); return; }
    if (tx?.state === 'wallet' || tx?.state === 'pending') return;
    try {
      if (Number(await provider.request({ method: 'eth_chainId' })) !== CHAIN_ID) { await switchSepolia(provider); setChain(CHAIN_ID); }
      setTx({ state: 'wallet', label, message: 'Confirm in your wallet. Only Sepolia test ETH is used for gas.' });
      const browser = new BrowserProvider(provider, 'any');
      const signer = await browser.getSigner(account);
      // No gasLimit or fee override: the connected wallet estimates Sepolia gas.
      const sent = await signer.sendTransaction({ to: LEAGUE, data: leagueInterface.encodeFunctionData(name, args), chainId: CHAIN_ID });
      setTx({ state: 'pending', label, hash: sent.hash, message: 'Submitted. Waiting for a Sepolia confirmation…' });
      try { const receipt = await sent.wait(1); if (!receipt || receipt.status !== 1) throw new Error('Transaction reverted.'); }
      catch (e) {
        const replacement = e as { code?: string; cancelled?: boolean; receipt?: { status: number }; replacement?: { hash: string } };
        if (replacement.code !== 'TRANSACTION_REPLACED' || replacement.cancelled || replacement.receipt?.status !== 1) throw e;
      }
      setTx({ state: 'success', label, hash: sent.hash, message: `${label} confirmed on Sepolia.` }); onSuccess();
    } catch (e) { setTx({ state: 'error', label, message: explainError(e) }); }
  };
  return { options, account, chain, balance, provider, open, setOpen, busy, error, setError, tx, setTx, connect, disconnect, switchChain, transact, refreshBalance };
}
export type Wallet = ReturnType<typeof useWallet>;
export async function switchSepolia(provider: WalletProvider) {
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] }); }
  catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN_HEX, chainName: 'Sepolia', nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [...RPC_URLS] }] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] });
  }
}
