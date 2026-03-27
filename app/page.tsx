import { createPublicClient, http, formatUnits } from 'viem';
import { avalanche } from 'viem/chains';

// ── ERC-20 balanceOf ───────────────────────────────────────────────────────────
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function fetchDeadBalance(tokenAddress: string): Promise<number> {
  try {
    const client = createPublicClient({
      chain: avalanche,
      transport: http(process.env.AVAX_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc'),
    });
    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: ['0x000000000000000000000000000000000000dEaD'],
    });
    return Math.round(Number(formatUnits(balance, 18)));
  } catch (err) {
    console.error('fetchDeadBalance error:', err);
    return 0;
  }
}

// ── Moat contract ──────────────────────────────────────────────────────────────
const MOAT_ABI = [
  {
    name: 'getTotalAmounts',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_totalStaked',     type: 'uint256' },
      { name: '_totalLocked',     type: 'uint256' },
      { name: '_totalBurned',     type: 'uint256' },
      { name: '_totalInContract', type: 'uint256' },
    ],
  },
] as const;

async function fetchMoatData(moatAddress: string) {
  try {
    const client = createPublicClient({
      chain: avalanche,
      transport: http(process.env.AVAX_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc'),
    });

    const [totalStaked, totalLocked, totalBurned] = await client.readContract({
      address: moatAddress as `0x${string}`,
      abi: MOAT_ABI,
      functionName: 'getTotalAmounts',
    });

    return {
      staked: Math.round(Number(formatUnits(totalStaked, 18))),
      locked: Math.round(Number(formatUnits(totalLocked, 18))),
      burned: Math.round(Number(formatUnits(totalBurned, 18))),
    };
  } catch (err) {
    console.error('fetchMoatData error:', err);
    return { staked: 0, locked: 0, burned: 0 };
  }
}

// ── Env-driven constants ───────────────────────────────────────────────────────
const TOTAL_SUPPLY = Number(process.env.NEXT_PUBLIC_TOTAL_SUPPLY   ?? '1000000000');
const TOKEN_ADDR   = process.env.NEXT_PUBLIC_TOKEN_ADDRESS         ?? '0x201d04f88Bc9B3bdAcdf0519a95E117f25062D38';
const MOAT_ADDR    = process.env.NEXT_PUBLIC_MOAT_ADDRESS          ?? '0x020c73b55d139d5e259bad89b126f2a446c22ac6';
const DEX_PAIR     = process.env.NEXT_PUBLIC_DEX_PAIR              ?? '0x0e13283315fd3d996b22ef40f54c38f24c7f4ee0';

const MOAT_URL = `https://moats.app/moat/${MOAT_ADDR}`;
const BURN_URL = `https://snowtrace.io/token/${TOKEN_ADDR}?a=0x000000000000000000000000000000000000dead`;
const BUY_URL  = process.env.NEXT_PUBLIC_BUY_URL ?? `https://dexscreener.com/avalanche/${DEX_PAIR}`;
const DEX_URL  = `https://dexscreener.com/avalanche/${DEX_PAIR}`;
const DEX_API  = `https://api.dexscreener.com/latest/dex/pairs/avalanche/${DEX_PAIR}`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + Math.round(n).toLocaleString('en-US');
  return '$' + n.toFixed(6);
}

function fmtPrice(n: number): string {
  if (n < 0.0001) return '$' + n.toFixed(8);
  if (n < 0.01)   return '$' + n.toFixed(6);
  return '$' + n.toFixed(4);
}

function pct(value: number): string {
  return (value / TOTAL_SUPPLY * 100).toFixed(2);
}

// ── Inline StatCard ────────────────────────────────────────────────────────────
interface StatCardProps {
  icon?: string;
  iconSrc?: string;
  label: string;
  value: number;
  pctVal: string;
  sub?: string;
  provenance?: string;
}

function StatCard({ icon, iconSrc, label, value, pctVal, sub, provenance }: StatCardProps) {
  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-2 transition-all duration-300 ease-in-out hover:border-[#FF8C00] hover:shadow-[0_0_15px_rgba(255,140,0,0.35)]">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm font-medium flex items-center gap-1.5">
          {iconSrc ? (
            <div
              className="h-6 w-6 min-w-[24px] rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '1px solid rgba(255,140,0,0.3)' }}
            >
              <img src={iconSrc} className="h-full w-full object-cover" alt="" />
            </div>
          ) : (
            <span>{icon}</span>
          )}
          {label}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(255,140,0,0.08)',
            border: '1px solid rgba(255,140,0,0.35)',
            color: '#FF8C00',
          }}
        >
          {pctVal}%
        </span>
      </div>

      <p className="text-white text-2xl font-bold tracking-tight">
        {fmt(value)}
        <span className="text-zinc-500 text-base font-normal ml-1">$FREAK</span>
      </p>

      <div className="h-4">
        {sub && <span className="text-zinc-600 text-xs">{sub}</span>}
      </div>

      {provenance && (
        <span className="absolute bottom-3 right-3 text-[14px] select-none opacity-80">
          {provenance}
        </span>
      )}
    </div>
  );
}

