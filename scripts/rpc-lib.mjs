// Tiny, dependency-light JSON-RPC client for the Portaldot V3 testnet EVM endpoint.
// Retries + explicit timeouts, because the public RPC intermittently stalls.
const RPC = process.env.PORTALDOT_RPC || 'https://test-evm-rpc-v3.portaldot.dev';

let idc = 1;

export async function rpc(method, params = [], { timeoutMs = 45000, retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: idc++, method, params }),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`non-JSON response (${res.status}): ${text.slice(0, 200)}`); }
      if (json.error) {
        const e = new Error(`${method}: ${json.error.message || JSON.stringify(json.error)}`);
        e.code = json.error.code;
        e.rpc = json.error;
        throw e;
      }
      return json.result;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export const chainId = async () => Number(await rpc('eth_chainId'));
export const getBalance = async (addr) => BigInt(await rpc('eth_getBalance', [addr, 'latest']));
export const getCode = async (addr, block = 'latest') => rpc('eth_getCode', [addr, block]);
export const getNonce = async (addr) => Number(BigInt(await rpc('eth_getTransactionCount', [addr, 'pending'])));
export const blockNumber = async () => Number(BigInt(await rpc('eth_blockNumber')));
export const getReceipt = async (hash) => rpc('eth_getTransactionReceipt', [hash]);
export const getBlock = async (n, full = false) => rpc('eth_getBlockByNumber', [typeof n === 'number' ? '0x' + n.toString(16) : n, full]);

export async function waitForReceipt(hash, { timeoutMs = 120000, intervalMs = 2000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const r = await rpc('eth_getTransactionReceipt', [hash], { retries: 3, timeoutMs: 20000 });
    if (r) return r;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('timed out waiting for receipt ' + hash);
}
