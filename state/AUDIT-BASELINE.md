# AUDIT BASELINE — clean-clone reproduction (BEFORE fixes)

Recorded **2026-10-24T02:42Z → 06:32Z**. This file records the original state, including failures,
so the fixes can be compared against it. It is not a claim that the project is ready.

## 0. Baseline identity

| Item | Value |
|---|---|
| Default branch | `main` |
| HEAD at audit start | `23f406702c0f456bbdea00c21aab46655780e1f3` |
| Working tree | clean (`git status --porcelain` empty) |
| Public repo | `https://github.com/unifyWeb3/plaque` |
| `audit-baseline` tag | did **not** exist; created at `23f406702c0f456bbdea00c21aab46655780e1f3` |
| Clone used | `https://github.com/unifyWeb3/plaque.git` → `/tmp/opencode/audit/plaque-baseline` |
| Clone SHA | `23f406702c0f456bbdea00c21aab46655780e1f3` (branch `main`, clean) |
| Node / npm | `v22.22.1` / `9.2.0` |
| OS | Linux aarch64 (no native solc/foundry) |

The clone contained no `secrets/`, no `build/`, no `node_modules/`, no `.env` — as expected.

## 1. Install (README line: `npm install`)

First attempt, default cache:

```
$ npm install
npm ERR! code ENOENT ... _cacache/tmp/85ab200b -> .../be/33/...
EXIT=1
```

Second/third attempts with a fresh cache failed on registry socket timeouts:

```
$ npm install --cache /tmp/opencode/npm-cache --no-audit --no-fund
npm ERR! code ETIMEDOUT ... @polkadot/types-support
EXIT=1

$ npm install --cache /tmp/opencode/npm-cache --fetch-timeout=120000 --fetch-retries=2
npm ERR! code ERR_SOCKET_TIMEOUT ... smoldot
EXIT=1
```

A clean install eventually succeeded, with environment workarounds only (no files copied from the
working tree):

```
$ npm install --prefer-offline --cache /tmp/opencode/npm-cache2 --no-audit --no-fund \
    --maxsockets=1 --fetch-timeout=600000 --fetch-retries=5
added 453 packages in 2m
EXIT=0
```

**F0 (environment, not a product defect):** the public npm registry was slow/flaky from this host;
`npm ci` also fails because `package-lock.json` is out of sync with `package.json`
(`Missing: @polkadot/x-textdecoder@13.5.7 from lock file`, exit 1). `npm install` rewrites the lock.

## 2. Compile (README line: `npm run compile`)

```
$ npm run compile
solc-js version: 0.8.28+commit.7893614a.Emscripten.clang
Gate        285 creation / 255 deployed bytes
Plaque     1116 creation / 1085 deployed bytes
PlaqueLite  333 creation / 302 deployed bytes
PlaqueV2   1026 creation / 995 deployed bytes
EXIT=0
```

This does **not** reproduce the documented/deployed artifacts for three contracts:

| Contract | Deployed (chain) | `npm run compile` (clean clone) | Documented |
|---|---:|---:|---:|
| PlaqueLite | 302 B | 302 B | 302 B |
| Plaque | 786 B | 1085 B | 786 B |
| PlaqueV2 | 741 B | 995 B | 741 B |
| Gate | 214 B | 255 B | 214 B |

The reason was isolated with a compile matrix: the committed working artifacts were produced with
`viaIR: true, optimizer runs: 1, metadata.bytecodeHash: none` for Plaque/PlaqueV2, and
`viaIR: false, runs: 1, none` for Gate; PlaqueLite used `runs: 200, ipfs`. `compile.mjs` defaults
to `viaIR: false, runs: 200, ipfs`, so it silently produces different bytecode. Re-compiling with
the recorded per-contract settings reproduces the deployed raw code exactly (Plaque
`0xce34126d…72ae`, PlaqueV2 `0xbf079c2d…20bca`, Gate `0x2bd5f237…67d3`).

PlaqueLite raw hash:

```
deployed      302 B  keccak 0x8a952eb82ff4a318b515cbface69a28c0f5dbbdab725d26220612a2dde6e3986
clean default 302 B  keccak 0xa8997f1470186e7d7124fb94ba509edf23b1ea2c7bae42316ce0bdb75880168a
```

The only difference is the CBOR metadata suffix, which hashes the **absolute source path**
(`/root/hack/contracts/PlaqueLite.sol` at deployment vs the clone path). Stripping the metadata:

```
runtime (no metadata) 249 B
deployed normalized   keccak 0xe1d47006fcd00823101a9bf8e9e9b03403f399722511bead88acdef98208068a
clean normalized      keccak 0xe1d47006fcd00823101a9bf8e9e9b03403f399722511bead88acdef98208068a
equal = true
```

So the deployed **runtime logic** matches the committed source, but the raw byte-for-byte claim in
README/EVIDENCE/CHECK-IN is false for a clean clone at a different path and with default settings.

