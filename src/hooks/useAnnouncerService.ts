import { useCallback, useEffect, useRef, useState } from "react";
import type { Sails } from "sails-js";
import { getAnnouncerSails } from "@/vara/connection";
import { useVaraAccount } from "./useVaraAccount";
import { useVaraSigner } from "./useVaraSigner";

export type Announcement = {
  stealth_address: string;
  caller: string;
  ephemeral_pub_key: number[] | string;
  metadata: number[] | string;
  chain: "Ethereum" | "Vara";
};

export function useAnnouncerService() {
  const { account } = useVaraAccount();
  const { getSigner } = useVaraSigner();
  const sailsRef = useRef<Sails | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAnnouncerSails()
      .then((sails) => {
        if (!cancelled) {
          sailsRef.current = sails;
          setReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to init Announcer service");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const announce = useCallback(
    async (announcement: Announcement) => {
      if (!sailsRef.current || !account) {
        throw new Error("Announcer service not ready or wallet not connected");
      }

      const signer = await getSigner();
      const sails = sailsRef.current;
      console.log("[Announcer] announce payload:", {
        stealth_address: announcement.stealth_address,
        caller: announcement.caller,
        ephemeral_pub_key: announcement.ephemeral_pub_key,
        ephemeral_pub_key_type: typeof announcement.ephemeral_pub_key,
        ephemeral_pub_key_length:
          typeof announcement.ephemeral_pub_key === "string"
            ? `${announcement.ephemeral_pub_key.replace(/^0x/, "").length / 2} bytes (hex)`
            : `${(announcement.ephemeral_pub_key as number[]).length} bytes (array)`,
        metadata: announcement.metadata,
        metadata_type: typeof announcement.metadata,
        chain: announcement.chain,
      });
      const tx = sails.services.Announcer.functions.Announce(announcement);
      tx.withAccount(account.address, { signer });
      await tx.calculateGas();
      const result = await tx.signAndSend();
      return result;
    },
    [account, getSigner],
  );

  const getAnnouncements = useCallback(
    async (offset: number, limit: number): Promise<Announcement[]> => {
      if (!sailsRef.current) {
        throw new Error("Announcer service not ready");
      }
      const sails = sailsRef.current;
      const result = await sails.services.Announcer.queries
        .Announcements(offset, limit)
        .withAddress(account?.address ?? "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
        .call();
      return result ?? [];
    },
    [account],
  );

  const getAnnouncementsLen = useCallback(async (): Promise<number> => {
    if (!sailsRef.current) {
      throw new Error("Announcer service not ready");
    }
    const sails = sailsRef.current;
    const result = await sails.services.Announcer.queries
      .AnnouncementsLen()
      .withAddress(account?.address ?? "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
      .call();
    return result ?? 0;
  }, [account]);

  return { ready, error, announce, getAnnouncements, getAnnouncementsLen };
}
