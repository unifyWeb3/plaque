# Stage 5 — redeploy decision

**Decision: do not redeploy.** Recorded 2026-10-24 09:05Z.

## Why

1. **The deployed bytecode already is the committed source.** `npm run compile` reproduces the
   exact 302-byte runtime and keccak `0x8a952eb8…3986`; `npm run verify:live` compares the raw
   `eth_getCode` and the normalized runtime. A redeploy would produce the same code at a new
   address, not a stronger security property.
2. **A redeploy would invalidate the only live claim.** The existing claim tx
   `0xa654bd9c…edf2` (block 167209) is the evidence for the zero-balance sponsored write. A new
   address would need a new claim, new evidence, and a new verifier run.
3. **It is not funded.** The sponsor holds 0.8748 tPOT. One claim needs a 4.3055 tPOT balance under the default 0.1 tPOT reserve to
   cover the fixed 1.3e14 gas limit; the live claim already spent 3.87 tPOT. A new 302-byte
   deployment needs ~36.7 tPOT of code deposit. The readable 741-byte `PlaqueV2` needs ~74.5 tPOT.
4. **A larger build would be a different product.** Adding `release`, a validity window, or a
   resolver would require new source, new tests, a new deployment, and a new audit; it would not be
   a fix to the deployed claim path.

## What would change the decision

A funded sponsor and a concrete product reason to deploy `PlaqueV2` (release/window) with a fresh
end-to-end test and a new claim. Until then, the correct move is to document the lite limits and
keep the reproducible live deployment. This is a deliberate trade-off, not a missing step.
