// GET /api/registry — the live Plaque registry, read from the Portaldot V3 testnet.
//
//   ?handle=unify  -> adds the owner of that handle
//
// Everything is read at one explicit block, so the numbers the UI shows come from a
// single point of the chain.
import { NextResponse } from 'next/server';
import { CONTRACT, DEPLOY_BLOCK, DEPLOY_TX, EXPLORER, headBlock, readEvents, readOwner } from '../../../lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const block = await headBlock();
    const handle = new URL(request.url).searchParams.get('handle');
    const validHandle = handle && /^0x[0-9a-fA-F]{64}$/.test(handle);

    // The event scan and the owner read are independent; run them together so a keystroke does
    // not wait for the whole log range before it can show the owner.
    const [events, owner] = await Promise.all([
      readEvents(block),
      validHandle ? readOwner(handle, block) : Promise.resolve(null),
    ]);
    const ownerAtBlock = validHandle ? block : null;

    return NextResponse.json({
      ok: true,
      block,
      contract: CONTRACT,
      deployTx: DEPLOY_TX,
      deployBlock: DEPLOY_BLOCK,
      explorer: EXPLORER,
      events,
      owner,
      ownerAtBlock,
      // the number of distinct handles currently claimed
      handles: events.filter((e) => e.kind === 'claimed').length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 502 },
    );
  }
}
