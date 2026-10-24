// Sponsor policy: the limits a relayer applies before it spends a deposit.
//
// This module is deliberately chain-free. The HTTP relayer calls admit() on every request,
// reserve() after it has priced the claim, commit() after a successful receipt, and release()
// if the submission fails. The integration guide uses the same module.
import { readFileSync, existsSync } from 'node:fs';

export const DEFAULT_POLICY = {
  perIp: { max: 6, windowMs: 60_000 },
  perOrigin: { max: 6, windowMs: 60_000 },
  perOwner: { max: 3, windowMs: 86_400_000 },
  global: { maxClaims: 20, maxSpendWei: 80_000_000_000_000_000_000n, windowMs: 3_600_000 },
  minBalanceWei: 100_000_000_000_000_000n,
};

const asBig = (v, name) => {
  try { return BigInt(v); } catch { throw new Error(`${name} must be an integer wei value`); }
};

export function normalizePolicyConfig(input = {}) {
  const p = {
    ...DEFAULT_POLICY,
    ...input,
    perIp: { ...DEFAULT_POLICY.perIp, ...(input.perIp ?? {}) },
    perOrigin: { ...DEFAULT_POLICY.perOrigin, ...(input.perOrigin ?? {}) },
    perOwner: { ...DEFAULT_POLICY.perOwner, ...(input.perOwner ?? {}) },
    global: { ...DEFAULT_POLICY.global, ...(input.global ?? {}) },
  };
  for (const [name, limit] of [['perIp', p.perIp], ['perOrigin', p.perOrigin], ['perOwner', p.perOwner]]) {
    if (!Number.isSafeInteger(limit.max) || limit.max < 1) throw new Error(`${name}.max must be >= 1`);
    if (!Number.isSafeInteger(limit.windowMs) || limit.windowMs < 1) throw new Error(`${name}.windowMs must be >= 1`);
  }
  if (!Number.isSafeInteger(p.global.maxClaims) || p.global.maxClaims < 1) throw new Error('global.maxClaims must be >= 1');
  if (!Number.isSafeInteger(p.global.windowMs) || p.global.windowMs < 1) throw new Error('global.windowMs must be >= 1');
  p.global.maxSpendWei = asBig(p.global.maxSpendWei, 'global.maxSpendWei');
  p.minBalanceWei = asBig(p.minBalanceWei, 'minBalanceWei');
  if (p.global.maxSpendWei < 0n || p.minBalanceWei < 0n) throw new Error('wei limits must be non-negative');
  return p;
}

export function loadPolicyConfig(path) {
  if (!path || !existsSync(path)) return normalizePolicyConfig();
  return normalizePolicyConfig(JSON.parse(readFileSync(path, 'utf8')));
}

/** A sliding-window limiter plus a spend reservation. `now` is injectable for tests. */
export function createSponsorPolicy({ config, now = () => Date.now() } = {}) {
  const p = normalizePolicyConfig(config ?? {});
  const hits = new Map();
  const budget = [];
  let nextId = 1;

  const prune = (list, t, windowMs) => list.filter((x) => x > t - windowMs);
  const rate = (kind, key, limit, t) => {
    const k = `${kind}:${key}`;
    const list = prune(hits.get(k) ?? [], t, limit.windowMs);
    if (list.length >= limit.max) {
      const retryAfterMs = Math.max(1, list[0] + limit.windowMs - t);
      hits.set(k, list);
      return { ok: false, reason: `${kind} rate limit (${limit.max}/${limit.windowMs}ms)`, retryAfterMs };
    }
    list.push(t);
    hits.set(k, list);
    return { ok: true };
  };

  const pruneBudget = (t) => {
    while (budget.length && budget[0].at <= t - p.global.windowMs) budget.shift();
  };

  return {
    config: p,
    admit({ ip = 'unknown', origin = 'cli', owner = 'unknown' } = {}) {
      const t = now();
      for (const [kind, key, limit] of [
        ['ip', ip, p.perIp],
        ['origin', origin, p.perOrigin],
        ['owner', String(owner).toLowerCase(), p.perOwner],
      ]) {
        const r = rate(kind, key, limit, t);
        if (!r.ok) return r;
      }
      return { ok: true };
    },
    reserve({ costWei, balanceWei }) {
      const t = now();
      const cost = asBig(costWei, 'costWei');
      const balance = asBig(balanceWei, 'balanceWei');
      if (balance < cost + p.minBalanceWei) {
        return { ok: false, reason: `minimum balance guard: need ${cost + p.minBalanceWei} wei, have ${balance} wei` };
      }
      pruneBudget(t);
      const spent = budget.reduce((a, x) => a + x.costWei, 0n);
      if (budget.length >= p.global.maxClaims) {
        return { ok: false, reason: `global claim budget (${p.global.maxClaims}/${p.global.windowMs}ms)` };
      }
      if (spent + cost > p.global.maxSpendWei) {
        return { ok: false, reason: `global spend budget (${p.global.maxSpendWei} wei/${p.global.windowMs}ms)` };
      }
      const token = { id: nextId++, at: t, costWei: cost };
      budget.push(token);
      return { ok: true, token };
    },
    commit() { /* the reservation is already counted as spent */ },
    release(token) {
      const i = budget.findIndex((x) => x.id === token?.id);
      if (i >= 0) budget.splice(i, 1);
    },
    snapshot() {
      const t = now();
      pruneBudget(t);
      return {
        budgetClaims: budget.length,
        budgetSpentWei: budget.reduce((a, x) => a + x.costWei, 0n),
        keys: hits.size,
      };
    },
  };
}
