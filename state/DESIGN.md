# Stage 3 — Design (Plaque)

> **Audit note (2026-10-24):** this file was rewritten to describe the code that is actually
> deployed. The earlier version described `Plaque.sol` (a validity window, a claim counter, a
> `gasPrice`/`at` event and a release button) as if it were the live product. Those features are
> **not** in the deployed `PlaqueLite`; the differences are called out below. See
> `state/AUDIT-BASELINE.md` for the findings and `README.md` for the current public claims.

**Product:** Plaque — a sponsored handle registry for the Portaldot V3 testnet. A user signs a
claim; a sponsor submits it and pays the chain fee and storage deposit. The binding is public and
readable through the RPC.

**Track:** 4 · Ecosystem DApps (consumer-facing application).

---

## 1. Components

| Component | Where | Responsibility |
|---|---|---|
| `PlaqueLite.sol` | Portaldot V3 testnet EVM, `0x5432e6b8…b685` | **Deployed.** Fallback-only assembly: verifies an EIP-191 signature over `(1, handle, who, chainId, contract)`, stores `ownerOf[handle] = who`, emits `Claimed(handle, who, sponsor)`. No release, no window, no gas-price field. |
| `Plaque.sol` | First deployment, `0xa0e58d0c…63d6` | Readable reference. Uses `block.chainid` and `block.timestamp`; every claim reverts on this runtime. Kept as evidence, not as the product. |
| `PlaqueV2.sol` | Not deployed | Readable, chain-compatible: constant chain id, no window, `release`, four-argument `Claimed` event with `gasPrice`. Its code deposit (~74.5 tPOT) exceeded the funded balance. |
| `web/lib/plaque.js` | Browser + Node | Handle normalisation, both digest builders, ABI, refusals and the pure state function. |
| `scripts/relayer.mjs` | Operator machine | Verifies the claim off chain, checks the handle is free, uses a fixed gas limit, serialises nonces and submits. Never sees the claimant key. |
| `web/` | Vercel | Homepage (pitch + live reads) and dashboard (live registry + claim payload). The hosted app has no sponsor key; it does not send a transaction. |

## 2. Data flow of one sponsored claim

1. The user types a handle. `normalizeHandle` lowercases/trims it and enforces 3–31 bytes of
   `[a-z0-9._-]`; `handleKey` produces the 32-byte UTF-8 key, zero-padded.
2. The SDK builds the digest and the wallet signs it with `personal_sign`. The user sends no
   transaction and pays nothing.
3. The signed claim goes to a sponsor. The relayer validates the shape, canonical handle and
   signature **before** spending gas, checks the storage slot is free, then submits.
4. `PlaqueLite` recomputes the digest, checks `ecrecover == who`, checks the slot is empty, writes
   `ownerOf[handle] = who` and emits the event. The sponsor pays.
5. The dashboard reads `eth_getStorageAt` for a single handle and `eth_getLogs` from the deployment
   block for the list. It does not use `eth_call` for reads (the node rejects unfunded callers).

## 3. On-chain vs off-chain, and custody

**On-chain:** the handle→owner binding and the `Claimed` events (handle, who, sponsor). The lite
event does **not** record the gas price or a timestamp; those are in the transaction receipt/block.

**Off-chain:** the signed payload, the relayer and the UI. They are untrusted; the contract checks
the signature.

**Custody:** there is no escrow, bond, arbitration or name fee. The sponsor pays the chain fee and
the storage deposit. The lite fallback is `payable` but has no withdraw, so a claim must send value
0; do not send tPOT to the contract. The sponsor key is the only key in the system; if leaked, its
balance can be drained, but it cannot forge a claim or choose a recipient.

## 4. Contract interfaces

**Deployed `PlaqueLite` (no ABI, no selector):**

```
calldata = handle (32) ‖ who (32, address right-aligned) ‖ v (32) ‖ r (32) ‖ s (32)   // 0xa0 bytes
slot     = keccak256(handle ‖ bytes32(0))
event    = Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor)
digest   = keccak256(abi.encode(bytes32(1), handle, who, bytes32(420420777), bytes32(address(this))))
hash     = keccak256("\x19Ethereum Signed Message:\n32" ‖ digest)
```

**Readable builds:** `Plaque.sol` adds `validUntil` and uses `block.chainid`/`block.timestamp`
(hence unusable here). `PlaqueV2.sol` drops the window and uses the same five-field digest as the
lite build, but has an ABI and a four-argument event with `gasPrice`.

**Refusals, as implemented:**

