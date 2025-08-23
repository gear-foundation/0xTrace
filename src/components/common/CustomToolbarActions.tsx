import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import CustomThemeSwitcher from "./CustomThemeSwitcher";

export default function CustomToolbarActions() {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();

  return (
    <Stack spacing={1} direction="row" alignItems="center">
      {!isConnected && (
        <Button variant="outlined" onClick={() => open({ view: "Connect" })}>
          Connect Wallet
        </Button>
      )}
      {isConnected && <appkit-button />}
      <CustomThemeSwitcher />
    </Stack>
  );
}