// ── Page (server component) ────────────────────────────────────────────────────
export const revalidate = 60;

export default async function Dashboard() {
  const [dexRes, moat, dead] = await Promise.all([
    fetch(DEX_API, { next: { revalidate: 60 } }),
    fetchMoatData(MOAT_ADDR),
    fetchDeadBalance(TOKEN_ADDR),
  ]);

  const dexJson = await dexRes.json().catch(() => null);
  const pair    = dexJson?.pairs?.[0] ?? null;

  // Market data
  const priceUsd  = pair?.priceUsd     ? parseFloat(pair.priceUsd)     : null;
  const priceAvax = pair?.priceNative  ? parseFloat(pair.priceNative)  : null;
  const liquidity = pair?.liquidity?.usd  ?? null;
  const marketCap = pair?.fdv             ?? null;
  const h24       = pair?.priceChange?.h24 != null
    ? parseFloat(pair.priceChange.h24)
    : null;

  // LP token count (Dexscreener's liquidity.base = base-token units in pool)
  const lpRaw = pair?.liquidity?.base ? parseFloat(pair.liquidity.base) : 0;
  const lp    = Math.round(lpRaw);

  // Supply breakdown — live from Moat contract
  const staked      = moat.staked;
  const locked      = moat.locked;
  const burned      = moat.burned;
  // dead is live from fetchDeadBalance (balanceOf dead wallet on TOKEN contract)
  const circulating = TOTAL_SUPPLY - staked - locked - dead - lp;

  // 3-segment supply bar
  const securedMoat    = staked + locked;
  const barCirculating = TOTAL_SUPPLY - securedMoat - dead;
  const barSegments = [
    {
      label: 'Secured in Moat',
      value: securedMoat,
      gradient: 'linear-gradient(180deg,#3B82F6 0%,#1D4ED8 100%)',
      dot: '#3B82F6',
    },
    {
      label: 'Burned',
      value: dead,
      gradient: 'linear-gradient(180deg,#FF00FF 0%,#CC00CC 100%)',
      dot: '#FF00FF',
    },
    {
      label: 'Circulating',
      value: barCirculating,
      gradient: 'linear-gradient(180deg,#FF8C00 0%,#CC7000 100%)',
      dot: '#FF8C00',
    },
  ];

  const moatTotal = staked + locked + burned;
  const moatPct   = pct(moatTotal);

  const updatedAt = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  // 24h price color
  const h24Positive = h24 != null && h24 >= 0;
  const h24Color    = h24 != null ? (h24Positive ? '#FF8C00' : '#FF00FF') : '#71717A';

  const btnBase = [
    'inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-medium',
    'border-2 transition-colors [box-sizing:border-box] will-change-transform [transform:translateZ(0)]',
  ].join(' ');

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(255,140,0,0.4) 0%, rgba(255,140,0,0) 70%)',
                  filter: 'blur(8px)',
                  transform: 'scale(1.8)',
                }}
              />
              <div
                className="h-10 w-10 min-w-[40px] rounded-full overflow-hidden flex items-center justify-center relative"
                style={{ border: '2px solid #FF8C00' }}
              >
                <img src="/logo-freak.png" className="h-full w-full object-cover" alt="FREAK" />
              </div>
            </div>
            <span className="neon-title">$FREAK Hub</span>
          </h1>

          <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2 flex-wrap">
            <span>
              Total Supply:{' '}
              <span className="font-bold" style={{ color: '#FF8C00' }}>
                1,000,000,000 $FREAK
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-zinc-500 uppercase text-[10px] tracking-widest font-bold">
                Live Network
              </span>
            </span>
          </p>
        </div>

        {/* ── Market Metrics ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Price USD',  value: priceUsd  ? fmtPrice(priceUsd)             : '—' },
            { label: 'Price AVAX', value: priceAvax ? priceAvax.toFixed(6) + ' AVAX' : '—' },
            { label: 'Liquidity',  value: liquidity ? fmtUsd(liquidity)              : '—' },
            { label: 'Market Cap', value: marketCap ? fmtUsd(marketCap)              : '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1 transition-all duration-300 ease-in-out hover:border-[#FF8C00] hover:shadow-[0_0_15px_rgba(255,140,0,0.35)]"
            >
              <span className="text-zinc-500 text-xs font-medium">{label}</span>
              <span className="text-white text-base font-bold tracking-tight">{value}</span>
            </div>
          ))}

          {/* 24h Change — colored orange/magenta */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1 transition-all duration-300 ease-in-out hover:border-[#FF8C00] hover:shadow-[0_0_15px_rgba(255,140,0,0.35)]">
            <span className="text-zinc-500 text-xs font-medium">24h Change</span>
            <span className="text-base font-bold tracking-tight" style={{ color: h24Color }}>
              {h24 != null ? `${h24 >= 0 ? '+' : ''}${h24.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>

        {/* ── Token Tracking Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatCard icon="🏛️" label="Staked"       value={staked}      pctVal={pct(staked)}      sub="🏰 Fortifi Moat" provenance="🏰" />
          <StatCard icon="🔐" label="Locked"       value={locked}      pctVal={pct(locked)}      sub="🏰 Fortifi Moat" provenance="🏰" />
          <StatCard icon="🔥" label="Burned"       value={burned}      pctVal={pct(burned)}      sub="🏰 Fortifi Moat" provenance="🏰" />
          <StatCard icon="🔥" label="Total Burned" value={dead}        pctVal={pct(dead)}        sub="💀 Dead wallet"  provenance="💀" />
          <StatCard icon="⚖️" label="LP Pair"      value={lp}          pctVal={pct(lp)}          sub="📊 Dexscreener" />
          <StatCard
            iconSrc="/logo-freak.png"
            label="Circulating"
            value={circulating}
            pctVal={pct(circulating)}
            sub="Derived from supply"
          />
        </div>

        {/* ── Secured in Moat + 3-Segment Supply Bar ──────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4 transition-all duration-300 ease-in-out hover:border-[#FF8C00] hover:shadow-[0_0_15px_rgba(255,140,0,0.35)]">
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-lg font-bold tracking-tight leading-none" style={{ color: '#FF8C00' }}>
              {fmt(moatTotal)}
              <span className="text-sm font-normal ml-1" style={{ color: '#FF8C00' }}>$FREAK</span>
            </span>
            <span className="text-zinc-400 text-[11px] font-medium leading-none">Secured in Moat</span>
            <span
              className="border text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap leading-none"
              style={{ borderColor: '#FF8C00', color: '#FF8C00' }}
            >
              {moatPct}% of 1B
            </span>
          </div>

          <p className="text-zinc-400 text-sm font-medium mb-3">Supply Distribution</p>

          <div
            className="flex w-full h-3 rounded-full overflow-hidden gap-px mb-3"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255,140,0,0.2))',
              borderTop: '1.5px solid rgba(255,255,255,0.25)',
            }}
          >
            {barSegments.map((s) => (
              <div
                key={s.label}
                className="transition-all duration-500"
                style={{
                  width: `${(s.value / TOTAL_SUPPLY * 100).toFixed(4)}%`,
                  background: s.gradient,
                }}
                title={`${s.label}: ${fmt(s.value)}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {barSegments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.dot }} />
                {s.label} — {(s.value / TOTAL_SUPPLY * 100).toFixed(2)}%
              </div>
            ))}
          </div>
        </div>

        {/* ── Action Bar ──────────────────────────────────────────────────────── */}
        <div className="grid grid-flow-col items-end justify-center gap-3 py-6 overflow-x-auto">
          <a
            href={BUY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-orange-950 hover:bg-orange-900`}
            style={{ borderColor: '#FF8C00', color: '#FF8C00' }}
          >
            🛒 Buy $FREAK
          </a>
          <a
            href={MOAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-blue-950 border-blue-700 text-blue-300 hover:bg-blue-900`}
          >
            🏰 Stake
          </a>
          <a
            href={MOAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-violet-950 border-violet-700 text-violet-300 hover:bg-violet-900`}
          >
            🔐 Lock
          </a>
          <a
            href={MOAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-fuchsia-950 hover:bg-fuchsia-900`}
            style={{ borderColor: '#FF00FF', color: '#FF00FF' }}
          >
            🔥 Burn
          </a>
          <a
            href={BURN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-fuchsia-950 hover:bg-fuchsia-900`}
            style={{ borderColor: '#FF00FF', color: '#FF00FF' }}
          >
            💀 View Total Burn
          </a>
          <a
            href={DEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-orange-950 hover:bg-orange-900`}
            style={{ borderColor: '#FF8C00', color: '#FF8C00' }}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#FF8C00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 17 9 11 13 15 21 7" />
              <polyline points="15 7 21 7 21 13" />
            </svg>
            Live Chart
          </a>
        </div>

        {/* ── System Legend ────────────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4 transition-all duration-300 ease-in-out hover:border-[#FF8C00] hover:shadow-[0_0_15px_rgba(255,140,0,0.35)]">
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-4">
            System Legend
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">🏛️</span>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">Staked</span> — $FREAK actively staked in The Moat.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">🔐</span>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">Locked</span> — $FREAK locked in The Moat (time-locked).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">🔥</span>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">Burned</span> — $FREAK burned via The Moat contract.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">💀</span>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">Total Burned</span> — Cumulative $FREAK sent to the dead wallet.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">⚖️</span>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">LP Pair</span> — $FREAK tokens in the DEX liquidity pool.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div
                className="h-5 w-5 min-w-[20px] rounded-full overflow-hidden flex-shrink-0 mt-0.5"
                style={{ border: '1px solid rgba(255,140,0,0.3)' }}
              >
                <img src="/logo-freak.png" className="h-full w-full object-cover" alt="FREAK" />
              </div>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">Circulating</span> — Supply held in user wallets.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          Last live check: {updatedAt}
        </p>
      </div>
    </main>
  );
}
