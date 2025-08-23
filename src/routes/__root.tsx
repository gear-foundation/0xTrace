import { createRootRoute } from "@tanstack/react-router";
import App from "@/components/App";
import RootNotFound from "@/components/RootNotFound";

export const Route = createRootRoute({
  component: App,
  notFoundComponent: RootNotFound,
});
