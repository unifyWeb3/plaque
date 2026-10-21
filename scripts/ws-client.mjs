// Minimal persistent JSON-RPC-over-WebSocket client for the Portaldot Substrate node.
const WS = process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev';

let ws = null;
let nextId = 1;
const pending = new Map();

export async function connect(url = WS) {
  if (ws && ws.readyState === 1) return ws;
  ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = (e) => rej(new Error('ws connect error'));
  });
  ws.onmessage = (e) => {
    let d;
    try { d = JSON.parse(e.data); } catch { return; }
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    clearTimeout(p.timer);
    if (d.error) p.rej(new Error(`${p.method}: ${d.error.message || JSON.stringify(d.error)}`));
    else p.res(d.result);
  };
  ws.onclose = () => { ws = null; };
  return ws;
}

export async function rpc(method, params = [], timeoutMs = 45000) {
  await connect();
  const id = nextId++;
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { pending.delete(id); rej(new Error('timeout ' + method)); }, timeoutMs);
    pending.set(id, { res, rej, timer, method });
    ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
  });
}

export async function rpcSafe(method, params = []) {
  for (let i = 0; i < 3; i++) {
    try { return await rpc(method, params); } catch (e) { if (i === 2) return null; }
  }
  return null;
}
