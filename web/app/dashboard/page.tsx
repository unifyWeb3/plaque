'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildClaimDigestV2,
  deriveHandleState,
  handleKey,
  handleNameFromKey,
  normalizeHandle,
  type HandleState,
  type PlaqueHandle,
} from '../../lib/plaque';

const CHAIN_ID = 420420777;
// The live registry (PlaqueLite, block 167044). Read-side constants live in lib/chain.ts; this
// one is the same public value, needed in the browser to build the signed claim.
const CONTRACT = process.env.NEXT_PUBLIC_PLAQUE_CONTRACT ?? '0x5432e6b89dc3042d47f2be98e971cad9dabab685';
const EXPLORER = 'https://node-console.portaldot.dev';
const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? '';

type RegistryEvent = {
  kind: 'claimed' | 'released';
  handle: string;
  who: string;
  sponsor: string | null;
  gasPrice: string | null;
  block: number;
  txHash: string;
  logIndex: number;
};

type Registry = {
  ok: boolean;
  block?: number;
  contract?: string;
  deployTx?: string;
  events?: RegistryEvent[];
  owner?: string | null;
  error?: string;
};

type WalletState = { address: string | null; error: string | null };

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    };
  }
}

const ZERO = '0x0000000000000000000000000000000000000000';
const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');

