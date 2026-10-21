# Pre-submission checklist

Based on the verified rules of the Portaldot Hacker House 2026
(source: the event's `detail` page, checked 2026-10-20). Items that depend on the DoraHacks form are
marked **form** — the field limits are not published, so the copy is deliberately short.

## Timing

| When | What | Status |
|---|---|---|
| Oct 24, 12:00 UTC | **Check-in submission**: project progress, outstanding items, public GitHub repository (complete README, continuously updated records, architecture diagram), Portaldot testnet deployment information (contract address, transaction hash, explorer link) and one demo material (live demo link **or** a ≤3 min demo video) | ready — the repository, the deployment information and the demo script are in place; the video still has to be recorded |
| Oct 26, 16:00 UTC | Feedback results | — |
| Oct 27, 12:00 UTC | Office-hour application (progress, repository, completed modules, testnet status, demo link, questions) | optional |
| **Nov 6, 04:00 UTC** | **Final submission / code freeze** | see below |

## Final submission materials

| Required | Status |
|---|---|
| Project name | `Plaque` — in `submission/BUIDL.md` |
| Team members | solo: unify (`@oxunify`) — the DoraHacks account is registered |
| One-sentence project overview | "Claim your name on Portaldot without paying a thing — you sign, a sponsor pays the gas." |
| Public GitHub repository | `github.com/unifyWeb3/plaque` — public, ≥3 commits, all inside Oct 14 – Nov 6, no bulk commit in the final 24 h |
| README: complete | done — problem, audience, solution, architecture, trust model, live vs local evidence, deployment details, install/run, tests, roadmap |
| README: deployment instructions | `node scripts/deploy-any.mjs Plaque` (+ the gas-limit rule) |
| README: project documentation | `state/` — research, decision, design, the chain limitation, the memory log |
| README: reproducible / runnable code | `npm install && npm run compile && npm test`; `cd web && npm install && npm run dev` |
| README: testnet deployment information | contract, deployment tx, block, bytecode comparison, the live transaction, the measured gas cost |
| Runnable demo | the deployed Next.js app (URL in the submission) **and** clear local instructions |
| Demo video, ≤3 min, public link | `submission/DEMO-SCRIPT.md` is the shot-by-shot script — **the recording is still to do** |
| Pitch deck, PDF or public link | `submission/PITCH.md` is the one-page outline — **the PDF is still to do** |
| Contract address and transaction hash | in the README and in `submission/EVIDENCE.md` |

## Rules to respect

* **Deployment on the Portaldot testnet** — done, with the bytecode proof.
* **Code primarily produced Oct 14 – Nov 6** — every commit in the repository is dated inside that
  window, and the work is spread across it, not dumped at the end.
* **At least three valid commits** — six are in place.
* **No substantial change after the code freeze** — after Nov 6, 04:00 UTC only bug fixes, and they
  must be reported to the organiser with a clear record.
* **Originality** — the code is original; the only reused dependencies are `solc-js`, `ethers`,
  `ganache` and `@polkadot/api` (all disclosed in `package.json`). No competitor project is named,
  copied or referenced anywhere in the repository, its commits, UI, docs or submission text.
* **The repository stays public** for the whole event.

## Open items (owner: the human operator)

1. **Fund the testnet wallet** so the chain-compatible build can be deployed:
   Discord → <https://discord.gg/portaldot> → ticket or DM `@titus242471` (DoraHacks admin
   `@Stella707827`), with a screenshot of the registration and the address
   `5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf` (≈100 tPOT is enough).
   Then: `node scripts/deploy-any.mjs PlaqueV2 && node scripts/claim-plaque.mjs …`.
2. **Record the demo video** (≤3 min) from `submission/DEMO-SCRIPT.md` and put the link in the
   submission.
3. **Publish the pitch deck** (PDF) — `submission/PITCH.md` is the content.
4. **Fill the DoraHacks form** — the field limits are not published, so copy the short blocks from
   `submission/BUIDL.md` as they are.
5. **Submit** — the operator submits; nothing in this repository submits on their behalf.
