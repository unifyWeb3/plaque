# Stage 4 — hostile idea critique

**When:** 2026-10-24 08:10Z. **Verdict:** keep the idea and ship it, but stop calling it novel.
The deployed primitive is real and measurable; the *category* is crowded.

## 1. What the idea actually is

A 32-byte ASCII handle → address binding on the Portaldot V3 EVM, claimed by an EIP-191
signature from a zero-balance account and submitted by a sponsor. No resolver, no records, no
transfers, no renewal, no release in the deployed build. It is a **registry primitive plus a
sponsored-write rail**, not a name service.

## 2. Direct competitor found (re-run of the scan, 2026-10-24)

A public DoraHacks BUIDL and two public repositories describe an **ENS-style `.pot` name service
for Portaldot**, built in ink!, with six contracts (registry, registrar, resolver, reverse
registrar, subnames, attestations), a TypeScript/Python SDK, a Next.js dApp, commit–reveal
registration, length-based pricing, records, reverse resolution and a roadmap. It is materially
broader than Plaque and is already a runnable MVP. One repository says it was built for a
*Portaldot mini hackathon*; the BUIDL page was updated within the last day. I did not verify
whether it is entered in this Hacker House, and I am not naming it in the repo (the brief says
not to name other projects). The point is not the name: **the "name registry on Portaldot" idea
is not novel, and a judge may have seen a much more complete one.**

Other adjacent results: a Polkadot `.dot` naming system, a transaction-preview copilot, a
privacy matchmaking dApp, and several middleware/indexer projects. Naming is a known category,
not a gap.

**Consequence for the pitch:** delete "nobody has built this" and "first consumer app" (done in
README/deck/PITCH). The defensible claims are narrower:

1. a **measured sponsored write** on this specific V3 EVM testnet (3.87 tPOT, zero-balance
   signer, public receipt);
2. a **302-byte** deployed build that is byte-for-byte reproducible from the committed source;
3. a **public verifier** that anyone can run without a secret;
4. a clean **honesty boundary**: the limits (no release/window, zero-key acceptance, no hosted
   sponsor) are tested and documented rather than hidden.

## 3. Is it worth continuing? (judgment)

**Yes, as a track-4 demo, not as a venture.** The strongest part is the rail: a zero-balance
account can get a public, verifiable binding for the price of one storage deposit, and the
sponsor is publicly accountable. That is a reusable onboarding primitive. The weakest parts are
product depth and differentiation: one mapping, no reverse lookup, no profile, no transfer, no
release, no renewal, no integration with wallets or identity pallets, and a hosted app that
cannot submit a claim. A direct competitor already has most of that surface.

The honest positioning is "a small, reproducible sponsored-write primitive with a live receipt",
not "Portaldot's name service". That is enough for a hackathon track if the demo is crisp and the
claims are exact. It is not enough to win on novelty against a full ENS port.

## 4. Gaps a hostile judge will find

| Gap | Severity | Can it be fixed before the deadline? |
|---|---|---|
| Direct, broader ENS-style competitor | High (judging) | No — not by copying scope. Reposition honestly; do not pivot. |
| Deployed build has no `release`, no validity window, no transfer | High (product) | Only by redeploying a larger build (~4.29 tPOT gas-limit cover, new address); not planned. Document. |
| Hosted app has no sponsor; "claim" is sign-only | High (demo) | A funded local relayer can be shown in the video; a hosted sponsor needs a key and funds. Do not put a key on Vercel. |
| No reverse resolution (`address → handle`) | Medium | Off-chain index from `Claimed` events; not built. |
| No metadata/profile; name is only an address | Medium | Out of scope; say so. |
| ASCII-only, 3–31 chars; no Unicode/homograph policy | Medium | Deliberate; document. |
| Squatting costs 3.87 tPOT per name; no grace period | Medium | Roadmap only. |
| No demo video (required) | Blocking (submission) | Human action: record from `submission/DEMO-SCRIPT.md`; a draft can be generated, but a real voice/screen recording is better. |
| Pitch deck now says the competitor gap is narrower | Low | Fixed in `submission/deck.html` and the PDF. |
| Testnet only, no audit | Low (honesty) | State it; no mainnet claim. |

## 5. Integration guide (useful, small)

A dApp that wants to resolve a handle needs no SDK:

```ts
import { keccak256, concat, zeroPadValue } from 'ethers';
const key = '0x' + Buffer.from('alice').toString('hex').padEnd(64, '0');
const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
const word = await rpc('eth_getStorageAt', [CONTRACT, slot, 'latest']);
const owner = '0x' + word.slice(-40);
```

To claim from a funded wallet, build the digest, `personal_sign`, then send the five-word
calldata to the contract (see `web/lib/plaque.js` and `scripts/relayer-lib.mjs`). A TypeScript
reader is `web/lib/chain.ts`; the Solidity reference is `contracts/PlaqueV2.sol`.

## 6. Decision

**Do not pivot.** The code and the live receipt are real; the remaining time is better spent on
reproducibility, honest claims, the missing demo video, and a final clean-clone run than on
adding a resolver/profile/transfer surface that would be a worse copy of a competitor. Record
the competitor risk in the final report; let the human decide whether to enter at all.
