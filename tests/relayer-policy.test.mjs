/** The sponsor policy's refusal cases, each paired with a positive control. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSponsorPolicy, normalizePolicyConfig } from '../scripts/relayer-policy.mjs';

const wide = {
  perIp: { max: 100, windowMs: 60_000 },
  perOrigin: { max: 100, windowMs: 60_000 },
  perOwner: { max: 100, windowMs: 86_400_000 },
  global: { maxClaims: 100, maxSpendWei: 1_000_000n, windowMs: 3_600_000 },
  minBalanceWei: 0n,
};
const policyAt = (overrides, clock) => createSponsorPolicy({ config: { ...wide, ...overrides }, now: () => clock.t });

test('per-IP window: first two pass, third is refused, and the window resets', () => {
  const clock = { t: 1_000 };
  const p = policyAt({ perIp: { max: 2, windowMs: 1_000 } }, clock);
  assert.equal(p.admit({ ip: 'a', origin: 'o1', owner: 'w1' }).ok, true);
  assert.equal(p.admit({ ip: 'a', origin: 'o2', owner: 'w2' }).ok, true);
  const refused = p.admit({ ip: 'a', origin: 'o3', owner: 'w3' });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /ip rate limit/);
  assert.ok(refused.retryAfterMs >= 1);
  clock.t = 2_001;
  assert.equal(p.admit({ ip: 'a', origin: 'o4', owner: 'w4' }).ok, true);
});

test('per-origin window: first two pass, third is refused', () => {
  const clock = { t: 1_000 };
  const p = policyAt({ perOrigin: { max: 2, windowMs: 1_000 } }, clock);
  assert.equal(p.admit({ ip: 'a', origin: 'https://one', owner: 'w1' }).ok, true);
  assert.equal(p.admit({ ip: 'b', origin: 'https://one', owner: 'w2' }).ok, true);
  const refused = p.admit({ ip: 'c', origin: 'https://one', owner: 'w3' });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /origin rate limit/);
});

test('per-owner cap: first two pass, third is refused, and another owner still passes', () => {
  const clock = { t: 1_000 };
  const p = policyAt({ perOwner: { max: 2, windowMs: 86_400_000 } }, clock);
  const owner = '0xAbC';
  assert.equal(p.admit({ ip: 'a', origin: 'o1', owner }).ok, true);
  assert.equal(p.admit({ ip: 'b', origin: 'o2', owner }).ok, true);
  const refused = p.admit({ ip: 'c', origin: 'o3', owner });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /owner rate limit/);
  assert.equal(p.admit({ ip: 'd', origin: 'o4', owner: '0xDeF' }).ok, true);
});

test('global claim and spend budgets: refusal, release, and window reset', () => {
  const clock = { t: 10_000 };
  const p = policyAt({ global: { maxClaims: 2, maxSpendWei: 1_000n, windowMs: 1_000 } }, clock);
  const first = p.reserve({ costWei: 400n, balanceWei: 1_000n });
  const second = p.reserve({ costWei: 400n, balanceWei: 1_000n });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  const third = p.reserve({ costWei: 400n, balanceWei: 1_000n });
  assert.equal(third.ok, false);
  assert.match(third.reason, /global claim budget/);
  p.release(first.token);
  assert.equal(p.reserve({ costWei: 400n, balanceWei: 1_000n }).ok, true);
  clock.t = 11_001;
  assert.equal(p.reserve({ costWei: 1_000n, balanceWei: 1_000n }).ok, true);
});

test('global spend budget refuses a claim that would cross the cap', () => {
  const clock = { t: 10_000 };
  const p = policyAt({ global: { maxClaims: 10, maxSpendWei: 1_000n, windowMs: 1_000 } }, clock);
  assert.equal(p.reserve({ costWei: 600n, balanceWei: 1_000n }).ok, true);
  const refused = p.reserve({ costWei: 500n, balanceWei: 1_000n });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /global spend budget/);
});

test('minimum-balance guard: one wei short is refused, the exact amount passes', () => {
  const clock = { t: 10_000 };
  const p = policyAt({ minBalanceWei: 50n }, clock);
  const short = p.reserve({ costWei: 100n, balanceWei: 149n });
  assert.equal(short.ok, false);
  assert.match(short.reason, /minimum balance guard/);
  assert.equal(p.reserve({ costWei: 100n, balanceWei: 150n }).ok, true);
});

test('config validation rejects malformed limits', () => {
  assert.throws(() => normalizePolicyConfig({ perIp: { max: 0 } }), /perIp.max/);
  assert.throws(() => normalizePolicyConfig({ global: { maxSpendWei: 'not-wei' } }), /maxSpendWei/);
  assert.equal(normalizePolicyConfig({ global: { maxSpendWei: '1000' } }).global.maxSpendWei, 1_000n);
});
