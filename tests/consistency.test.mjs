/**
 * Cross-file consistency checks.
 *
 * These are deliberately boring: they fail when a public address, chain id, event topic, storage
 * slot or compiler setting drifts between the config file, the SDK, the docs and the artifacts.
 * Run after `npm run compile` (the test suite's documented order).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { keccak256 } from 'ethers';
import { PORTALDOT, handleKey, keccakText } from '../web/lib/plaque.js';
import { BUILD_CONFIG } from '../scripts/build-config.mjs';
import { normalizePolicyConfig } from '../scripts/relayer-policy.mjs';
import config from '../config/plaque.json' with { type: 'json' };
import { validateConfig } from '../scripts/config-lib.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const readJson = (p) => JSON.parse(read(p));

test('the public config is the expected live deployment', () => {
  assert.equal(config.chainId, 420420777);
  assert.equal(config.chainIdHex, '0x190f1ca9');
  assert.equal(config.contract, '0x5432e6b89dc3042d47f2be98e971cad9dabab685');
  assert.equal(config.eventTopic, keccakText('Claimed(bytes32,address,address)'));
  assert.equal(config.storageSlot, keccak256(
    '0x' + handleKey(config.handle).slice(2) + '0'.repeat(64),
  ));
  // the web build cannot import files above its Vercel root, so it carries a mirror; the mirror
  // must be byte-for-byte the same public config.
  assert.deepEqual(readJson('web/lib/plaque-config.json'), config, 'web config mirror drifted');
  // fail closed on malformed public parameters
  assert.doesNotThrow(() => validateConfig(config));
  assert.throws(() => validateConfig({ ...config, contract: '0x1234' }), /contract/);
  assert.throws(() => validateConfig({ ...config, chainId: 0 }), /chainId/);
  assert.throws(() => validateConfig({ ...config, chainIdHex: '0x1' }), /chainIdHex/);
  assert.throws(() => validateConfig({ ...config, rpc: 'http://insecure.example' }), /https/);
  assert.throws(() => validateConfig({ ...config, eventTopic: '0x00' }), /eventTopic/);
});

test('the SDK constants agree with the config', () => {
  assert.equal(PORTALDOT.chainId, config.chainId);
  assert.equal(PORTALDOT.rpc, config.rpc);
  assert.equal(PORTALDOT.explorer, config.explorer);
});

test('every code path reads the config instead of keeping a second live address', () => {
  for (const f of [
    'web/lib/chain.ts',
    'web/app/dashboard/page.tsx',
    'web/app/layout.tsx',
    'web/app/page.tsx',
    'scripts/verify-live.mjs',
    'scripts/relayer.mjs',
    'scripts/claim-plaque-lite.mjs',
  ]) {
    assert.match(read(f), /plaque-config\.json|config\/plaque\.json/, `${f} must import config/plaque.json`);
  }
});

test('the contracts compile with the chain id the config names', () => {
  for (const f of ['contracts/PlaqueLite.sol', 'contracts/PlaqueV2.sol']) {
    assert.match(read(f), new RegExp(`CHAIN_ID\\s*=\\s*${config.chainId}\\b`), `${f} chain id`);
  }
});

test('public docs name the live contract and chain id', () => {
  for (const f of ['README.md', 'submission/BUIDL.md', 'submission/EVIDENCE.md', 'submission/CHECK-IN.md', 'submission/deck.html']) {
    const s = read(f).replace(/<[^>]+>/g, '').replace(/\s+/g, '');
    assert.ok(s.toLowerCase().includes(config.contract.toLowerCase()), `${f} must name the live contract`);
  }
  for (const f of ['README.md', 'submission/BUIDL.md', 'submission/EVIDENCE.md', 'submission/CHECK-IN.md', 'submission/deck.html']) {
    assert.ok(read(f).includes(String(config.chainId)), `${f} must name the chain id`);
  }
  // The integration guide's policy block is copy-pasteable; its keys must be the keys the
  // policy loader actually reads, not a parallel shape that silently falls back to defaults.
  const guide = read('docs/INTEGRATE.md');
  const block = guide.match(/## 2\. The config surface[\s\S]*?```json\n([\s\S]*?)\n```/);
  assert.ok(block, 'docs/INTEGRATE.md must contain the policy JSON block');
  const policy = JSON.parse(block[1]);
  assert.deepEqual(Object.keys(policy).sort(), ['global', 'minBalanceWei', 'perIp', 'perOrigin', 'perOwner']);
  const changed = structuredClone(policy);
  changed.perIp.max = 1;
  changed.perOwner.max = 1;
  changed.global.maxClaims = 1;
  const normalized = normalizePolicyConfig(changed);
  assert.equal(normalized.perIp.max, 1);
  assert.equal(normalized.perOwner.max, 1);
  assert.equal(normalized.global.maxClaims, 1);
  assert.equal(normalized.global.maxSpendWei, 80_000_000_000_000_000_000n);
  assert.equal(normalized.minBalanceWei, 100_000_000_000_000_000n);
});

test('the committed build settings reproduce the documented bytecode', () => {
  for (const [name, expected] of Object.entries(config.bytecode)) {
    const p = `build/${name}.json`;
    assert.ok(existsSync(new URL('../' + p, import.meta.url)), `${p} missing; run npm run compile`);
    const a = JSON.parse(read(p));
    assert.equal((a.deployedBytecode.length - 2) / 2, expected.bytes, `${name} deployed size`);
    assert.equal(keccak256(a.deployedBytecode), expected.keccak, `${name} deployed keccak`);
    assert.equal(a.compiler.optimizer?.runs, BUILD_CONFIG[name].runs, `${name} optimizer runs`);
    assert.equal(a.compiler.viaIR, BUILD_CONFIG[name].viaIR, `${name} viaIR`);
    assert.equal(a.compiler.metadata, BUILD_CONFIG[name].metadata, `${name} metadata mode`);
  }
});

test('no public file names an unexpected live contract address', () => {
  const known = new Set([
    config.contract.toLowerCase(),
    config.claimant.toLowerCase(),
    config.sponsor.toLowerCase(),
    config.deployer.toLowerCase(),
    // historical deployments, explicitly labelled in README/state
    '0xa0e58d0c6392048959c0b16a9d3696fe49d063d6',
    '0x55040a925e106e7b7507015a0448ced999f572b6',
    // local-ganache transcripts in README (addresses are regenerated on every demo run)
    '0x503dfeccfc48ab11908ad192bb62028bc00b00c3',
    '0x7e6794dc1032580a6e9ebffb83ae31ca491e6496',
    '0x58aca140bddce2409fad44e8747ab41fc1ba3e1d',
    '0x0000000000000000000000000000000000000000',
  ]);
  const files = execFileSync('git', ['ls-files', 'README.md', 'submission/*.md', 'submission/deck.html',
    'web/app/*.tsx', 'web/lib/*.ts', 'web/lib/*.js', 'config/*.json'], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  const found = new Set();
  for (const f of files) {
    for (const m of read(f).matchAll(/0x[0-9a-fA-F]{40}\b/g)) found.add(m[0].toLowerCase());
  }
  const unexpected = [...found].filter((a) => !known.has(a));
  assert.deepEqual(unexpected, [], `unexpected 20-byte addresses in public files: ${unexpected.join(', ')}`);
});

