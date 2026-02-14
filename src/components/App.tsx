import DashboardIcon from "@mui/icons-material/Dashboard";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TokenIcon from "@mui/icons-material/Token";
import { createTheme, useColorScheme } from "@mui/material/styles";
import { type AppKitNetwork, hoodi } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import type { Navigation } from "@toolpad/core/AppProvider";
import { TanStackRouterAppProvider } from "@toolpad/core/tanstack-router";
import { WagmiProvider } from "wagmi";
import { AlertProvider } from "@/contexts/AlertContext";
import { VaraAccountProvider } from "@/contexts/VaraAccountContext";

function Logo() {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === "system" ? systemMode : mode;
  const src = resolved === "dark" ? "/logo-light.png" : "/logo-dark.png";
  return <img src={src} alt="0xTrace" style={{ height: 32 }} />;
}

const THEME = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true, dark: true },
});

const BRANDING = {
  title: "",
  logo: <Logo />,
};

const NAVIGATION: Navigation = [
  {
    title: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    segment: "orders",
    title: "Get Tokens",
    icon: <TokenIcon />,
  },
  {
    segment: "about",
    title: "About",
    icon: <InfoOutlinedIcon />,
  },
];

const queryClient = new QueryClient();

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;
const defaultNetwork = hoodi;
const networks = [defaultNetwork] as [AppKitNetwork, ...AppKitNetwork[]];
const wagmiAdapter = new WagmiAdapter({ projectId, networks });

createAppKit({
  adapters: [wagmiAdapter],
  themeVariables: {
    "--w3m-z-index": THEME.zIndex.modal,
  },
  networks,
  defaultNetwork,
  metadata: {
    name: "0xTrace",
    description: "Yet another ERC-5564 wallet",
    url: window.location.origin,
    icons: [`${window.location.origin}/logo.png`],
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
        <AlertProvider>
          <VaraAccountProvider>
            <TanStackRouterAppProvider theme={THEME} branding={BRANDING} navigation={NAVIGATION}>
              <Outlet />
            </TanStackRouterAppProvider>
          </VaraAccountProvider>
        </AlertProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