## 3. Tests (README line: `npm test`)

```
$ npm test
# tests 21
# pass 21
# fail 0
# cancelled 0
# skipped 0
EXIT=0
```

All 21 pass, 87 s. This is the one README command that worked exactly as written in the clean clone.

## 4. Live verifier (README line: `npm run verify:live`)

```
$ npm run verify:live
Error: ENOENT: no such file or directory, open 'secrets/claimant.key'
EXIT=1
```

The verifier requires a gitignored secret that a clean clone cannot have. This is a direct
contradiction of “read-only, no funds needed” / “anyone can run it”.

With a temporary random key (not the live claimant), it runs but fails 3 checks because it compares
live storage/event values against the local key:

```
$ CLAIMANT_KEY=/tmp/opencode/audit/tmp-claimant.key npm run verify:live
FAIL deployed code equals the committed build   (raw metadata/path mismatch)
FAIL ownerOf("unify") is the zero-balance claimant
FAIL the event names the claimant as `who`
PASS the claimant still holds 0 wei
PASS the Claimed event is on chain  block 167209
PASS the event names the sponsor that paid
PASS a valid signature is accepted (eth_call)
PASS a tampered signature is refused
PASS a signature for another address is refused
PASS an empty handle is refused
3 CHECK(S) FAILED
EXIT=1
```

## 5. Web app (README lines: `cd web; npm install; npm run dev`)

```
$ npm install        added 32 packages in 2m, EXIT=0
$ npm run build      ✓ Compiled successfully, 5 routes, EXIT=0
$ npm run typecheck  EXIT=0
$ npm run lint       prompts for ESLint setup and exits 1 (no config committed)
```

`node scripts/qa-browser.mjs` at 390×844 and 1280×900: no overflow, h1 present, 2 px focus outline,
no console errors, `EXIT=0`. The QA only checks layout; it does not exercise a claim.

A direct interaction with a free handle (`audit-free-1`) showed:

```
pill: "taken"
buttons: Connect wallet (enabled), Sign and claim (disabled)
text: "The contract refuses a handle that already has an owner."
```

The API returns `owner: "0x0000000000000000000000000000000000000000"` for a free handle;
`deriveHandleState` treats that truthy string as an owner, so **the dashboard refuses every free
handle** even though the contract would accept it.

## 6. Local demo (README line: `npm run demo`)

```
$ npm run demo
contract bytecode 995 bytes
matches the artifact true
claim succeeds, claimant pays 0 wei, second claim refused Unavailable()
EXIT=0
```

It is correctly labelled as a local ganache chain. Its output no longer matches the committed
`evidence/local-demo.txt` (which says 741 bytes) because the compile settings changed.

## 7. Live chain facts observed at 2026-10-24T06:32Z

| Item | Value |
|---|---|
| Chain id | `0x190f1ca9` = 420420777 |
| Head | 171,060 |
| Contract | `0x5432e6b89dc3042d47f2be98e971cad9dabab685` (302 B) |
| Deploy tx | `0xcee4d1db…bb63a`, block 167044, status `0x1`, gas 1,114,774,206,357,087 |
| Claim tx | `0xa654bd9c…edf2`, block 167209, status `0x1`, gas 117,560,751,145,021, 1 log |
| Claimant balance | 0 wei |
| Sponsor balance | 874,819,304,188,115,062 wei |
| Deployer balance | 47,589,628,396,231,655 wei |
| `eth_getLogs` | one `Claimed` log at block 167209, four topics, empty data |

## 8. Baseline failure list

| # | Failure | Severity | Where |
|---|---|---|---|
| F1 | Clean-clone `verify:live` crashes on missing `secrets/claimant.key` | Critical (reproducibility) | `scripts/verify-live.mjs:24` |
| F2 | Raw bytecode claim false in a clean clone: build settings/path not pinned; `compile.mjs` defaults differ from deployed builds | Critical (supply chain) | `scripts/compile.mjs`, README, EVIDENCE, CHECK-IN |
| F3 | Dashboard classifies every free handle as `taken`; claim button disabled | Critical (product) | `web/lib/plaque.js:deriveHandleState`, `web/app/api/registry/route.ts` |
| F4 | Homepage claims 0.0004 tPOT/claim and “tens of thousands with one tPOT”, contradicting the measured 3.87 tPOT | High (false claim) | `web/app/page.tsx` |
| F5 | Event scan only covers the last 20,000 blocks; the live claim will vanish from the dashboard | High (demo/reproducibility) | `web/lib/chain.ts:readEvents` |
| F6 | `package-lock.json` does not satisfy `npm ci`; `lint` is unconfigured | Medium (reproducibility) | `package-lock.json`, `web/package.json` |
| F7 | Docs disagree on release/validUntil/event shape and compiler settings | High (claims) | DESIGN, DECISION, README, EVIDENCE |

No funds were spent and no chain state was changed during this baseline.
