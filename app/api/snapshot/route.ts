import { NextResponse } from 'next/server';
import { fetchMoatData, fetchDeadBalance } from '@/lib/chain';
import { kvSet } from '@/lib/kv';

const TOTAL_SUPPLY = 1_000_000_000;
const TOKEN_ADDR   = process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? '0x201d04f88Bc9B3bdAcdf0519a95E117f25062D38';
const MOAT_ADDR    = process.env.NEXT_PUBLIC_MOAT_ADDRESS  ?? '0x020c73b55d139d5e259bad89b126f2a446c22ac6';
const DEX_PAIR     = process.env.NEXT_PUBLIC_DEX_PAIR      ?? '0x0e13283315fd3d996b22ef40f54c38f24c7f4ee0';
const DEX_API      = `https://api.dexscreener.com/latest/dex/pairs/avalanche/${DEX_PAIR}`;

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [dexRes, moat, dead] = await Promise.all([
    fetch(DEX_API),
    fetchMoatData(MOAT_ADDR),
    fetchDeadBalance(TOKEN_ADDR),
  ]);

  const dexJson = await dexRes.json().catch(() => null);
  const lp = Math.round(parseFloat(dexJson?.pairs?.[0]?.liquidity?.base ?? '0'));
  const circulating = TOTAL_SUPPLY - moat.staked - moat.locked - dead - lp;

  await kvSet('freak:snapshot', {
    staked:      moat.staked,
    locked:      moat.locked,
    burned:      moat.burned,
    dead,
    lp,
    circulating,
    ts:          Date.now(),
  });

  return NextResponse.json({ ok: true });
}
