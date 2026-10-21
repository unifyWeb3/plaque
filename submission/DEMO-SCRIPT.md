# Demo script — Plaque (2:30)

> Two-and-a-half minutes, one screen recording, no voice-over needed for the key beats.
> Every number below is read from the live chain; the commands to reproduce them are in the README.

## 0:00 — The hook (the problem)

**Shot:** the homepage, top of the page, cursor resting on the "problem" paragraph.

**Say / caption:**
> On Portaldot, a brand-new account holds zero tPOT. It cannot make a single on-chain record — and
> testnet POT arrives by hand through a Discord ticket. So every newcomer is stuck at zero.

**On screen:** the live block height in the "Live on the Portaldot V3 testnet" card. It is not a
mock; the page read the chain while you were talking.

## 0:25 — The product in one line

**Shot:** scroll to the hero headline.

> Plaque is a sponsored handle registry. You sign one message. A sponsor pays the gas. Your name
> is on chain, and anyone can read it back.

**On screen:** the contract address, the deployment transaction and the block it landed in.

## 0:50 — The proof strip

**Shot:** the four proof tiles (handles claimed, sponsors, cost per write, "your balance: 0 is
enough to claim").

> The cost per write is measured from a live receipt on this chain: about 0.01 tPOT. A sponsor can
> fund thousands of names with a single tPOT.

## 1:10 — How it works (the three steps)

**Shot:** the three numbered steps, cursor moving down them.

> One: you sign, not you pay — the signature covers the handle, your address, the chain and this
> contract. Two: a sponsor submits the signed claim. Three: the name is bound to your address on
> chain, and the sponsor, the gas price and the block are in the event log.

## 1:35 — The trust model, plainly

**Shot:** the three trust cards.

> The contract trusts nobody except the signature. The sponsor is untrusted — it can refuse to pay
> or go offline, but it cannot forge a claim and it cannot bind a name to somebody else's address.
> There is one key in the whole system and it only ever pays gas. No contract holds anybody's
> money.

## 2:00 — The dashboard, live

**Shot:** the dashboard. Type a handle (e.g. `unify`).

**Say:**
> The state you see is read from the chain, not from a local cache. The status pill comes from one
> pure function of the on-chain state, so the interface can never offer an action the contract
> would refuse.

**Action:** type `unify` → the pill flips to *taken* (or *available*), and the raw 32-byte key is
shown. Show a *taken* handle so the refusal path is visible.

## 2:20 — The honest limitation

**Shot:** the "Known V3 testnet limitation" card.

> One thing I will not hide: this runtime reverts on the BLOCK-family opcodes, so the deployed build,
> which reads `block.chainid` inside the claim digest, cannot complete a claim on this chain. Two
> probe contracts in the repository prove it, and the chain-compatible build that fixes it is
> committed and one faucet top-up away.

## 2:30 — Close

**Shot:** the repository link in the header.

> Everything here is open source, the tests are in the repository, and the deployment and its
> bytecode are in the README. Plaque is a Portaldot Hacker House 2026 project.

---

## If the sponsor flow is running (optional, +30 s)

Start `node scripts/relayer.mjs` before recording, set `NEXT_PUBLIC_SPONSOR_URL`, rebuild, and
show: connect a wallet → sign → the claim is submitted by the sponsor → the registry updates →
the sponsor's balance is down by exactly one write. The user's balance never moves, because it
started at zero — that is the whole product in one screen.

## Commands to reproduce every claim in the script

```bash
npm run compile && npm test                      # 16 tests, all passing
node scripts/deploy-any.mjs Plaque              # deploy (needs a funded wallet)
node scripts/claim-plaque.mjs <contract> <deployTx> unify
node scripts/relayer.mjs --contract Plaque       # a sponsor
cd web && npm run build && npm run start         # the frontend
node web/scripts/qa-browser.mjs http://127.0.0.1:3000   # the browser QA
```
