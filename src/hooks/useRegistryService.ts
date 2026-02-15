import { useCallback, useEffect, useRef, useState } from "react";
import type { Signer } from "@polkadot/api/types";
import type { Sails } from "sails-js";
import { getRegistrySails } from "@/vara/connection";
import { useVaraAccount } from "./useVaraAccount";

export function useRegistryService() {
  const { account } = useVaraAccount();
  const sailsRef = useRef<Sails | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getRegistrySails()
      .then((sails) => {
        if (!cancelled) {
          sailsRef.current = sails;
          setReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to init Registry service");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const registerKeys = useCallback(
    async (ethereumAddress: string, stealthMetaAddress: string) => {
      if (!sailsRef.current || !account) {
        throw new Error("Registry service not ready or wallet not connected");
      }

      const injected = (window as unknown as Record<string, unknown>).injectedWeb3 as Record<
        string,
        { enable: (origin: string) => Promise<{ signer: unknown }> }
      >;
      const provider = injected[account.source];
      if (!provider) throw new Error("Wallet extension not found");

      const extension = await provider.enable("Stealth Wallet");

      const sails = sailsRef.current;

      // Strip 0x prefix — the contract adds it internally
      const rawHex = stealthMetaAddress.startsWith("0x")
        ? stealthMetaAddress.slice(2).toLowerCase()
        : stealthMetaAddress.toLowerCase();

      console.log("[Registry] registerKeys:", { ethereumAddress, rawHex, len: rawHex.length });

      const tx = sails.services.Registry.functions.RegisterKeys(ethereumAddress, rawHex);
      tx.withAccount(account.address, { signer: (extension as { signer: Signer }).signer });
      await tx.calculateGas();
      const result = await tx.signAndSend();
      return result;
    },
    [account],
  );

  const stealthMetaAddressOf = useCallback(
    async (ethereumAddress: string): Promise<string | null> => {
      if (!sailsRef.current) {
        throw new Error("Registry service not ready");
      }
      const sails = sailsRef.current;
      const result = await sails.services.Registry.queries
        .StealthMetaAddressOf(ethereumAddress)
        .withAddress(account?.address ?? "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
        .call();
      return result ?? null;
    },
    [account],
  );

  return { ready, error, registerKeys, stealthMetaAddressOf };
}
