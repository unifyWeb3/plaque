// solc-js compile wrapper (pure JS, no native binaries -> works on aarch64).
// Usage: node scripts/compile.mjs [entryFile ...]
// Writes artifacts to build/<name>.json  (build/ is gitignored)
//
// Each contract is compiled in its own solc input because the deployed builds used different
// settings (see scripts/build-config.mjs). The source key is canonicalised to the path used at
// deployment so the IPFS metadata hash, and therefore the raw runtime bytecode, is reproducible.
import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { buildConfigFor } from './build-config.mjs';

const entries = process.argv.slice(2);
if (!entries.length) {
  console.error('usage: node scripts/compile.mjs <file.sol> [...]');
  process.exit(1);
}

mkdirSync('build', { recursive: true });
const summary = [];

for (const e of entries) {
  const p = resolve(e);
  const name = basename(p, '.sol');
  const cfg = buildConfigFor(name);
  const content = readFileSync(p, 'utf8');
  const runs = process.env.SOLC_RUNS ? Number(process.env.SOLC_RUNS) : cfg.runs;
  const metadata = process.env.SOLC_METADATA_HASH || cfg.metadata;
  const viaIR = process.env.SOLC_VIA_IR ? process.env.SOLC_VIA_IR === '1' : cfg.viaIR;
  const evmVersion = process.env.SOLC_EVM_VERSION || 'paris';

  const input = {
    language: 'Solidity',
    sources: { [cfg.sourceKey]: { content } },
    settings: {
      optimizer: { enabled: true, runs },
      evmVersion,
      metadata: { bytecodeHash: metadata },
      viaIR,
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata', 'storageLayout'] } },
    },
  };

  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors || []).filter((x) => x.severity === 'error');
  const warnings = (out.errors || []).filter((x) => x.severity !== 'error');
  if (errors.length) {
    console.error(`COMPILATION ERRORS (${name}):`);
    for (const x of errors) console.error('  ' + x.formattedMessage);
    process.exit(1);
  }
  for (const w of warnings) console.warn('  warn: ' + (w.formattedMessage || w.message).split('\n')[0]);

  const c = out.contracts?.[cfg.sourceKey]?.[name];
  if (!c) throw new Error(`solc produced no ${name} artifact`);
  const artifact = {
    contractName: name,
    sourceName: `contracts/${name}.sol`,
    abi: c.abi,
    bytecode: '0x' + c.evm.bytecode.object,
    deployedBytecode: '0x' + c.evm.deployedBytecode.object,
    metadata: c.metadata,
    storageLayout: c.storageLayout,
    compiler: {
      name: 'solc-js',
      version: solc.version(),
      evmVersion,
      optimizer: { enabled: true, runs },
      viaIR,
      metadata,
    },
  };
  writeFileSync(`build/${name}.json`, JSON.stringify(artifact, null, 2));
  summary.push({
    name,
    path: `build/${name}.json`,
    bytecodeBytes: (artifact.bytecode.length - 2) / 2,
    deployedBytes: (artifact.deployedBytecode.length - 2) / 2,
  });
}

console.log('solc-js version:', solc.version());
console.table(summary);
