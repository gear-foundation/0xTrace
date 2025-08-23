import { useMediaQuery } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useAppKitTheme } from "@reown/appkit/react";
import { Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { PageContainer } from "@toolpad/core/PageContainer";
import CustomToolbarActions from "./common/CustomToolbarActions";

function usePreferredMode(window?: Window) {
  const prefersDarkMode = useMediaQuery(
    "(prefers-color-scheme: dark)",
    window && {
      matchMedia: window.matchMedia,
    },
  );
  return prefersDarkMode ? "dark" : "light";
}

export default function Layout() {
  const preferredMode = usePreferredMode(window);
  const { mode } = useColorScheme();

  const { setThemeMode } = useAppKitTheme();

  setThemeMode(!mode || mode === "system" ? preferredMode : mode);

  return (
    <DashboardLayout
      slots={{
        toolbarActions: CustomToolbarActions,
      }}
    >
      <PageContainer title={""} breadcrumbs={[]}>
        <Outlet />
      </PageContainer>
    </DashboardLayout>
  );
}
