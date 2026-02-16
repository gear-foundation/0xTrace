import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LogoutIcon from "@mui/icons-material/Logout";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import type { DetectedWallet, VaraAccount } from "@/contexts/VaraAccountContext";
import { useAlert } from "@/hooks/useAlert";
import { useVaraAccount } from "@/hooks/useVaraAccount";

function VaraIcon() {
  return (
    <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 20 }}>
      <circle cx="12" cy="12" r="12" fill="#00FFC4" />
      <path
        d="M7.5 7L12 17L16.5 7"
        stroke="#000"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function WalletListView({
  wallets,
  onSelectWallet,
}: {
  wallets: DetectedWallet[];
  onSelectWallet: (wallet: DetectedWallet) => void;
}) {
  return (
    <List disablePadding>
      {wallets.map((wallet) => (
        <ListItemButton
          key={wallet.id}
          disabled={!wallet.isInstalled}
          onClick={() => onSelectWallet(wallet)}
          sx={{
            borderRadius: 1,
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : theme.palette.action.hover,
            },
            "&.Mui-disabled": { opacity: 0.4 },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: (theme) =>
                  wallet.isInstalled
                    ? "#00FFC4"
                    : theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.15)"
                      : theme.palette.action.disabledBackground,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {wallet.name.charAt(0)}
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={wallet.name}
            secondary={
              wallet.isInstalled
                ? wallet.isConnected
                  ? `${wallet.accounts.length} accounts`
                  : "Installed"
                : "Not installed"
            }
            slotProps={{
              primary: { sx: { color: (theme) => theme.palette.text.primary } },
              secondary: {
                sx: {
                  color: (theme) =>
                    wallet.isConnected
                      ? "#00FFC4"
                      : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.5)"
                        : theme.palette.text.secondary,
                },
              },
            }}
          />
          {wallet.isConnected && <CheckCircleOutlineIcon sx={{ color: "#00FFC4" }} fontSize="small" />}
        </ListItemButton>
      ))}
    </List>
  );
}

function AccountListView({
  wallet,
  activeAddress,
  onSelectAccount,
  onCopyAddress,
  onBack,
}: {
  wallet: DetectedWallet;
  activeAddress: string | null;
  onSelectAccount: (account: VaraAccount) => void;
  onCopyAddress: (address: string) => void;
  onBack: () => void;
}) {
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={onBack} sx={{ color: (theme) => theme.palette.text.secondary }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle2" sx={{ color: (theme) => theme.palette.text.primary }}>
          {wallet.name}
        </Typography>
      </Box>
      {wallet.accounts.length === 0 ? (
        <Typography variant="body2" sx={{ py: 2, textAlign: "center", color: (theme) => theme.palette.text.secondary }}>
          No accounts found in {wallet.name}. Create one in the extension.
        </Typography>
      ) : (
        <List disablePadding>
          {wallet.accounts.map((acc) => (
            <ListItemButton
              key={acc.address}
              onClick={() => onSelectAccount(acc)}
              selected={acc.address === activeAddress}
              sx={{
                borderRadius: 1,
                pr: 1,
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : theme.palette.action.hover,
                },
                "&.Mui-selected": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0,255,196,0.12)" : theme.palette.action.selected,
                },
                "&.Mui-selected:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0,255,196,0.18)" : theme.palette.action.selected,
                },
              }}
            >
              <ListItemText
                primary={acc.name || truncateAddress(acc.address)}
                secondary={truncateAddress(acc.address, 8)}
                slotProps={{
                  primary: { noWrap: true, sx: { color: (theme) => theme.palette.text.primary } },
                  secondary: {
                    noWrap: true,
                    sx: {
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: (theme) => theme.palette.text.secondary,
                    },
                  },
                }}
              />
              <IconButton
                size="small"
                sx={{ color: (theme) => theme.palette.text.secondary }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyAddress(acc.address);
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      )}
    </>
  );
}

function ConnectedView({
  account,
  walletName,
  balance,
  tokenSymbol,
  onCopyAddress,
  onChangeWallet,
  onDisconnect,
}: {
  account: VaraAccount;
  walletName: string;
  balance: string | null;
  tokenSymbol: string;
  onCopyAddress: () => void;
  onChangeWallet: () => void;
  onDisconnect: () => void;
}) {
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : theme.palette.action.hover),
          borderRadius: 1,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "#00FFC4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontWeight: 700,
          }}
        >
          {account.name?.charAt(0) || "A"}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ color: (theme) => theme.palette.text.primary }}>
            {account.name || "Account"}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{ fontFamily: "monospace", color: (theme) => theme.palette.text.secondary }}
          >
            {truncateAddress(account.address, 10)}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onCopyAddress} sx={{ color: (theme) => theme.palette.text.secondary }}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Box>
      {balance && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 0.5 }}>
          <VaraIcon />
          <Typography
            variant="body2"
            sx={{ color: (theme) => theme.palette.text.primary, fontWeight: 600, lineHeight: 1 }}
          >
            {balance}
          </Typography>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.text.secondary, lineHeight: 1 }}>
            {tokenSymbol}
          </Typography>
        </Box>
      )}
      <Divider sx={{ borderColor: (theme) => theme.palette.divider }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Chip
          label={walletName}
          size="small"
          variant="outlined"
          onClick={onChangeWallet}
          sx={{ color: (theme) => theme.palette.text.primary, borderColor: (theme) => theme.palette.divider }}
        />
        <Button size="small" color="error" startIcon={<LogoutIcon />} onClick={onDisconnect}>
          Disconnect
        </Button>
      </Box>
    </Stack>
  );
}

