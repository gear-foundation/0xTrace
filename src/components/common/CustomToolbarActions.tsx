import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useAppKit } from "@reown/appkit/react";
import { formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
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

function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export default function CustomToolbarActions() {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({ address });

  const formattedBalance = balanceData
    ? Number.parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(3)
    : null;

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
      {isConnected && address && (
        <Button
          variant="outlined"
          onClick={() => open()}
          startIcon={<EthIcon />}
          sx={{
            textTransform: "none",
            borderColor: "rgba(255,255,255,0.25)",
            color: "inherit",
            "&:hover": { borderColor: "#627EEA", bgcolor: "rgba(98,126,234,0.08)" },
          }}
        >
          {truncateAddress(address)}
          {isBalanceLoading && <CircularProgress size={10} sx={{ ml: 0.5, color: "rgba(255,255,255,0.5)" }} />}
          {formattedBalance && (
            <Typography component="span" variant="caption" sx={{ ml: 0.5, mt: "2px", opacity: 0.7, lineHeight: 1 }}>
              {formattedBalance} {balanceData?.symbol}
            </Typography>
          )}
        </Button>
      )}
      <CustomThemeSwitcher />
    </Stack>
  );
}
