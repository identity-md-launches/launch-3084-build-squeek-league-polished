import { leagueInterface } from './config';
export const errorMessages: Record<string, string> = {
  OutsideLockWindow: 'Picks open 20 minutes after the previous UTC day starts and close 10 minutes before this match. Check the countdown.',
  BadSlots: 'Choose exactly 3 different UTC hours from 00:00 to 23:00.',
  AlreadyLocked: 'Your pick for this day is already locked. Refresh to see it.',
  SettlePending: 'Waiting for Squeekchain to certify the previous day, or press Settle day to settle earlier days first.',
  DayNotCertified: 'Squeekchain has not certified that day yet. Try again in a few minutes, or press Settle day once it is ready.',
  DayAlreadySettled: 'This day is already settled. Refresh to see the results.',
  SettleInOrder: 'Settle earlier days first. The Settle day button selects the next day in order.',
  CoreChanged: 'Squeekchain was redeployed - this league is closed. New picks are disabled.',
  DayNotSettled: 'Settle this day before scoring its picks.',
  NoPick: 'This player has no locked pick for that day. Refresh the player list.',
  AlreadyScored: 'These picks are already scored. Refresh before choosing another batch.',
  SeasonOpen: 'This season is still open. All 7 days must finish and settle before crowning.',
  PicksPending: 'Some picks still need scoring. Use Score picks first.',
  AlreadyCrowned: 'This season has already been crowned. Refresh to see the champions.',
};
function findData(error: unknown, depth = 0): string | undefined {
  if (depth > 5 || !error || typeof error !== 'object') return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.data === 'string' && /^0x[0-9a-f]+$/i.test(e.data)) return e.data;
  return findData(e.error, depth + 1) ?? findData(e.info, depth + 1) ?? findData(e.cause, depth + 1);
}
export function explainError(error: unknown): string {
  const e = error as { code?: number | string; message?: string; shortMessage?: string; name?: string; reason?: string };
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') return 'Wallet request declined. Your picks are still here; try again when ready.';
  if (e?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(e?.message ?? '')) return 'You need a little Sepolia test ETH for network gas. Use a Sepolia faucet, then try again.';
  try { const data = findData(error); if (data) { const decoded = leagueInterface.parseError(data); if (decoded && errorMessages[decoded.name]) return errorMessages[decoded.name]; } } catch { /* Not a league error. */ }
  const message = e?.reason ?? e?.shortMessage ?? e?.message ?? '';
  for (const [name, text] of Object.entries(errorMessages)) if (message.includes(name)) return text;
  if (/timeout|fetch|network|rpc|rate.limit|429|502|503/i.test(message)) return 'Unable to reach the testnet. Your picks are safe in this browser. Retry in a moment.';
  return 'The request could not complete. Check your wallet and connection, then retry.';
}
