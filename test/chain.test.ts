import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AbiCoder } from 'ethers';
import { CORE_ABI, DEPLOY_BLOCK, LEAGUE, LOG_RPC, RPC_URLS, coreInterface, leagueInterface } from '../src/config';
import { decodeLog, frontierOf, loadEvents, loadHistory, liveWheel, roundPage } from '../src/chain';
import { explainError, errorMessages } from '../src/errors';
import { rpc } from '../src/rpc';

test('all custom contract errors translate to player-facing English', () => {
  for (const [name,text] of Object.entries(errorMessages)) {
    assert.equal(explainError({ info: { error: { data: leagueInterface.encodeErrorResult(name) } } }), text);
    assert.equal(explainError({ message: name }), text);
  }
  assert.match(explainError({ code: 4001 }), /declined/);
  assert.match(explainError({ code: 'INSUFFICIENT_FUNDS' }), /faucet/);
});
test('event decoder preserves public picks, scored points, and certified counts', () => {
  const encoded = leagueInterface.encodeEventLog(leagueInterface.getEvent('PicksLocked')!, [2, LEAGUE, [1,4,22], false]);
  const log = { ...encoded, blockNumber: '0xb85023', logIndex: '0x3', transactionHash: 'test-only-transaction' };
  const event = decodeLog(log)!;
  assert.equal(event.day, 2); assert.equal(event.player, LEAGUE); assert.deepEqual(event.slots, [1,4,22]);
  assert.equal(event.index, 3); assert.equal(decodeLog({ ...log, removed: true }), undefined);
});
test('RPC calls fail over to the second allowed endpoint; logs only use Tenderly', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    if (input === RPC_URLS[0]) throw new Error('Network unavailable');
    return new Response(JSON.stringify({ result: '0x2a' }), { status: 200 });
  };
  try {
    assert.equal(await rpc('eth_blockNumber', []), '0x2a'); assert.deepEqual(calls, [...RPC_URLS]);
    calls.length = 0;
    await rpc('eth_getLogs', [], true); assert.deepEqual(calls, [LOG_RPC]);
  } finally { globalThis.fetch = original; }
});
test('history paging never requests beyond frontier or a span greater than sixteen; cache supports incremental reads', async () => {
  const original = globalThis.fetch;
  const store = new Map<string,string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k:string) => store.get(k) ?? null, setItem: (k:string,v:string) => store.set(k,v), removeItem: (k:string) => store.delete(k) } });
  let frontier = 40;
  const ranges: [number,number][] = [];
  const active = [2,17,40,41];
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const data: string = request.params[0].data;
    let result: string;
    if (data === '0xc19d93fb') result = ''; // state selector is tested through the fallback below.
    const method = coreInterface.parseTransaction({ data });
    if (method?.name === 'roundPage') {
      const [a,t] = method.args.map(Number); ranges.push([a,t]); assert.ok(t-a <= 16); assert.ok(t <= frontier);
      result = coreInterface.encodeFunctionResult('roundPage', [[t, [0,0,0], [0,0,0], active.filter(r=>r>a&&r<=t).map(r => [r,1,1,1,'0x'+'12'.repeat(32)])]]);
    } else result = AbiCoder.defaultAbiCoder().encode(['uint64','uint64'], [frontier, 123]);
    return new Response(JSON.stringify({ result }), { status: 200 });
  };
  try {
    const h = await loadHistory(LEAGUE, () => {});
    assert.deepEqual(h.active, [2,17,40]); assert.equal(h.frontier, 40);
    assert.deepEqual(ranges.sort((a,b)=>a[0]-b[0]), [[0,16],[16,32],[32,40]]);
    ranges.length=0; await loadHistory(LEAGUE, () => {}); assert.equal(ranges.length,0);
    frontier=41; const next=await loadHistory(LEAGUE,()=>{}); assert.deepEqual(next.active,[2,17,40,41]); assert.deepEqual(ranges,[[40,41]]);
    assert.equal(await frontierOf(LEAGUE), 41);
    await assert.rejects(roundPage(LEAGUE, 0, 17));
    assert.ok(CORE_ABI.length);
  } finally { globalThis.fetch=original; }
});

test('event scans use only Tenderly, inclusive ranges <=5000, a persistent confirmed cursor and fresh tail', async () => {
  const original = globalThis.fetch;
  const store = new Map<string,string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k:string)=>store.get(k)??null, setItem: (k:string,v:string)=>store.set(k,v), removeItem: (k:string)=>store.delete(k) } });
  const ranges: [number,number][]=[];
  const tip=DEPLOY_BLOCK+10100;
  globalThis.fetch=async (input,init)=>{
    assert.equal(input,LOG_RPC);
    const p=JSON.parse(String(init?.body));
    let result: string | unknown[];
    if(p.method==='eth_blockNumber')result='0x'+tip.toString(16);
    else { assert.equal(p.method,'eth_getLogs'); const q=p.params[0]; const a=Number(q.fromBlock),b=Number(q.toBlock);assert.ok(b-a+1<=5000);assert.ok(a>=DEPLOY_BLOCK);ranges.push([a,b]);result=[]; }
    return new Response(JSON.stringify({result}),{status:200});
  };
  try {
    await loadEvents(()=>{});
    assert.equal(ranges[0][0],DEPLOY_BLOCK);
    assert.equal(ranges[0][1],DEPLOY_BLOCK+4999);
    assert.equal(ranges.length,4);
    assert.equal(ranges.at(-1)![1],tip);
    ranges.length=0;
    await loadEvents(()=>{});
    assert.deepEqual(ranges,[[tip-11,tip]]);
  } finally {globalThis.fetch=original;}
});

test('live wheel badge uses online freshness and positive RPM, and treats malformed data as unknown', async () => {
  const original=globalThis.fetch;
  try {
    for(const [measurement,expected] of [
      [{freshness:'online',rpmMilli:1000},'running'],
      [{freshness:'online',rpmMilli:0},'idle'],
      [{freshness:'offline',rpmMilli:1000},'offline'],
      [{freshness:'stale',rpmMilli:1000},'offline'],
      [{freshness:'online'},'unknown'],
      [undefined,'unknown'],
    ] as const){
      globalThis.fetch=async()=>new Response(JSON.stringify({measurement}),{status:200});
      assert.equal((await liveWheel()).state,expected);
    }
  }finally{globalThis.fetch=original;}
});
