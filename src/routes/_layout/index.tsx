import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/components/pages/DashboardPage";

type DashboardSearch = {
  tab?: "receive" | "send" | "claim";
};

export const Route = createFileRoute("/_layout/")({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    tab: (["receive", "send", "claim"].includes(search.tab as string) ? search.tab : "receive") as DashboardSearch["tab"],
  }),
});
