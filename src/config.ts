import { Interface } from 'ethers';

// Public deployment and fixed Sepolia transport configuration; there are no secret settings.

export const CHAIN_ID = 11155111;
export const CHAIN_HEX = '0xaa36a7';
export const LEAGUE = '0xaDEA9907bAA30D7B54E7B9Eb6F6551B9A0088e08';
export const DEPLOY_BLOCK = 12079298;
export const RPC_URLS = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.gateway.tenderly.co'] as const;
export const LOG_RPC = RPC_URLS[1];
export const ECONOMY_API = 'https://api.squeekchain.com/v1/economy/state';
export const STATUS_API = 'https://api.squeekchain.com/v1/status';
export const DAY_ZERO = Date.parse('2026-11-08T00:00:00Z') / 1000;
export const ROUND_EPOCH = Date.parse('2026-11-03T19:50:00Z') / 1000;
export const FIRST_ROUND = 601;
export const DAY_SECONDS = 86400;
export const ROUNDS_PER_DAY = 144;
export const ERRORS = [
  'OutsideLockWindow', 'BadSlots', 'AlreadyLocked', 'SettlePending', 'DayNotCertified',
  'DayAlreadySettled', 'SettleInOrder', 'CoreChanged', 'DayNotSettled', 'NoPick',
  'AlreadyScored', 'SeasonOpen', 'PicksPending', 'AlreadyCrowned',
] as const;
export const LEAGUE_ABI = [
  'function lockPicks(uint64 day,uint8 a,uint8 b,uint8 c)',
  'function lockSleepCall(uint64 day)',
  'function settleDay(uint64 day)',
  'function scorePicks(uint64 day,address[] players)',
  'function crownChampion(uint32 season)',
  'function nextDayToSettle() view returns (uint64)',
  'function isSettled(uint64) view returns (bool)',
  'function slotCounts(uint64) view returns (uint8[24])',
  'function pickOf(uint64,address) view returns (bool locked,bool sleep,bool scored,uint8 a,uint8 b,uint8 c)',
  'function botDraft(uint64) view returns (uint8[3] slots,bool sleep)',
  'function lockWindow(uint64) view returns (uint256 opens,uint256 closes)',
  'function seasonPoints(uint32,address) view returns (uint32)',
  'function botPoints(uint32) view returns (uint32)',
  'function topScore(uint32) view returns (uint32)',
  'function leaders(uint32) view returns (address[])',
  'function pendingPicks(uint32) view returns (uint32)',
  'function crowned(uint32) view returns (bool)',
  'function dayStartTime(uint64) view returns (uint256)',
  'function sleepPoints() view returns (uint16)',
  'function core() view returns (address)',
  'function streamId() view returns (bytes32)',
  'event PicksLocked(uint64 indexed day,address indexed player,uint8[3] slots,bool sleep)',
  'event DaySettled(uint64 indexed day,uint8[24] counts)',
  'event Scored(uint64 indexed day,address indexed player,uint16 points)',
  'event ChampionCrowned(uint32 indexed season,address indexed player,uint32 points)',
  'event SeasonClosed(uint32 indexed season,uint32 topScore,uint256 champions)',
  ...ERRORS.map(name => `error ${name}()`),
];
export const CORE_ABI = [
  'function roundPage(uint64 afterRound,uint64 throughRound,uint256 maxRecords) view returns ((uint64 certifiedThroughRound,(uint64 cumulativeWork,uint96 cumulativeBlockUnits,uint32 workPerThousandBlocks) start,(uint64 cumulativeWork,uint96 cumulativeBlockUnits,uint32 workPerThousandBlocks) end,(uint64 roundId,uint64 cumulativeWork,uint96 cumulativeBlockUnits,uint32 workPerThousandBlocks,bytes32 dataHash)[] rounds) page)',
];
export const leagueInterface = new Interface(LEAGUE_ABI);
export const coreInterface = new Interface(CORE_ABI);
export const shortAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
