import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBalance } from '../useBalance';

const loadAccount = vi.fn();

vi.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: (...args: unknown[]) => loadAccount(...args),
    })),
  },
}));

vi.mock('../useWallet', () => ({
  useWallet: () => ({ activeAddress: 'GABC...TESTADDRESS', network: 'TESTNET' }),
}));

describe('useBalance regression: single polling path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadAccount.mockReset();
    loadAccount.mockResolvedValue({
      balances: [{ asset_type: 'native', balance: '100.0000000' }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires exactly one fetch per refreshInterval tick, with no extra legacy fallback calls', async () => {
    const refreshInterval = 1000;
    renderHook(() => useBalance({ refreshInterval, fetchOnMount: false }));

    // Advance through 3 ticks of the refresh interval.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(refreshInterval);
      });
    }

    // A legacy/duplicate polling path would fire additional calls on its own
    // cadence (e.g. refreshInterval * 2); exactly 3 calls confirms only the
    // single documented interval is active.
    expect(loadAccount).toHaveBeenCalledTimes(3);
  });

  it('does not poll at all when refreshInterval is 0', async () => {
    renderHook(() => useBalance({ refreshInterval: 0, fetchOnMount: false }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(loadAccount).not.toHaveBeenCalled();
  });
});
