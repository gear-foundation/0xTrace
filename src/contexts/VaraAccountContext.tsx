import { GearApi } from "@gear-js/api";
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type VaraAccount = {
  address: string;
  name: string;
  source: string;
};

export type DetectedWallet = {
  id: string;
  name: string;
  isInstalled: boolean;
  isConnected: boolean;
  accounts: VaraAccount[];
};

type VaraAccountContextType = {
  wallets: DetectedWallet[];
  account: VaraAccount | null;
  balance: string | null;
  tokenSymbol: string;
  isConnected: boolean;
  isReady: boolean;
  connectWallet: (walletId: string) => Promise<VaraAccount[]>;
  selectAccount: (account: VaraAccount) => void;
  disconnect: () => void;
};

const STORAGE_WALLET_KEY = "vara-wallet-id";
const STORAGE_ACCOUNT_KEY = "vara-account-address";
const VARA_RPC = "wss://testnet.vara.network";
const VARA_DECIMALS = 12;

const KNOWN_WALLETS: Record<string, string> = {
  "polkadot-js": "Polkadot JS",
  "subwallet-js": "SubWallet",
  talisman: "Talisman",
  enkrypt: "Enkrypt",
};

export const VaraAccountContext = createContext<VaraAccountContextType>({
  wallets: [],
  account: null,
  balance: null,
  tokenSymbol: "VARA",
  isConnected: false,
  isReady: false,
  connectWallet: async () => [],
  selectAccount: () => {},
  disconnect: () => {},
});

function getInjectedWeb3(): Record<
  string,
  { enable: (origin: string) => Promise<{ accounts: { get: () => Promise<{ address: string; name?: string }[]> } }> }
> {
  return ((window as unknown as Record<string, unknown>).injectedWeb3 as ReturnType<typeof getInjectedWeb3>) ?? {};
}

function formatBalance(raw: string, decimals: number): string {
  const padded = raw.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals) || "0";
  const fracPart = padded.slice(padded.length - decimals, padded.length - decimals + 2);
  return `${intPart}.${fracPart}`;
}

export function VaraAccountProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [account, setAccount] = useState<VaraAccount | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState("VARA");
  const [isReady, setIsReady] = useState(false);
  const apiRef = useRef<GearApi | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const detectWallets = useCallback(() => {
    const injected = getInjectedWeb3();
    const detected: DetectedWallet[] = Object.entries(KNOWN_WALLETS).map(([id, name]) => ({
      id,
      name,
      isInstalled: !!injected[id],
      isConnected: false,
      accounts: [],
    }));
    for (const id of Object.keys(injected)) {
      if (!KNOWN_WALLETS[id]) {
        detected.push({ id, name: id, isInstalled: true, isConnected: false, accounts: [] });
      }
    }
    setWallets(detected);
    return detected;
  }, []);

  const connectWallet = useCallback(async (walletId: string): Promise<VaraAccount[]> => {
    const injected = getInjectedWeb3();
    const provider = injected[walletId];
    if (!provider) return [];

    const extension = await provider.enable("Stealth Wallet");
    const injectedAccounts = await extension.accounts.get();

    const accounts: VaraAccount[] = injectedAccounts.map((acc) => ({
      address: acc.address,
      name: acc.name || "",
      source: walletId,
    }));

    setWallets((prev) => prev.map((w) => (w.id === walletId ? { ...w, isConnected: true, accounts } : w)));

    localStorage.setItem(STORAGE_WALLET_KEY, walletId);
    return accounts;
  }, []);

  const selectAccount = useCallback((acc: VaraAccount) => {
    setAccount(acc);
    localStorage.setItem(STORAGE_ACCOUNT_KEY, acc.address);
    localStorage.setItem(STORAGE_WALLET_KEY, acc.source);
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(null);
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    setWallets((prev) => prev.map((w) => ({ ...w, isConnected: false, accounts: [] })));
    localStorage.removeItem(STORAGE_WALLET_KEY);
    localStorage.removeItem(STORAGE_ACCOUNT_KEY);
  }, []);

  useEffect(() => {
    const init = async () => {
      await new Promise((r) => setTimeout(r, 300));
      detectWallets();

      const savedWalletId = localStorage.getItem(STORAGE_WALLET_KEY);
      const savedAddress = localStorage.getItem(STORAGE_ACCOUNT_KEY);

      if (savedWalletId && savedAddress) {
        try {
          const accounts = await connectWallet(savedWalletId);
          const saved = accounts.find((a) => a.address === savedAddress);
          if (saved) setAccount(saved);
        } catch {
          localStorage.removeItem(STORAGE_WALLET_KEY);
          localStorage.removeItem(STORAGE_ACCOUNT_KEY);
        }
      }

      setIsReady(true);
    };
    init();
  }, [connectWallet, detectWallets]);

  useEffect(() => {
    if (!account) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        if (!apiRef.current) {
          apiRef.current = await GearApi.create({ providerAddress: VARA_RPC });
        }
        const api = apiRef.current;

        const symbols = api.registry.chainTokens;
        const chainDecimals = api.registry.chainDecimals;
        if (symbols[0] && !cancelled) setTokenSymbol(symbols[0]);
        const decimals = chainDecimals[0] ?? VARA_DECIMALS;

        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }

        const unsub = await api.query.system.account(account.address, ({ data }) => {
          if (!cancelled) {
            setBalance(formatBalance(data.free.toString(), decimals));
          }
        });
        unsubRef.current = unsub as unknown as () => void;
      } catch {
        if (!cancelled) setBalance(null);
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [account]);

  useEffect(() => {
    return () => {
      if (apiRef.current) {
        apiRef.current.disconnect();
        apiRef.current = null;
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      wallets,
      account,
      balance,
      tokenSymbol,
      isConnected: !!account,
      isReady,
      connectWallet,
      selectAccount,
      disconnect,
    }),
    [wallets, account, balance, tokenSymbol, isReady, connectWallet, selectAccount, disconnect],
  );

  return <VaraAccountContext.Provider value={value}>{children}</VaraAccountContext.Provider>;
}
