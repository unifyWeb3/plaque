// Plaque — a reference sponsored write for the Portaldot V3 testnet.
export const metadata = {
  title: 'Plaque — a sponsored write on Portaldot with one signature',
  description:
    'Plaque is a reference implementation of a sponsored (gasless) write on the Portaldot V3 testnet: a zero-balance user signs, a relayer pays, and the chain records who claimed. The handle registry is the example. Testnet only.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c0e12',
};

import './globals.css';
import config from '../lib/plaque-config.json';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">Plaque</span>
            </Link>
            <nav aria-label="Primary">
              <Link href="/">Overview</Link>
              <Link href="/dashboard">Registry</Link>
              <a href="https://github.com/unifyWeb3/plaque" rel="noreferrer" target="_blank">Source</a>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-inner">
            <p>
              Plaque is a Portaldot Hacker House 2026 project. Live on the Portaldot V3 testnet
              (chain id {config.chainId}). Testnet only — no real value, no audited code, no mainnet deployment.
            </p>
            <p className="mono muted">
              contract {config.contract} · 14-decimal tPOT · pallet-revive EVM
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