function toBytes32(hex: string): string {
  return hex.replace(/^0x/, '').padEnd(64, '0');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export default function Dashboard() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [wallet, setWallet] = useState<WalletState>({ address: null, error: null });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; hash?: string } | null>(null);

  const handle: PlaqueHandle = useMemo(() => normalizeHandle(input), [input]);
  const owner = registry?.owner ?? null;
  const state: HandleState = useMemo(
    () => deriveHandleState({ owner, connected: wallet.address, handle }),
    [owner, wallet.address, handle],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const key = handle.ok ? handle.key! : null;
      const url = key ? `/api/registry?handle=${key}` : '/api/registry';
      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as Registry;
      if (!json.ok) throw new Error(json.error ?? 'the node did not answer');
      setRegistry(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'the node did not answer');
    } finally {
      setLoading(false);
    }
  }, [handle.ok, handle.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = useCallback(async () => {
    setResult(null);
    if (!window.ethereum) {
      setWallet({ address: null, error: 'no injected wallet found in this browser' });
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts?.[0] ?? null;
      if (!address) throw new Error('the wallet returned no account');
      setWallet({ address, error: null });
    } catch (e) {
      setWallet({ address: null, error: e instanceof Error ? e.message : 'the wallet refused' });
    }
  }, []);

  const signAndSend = useCallback(async () => {
    if (!handle.ok || !wallet.address) return;
    setBusy(true);
    setResult(null);
    try {
      const digest = buildClaimDigestV2({
        handle: handle.key!,
        who: wallet.address,
        chainId: CHAIN_ID,
        contract: CONTRACT,
      });
      const signature = (await window.ethereum!.request({
        method: 'personal_sign',
        params: [digest, wallet.address],
      })) as string;

      const payload = {
        handle: handle.key!,
        who: wallet.address,
        v: parseInt(signature.slice(130, 132), 16),
        r: '0x' + signature.slice(2, 66),
        s: '0x' + signature.slice(66, 130),
        chainId: CHAIN_ID,
        contract: CONTRACT,
        digest,
      };

      if (SPONSOR_URL) {
        const res = await fetch(SPONSOR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok: boolean; hash?: string; error?: string };
        if (!json.ok) throw new Error(json.error ?? 'the sponsor refused the claim');
        setResult({ ok: true, message: 'The sponsor submitted your claim.', hash: json.hash });
        void load();
      } else {
        setResult({
          ok: true,
          message:
            'Signed. No sponsor is configured for this deployment, so copy the payload below and ' +
            'hand it to a sponsor (or submit it yourself from an account that holds tPOT).',
        });
        await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'the wallet refused' });
    } finally {
      setBusy(false);
    }
  }, [handle, wallet.address, load]);

  const events = registry?.events ?? [];
  const claims = events.filter((e) => e.kind === 'claimed');

  return (
    <div className="wrap" style={{ paddingBottom: '4rem' }}>
      <section style={{ paddingTop: '3rem' }}>
        <p className="eyebrow">The registry</p>
        <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)' }}>Claim a handle</h1>
        <p className="lede" style={{ maxWidth: '62ch' }}>
          A handle is a 32-byte key &mdash; your name, zero-padded &mdash; bound to the address
          that signed for it. The sponsor pays the gas; you pay nothing.
        </p>
      </section>

      <section style={{ paddingTop: '0.5rem' }}>
        <div className="registry">
          <div>
            <div className="card">
              <h3>Claim</h3>
              <div className="field">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="your-handle"
                  aria-label="handle to claim"
                  spellCheck={false}
                  autoComplete="off"
                />
                {wallet.address ? (
                  <button className="btn btn-ghost" onClick={connect} disabled={busy}>
                    {short(wallet.address)}
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={connect} disabled={busy}>
                    Connect wallet
                  </button>
                )}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                <span className={`state-pill state-${state.status}`}>
                  <span className="dot" aria-hidden="true" />
                  {state.status}
                </span>
                {state.owner && state.owner !== ZERO ? (
                  <span className="faint mono" style={{ fontSize: '0.82rem' }}>
                    owner {short(state.owner)}
                  </span>
                ) : null}
                {handle.ok ? (
                  <span className="faint mono" style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                    {handle.key}
                  </span>
                ) : (
                  <span className="faint" style={{ fontSize: '0.85rem' }}>{handle.reason}</span>
                )}
              </div>

              {wallet.error ? (
                <p className="notice notice-error" style={{ marginTop: '0.9rem' }}>{wallet.error}</p>
              ) : null}

              <div style={{ marginTop: '1.1rem', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={signAndSend}
                  disabled={!state.canClaim || busy || !wallet.address}
                >
                  {busy ? <span className="spinner" aria-hidden="true" /> : null}
                  {busy ? 'Signing…' : 'Sign and claim'}
                </button>
                {!state.canClaim && state.status === 'taken' ? (
                  <span className="faint" style={{ alignSelf: 'center', fontSize: '0.88rem' }}>
                    The contract refuses a handle that already has an owner.
                  </span>
                ) : null}
                {state.status === 'needs-wallet' ? (
                  <span className="faint" style={{ alignSelf: 'center', fontSize: '0.88rem' }}>
                    Connect a wallet to sign the claim.
                  </span>
                ) : null}
              </div>

              {result ? (
                <p className={`notice ${result.ok ? 'notice-ok' : 'notice-error'}`} style={{ marginTop: '1rem' }}>
                  {result.message}
                  {result.hash ? (
                    <>
                      {' '}
                      <a
                        href={`https://node-console.portaldot.dev/#/tx/${result.hash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {short(result.hash)}
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>What the sponsor pays</h3>
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                Every claim records the sponsor and its transaction, so the cost of growing the
                registry is public. The live claim cost <strong>3.87 tPOT</strong> at block 167,209 —
                0.03 tPOT of computation and signature checking, and 3.84 tPOT of storage deposit
                that this chain holds for the new registry entry.
              </p>
              {loading ? (
                <div className="skeleton" style={{ height: 90 }} />
              ) : error ? (
                <p className="notice notice-error">Could not read the chain: {error}</p>
              ) : claims.length === 0 ? (
                <p className="notice">
                  No claims yet. The first claim will appear here, on chain, as soon as a
                  sponsor submits it.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>handle</th>
                      <th>sponsor</th>
                      <th>block</th>
                      <th>transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.slice(0, 12).map((e) => (
                      <tr key={e.txHash + e.logIndex}>
                        <td>{handleNameFromKey(e.handle)}</td>
                        <td>{short(e.sponsor)}</td>
                        <td>{e.block.toLocaleString('en-US')}</td>
                        <td>
                          <a href={`${EXPLORER}`} target="_blank" rel="noreferrer">
                            {short(e.txHash)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <h3>Every handle on the chain</h3>
              {loading ? (
                <div className="entries">
                  <div className="skeleton" style={{ height: 44 }} />
                  <div className="skeleton" style={{ height: 44 }} />
                  <div className="skeleton" style={{ height: 44 }} />
                </div>
              ) : error ? (
                <p className="notice notice-error">
                  The public node did not answer, so the registry cannot be shown right now.
                  <br />
                  {error}
                </p>
              ) : events.length === 0 ? (
                <p className="notice">
                  The registry is empty. That is a real state, not a placeholder: the contract
                  is deployed and nobody has claimed a name yet.
                </p>
              ) : (
                <div className="entries">
                  {events.map((e) => (
                    <div className="entry" key={e.txHash + e.logIndex}>
                      <div className="entry-head">
                        <span className="entry-name">
                          {e.kind === 'claimed' ? handleNameFromKey(e.handle) : `${handleNameFromKey(e.handle)} (released)`}
                        </span>
                        <span className="entry-meta">{e.block.toLocaleString('en-US')}</span>
                      </div>
                      <div className="entry-meta">
                        {e.kind === 'claimed' ? `sponsored by ${short(e.sponsor)}` : `released by ${short(e.who)}`}
                        {' · '}
                        owner {short(e.who)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>How the live build differs</h3>
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                This runtime reverts on the BLOCK-family opcodes, so the contract reads no
                clock and no chain id from the chain: the chain id is a compile-time constant
                and the claim binds the handle, the claimant, the chain and this contract. The
                deployed build is 302 bytes of constant-size code, which is what makes it
                affordable here — this chain charges a deposit for every byte of code and for
                every storage entry it keeps.
              </p>
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>Read it yourself</h3>
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                Nothing here is private. The contract state, the event log and every receipt are
                on the Portaldot V3 testnet and can be read with the public RPC.
              </p>
              <dl className="kv">
                <dt>Contract</dt>
                <dd className="mono" style={{ wordBreak: 'break-all' }}>{registry?.contract ?? CONTRACT}</dd>
                <dt>Read at</dt>
                <dd className="mono">
                  {registry?.block ? `block ${registry.block.toLocaleString('en-US')}` : '—'}
                </dd>
                <dt>Chain id</dt>
                <dd className="mono">{CHAIN_ID}</dd>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
