import { useMediaQuery } from "@mui/material";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { AppKitButton, useAppKit, useAppKitAccount } from "@reown/appkit/react";
import CustomThemeSwitcher from "./CustomThemeSwitcher";

export default function CustomToolbarActions() {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const isWide = useMediaQuery("(min-width:400px)");

  return (
    <Stack spacing={0.5} direction="row" alignItems="center">
      {!isConnected && (
        <Button variant="text" onClick={() => open({ view: "Connect" })}>
          Connect
        </Button>
      )}
      {isConnected && <AppKitButton balance={isWide ? "show" : "hide"} charsEnd={4} />}
      <CustomThemeSwitcher />
    </Stack>
  );
}
