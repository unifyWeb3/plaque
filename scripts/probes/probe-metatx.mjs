// Inspect MetaTx / VerifySignature / SkipFeelessPayment via the typed API.
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });

for (const sec of ['metaTx', 'verifySignature', 'skipFeelessPayment', 'parameters', 'mixnet', 'oracle']) {
  console.log(`\n### ${sec}`);
  const tx = api.tx[sec];
  if (tx) {
    for (const [name, fn] of Object.entries(tx)) {
      if (typeof fn !== 'function') continue;
      try {
        const m = fn.meta;
        console.log(`  call ${name}(${m.args.map((a) => `${a.name}: ${a.type.toString()}`).join(', ')})`);
        const errs = m.errors?.toJSON?.();
        if (errs) {
          const variants = errs.def?.asVariant?.variants || [];
          console.log('    errors: ' + variants.map((v) => {
            const d = (v.docs || []).join(' ').replace(/\s+/g, ' ').trim();
            return `${v.name}="${d.slice(0, 130)}"`;
          }).join('\n            '));
        }
      } catch (e) { console.log(`  call ${name}: <${e.message.slice(0, 60)}>`); }
    }
  }
  const q = api.query[sec];
  if (q) {
    for (const [name, fn] of Object.entries(q)) {
      if (typeof fn !== 'function') continue;
      try { console.log(`  query ${name}(${fn.meta.args.map((a) => `${a.name}: ${a.type.toString()}`).join(', ')}) -> ${fn.meta.returnType.toString()}`); }
      catch { console.log(`  query ${name}`); }
    }
  }
}
await api.disconnect();
process.exit(0);
