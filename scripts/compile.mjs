// solc-js compile wrapper (pure JS, no native binaries -> works on aarch64).
// Usage: node scripts/compile.mjs [entryFile ...]
// Writes artifacts to build/<name>.json  (build/ is gitignored)
import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const entries = process.argv.slice(2);
if (!entries.length) {
  console.error('usage: node scripts/compile.mjs <file.sol> [...]');
  process.exit(1);
}

const files = {};
for (const e of entries) {
  const p = resolve(e);
  files[p] = { content: readFileSync(p, 'utf8') };
}

const input = {
  language: 'Solidity',
  sources: files,
  settings: {
    optimizer: { enabled: true, runs: Number(process.env.SOLC_RUNS || 200) },
    evmVersion: process.env.SOLC_EVM_VERSION || 'paris',
    metadata: { bytecodeHash: process.env.SOLC_METADATA_HASH || 'ipfs' },
    viaIR: process.env.SOLC_VIA_IR === '1',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata', 'storageLayout'] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors || []).filter((e) => e.severity === 'error');
const warnings = (out.errors || []).filter((e) => e.severity !== 'error');

if (errors.length) {
  console.error('COMPILATION ERRORS:');
  for (const e of errors) console.error('  ' + e.formattedMessage);
  process.exit(1);
}
for (const w of warnings) console.warn('  warn: ' + (w.formattedMessage || w.message).split('\n')[0]);

mkdirSync('build', { recursive: true });
const summary = [];
for (const file of Object.keys(out.contracts || {})) {
  for (const [name, c] of Object.entries(out.contracts[file])) {
    const artifact = {
      contractName: name,
      sourceName: file.replace(process.cwd() + '/', ''),
      abi: c.abi,
      bytecode: '0x' + c.evm.bytecode.object,
      deployedBytecode: '0x' + c.evm.deployedBytecode.object,
      metadata: c.metadata,
      storageLayout: c.storageLayout,
      compiler: { name: 'solc-js', version: solc.version(), evmVersion: input.settings.evmVersion, optimizer: input.settings.optimizer },
    };
    const path = `build/${name}.json`;
    writeFileSync(path, JSON.stringify(artifact, null, 2));
    summary.push({ name, path, bytecodeBytes: (artifact.bytecode.length - 2) / 2, deployedBytes: (artifact.deployedBytecode.length - 2) / 2 });
  }
}
console.log('solc-js version:', solc.version());
console.table(summary);