| Condition | Lite behaviour |
|---|---|
| calldata length ≠ 0xa0 | revert |
| `who == 0` or dirty upper 96 bits | revert |
| handle already owned | revert |
| recovered signer ≠ `who` | revert |
| handle == 0 | **accepted** if validly signed (known limit; app and relayer reject it) |
| expired claim | no window; a signed claim can be submitted until the name is taken |
| release | no `release` function; a `release` call reverts |
| value sent | accepted by the payable fallback and stuck (no withdraw) |

## 5. UI state function

`deriveHandleState({ owner, connected, handle, now, validUntil, supportsRelease })` is the single
pure function used by the dashboard. It treats the zero address as “no owner” (the bug found in the
baseline), returns `needs-wallet` when no wallet is connected, `available` for a free handle with a
wallet, `taken` for an owned handle, and `owned` when the connected wallet is the owner.
`supportsRelease` defaults to `false`; the deployed lite build has no release. The dashboard does not
offer a release action.

## 6. Threat model

| Threat | Mitigation / residual risk |
|---|---|
| Relayer binds a name to a third party | On-chain `ecrecover` must equal `who`. |
| Replay of the same signature | The handle can be claimed once. There is no nonce or deadline; a signed claim can be held and submitted later, but it can only bind the signer's own address. |
| Replay on another chain/contract | Chain id and contract address are in the digest. |
| Front-running / squatting | Anyone can submit a valid claim; a squatter must sign for their own address and pay ~3.87 tPOT per name. A claim-then-confirm grace period is roadmap. |
| Relayer drain | Off-chain signature validation, free-slot check, fixed 1.3e14 gas limit, nonce queue and a small pending cap. The relayer binds to localhost and rejects unknown browser origins. |
| Sponsor key leak | It can drain the sponsor balance; it cannot forge a claim. Key is `0600`, gitignored, never in the frontend. |
| UI offers a rejected action | One pure state function; the zero-owner bug is fixed and tested; the hosted app does not claim to submit. |
| Deployed code ≠ source | `scripts/build-config.mjs` pins per-contract settings and canonical source keys; `verify:live` compares raw `eth_getCode`; the consistency test checks all four hashes. |
| Event/indexer retention | The dashboard scans from the deployment block, not a 20k window; if the node prunes the range, the API errors rather than showing an empty registry. |

## 7. Build and deployment

- Chain: Portaldot V3 testnet, EVM RPC `https://test-evm-rpc-v3.portaldot.dev`, chain id
  `420420777`.
- Compiler: solc-js 0.8.28, `evmVersion: paris`.
- Per-contract settings (recorded in `scripts/build-config.mjs`):
  - `Plaque`: `viaIR: true`, runs 1, `metadata.bytecodeHash: none`;
  - `PlaqueV2`: `viaIR: true`, runs 1, `none`;
  - `PlaqueLite`: `viaIR: false`, runs 200, `ipfs` (canonical source key `/root/hack/contracts/PlaqueLite.sol`);
  - `Gate`: `viaIR: false`, runs 1, `none`.
- Deploy script computes the deposit-driven gas window from the balance and the measured rate and
  fails closed. A deployment needs a funded sponsor; the current sponsor holds 0.87 tPOT, below the
  ~4.29 tPOT gas-limit requirement for one claim.
- After deployment: fetch the code, compare the raw keccak (and the metadata-stripped runtime), run
  the claim, read the event and storage at a pinned block, and record the hashes.

## 8. Test plan (33 tests)

- `tests/plaque.test.mjs` (16): readable build, legitimate path, refusals with positive controls,
  digest vs Solidity, release access control, UI state, refusals list, unit conversion.
- `tests/plaque-lite.test.mjs` (7): size and bytecode, shared digest with V2, binding/event/zero-cost
  claimant, refusals, event topic, cross-chain/cross-contract/no-release, zero-key limitation.
- `tests/consistency.test.mjs` (7): config, SDK constants, docs, compiler settings, bytecode hashes,
  address allowlist.
- `tests/relayer.test.mjs` (3): valid claim, forged/cross-chain/zero/non-canonical refusals, fixed
  gas limit.

Live: `npm run verify:live` — 10 checks against one pinned block, no secret and no funds.

## 9. Claims the product may and may not make

**May claim:** every bound handle is owned by the address that signed for it; a claim is sponsored
(the user paid nothing); the sponsor is public in the event; the registry is readable from the RPC;
the deployed bytecode matches the committed source under the recorded build settings; the cost
figures come from receipts; the hosted app reads the chain and produces the signed payload.

**May not claim:** that the hosted app submits a transaction; that there is a release, a window or a
gas-price field in the deployed event; that the lite contract rejects the zero handle; that the
sponsor is trustworthy or always available; that `MetaTx` is used; that the product is audited; that
it works on mainnet.
