import { useMediaQuery } from "@mui/material";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import { AppKitButton, useAppKit, useAppKitAccount } from "@reown/appkit/react";
import CustomThemeSwitcher from "./CustomThemeSwitcher";
import VaraWalletButton from "./VaraWalletButton";

function EthIcon() {
  return (
    <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 20 }}>
      <circle cx="12" cy="12" r="12" fill="#627EEA" />
      <path d="M12 3.5L7 12.2L12 14.7L17 12.2L12 3.5Z" fill="#fff" fillOpacity="0.9" />
      <path d="M7 12.2L12 14.7V3.5L7 12.2Z" fill="#fff" fillOpacity="0.6" />
      <path d="M12 15.9L7 13.4L12 20.5L17 13.4L12 15.9Z" fill="#fff" fillOpacity="0.9" />
      <path d="M7 13.4L12 15.9V20.5L7 13.4Z" fill="#fff" fillOpacity="0.6" />
    </SvgIcon>
  );
}

export default function CustomToolbarActions() {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const isWide = useMediaQuery("(min-width:400px)");

  return (
    <Stack spacing={0.5} direction="row" alignItems="center">
      <VaraWalletButton />
      {!isConnected && (
        <Button
          variant="outlined"
          onClick={() => open({ view: "Connect" })}
          startIcon={<EthIcon />}
          sx={{
            borderColor: "rgba(255,255,255,0.25)",
            color: "inherit",
            "&:hover": { borderColor: "#627EEA", bgcolor: "rgba(98,126,234,0.08)" },
          }}
        >
          Connect
        </Button>
      )}
      {isConnected && <AppKitButton balance={isWide ? "show" : "hide"} charsEnd={4} />}
      <CustomThemeSwitcher />
    </Stack>
  );
}
