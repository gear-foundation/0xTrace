import type { Signer } from "@polkadot/api/types";
import { useCallback } from "react";
import { useVaraAccount } from "./useVaraAccount";

export function useVaraSigner() {
  const { account } = useVaraAccount();

  const getSigner = useCallback(async (): Promise<Signer> => {
    if (!account) throw new Error("Vara wallet not connected");

    const injected = (window as unknown as Record<string, unknown>).injectedWeb3 as Record<
      string,
      { enable: (origin: string) => Promise<{ signer: unknown }> }
    >;
    const provider = injected[account.source];
    if (!provider) throw new Error("Wallet extension not found");

    const extension = await provider.enable("Stealth Wallet");
    return (extension as { signer: Signer }).signer;
  }, [account]);

  return { getSigner, account };
}
