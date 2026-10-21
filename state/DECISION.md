# Stage 2 — Decision record

## 2.1 Candidates (10 genuinely distinct ideas), scored

Scoring 1–5 per criterion. Weights: problem&audience, Portaldot-leverage, alternative-gap, feasibility,
90-second demonstrability, judging-fit, durability. "Kill?" is the hard gate.

| # | Idea | Track | Problem & audience | Portaldot leverage | Alternatives / gap | Feasibility | 90s demo | Judging fit | Durability | Total /35 | Kill? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Sponsored handle registry** — anyone claims an on-chain name for free; a sponsor pays the gas, atomically settled in native POT; the chain becomes the ecosystem's directory | 4 (with 1 substrate) | 5 | 5 | 5 | 4 | 5 | 4 | 5 | **33** | no |
| 2 | Sponsored **broadcast rail** (generic signed-message board) as the product | 1 | 3 | 4 | 2 (attestation cliché) | 5 | 4 | 3 | 4 | 25 | yes — crowded house style |
| 3 | **Transaction-execution middleware + verifiable receipts** | 1 | 4 | 4 | 1 (the manifest-driven middleware owns it) | 2 | 3 | 3 | 3 | 20 | yes — direct collision |
| 4 | **Verifiable on-chain history / indexer** | 1 | 4 | 4 | 1 (the verifiable history indexer owns it) | 2 | 3 | 3 | 3 | 20 | yes — direct collision |
| 5 | **Validator / delegation-risk console** on the live chain | 3 | 4 | 4 | 2 (the validator-risk report owns it) | 4 | 4 | 3 | 3 | 24 | yes — adjacent to the validator-risk report |
| 6 | **Mixnet session & node-coverage monitor** | 3 | 3 | 5 (unique pallet) | 4 | 2 | 2 | 3 | 3 | 22 | yes — 0 registered mixnodes, nothing to show |
| 7 | **Cross-chain intent settlement / light client** | 2 | 4 | 3 | 1 (the cross-chain intent settler, bridge-zero) | 2 | 2 | 3 | 3 | 18 | yes — collision + huge scope |
| 8 | **RWA voucher / merchant credit** on the `Assets` pallet with EVM precompiles | 4 | 4 | 4 | 3 | 2 | 3 | 4 | 3 | 23 | yes — needs a real asset; would be staged/fake |
| 9 | **On-chain security-report registry** for Portaldot contracts | 3/1 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 22 | yes — drifts into bounty/escrow framing; bounty-escrow is explicitly excluded |
| 10 | **Deployment-cost calculator + one-click deployer** for Portaldot (tooling) | 3 Tooling | 4 (every builder hits it) | 5 | 5 | 5 | 4 | 3 | 4 | 30 | kept as a **supporting feature**, not the product |

### Strongest argument *against* each candidate
1. **Sponsored handle registry** — a name service is a 2017 idea; the sponsor/sponsorship framing is close to
   credit/escrow, which the brief excludes; and if a sponsor pays for a name, a judge may read it as
   "pay-to-list". *Mitigation: the sponsor pays only gas, never a fee for the name; the name itself is free and
   permanent; the payment settles to a public treasury address in the same transaction; no dispute or
   third-party custody exists anywhere in the design.*
2. Broadcast rail — indistinguishable from the ecosystem's default "attestation" build.
3. Middleware — the manifest-driven middleware already does it, better.
4. History — the verifiable history indexer already does it, better.
5. Validator console — the validator-risk report already publishes validator-concentration findings, with better data.
6. Mixnet monitor — the mixnet has 0 registered mixnodes; the demo would be empty.
7. Cross-chain — two competitors and a multi-month scope.
8. RWA voucher — no real asset exists on the chain, so the product would be staged data presented as live.
9. Security reports — drifts into bounty/escrow/dispute framing; also a governance-sensitive surface.
10. Deploy tooling — genuinely useful and unclaimed, but a tool is not a product; it is weak on
    "Ecosystem Contribution" and on business potential.

**The easiest idea did not automatically win**: #10 is the easiest to build and the fastest to demo, and it was
still demoted to a supporting feature because a tool alone is a weak entry for a 30 %-weighted "ecosystem
contribution" and "business potential" rubric.

## 2.2 Selected product

**Herald — the sponsored handle registry for Portaldot.**

- **Problem, one sentence:** on Portaldot a brand-new user holds 0 POT, so they cannot record a single thing
  on-chain, and there is no on-chain directory to put themselves in.
- **Audience:** people joining the Portaldot ecosystem (the 143 registered hackers, ecosystem newcomers,
  builders shipping their first dApp) — and, in a second audience, the ecosystem operators who want a
  permissionless directory instead of a hand-maintained list.
- **How it solves it:** a user signs a claim for a name (EIP-712-style digest over handle + address + chain id
  + contract + nonce) and never touches gas; a **sponsor** submits the signed claim and pays. The contract
  recovers the signature, refuses any claim whose signer does not match the claimed address, binds the name to
  that address, and records the sponsor and the gas price in an event — so the registry doubles as a public,
  verifiable ledger of *who paid for Portaldot's growth*. The name can be released by its owner and re-claimed.
- **Why better than the closest alternative:** the closest alternatives (the manifest-driven middleware, the verifiable history indexer) are *infrastructure for
  builders*; they do not let an ordinary user act. Herald's whole value is that the user spends nothing and is
  still recorded on-chain — provable in one glance, because the user's POT balance is unchanged.
