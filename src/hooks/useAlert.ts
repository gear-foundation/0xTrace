import { useContext } from "react";
import { AlertContext } from "@/contexts/AlertContext";

export function useAlert() {
  return useContext(AlertContext);
}
