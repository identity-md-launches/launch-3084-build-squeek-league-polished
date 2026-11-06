import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_ZERO, FIRST_ROUND } from '../src/config';
import { backtestDays, dayAt, dayStart, draftDayAt, endRound, historyDays, roundBucket, score, seasonAt, startRound, toggleSlot, validPick } from '../src/game';

const counts = (...entries: [number, number][]) => { const c = Array(24).fill(0); for (const [h,n] of entries) c[h] = n; return c; };
test('a draft scores only selected rounds, floors percentages, and maxes at 100', () => {
  const pick = { slots: [2, 3, 4], sleep: false };
  assert.equal(score(pick, counts()), 0);
  assert.equal(score(pick, counts([2,1], [20,6])), 5);
  assert.equal(score(pick, counts([2,3], [3,3], [4,3])), 50);
  assert.equal(score(pick, counts([2,6], [3,6], [4,5])), 94);
  assert.equal(score(pick, counts([2,6], [3,6], [4,6])), 100);
});
test('Sleep only scores when all 144 rounds are idle', () => {
  const sleep = { slots: [], sleep: true };
  assert.equal(score(sleep, counts()), 25);
  assert.equal(score(sleep, counts([23,1])), 0);
  assert.equal(score(sleep, counts(), 30), 30);
});
test('rejects duplicate, missing, out-of-range, fractional, and mixed Sleep picks', () => {
  for (const slots of [[0,0,1], [1,2], [0,1,24], [-1,1,2], [0,1,2.5]]) {
    assert.equal(validPick({ slots, sleep: false }), false);
    assert.throws(() => score({ slots, sleep: false }, counts()));
  }
  assert.equal(validPick({ slots: [1], sleep: true }), false);
  assert.throws(() => score({ slots: [1,2,3], sleep: false }, [0]));
  assert.throws(() => score({ slots: [1,2,3], sleep: false }, counts([1,7])));
});
test('three selection taps produce a valid draft; fourth cannot add a slot; deselect and Sleep work', () => {
  let p = { slots: [] as number[], sleep: false };
  for (const h of [3,1,23]) p = toggleSlot(p, h);
  assert.deepEqual(p, { slots: [1,3,23], sleep: false });
  assert.equal(validPick(p), true);
  assert.deepEqual(toggleSlot(p, 7), p);
  assert.deepEqual(toggleSlot(p, 3).slots, [1,23]);
  assert.deepEqual(toggleSlot({ slots: [], sleep: true }, 4), { slots: [4], sleep: false });
});
test('UTC round bucketing honors day zero, all six rounds per hour, and negative league days', () => {
  assert.deepEqual(roundBucket(25), { day: -4, slot: 0, minute: 0 });
  assert.deepEqual(roundBucket(24), { day: -5, slot: 23, minute: 50 });
  assert.deepEqual(roundBucket(FIRST_ROUND), { day: 0, slot: 0, minute: 0 });
  for (let day = -4; day < 10; day++) for (let h = 0; h < 24; h++) for (let r = 0; r < 6; r++) {
    assert.deepEqual(roundBucket(startRound(day) + h * 6 + r), { day, slot: h, minute: r * 10 });
  }
  assert.throws(() => roundBucket(-1));
});
test('day, season and draft boundaries are stable at UTC midnight', () => {
  assert.equal(dayAt(DAY_ZERO - 1), -1);
  assert.equal(dayAt(DAY_ZERO), 0);
  assert.equal(draftDayAt(DAY_ZERO - 100000), 0);
  assert.equal(draftDayAt(DAY_ZERO + 1), 1);
  assert.equal(seasonAt(6), 0); assert.equal(seasonAt(7), 1);
  assert.equal(dayStart(7), DAY_ZERO + 7 * 86400);
  assert.equal(endRound(-4), 168); assert.equal(startRound(0), 601);
});
test('history includes partial edges, deduplicates active records and never marks uncertified days complete', () => {
  const history = historyDays({ core: 'core-test', frontier: 175, active: [25,25,26,30,168,169,180] });
  assert.equal(history[0].day, -5); assert.equal(history[0].complete, false);
  const full = history.find(d => d.day === -4)!;
  assert.equal(full.complete, true); assert.equal(full.counts[0], 3); assert.equal(full.counts[23], 1);
  assert.equal(history.find(d => d.day === -3)!.complete, false);
  assert.equal(history.find(d => d.day === -3)!.counts[0], 1);
});
test('backtest includes complete pre-league and settled league days only; chain counts override raw data', () => {
  const raw = historyDays({ core: 'core-test', frontier: endRound(1), active: [25,601,745] });
  const settled = new Map([[0, counts([7,4])]]);
  const result = backtestDays(raw, settled);
  assert.equal(result.some(d => d.day === 1), false);
  assert.equal(result.some(d => d.day === -5), false);
  assert.equal(result.filter(d => d.day === 0).length, 1);
  assert.equal(result.find(d => d.day === 0)!.counts[7], 4);
  assert.equal(result.find(d => d.day === 0)!.source, 'league');
});
