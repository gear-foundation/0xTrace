import { useContext } from "react";
import { VaraAccountContext } from "@/contexts/VaraAccountContext";

export function useVaraAccount() {
  return useContext(VaraAccountContext);
}
