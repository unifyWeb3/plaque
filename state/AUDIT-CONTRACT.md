# Stage 3 — hostile contract and relayer review

**When:** 2026-10-24 09:05Z; re-checked 2026-10-24 13:20Z. **Scope:** `contracts/PlaqueLite.sol` (the deployed build),
`contracts/PlaqueV2.sol`, `contracts/Plaque.sol` (reference), `scripts/relayer.mjs`,
`scripts/relayer-lib.mjs`, `scripts/rpc-lib.mjs`, `web/lib/chain.ts`. Every refusal below has a
positive control in the same test file or command.

## Findings

| # | Attack / failure | Result | Evidence |
|---|---|---|---|
| C1 | Replay the same signed claim | Refused: `ownerOf` is already non-zero; a second claim reverts `Unavailable()`. | `tests/plaque-lite.test.mjs` "a second claim for the same handle is refused", with the first claim as positive control. |
| C2 | Change `who` and reuse the signature | Refused: the digest includes `who`; `ecrecover` returns a different address. | `verify-live` "a signature for another address is refused"; `tests/plaque-lite` cross-address case. |
| C3 | Change the chain or contract | Refused: both are in the digest. | `tests/plaque-lite` cross-chain and cross-contract cases; `verify-live` valid `eth_call` positive control. |
| C4 | Malleate `(r,s,v)` | Not exploitable. The lite build uses `ecrecover` and does not reject high-s, so a malleated signature may also recover the same signer; it still authorizes the same `handle/who/chain/contract`. There is no per-signature nonce to bypass. | Code review; `scripts/relayer-lib.mjs` validates `v ∈ {27,28}` and recovers with `verifyMessage`; the contract is the final verifier. |
| C5 | Front-run a claim | The front-runner can submit the same signed claim, but it binds `who`; it cannot change the owner. It can only race to pay the deposit. | Digest code in `contracts/PlaqueLite.sol` and `web/lib/plaque.js`; test C2. |
| C6 | Zero address as `who` | Refused by the contract (`who == 0`). Positive control: a valid non-zero `who` is accepted in the same `eth_call` matrix. | `verify-live` "a zero address is refused"; `scripts/probe-zero-key.mjs` PASS at block 178348. |
| C7 | Zero handle | **Accepted by the deployed contract if validly signed.** The owner is the non-zero signer, not the zero address; the sponsor pays the deposit. The UI and relayer refuse it, but a direct caller can claim it with their own gas. Documented, not hidden. | `tests/plaque-lite` "the zero-key limitation is explicit"; `scripts/probe-zero-key.mjs` live `eth_call` (zero handle accepted, invalid signature refused, zero address refused, state unchanged); `state/CHAIN-LIMITATION.md`. |
| C8 | Non-canonical handle / uppercase | The contract accepts any 32-byte key. The UI normalises to lower case; the relayer requires the key to equal `handleKey(normalizeHandle(name).name)`. | `tests/relayer.test.mjs` "a valid claim is accepted..." includes UI/relayer parity cases. |
| C9 | Calldata length | The fallback copies exactly five words. Short calldata yields zero words and a failed recovery; extra trailing bytes are ignored by the copy. No memory-safety issue in the generated code. | `contracts/PlaqueLite.sol`; `tests/plaque-lite` "encoded as five raw words". |
| C10 | Spam / squatting | Every successful claim pays the chain's storage deposit (measured 3.87 tPOT). There is no on-chain rate limit. The reference relayer caps pending requests at 4, applies per-IP/per-origin/per-owner windows, a global claim/spend budget and a minimum-balance reserve, and uses a fixed gas limit. | `config/relayer-policy.example.json`; `tests/relayer-policy.test.mjs`; HTTP 429 tests at 12:40Z; earlier origin 403/taken 400/unfunded 400. |
| C11 | Relayer key drain | Fixed `CLAIM_GAS_LIMIT = 1.3e14`; `claimGasLimit` refuses unless `balance >= limit × gasPrice + reserve`; no whole-balance gas; server binds `127.0.0.1`; origin allowlist; body cap 20 kB; global budget caps the loss per window. A leaked key can still drain its remaining balance, but cannot forge a claim. | `scripts/relayer.mjs`, `scripts/relayer-lib.mjs`, `scripts/relayer-policy.mjs`; `tests/relayer.test.mjs`, `tests/relayer-policy.test.mjs`; HTTP 429 tests. |
| C12 | Nonce concurrency | Submissions are serialised through one promise chain and read `eth_getTransactionCount(..., 'pending')`; each raw tx is sent with retries disabled; a reservation is released if the send or receipt fails. | Code review `scripts/relayer.mjs` `enqueue`/`submit`; `scripts/rpc-lib.mjs`. |
| C13 | Wrong RPC / wrong chain | Fail closed. `verify-live` exits 2 on a local chain 1337; the relayer checks `eth_chainId` and contract code at startup; the web `headBlock` checks chain once per process. | 09:02Z command `PORTALDOT_RPC=http://127.0.0.1:8546 npm run verify:live` → exit 2, `RPC chain 1337 != config chain 420420777`. |
| C14 | Storage layout | The owner mapping is slot 0; the verifier reads `keccak256(handleKey || 0x00…00)` and compares it to `ownerOf`. | `tests/consistency.test.mjs`; `verify-live` owner check; `web/lib/chain.ts` `ownerSlot`. |
| C15 | Contract holds funds | The lite fallback is `payable` and has no `withdraw`; value sent is stuck. The claim path sends value 0. | `contracts/PlaqueLite.sol`; README/UI corrected. |
| C16 | Readable build claims | `Plaque.sol` uses `block.chainid`/`block.timestamp` and cannot complete a claim on this runtime; `PlaqueV2` is chain-compatible but not deployed. | `state/CHAIN-LIMITATION.md`; `tests/plaque.test.mjs`; no live claim for either. |

## Positive-control discipline

The verifier's refusal checks are paired with a valid `eth_call` in the same run (C2/C3/C6); the
ganache suite's duplicate/cross-address/cross-chain refusals are paired with a successful first
claim; the relayer's 403/400 responses are paired with a valid signed claim that reaches the
on-chain free-slot check. No refusal was accepted on the strength of a negative-only test.

## Residual risk (judgment)

The main residual risks are product-level, not a missing signature check: the zero handle accepted by
the frozen contract, the payable fallback, the single sponsor key's balance, the 3.87 tPOT squatting
cost, and the fact that the hosted app has no sponsor. The relayer controls bound a public deployment
to the global budget, but a leaked key can still drain its remaining balance; per-IP/origin can be
spoofed by a non-browser client, and per-owner is bypassable with fresh keypairs. They are documented
and tested rather than presented as absent.
