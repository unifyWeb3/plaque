import Link from 'next/link';
import config from '../lib/plaque-config.json';
import { CONTRACT, DEPLOY_BLOCK, DEPLOY_TX, EXPLORER, headBlock, readEvents } from '../lib/chain';

export const dynamic = 'force-dynamic';

async function liveFacts() {
  try {
    const block = await headBlock();
    const events = await readEvents(block);
    const claims = events.filter((e) => e.kind === 'claimed');
    const sponsors = new Set(claims.map((e) => e.sponsor).filter(Boolean));
    return {
      ok: true as const,
      block,
      claims: claims.length,
      sponsors: sponsors.size,
      events: events.length,
    };
  } catch {
    return { ok: false as const, block: 0, claims: 0, sponsors: 0, events: 0 };
  }
}

export default async function Home() {
  const facts = await liveFacts();
  const steps = [
    {
      title: 'You sign, not you pay',
      body:
        'Pick a handle, sign one message with your wallet. No POT is needed, because the ' +
        'sponsor pays the gas. The signature covers the handle, your address, the chain and ' +
        'this contract, so it cannot be moved to another name or another address.',
    },
    {
      title: 'A sponsor submits it',
      body:
        'A sponsor (a relayer, or your own wallet) sends the signed claim to the contract. ' +
        'The contract recovers the signature itself and refuses anything that does not match.',
    },
    {
      title: 'The name is on chain',
      body:
        'The handle is bound to your address in the contract state. The sponsor is in the ' +
        'Claimed event; the block is the log block and the gas price is in the receipt. ' +
        'Anyone can read it back.',
    },
  ];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Portaldot Hacker House 2026 · Ecosystem DApps</p>
            <h1>Claim your name on Portaldot with one signature.</h1>
            <p className="lede">
              Plaque is a sponsored handle registry. A name is bound to the address that signed
              for it, a sponsor pays the gas, and the binding is permanent and readable by
              anyone through the public RPC. The hosted app has no sponsor key: it produces the
              exact signed claim; run the relayer locally, or submit it from a funded wallet.
            </p>

            <div className="problem">
              <p>
                <strong>The problem.</strong> On Portaldot, a brand-new account holds 0 tPOT, so
                it cannot make a single on-chain record &mdash; and testnet POT is distributed by
                hand through a Discord ticket. Every newcomer is stuck at zero, and a dApp cannot
                ask them to buy gas before they can use it.
              </p>
              <p className="muted" style={{ marginBottom: 0 }}>
                <strong>The answer.</strong> The user signs a message, a sponsor pays for it.
                The chain&rsquo;s measured cost is about <strong>3.87 tPOT</strong> per claim,
                almost all of it the storage deposit the runtime keeps for the new entry. A
                100 tPOT sponsor budget therefore covers roughly 25 names, not tens of thousands.
              </p>
            </div>

            <div className="hero-cta">
              <Link className="btn btn-primary" href="/dashboard">
                Open the registry
              </Link>
              <a className="btn btn-ghost" href="#how">How it works</a>
            </div>
          </div>

          <div className="card">
            <h3>Live on the Portaldot V3 testnet</h3>
            <p className="muted">
              This page reads the chain itself. The numbers below are not staged.
            </p>
            <dl className="kv">
              <dt>Chain</dt>
              <dd>Portaldot V3 testnet · id {config.chainId} · pallet-revive EVM</dd>
              <dt>Contract</dt>
              <dd className="mono" style={{ wordBreak: 'break-all' }}>{CONTRACT}</dd>
              <dt>Deployment</dt>
              <dd className="mono" style={{ wordBreak: 'break-all' }}>{DEPLOY_TX}</dd>
              <dt>Deployed at</dt>
              <dd className="mono">block {DEPLOY_BLOCK.toLocaleString('en-US')}</dd>
              <dt>Head</dt>
              <dd className="mono">
                {facts.ok ? `block ${facts.block.toLocaleString('en-US')}` : 'unreachable right now'}
              </dd>
              <dt>Explorer</dt>
              <dd>
                <a href={EXPLORER} target="_blank" rel="noreferrer">node-console.portaldot.dev</a>
              </dd>
            </dl>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <dl className="proof">
            <div>
              <dt>Handles claimed</dt>
              <dd>{facts.ok ? facts.claims : '—'}<small>claims in the contract&rsquo;s event log</small></dd>
            </div>
            <div>
              <dt>Sponsors</dt>
              <dd>{facts.ok ? facts.sponsors : '—'}<small>distinct addresses that paid gas</small></dd>
            </div>
            <div>
              <dt>Cost per claim</dt>
              <dd>3.87<small>tPOT at block 167,209 — 0.03 computation + 3.84 storage deposit</small></dd>
            </div>
            <div>
              <dt>Balance needed to sign</dt>
              <dd>0<small>tPOT; the sponsor pays the write</small></dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="section-head">
            <h2>How it works</h2>
            <p>
              Three steps, one signature, one transaction. The sponsor never sees your key and
              can never bind a name to somebody else&rsquo;s address.
            </p>
          </div>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <h2>The trust model, plainly</h2>
          </div>
          <div className="card-grid">
            <div className="card">
              <h3>The contract trusts nobody</h3>
              <p className="muted">
                It checks the signature against the address in the claim, and the signature
                covers the handle, the address, the chain id and the contract address. A
                sponsor cannot forge a claim and cannot move one to a different name.
              </p>
            </div>
            <div className="card">
              <h3>The sponsor is untrusted</h3>
              <p className="muted">
                A sponsor can refuse to pay, reorder claims or go offline &mdash; but it cannot
                forge one. A claim is a signed message, so any other sponsor can submit it until
                the name is taken. The claim path carries value 0; the lite fallback is payable
                but has no withdraw, so do not send tPOT to the contract.
              </p>
            </div>
            <div className="card">
              <h3>One key, and it only pays gas</h3>
              <p className="muted">
                The relayer key is a single trusted key in the whole system. In the protocol
                all it can do is pay gas; if it leaks, its balance can be drained, but it cannot
                forge a claim. It is never in the frontend, never in a commit and never in the
                deployment configuration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="callout">
            <h2 style={{ fontSize: '1.5rem' }}>Claim a handle, on your own terms</h2>
            <p className="muted">
              Connect a wallet, type a name, sign it. If a sponsor is running, the write is
              free; otherwise you get the exact signed payload to submit yourself.
            </p>
            <Link className="btn btn-primary" href="/dashboard">
              Open the registry
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
