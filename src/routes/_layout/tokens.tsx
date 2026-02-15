import { createFileRoute } from "@tanstack/react-router";
import GetTokensPage from "@/components/pages/GetTokensPage";

export const Route = createFileRoute("/_layout/tokens")({
  component: GetTokensPage,
});
