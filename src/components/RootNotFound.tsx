import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export default function RootNotFound() {
  const router = useRouter();

  useEffect(() => {
    router.navigate({ to: "/404" });
  }, [router]);

  return null;
}