type ModalView = "wallets" | "accounts" | "connected";

export default function VaraWalletButton({ compact = false }: { compact?: boolean }) {
  const { wallets, account, balance, tokenSymbol, isConnected, connectWallet, selectAccount, disconnect } =
    useVaraAccount();
  const alert = useAlert();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ModalView>("wallets");
  const [selectedWallet, setSelectedWallet] = useState<DetectedWallet | null>(null);

  const handleOpen = () => {
    setView(isConnected ? "connected" : "wallets");
    setSelectedWallet(null);
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSelectWallet = useCallback(
    async (wallet: DetectedWallet) => {
      if (!wallet.isInstalled) return;
      const accounts = await connectWallet(wallet.id);
      const updatedWallet = { ...wallet, isConnected: true, accounts };
      setSelectedWallet(updatedWallet);
      setView("accounts");
    },
    [connectWallet],
  );

  const handleSelectAccount = useCallback(
    (acc: VaraAccount) => {
      selectAccount(acc);
      handleClose();
    },
    [selectAccount, handleClose],
  );

  const handleCopyAddress = useCallback(
    (address: string) => {
      navigator.clipboard.writeText(address);
      alert.success("Copied!");
    },
    [alert],
  );

  const handleDisconnect = useCallback(() => {
    disconnect();
    handleClose();
  }, [disconnect, handleClose]);

  const dialogTitle = view === "wallets" ? "Connect Wallet" : view === "accounts" ? "Select Account" : "Vara Account";

  return (
    <>
      {!isConnected && (
        <Button
          variant="outlined"
          onClick={handleOpen}
          startIcon={<VaraIcon />}
          sx={{
            borderColor: "divider",
            color: "inherit",
            "&:hover": { borderColor: "#00FFC4", bgcolor: "rgba(0,255,196,0.08)" },
          }}
        >
          Vara
        </Button>
      )}
      {isConnected && (
        <Button
          variant="outlined"
          onClick={handleOpen}
          startIcon={<VaraIcon />}
          sx={{
            textTransform: "none",
            borderColor: "divider",
            color: "inherit",
            "&:hover": { borderColor: "#00FFC4", bgcolor: "rgba(0,255,196,0.08)" },
          }}
        >
          {account?.name || truncateAddress(account?.address ?? "")}
          {!compact && !balance && <CircularProgress size={10} sx={{ ml: 0.5, color: "text.secondary" }} />}
          {!compact && balance && (
            <Typography component="span" variant="caption" sx={{ ml: 0.5, mt: "2px", opacity: 0.7, lineHeight: 1 }}>
              {balance} {tokenSymbol}
            </Typography>
          )}
        </Button>
      )}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#141820" : theme.palette.background.paper),
              color: (theme) => theme.palette.text.primary,
              backgroundImage: (theme) =>
                theme.palette.mode === "dark" ? "linear-gradient(180deg, #1b2029 0%, #141820 100%)" : "none",
              border: (theme) => (theme.palette.mode === "dark" ? "none" : "1px solid"),
              borderColor: (theme) => (theme.palette.mode === "dark" ? "transparent" : theme.palette.divider),
              boxShadow: (theme) => (theme.palette.mode === "dark" ? "0 24px 60px rgba(0,0,0,0.55)" : theme.shadows[8]),
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: (theme) => theme.palette.text.primary,
            borderBottom: (theme) => (theme.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "none"),
          }}
        >
          {dialogTitle}
          <IconButton size="small" onClick={handleClose} sx={{ color: (theme) => theme.palette.text.secondary }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {view === "wallets" && <WalletListView wallets={wallets} onSelectWallet={handleSelectWallet} />}
          {view === "accounts" && selectedWallet && (
            <AccountListView
              wallet={selectedWallet}
              activeAddress={account?.address ?? null}
              onSelectAccount={handleSelectAccount}
              onCopyAddress={handleCopyAddress}
              onBack={() => setView("wallets")}
            />
          )}
          {view === "connected" && account && (
            <ConnectedView
              account={account}
              walletName={wallets.find((w) => w.id === account.source)?.name ?? account.source}
              balance={balance}
              tokenSymbol={tokenSymbol}
              onCopyAddress={() => handleCopyAddress(account.address)}
              onChangeWallet={() => setView("wallets")}
              onDisconnect={handleDisconnect}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