- **Why Portaldot is materially relevant:** (i) the runtime ships `MetaTx`/`VerifySignature` and a
  `SkipFeelessPayment` pallet — a chain-level gasless path that most chains lack; (ii) a sponsored write costs
  ~0.03 tPOT here (measured), so a sponsor can fund tens of thousands of writes per POT; (iii) the
  storage-deposit economics (0.157 tPOT/byte) make the code-deposit a first-class product constraint that
  Herald's design accounts for; (iv) the V3 EVM had essentially no consumer application before this build.
- **Defensible difference from any competing submission:** no public Portaldot project ships a consumer-facing
  app, uses the gasless path, or provides a permissionless on-chain directory. the manifest-driven middleware produces *receipts about
  transactions*, the verifiable history indexer produces *history*, the validator-risk report produces *network analytics*; Herald produces *user identity
  and a directory* — and it is the only one where the end user pays nothing.
- **Why it merits maintenance after the event:** a name service is permanent infrastructure that every later
  Portaldot app can read from the public RPC, and the sponsored-write rail is the first thing any Portaldot
  dApp needs once the chain is busy. The rail is protocol-native work that must track the runtime as
  `MetaTx` matures.

## 2.3 Red team — 13 failure cases

| # | Failure case | Risk | Severity | Mitigation | Test |
|---|---|---|---|---|---|
| 1 | Relayer fabricates a claim for an arbitrary address | Global state about a third party | Critical | Contract recovers the signature and requires `ecrecover == claimed address`; the digest binds handle, address, `chainid`, and the contract address | Refusal test with a forged signature **+ positive control** with a valid one |
| 2 | Same signed claim replayed for a different handle | Wrong name bound | Critical | The digest includes the handle; the contract address and chain id are in the digest | Test: a signature for handle A must not verify for handle B |
| 3 | Signature replay across chains/contracts | Cross-chain replay | High | `chainid` and `address(this)` are inside the digest | Test the digest construction against a fixed vector |
| 4 | A name is claimed twice / already taken | Double binding, front-running | High | `require(entry.owner == address(0))`; the UI derives availability from chain state and never offers a claim for a taken name | Refusal test **+ positive control** (first claim succeeds) |
| 5 | Front-runner takes a name before the sponsor submits | Griefing | Medium | The claim carries a deadline (`validUntil`) in the digest; the contract refuses expired claims, so a stale signed claim cannot be replayed later | Test an expired claim is refused |
| 6 | Owner releases, then someone else claims the name | Name theft | High | Release is by the owner only; a released name has a cooldown (`releasedAt` + `COOLDOWN`) enforced in the contract | Test: non-owner release refused; cooldown blocks immediate re-claim |
| 7 | Malformed input (zero handle, zero address, empty signature, bad `v`) | Wasted gas, weird state | Medium | Explicit `require`s; `ecrecover` returns address(0) for malformed signatures, which can never equal a non-zero claimed address | Malformed-input tests |
| 8 | Relayer stops paying / censors a claim | Availability | Medium | The claim is a *signed message*, so it can be re-submitted by anyone; the digest has a validity window, and the README documents the recovery path | Documented + tested re-submission path |
| 9 | UI shows "available" for a name that the contract refuses | Trust erosion | High | One pure function derives every UI state and action from on-chain state; it is unit-tested against the state definitions parsed from the contract source | Unit test of the state function + a live check |
| 10 | The claim price / sponsor accounting is misstated | Overclaim | High | The UI states the *measured* cost and links the tx; the contract records the gas price it observed, not a number invented by the UI | Cross-check the recorded gas price against the receipt |
| 11 | The deployed contract differs from the repository source | Supply-chain failure | Critical | Byte-for-byte comparison of `eth_getCode` with a fresh compile of the committed source, recorded with keccak hashes | Automated comparison script + recorded hashes |
| 12 | Chain economics change (deposit/limits) and the deployment breaks | Broken demo | Medium | The deploy script computes the required gas limit from the balance and the measured deposit rate, and fails closed | Dry-run check before deploying |
| 13 | The judge cannot reproduce the sponsored flow (no POT, no relayer) | Failed demo | High | The signed claim is a plain message: the README documents the exact relayer command; the demo is recorded with a live tx hash; the registry state is readable by anyone with the public RPC | Evidence file + README instructions |

**No critical risk is unresolved.** The only risk that cannot be fully closed in-budget is #8 (relayer
availability), which is mitigated by the signed-message design rather than by more code.

## 2.4 Name

Chosen: **Herald** — one word, memorable, protocol-flavoured, not AI-generic; it means "to announce publicly",
which is exactly what a sponsored on-chain write does. Rejected: *Gazette* (too newspaper-y for a registry that
is also a rail), *Steward* (implies custody/staking), *Cordon* (implies restriction), *Almanac* (directory only,
misses the rail), *Sponsor* (too plain, and reads as a fee), *Tab* (reads as credit). Availability checks are
recorded in `state/NAME-CHECK.md`.

## 2.5 Feature freeze

After the contract interfaces are fixed in Stage 3, scope is frozen. New features are permitted only to fix a
verified blocker, a security issue, or a critical usability failure. In particular: no multi-word handles, no
renewals, no avatar/URI metadata, no subdomains, no token-gating, no NFT minting.
