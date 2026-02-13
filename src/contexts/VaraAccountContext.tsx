import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

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
  isConnected: boolean;
  isReady: boolean;
  connectWallet: (walletId: string) => Promise<VaraAccount[]>;
  selectAccount: (account: VaraAccount) => void;
  disconnect: () => void;
};

const STORAGE_WALLET_KEY = "vara-wallet-id";
const STORAGE_ACCOUNT_KEY = "vara-account-address";

const KNOWN_WALLETS: Record<string, string> = {
  "polkadot-js": "Polkadot JS",
  "subwallet-js": "SubWallet",
  talisman: "Talisman",
  enkrypt: "Enkrypt",
};

export const VaraAccountContext = createContext<VaraAccountContextType>({
  wallets: [],
  account: null,
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
  return (
    ((window as Record<string, unknown>).injectedWeb3 as typeof getInjectedWeb3 extends () => infer R ? R : never) ?? {}
  );
}

export function VaraAccountProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [account, setAccount] = useState<VaraAccount | null>(null);
  const [isReady, setIsReady] = useState(false);

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

  const value = useMemo(
    () => ({ wallets, account, isConnected: !!account, isReady, connectWallet, selectAccount, disconnect }),
    [wallets, account, isReady, connectWallet, selectAccount, disconnect],
  );

  return <VaraAccountContext.Provider value={value}>{children}</VaraAccountContext.Provider>;
}
