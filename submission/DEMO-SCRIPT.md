# Demo script — Plaque (2:30)

> Two and a half minutes, one screen recording. Every number below is read from the live chain;
> every command is in the README. Record at 1280×900.

## 0:00 — The hook

**Shot:** the homepage, top of the page, cursor on the problem paragraph.

**Say / caption:**
> On Portaldot, a brand-new account holds zero tPOT. It cannot make a single on-chain record — and
> testnet POT arrives by hand through a Discord ticket. So every newcomer is stuck at zero.

**On screen:** the live block height in the "Live on the Portaldot V3 testnet" card. It is not a
mock: the page read the chain while you were talking.

## 0:25 — The product, and a claim that already happened

**Shot:** the hero, then the header table in the README (contract / deployment tx / live claim).

> Plaque is a sponsored handle registry. You sign one message, a sponsor pays, your name is on chain.
> This is not a promise: block 167,209 holds a claim signed by an account whose balance was zero
> before, during and after — `0xd35404…15Fe6` — submitted and paid for by a sponsor.

## 0:50 — The proof shot

**Shot:** a terminal.

```bash
npm run verify:live
```

> This script reads the public RPC and checks ten things: the deployed code is byte-identical to the
> committed build, the name is bound to the zero-balance signer, the event names the sponsor, and the
> contract accepts a valid signature and refuses a tampered one.

**On screen:** ten `PASS` lines and `ALL CHECKS PASSED`.

## 1:20 — How it works

**Shot:** the three numbered steps on the homepage.

> One: you sign, you do not pay. The signature covers the handle, your address, the chain id and this
> contract, so it cannot be replayed anywhere. Two: a sponsor submits the signed claim. Three: the
> contract recovers the signer itself and binds the name — the sponsor cannot choose who gets it.

## 1:40 — The trust model

**Shot:** the three trust cards.

> The contract trusts nobody except the signature. The sponsor is untrusted: it can refuse to pay or
> go offline, but it cannot forge a claim and it cannot bind a name to somebody else's address.
> A claim carries no value; the lite fallback is payable but has no withdraw, so nobody should send tPOT to it.

## 2:00 — The dashboard, live

**Shot:** the dashboard. Type `unify`.

> The state is read from the chain, not a cache. `unify` is taken — by the zero-balance signer — and
> this is the claim that took it, with the sponsor that paid.

**Action:** type `unify` → the pill reads *taken* and the owner is `0xd354…15Fe6`. Then type an
unused name → *needs-wallet* (or *available* once a wallet is connected), with its 32-byte key. Scroll to the sponsor ledger: one row, with the
transaction link.

## 2:20 — The honest engineering story

**Shot:** the "How the live build differs" card.

> One thing worth saying: this runtime reverts on the BLOCK-family opcodes, so my first contract
> could not claim here at all. I proved that with two probe contracts, rebuilt the digest without any
> block value, then hit the second constraint — the chain charges a deposit for every byte of code
> and every storage entry. So the deployed build is 302 bytes, and one claim costs 3.87 tPOT, almost
> all of it that storage deposit. The repository documents both constraints with transactions.

## 2:30 — Close

**Shot:** the repository link.

> It is all open source: contracts, tests, the deployment and the verifier. Plaque, for the Portaldot
> Hacker House 2026.

---

## If a live claim is funded (optional, +40 s)

With ≈4 tPOT in the sponsor, run `npm run claim <contract> <handle>` on camera: the claimant signs,
the sponsor pays, the storage slot and the event appear, and the claimant's balance stays at 0. The
registry and the ledger update on the next page load.

## Commands to reproduce every claim in the script

```bash
npm run compile && npm test                      # 33 tests, all passing
npm run demo                                     # the mechanic on a local chain (labelled as such)
npm run verify:live                              # 10 checks against the live testnet
node scripts/deploy-any.mjs PlaqueLite           # deploy (needs a funded wallet)
npm run claim -- <contract> <handle>             # a live sponsored claim
npm run relayer -- --contract PlaqueLite         # a sponsor
cd web && npm run build && npm run start         # the frontend
node web/scripts/qa-browser.mjs http://127.0.0.1:3000   # the browser QA
```
