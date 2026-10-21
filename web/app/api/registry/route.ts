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
    const events = await readEvents(block);
    const handle = new URL(request.url).searchParams.get('handle');

    let owner: string | null = null;
    let ownerAtBlock: number | null = null;
    if (handle && /^0x[0-9a-fA-F]{64}$/.test(handle)) {
      owner = await readOwner(handle, block);
      ownerAtBlock = block;
    }

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
