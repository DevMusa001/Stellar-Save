/**
 * WalletBalanceProvider — Issue #1462
 *
 * Responsible for balance polling only:
 * - Fetches XLM and all asset balances from Stellar Horizon
 * - Auto-refreshes on a configurable interval
 * - Exposes balance state and manual refresh
 *
 * Depends on WalletConnectionProvider being present in the tree.
 */
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
  useContext,
} from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import type { Balance } from '../hooks/useBalance';
import { useWalletConnection } from './WalletConnectionProvider';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_REFRESH_INTERVAL = 30_000; // ms
const TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org';
const MAINNET_HORIZON_URL = 'https://horizon.stellar.org';

// ── Context shape ─────────────────────────────────────────────────────────────

export interface WalletBalanceContextValue {
  /** XLM balance as a string (e.g. "100.5000000"), null when not loaded */
  xlmBalance: string | null;
  /** All account balances including non-XLM assets */
  allBalances: Balance[];
  /** Whether a balance fetch is in flight */
  isLoadingBalance: boolean;
  /** Error message from the most recent balance fetch, if any */
  balanceError: string | null;
  /** Timestamp of the last successful fetch */
  balanceLastUpdated: Date | null;
  /** Manually trigger a balance refresh */
  refreshBalance: () => Promise<void>;
}

export const WalletBalanceContext = createContext<
  WalletBalanceContextValue | undefined
>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

interface WalletBalanceProviderProps {
  children: ReactNode;
  /** Auto-refresh interval in ms. Set to 0 to disable. */
  refreshInterval?: number;
}

export const WalletBalanceProvider: React.FC<WalletBalanceProviderProps> = ({
  children,
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
}) => {
  const { activeAddress, network } = useWalletConnection();

  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [allBalances, setAllBalances] = useState<Balance[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLastUpdated, setBalanceLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getHorizonServer = useCallback(() => {
    if (network === 'PUBLIC' || network === 'MAINNET') {
      return new Horizon.Server(MAINNET_HORIZON_URL);
    }
    return new Horizon.Server(TESTNET_HORIZON_URL);
  }, [network]);

  const fetchBalance = useCallback(async () => {
    if (!activeAddress) {
      setXlmBalance(null);
      setAllBalances([]);
      setBalanceError(null);
      setBalanceLastUpdated(null);
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoadingBalance(true);
    setBalanceError(null);

    try {
      const server = getHorizonServer();
      const account = await server.loadAccount(activeAddress);

      if (!isMountedRef.current) return;

      const xlmObj = account.balances.find(
        (b: Balance) => b.asset_type === 'native',
      );

      setXlmBalance(xlmObj?.balance ?? '0');
      setAllBalances(account.balances as Balance[]);
      setBalanceLastUpdated(new Date());
    } catch (err) {
      if (!isMountedRef.current) return;
      let msg = 'Failed to fetch balance';
      if (err instanceof Error) {
        if (err.message.includes('404')) {
          msg = 'Account not found. It may not be funded yet.';
        } else if (err.message.includes('timeout') || err.message.includes('Network')) {
          msg = 'Network error. Please check your connection.';
        } else {
          msg = err.message;
        }
      }
      setBalanceError(msg);
    } finally {
      if (isMountedRef.current) setIsLoadingBalance(false);
    }
  }, [activeAddress, getHorizonServer]);

  // Fetch on address change
  useEffect(() => {
    if (activeAddress) void fetchBalance();
  }, [activeAddress, fetchBalance]);

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval > 0 && activeAddress) {
      intervalRef.current = setInterval(() => void fetchBalance(), refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, activeAddress, fetchBalance]);

  const value: WalletBalanceContextValue = {
    xlmBalance,
    allBalances,
    isLoadingBalance,
    balanceError,
    balanceLastUpdated,
    refreshBalance: fetchBalance,
  };

  return (
    <WalletBalanceContext.Provider value={value}>
      {children}
    </WalletBalanceContext.Provider>
  );
};

// ── Narrow hook ───────────────────────────────────────────────────────────────

export function useWalletBalance(): WalletBalanceContextValue {
  const ctx = useContext(WalletBalanceContext);
  if (!ctx) {
    throw new Error(
      'useWalletBalance must be used within WalletBalanceProvider.',
    );
  }
  return ctx;
}
