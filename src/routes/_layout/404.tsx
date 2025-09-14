import { createFileRoute } from "@tanstack/react-router";
import NotFoundPage from "@/components/pages/NotFoundPage";

export const Route = createFileRoute("/_layout/404")({
  component: NotFoundPage,
});
