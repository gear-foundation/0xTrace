import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAppKit } from "@reown/appkit/react";
import { useState } from "react";
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

function EthWalletButton({ compact = false }: { compact?: boolean }) {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({ address });

  const formattedBalance = balanceData
    ? Number.parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(3)
    : null;

  if (!isConnected) {
    return (
      <Button
        variant="outlined"
        onClick={() => open({ view: "Connect" })}
        startIcon={<EthIcon />}
        sx={{
          borderColor: "divider",
          color: "inherit",
          "&:hover": { borderColor: "#627EEA", bgcolor: "rgba(98,126,234,0.08)" },
        }}
      >
        Ethereum
      </Button>
    );
  }

  if (!address) return null;

  return (
    <Button
      variant="outlined"
      onClick={() => open()}
      startIcon={<EthIcon />}
      sx={{
        textTransform: "none",
        borderColor: "divider",
        color: "inherit",
        "&:hover": { borderColor: "#627EEA", bgcolor: "rgba(98,126,234,0.08)" },
      }}
    >
      {truncateAddress(address)}
      {!compact && isBalanceLoading && (
        <CircularProgress size={10} sx={{ ml: 0.5, color: "rgba(255,255,255,0.5)" }} />
      )}
      {!compact && formattedBalance && (
        <Typography component="span" variant="caption" sx={{ ml: 0.5, mt: "2px", opacity: 0.7, lineHeight: 1 }}>
          {formattedBalance} {balanceData?.symbol}
        </Typography>
      )}
    </Button>
  );
}

export default function CustomToolbarActions() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [slideOpen, setSlideOpen] = useState(false);

  if (isMobile) {
    return (
      <Stack direction="row" alignItems="center">
        <IconButton
          onClick={() => setSlideOpen((prev) => !prev)}
          sx={{ color: slideOpen ? "#00FFC4" : "inherit" }}
        >
          <AccountBalanceWalletIcon />
        </IconButton>
        <CustomThemeSwitcher />
        <Box
          sx={{
            position: "fixed",
            top: 56,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar - 1,
          }}
        >
          <Collapse in={slideOpen}>
            <Box
              sx={{
                bgcolor: "background.paper",
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Stack
                direction="column"
                spacing={1}
                sx={{ "& .MuiButton-root": { width: "100%", justifyContent: "center" } }}
              >
                <VaraWalletButton />
                <EthWalletButton />
              </Stack>
            </Box>
          </Collapse>
        </Box>
        <Backdrop
          open={slideOpen}
          onClick={() => setSlideOpen(false)}
          sx={{ zIndex: theme.zIndex.appBar - 2, top: 56 }}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5} direction="row" alignItems="center">
      <VaraWalletButton />
      <EthWalletButton />
      <CustomThemeSwitcher />
    </Stack>
  );
}
