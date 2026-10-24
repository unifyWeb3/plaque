// Plaque — sponsored handle registry for the Portaldot V3 testnet.
export const metadata = {
  title: 'Plaque — claim your name on Portaldot with one signature',
  description:
    'Plaque is a sponsored handle registry on the Portaldot V3 testnet: you sign, a sponsor pays the gas, and the hosted app produces the exact signed claim. Testnet only.',
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
