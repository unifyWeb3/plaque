# Demo script — Plaque (2:50 hard cap)

> One screen recording, 1280×900. Every number is read from the live chain. The live claim is already
> on chain; the fallback path needs no funds. Do not record a fake transaction.

## 0:00–0:20 — The hook (20 s)

**Shot:** homepage at `https://plaque-oxunify.vercel.app`, top card with the live block height.

**Say / caption:**
> On Portaldot, a brand-new account holds zero tPOT. It cannot make a single on-chain record — and
> testnet POT arrives by hand through a manual support ticket. So every newcomer is stuck at zero. Plaque
> is the reusable answer: a user with zero balance signs once, a relayer pays, and the chain records
> who claimed.

**On-screen proof:** the live block height and the header table (contract, deploy tx, live claim).

## 0:20–0:50 — The proof that already exists (30 s)

**Shot:** terminal. Run:

```bash
npm run verify:live
```

**Say / caption:**
> This is read-only against the public RPC. Ten checks: the deployed code is byte-identical to the
> committed build, `unify` is bound to the zero-balance claimant, the claimant still holds 0 wei, and
> the event names the sponsor that paid. It also proves the contract accepts a valid signature and
> refuses a tampered one and a zero address.

**On-screen proof:** all ten `PASS` lines, `ALL CHECKS PASSED`, block number.

## 0:50–1:20 — Before / during / after (30 s)

**Shot:** terminal, two panes. Run:

```bash
node -e "const {JsonRpcProvider,formatEther}=require('ethers');const p=new JsonRpcProvider('https://test-evm-rpc-v3.portaldot.dev');Promise.all(['0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6','0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5'].map(async a=>console.log(a,formatEther(await p.getBalance(a)),'tPOT')))"
```

**Say / caption:**
> Before the claim the signer held 0 tPOT. During the claim they signed a message — no transaction,
> no gas. After the claim they still hold 0. The sponsor paid 3.8695 tPOT. The claimant never had a
> balance to pay with.

**On-screen proof:** `0.0 tPOT` for the claimant before and after; sponsor balance; then the claim
transaction on the explorer.

**Shot:** explorer `https://node-console.portaldot.dev`, search
`0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`. Show status success,
block 167209, the `Claimed` event, and the sponsor.

## 1:20–1:50 — How the sponsored write works (30 s)

**Shot:** homepage's three steps, then the relayer terminal with a refused request.

```bash
# a second claim for the live handle is refused before any gas is spent
node scripts/relayer.mjs --contract PlaqueLite --port 8787 &
curl -s -X POST http://127.0.0.1:8787/claim \
  -H 'Origin: http://127.0.0.1:3000' -H 'Content-Type: application/json' \
  --data '{"handle":"0x756e696679000000000000000000000000000000000000000000000000000000","who":"0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6","v":27,"r":"0x01","s":"0x01"}'
```

**Say / caption:**
> The signature covers the handle, the signer, the chain id and this contract. The relayer verifies
> it off-chain, refuses a bad or taken claim before spending, and serializes the nonce. The contract
> is still the authority: it recovers the signer and cannot bind the name to anyone else.

**On-screen proof:** `handle already owned` or `bad r` (a refusal, no tx hash).

## 1:50–2:10 — The integration kit in 20 seconds (20 s)

**Shot:** `docs/INTEGRATE.md` on screen, then the local test output.

```bash
node --test tests/relayer-policy.test.mjs tests/plaque-lite.test.mjs
```

**Say / caption:**
> Another builder copies three files: signature verification, the policy caps and the nonce queue.
> The guide has the client snippet, the config surface, the storage slot and the event signature.
> The same module is tested against Ganache with positive controls and refusals.

**On-screen proof:** `# pass 15`, `# fail 0` (8 lite + 7 policy tests).

## 2:10–2:30 — Honest limits (20 s)

**Shot:** README "Limits up front".

**Say / caption:**
> What this is not: the 302-byte build has no release or transfer; the registry is first-come. The
> sponsor spends about 3.87 tPOT per claim, almost all of it the chain's storage deposit, so 100
> tPOT is roughly 25 writes, not thousands. There is one relayer key; it can only pay, but a leak
> can drain it. The contract accepts the zero handle if validly signed — the app and relayer refuse
> it, and the deployed contract cannot be changed.

## 2:30–2:50 — Close (20 s)

**Shot:** repository link and the live claim header.

**Say / caption:**
> Everything is open: the 302-byte contract, the 41 tests, the live claim, the verifier and the
> integration guide. Plaque — a sponsored write on Portaldot, proved by a claim from an account that
> held zero. Repository: github.com/unifyWeb3/plaque.

---

## Rehearsal checklist

- [ ] Browser zoom 100%; terminal font large enough to read at 1280×900.
- [ ] `npm run verify:live` passes before recording; note the block number it prints.
- [ ] The claimant and sponsor addresses are pasted from `config/plaque.json`, not typed by hand.
- [ ] The explorer tab is pre-opened on the claim tx; no waiting for indexing.
- [ ] The relayer refusal is rehearsed: the taken handle is refused before a tx.
- [ ] The 20-second integration segment shows `docs/INTEGRATE.md` and the test pass count.
- [ ] Total runtime is under 3:00; cut the optional live claim first if over.

## Fallback with no funds (record this if the live claim cannot be funded)

No new transaction is needed. The existing claim tx is the proof:

1. `npm run verify:live` → ten PASS lines and `ALL CHECKS PASSED`.
2. Explorer: `0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`
   (block 167209, status success, `Claimed` event).
3. Dashboard: type `unify` → `taken`, owner `0xd354…15Fe6`, sponsor `0x064e…4fD5`.
4. `npm run demo` → the same mechanic on a local chain, clearly labelled "local".

## Sponsor balance / top-up

The sponsor `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` holds **0.874819 tPOT**. Under the default
policy (fixed 1.3e14 gas limit, 0.1 tPOT reserve) the required balance is
`gasLimit × gasPrice + 0.1`. At the live 31,970 wei reading on 2026-10-24 19:31Z that is **4.2561
tPOT** (4.3055 at the 32,350 example); the actual spend is **≈3.87 tPOT**. It can fund **0** live
claims today.

For one live claim on camera, top up at least **3.3813 tPOT** at the live price (3.4307 at the
example); **5 tPOT** is the recommended buffer (top up **4.1252 tPOT**). If you do not top up, record
the fallback; it is a complete proof of the same live claim.

## Commands to reproduce every number

```bash
npm ci
npm run compile && npm test                     # 41 tests
npm run demo                                    # local sponsored write (labelled)
npm run verify:live                             # 10 checks against the live testnet
npm run probe:zero                              # zero-address / invalid-sig / zero-handle eth_call
node scripts/deploy-any.mjs PlaqueLite          # deploy (needs a funded wallet)
npm run claim -- <contract> <handle>            # a live sponsored claim
npm run relayer -- --contract PlaqueLite        # a sponsor
cd web && npm ci && npm run typecheck && npm run lint && npm run build
node web/scripts/qa-browser.mjs http://127.0.0.1:3000
```
