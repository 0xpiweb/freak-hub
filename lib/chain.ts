import { createPublicClient, http, formatUnits } from 'viem';
import { avalanche } from 'viem/chains';

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

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function getClient() {
  return createPublicClient({
    chain: avalanche,
    transport: http(process.env.AVAX_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc'),
  });
}

export async function fetchMoatData(moatAddress: string) {
  try {
    const [totalStaked, totalLocked, totalBurned] = await getClient().readContract({
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

export async function fetchDeadBalance(tokenAddress: string): Promise<number> {
  try {
    const balance = await getClient().readContract({
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
