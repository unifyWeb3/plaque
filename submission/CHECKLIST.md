# Pre-submission checklist

Based on the verified rules of the Portaldot Hacker House 2026
(source: the event's `detail` page, checked 2026-10-24). Items that depend on the DoraHacks form are
marked **form** — the field limits are not published, so the copy is deliberately short.

## Timing

| When | What | Status |
|---|---|---|
| **Oct 24, 12:00 UTC** | **Check-in submission**: progress, outstanding items, public repository, testnet deployment information, one demo material | **SUBMITTED (human)** — `submission/CHECK-IN.md` is preserved; the audit addendum corrects the counts and the zero-key boundary. |
| Oct 26, 16:00 UTC | Feedback results | — |
| Oct 27, 12:00 UTC | Office-hour application (optional) | optional |
| **Nov 6, 04:00 UTC** | **Final submission / code freeze** | see below |

## Final submission materials

| Required | Status |
|---|---|
| Project name | `Plaque` — in `submission/BUIDL.md` |
| Team members | solo: unify — registered |
| One-sentence overview | "A sponsored (gasless) write on Portaldot — you sign, a relayer pays." |
| Public GitHub repository | `github.com/unifyWeb3/plaque` — public, 27 commits, all inside Oct 14 – Nov 6; core contracts committed Oct 21, no bulk core-module commit in the final 24 h |
| README: complete | done — problem, audience, solution, architecture, trust model, live evidence, deployment details, install/run, tests, the two chain constraints, roadmap |
| README: deployment instructions | `node scripts/deploy-any.mjs PlaqueLite` (+ the deposit-driven gas-limit rule) |
| README: project documentation | `state/` — research, decision, design, the chain limitation, the memory log |
| README: runnable code | `npm ci && npm run compile && npm test` (41 tests); `npm run verify:live` (10 checks, no secret); `cd web && npm ci && npm run dev` |
| README: testnet deployment information | contract `0x5432e6b8…b685`, deployment tx, block 167044, bytecode comparison, the live claim tx, the measured cost |
| Runnable demo | the deployed app **and** `npm run verify:live` **and** `npm run demo` (local, labelled) |
| Demo video, ≤3 min, public link | `submission/DEMO-SCRIPT.md` is the shot-by-shot script — **the recording is still to do** (blocking; human action) |
| Pitch deck, PDF or public link | **`submission/Plaque-pitch-deck.pdf`** — 9 slides, generated from `submission/deck.html` (the one-page summary is `submission/PITCH.md`) |
| Contract address and transaction hash | in the README, `submission/EVIDENCE.md` and the app |

## Rules to respect

* **Deployment on the Portaldot testnet** — done, with the bytecode proof and a live sponsored claim.
* **Code primarily produced Oct 14 – Nov 6** — every commit is dated inside that window and the work
  is spread across it.
* **At least three valid commits** — 27, all inside the window.
* **No substantial change after the code freeze** — after Nov 6, 04:00 UTC only bug fixes, reported to
  the organiser with a clear record.
* **Originality** — the code is original; the only reused dependencies are `solc-js`, `ethers`,
  `ganache` and `@polkadot/api` (disclosed in `package.json`). No competitor project or researched
  profile is named, copied or referenced anywhere in the repository, its commits, UI, docs or
  submission text.
* **No simulated data presented as live** — the live claim is a real transaction; the local demo is
  labelled as a local chain everywhere it appears.
* **The repository stays public** for the whole event.

## Open items (owner: the human operator)

1. **Check-in** — submitted; preserved in `submission/CHECK-IN.md`.
2. **Record the demo video** (≤3 min) from `submission/DEMO-SCRIPT.md`; the proof shot is
   `npm run verify:live`.
3. **Fill the DoraHacks form** — the field limits are not published, so copy the short blocks from
   `submission/BUIDL.md` as they are.
4. *(optional)* **Top up ≥3.3813 tPOT to `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5`** for one
   live claim on camera (the sponsor holds 0.8748 tPOT; at 31,970 wei one claim needs 4.2561 tPOT;
   5 tPOT is the recommended buffer).
5. **Submit** — the operator submits; nothing in this repository submits on their behalf.
