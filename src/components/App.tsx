import DashboardIcon from "@mui/icons-material/Dashboard";
import SecurityIcon from "@mui/icons-material/Security";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { createTheme } from "@mui/material/styles";
import { type AppKitNetwork, arbitrum, avalanche, base, bsc, hoodi, mainnet } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import type { Navigation } from "@toolpad/core/AppProvider";
import { TanStackRouterAppProvider } from "@toolpad/core/tanstack-router";
import { WagmiProvider } from "wagmi";
import { VaraAccountProvider } from "@/contexts/VaraAccountContext";

const THEME = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true, dark: true },
});

const BRANDING = {
  title: "Wallet",
  logo: <SecurityIcon color="primary" />,
};

const NAVIGATION: Navigation = [
  {
    title: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    segment: "orders",
    title: "Orders",
    icon: <ShoppingCartIcon />,
  },
];

const queryClient = new QueryClient();

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;
const defaultNetwork = mainnet;
const networks = [defaultNetwork, bsc, base, arbitrum, avalanche, hoodi] as [AppKitNetwork, ...AppKitNetwork[]];
const wagmiAdapter = new WagmiAdapter({ projectId, networks });

createAppKit({
  adapters: [wagmiAdapter],
  themeVariables: {
    "--w3m-z-index": THEME.zIndex.modal,
  },
  networks,
  defaultNetwork,
  metadata: {
    name: "Stealth Wallet",
    description: "Yet another ERC-5564 wallet",
    url: window.location.origin,
    icons: [`${window.location.origin}/light.svg`, `${window.location.origin}/dark.svg`],
  },
  features: {
    email: false,
    socials: false,
    analytics: false,
  },
  projectId,
});

export default function App() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <VaraAccountProvider>
          <TanStackRouterAppProvider theme={THEME} branding={BRANDING} navigation={NAVIGATION}>
            <Outlet />
          </TanStackRouterAppProvider>
        </VaraAccountProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
