// Per-contract compiler settings, recorded from the builds that were actually deployed.
//
// Solidity's IPFS metadata hash includes the *source key* (the path shown to solc) as well as the
// source content and settings. The deployed PlaqueLite artifact was built with the canonical key
// `/root/hack/contracts/PlaqueLite.sol`; keeping that key here makes `npm run compile` reproduce
// the deployed runtime byte-for-byte from any clone directory. This is a build-path
// canonicalisation, not a claim that the deployment machine path is meaningful.
//
// The three earlier contracts used `viaIR: true` (Plaque/PlaqueV2) or the legacy pipeline (Gate)
// with `metadata.bytecodeHash: none`; compiling them with the script's old defaults silently
// produced different bytecode (see state/AUDIT-BASELINE.md).
export const CANONICAL_SOURCE_ROOT = '/root/hack/contracts';

export const BUILD_CONFIG = {
  Plaque: { viaIR: true, runs: 1, metadata: 'none' },
  PlaqueV2: { viaIR: true, runs: 1, metadata: 'none' },
  PlaqueLite: { viaIR: false, runs: 200, metadata: 'ipfs' },
  Gate: { viaIR: false, runs: 1, metadata: 'none' },
};

export function buildConfigFor(name) {
  const cfg = BUILD_CONFIG[name];
  if (!cfg) throw new Error(`no build configuration for ${name}; add it to scripts/build-config.mjs`);
  return {
    ...cfg,
    sourceKey: `${CANONICAL_SOURCE_ROOT}/${name}.sol`,
  };
}
