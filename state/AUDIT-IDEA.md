# Stage 4 — hostile idea critique

**When:** 2026-10-24 08:10Z; competitor scan re-run 2026-10-24 13:10Z. **Verdict:** keep the idea and ship it, but stop calling it novel.
The deployed primitive is real and measurable; the *category* is crowded.

## 1. What the idea actually is

A 32-byte ASCII handle → address binding on the Portaldot V3 EVM, claimed by an EIP-191
signature from a zero-balance account and submitted by a sponsor. No resolver, no records, no
transfers, no renewal, no release in the deployed build. It is a **registry primitive plus a
sponsored-write rail**, not a name service.

## 2. Competitor scan (re-run 2026-10-24 13:10Z)

**DoraHacks, this event:** the public builds tab reports 39 builds and 170 hackers but is gated by
"the organizer is reviewing builds"; the list is not enumerable without a login. I did not bypass
that gate. **Web search:** a public DoraHacks BUIDL and public repositories describe a broader **name service for Portaldot** with six contracts, a resolver, reverse resolution, subnames,
records and a runnable dApp; it is materially broader than Plaque. Adjacent results include a
privacy project on another chain with gasless claims, a transaction-preview copilot, and generic
gasless-relayer infrastructure. **GitHub API:** `search/repositories?q=portaldot` returned HTTP 403
(rate limit, reset 1792843788), so the GitHub side is not exhaustive; the manual web results above
are the evidence. No project or person is named in this repository, per the brief.

Other adjacent results: a Polkadot `.dot` naming system, a transaction-preview copilot, a
privacy matchmaking dApp, and several middleware/indexer projects. Naming is a known category,
not a gap.

**Consequence for the pitch:** delete "nobody has built this" and "first consumer app" (done in
README/deck/PITCH). The defensible difference is not the name registry; it is the **reusable
sponsored-write rail** with a live, measured receipt and a reproducible integration path:

1. a **measured sponsored write** on this specific V3 EVM testnet (3.87 tPOT, zero-balance
   signer, public receipt);
2. a **302-byte** deployed build that is byte-for-byte reproducible from the committed source;
3. a **public verifier** and **41 tests** that anyone can run without a secret;
4. a **reusable integration kit** (`docs/INTEGRATE.md`) with off-chain signature checks, policy
   caps, serialized nonces and a local-chain test;
5. a clean **honesty boundary**: the limits (no release/transfer, zero-handle acceptance, one
   relayer key, first-come registry, no hosted sponsor) are tested and documented rather than hidden.

## 3. Is it worth continuing? (judgment)

**Yes, as a Modular Cloud & Middleware submission, not as a venture.** The strongest part is the rail: a zero-balance
account can get a public, verifiable binding for the price of one storage deposit, and the
sponsor is publicly accountable. That is a reusable onboarding primitive. The weakest parts are
product depth and differentiation: one mapping, no reverse lookup, no profile, no transfer, no
release, no renewal, no integration with wallets or identity pallets, and a hosted app that
cannot submit a claim. A direct competitor already has most of that surface.

The honest positioning is "a small, reproducible sponsored-write primitive with a live receipt",
not "Portaldot's name service". That is enough for a hackathon track if the demo is crisp and the
claims are exact. It is not enough to win on novelty against a broader public name service.

## 4. Gaps a hostile judge will find

| Gap | Severity | Can it be fixed before the deadline? |
|---|---|---|
| Direct, broader name-service competitor | High (judging) | No — not by copying scope. Reposition honestly; do not pivot. |
| Deployed build has no `release`, no validity window, no transfer | High (product) | Only by redeploying a larger build (~4.31 tPOT gas-limit cover, new address); not planned. Document. |
| Hosted app has no sponsor; "claim" is sign-only | High (demo) | A funded local relayer can be shown in the video; a hosted sponsor needs a key and funds. Do not put a key on Vercel. |
| No reverse resolution (`address → handle`) | Medium | Off-chain index from `Claimed` events; not built. |
| No metadata/profile; name is only an address | Medium | Out of scope; say so. |
| ASCII-only, 3–31 chars; no Unicode/homograph policy | Medium | Deliberate; document. |
| Squatting costs 3.87 tPOT per name; no grace period | Medium | Roadmap only. |
| No demo video (required) | Blocking (submission) | Human action: record from `submission/DEMO-SCRIPT.md`; a draft can be generated, but a real voice/screen recording is better. |
| Pitch deck now says the competitor gap is narrower | Low | Fixed in `submission/deck.html` and the PDF. |
| Testnet only, no audit | Low (honesty) | State it; no mainnet claim. |

## 5. Integration guide (useful, small)

The current guide is `docs/INTEGRATE.md`; it covers the relayer module, the client signature, the
config surface, the storage layout and the local test. A dApp that only wants to resolve a handle
needs no SDK:

```ts
import { keccak256, concat, zeroPadValue } from 'ethers';
const key = '0x' + Buffer.from('alice').toString('hex').padEnd(64, '0');
const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
const word = await rpc('eth_getStorageAt', [CONTRACT, slot, 'latest']);
const owner = '0x' + word.slice(-40);
```

To claim from a funded wallet, build the digest, `personal_sign`, then send the five-word
calldata to the contract (see `web/lib/plaque.js` and `scripts/relayer-lib.mjs`). The relayer kit
adds `validateLiteClaim` (off-chain signature/domain/canonical-handle checks), `createSponsorPolicy`
(per-IP/per-origin/per-owner/global/min-balance) and a serialized nonce queue. A TypeScript reader
is `web/lib/chain.ts`; the Solidity reference is `contracts/PlaqueV2.sol`.

## 6. Decision

**Do not pivot.** The code and the live receipt are real; the remaining time is better spent on
reproducibility, honest claims, the missing demo video, and a final clean-clone run than on
adding a resolver/profile/transfer surface that would be a worse copy of a competitor. Record
the competitor risk in the final report; let the human decide whether to enter at all.
