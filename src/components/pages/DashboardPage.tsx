import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import type { SnackbarCloseReason } from "@mui/material/Snackbar";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import { useAppKitAccount } from "@reown/appkit/react";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { useWriteContract } from "wagmi";
import { abi as ERC6538RegistryAbi, address as ERC6538RegistryAddress } from "@/contracts/ERC6538Registry";
import { generateNewStealthAddress } from "@/cryptography/StealthAddresses";

function FieldRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
      <TextField
        fullWidth
        label={label}
        value={value}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={onCopy} edge="end" size="small" aria-label={`copy ${label}`}>
                  {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}

export default function DashboardPage() {
  const [copiedStealth, setCopiedStealth] = useState(false);
  const [copiedSpend, setCopiedSpend] = useState(false);
  const [copiedView, setCopiedView] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [registerSnackOpen, setRegisterSnackOpen] = useState(false);

  const { isConnected } = useAppKitAccount();
  const { writeContract } = useWriteContract();

  const [keys, setKeys] = useState(() => generateNewStealthAddress());
  const { spend, view, stealthAddressHex, stealthAddress } = keys;

  const copyToClipboard = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
    }
  }, []);

  const handleCopyStealth = useCallback(
    () => copyToClipboard(stealthAddress, setCopiedStealth),
    [copyToClipboard, stealthAddress],
  );
  const handleCopySpend = useCallback(
    () => copyToClipboard(spend.mnemonic, setCopiedSpend),
    [copyToClipboard, spend.mnemonic],
  );
  const handleCopyView = useCallback(
    () => copyToClipboard(view.mnemonic, setCopiedView),
    [copyToClipboard, view.mnemonic],
  );

  const formatBackupText = useCallback(() => {
    return [
      "Backup of Stealth Wallet:",
      `Stealth meta-address: ${stealthAddress}`,
      `Spend mnemonic: ${spend.mnemonic}`,
      `View mnemonic: ${view.mnemonic}`,
      "",
    ].join("\n");
  }, [stealthAddress, spend.mnemonic, view.mnemonic]);

  const handleBackup = useCallback(
    () => copyToClipboard(formatBackupText(), setCopiedBackup),
    [copyToClipboard, formatBackupText],
  );

  const handleGenerate = useCallback(() => {
    setKeys(generateNewStealthAddress());
    setCopiedStealth(false);
    setCopiedSpend(false);
    setCopiedView(false);
  }, []);

  const handleRegister = useCallback(() => {
    if (isConnected) {
      writeContract({
        abi: ERC6538RegistryAbi,
        address: ERC6538RegistryAddress,
        functionName: "registerKeys",
        args: [1n, stealthAddressHex],
      });
    } else {
      setRegisterSnackOpen(true);
    }
  }, [isConnected, writeContract, stealthAddressHex]);

  const handleRegisterSnackClose = useCallback(
    (_event?: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
      if (reason === "clickaway") return;
      setRegisterSnackOpen(false);
    },
    [],
  );

  const fields = useMemo(
    () => [
      { label: "Stealth meta-address", value: stealthAddress, onCopy: handleCopyStealth, copied: copiedStealth },
      { label: "Spend mnemonic", value: spend.mnemonic, onCopy: handleCopySpend, copied: copiedSpend },
      { label: "View mnemonic", value: view.mnemonic, onCopy: handleCopyView, copied: copiedView },
    ],
    [
      stealthAddress,
      spend.mnemonic,
      view.mnemonic,
      handleCopyStealth,
      handleCopySpend,
      handleCopyView,
      copiedStealth,
      copiedSpend,
      copiedView,
    ],
  );

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Alert severity="warning" sx={{ px: 1 }}>
        <AlertTitle>Important</AlertTitle>
        Backup both 12-word mnemonics (24 words total). You will need them to access your wallet.
      </Alert>

      {fields.map(({ label, value, onCopy, copied }) => (
        <FieldRow key={label} label={label} value={value} onCopy={onCopy} copied={copied} />
      ))}

      <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" }, gap: 1 }}>
        <Button variant="outlined" onClick={handleGenerate} startIcon={<AutorenewIcon />}>
          Generate
        </Button>

        <Button
          variant="outlined"
          onClick={handleBackup}
          startIcon={copiedBackup ? <CheckIcon color="success" /> : <ContentCopyIcon />}
        >
          Backup
        </Button>

        <Button variant="outlined" onClick={handleRegister} startIcon={<HowToRegIcon />}>
          Register
        </Button>
      </Box>

      <Snackbar
        open={registerSnackOpen}
        autoHideDuration={5000}
        onClose={handleRegisterSnackClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleRegisterSnackClose} severity="warning" variant="filled" sx={{ width: "100%" }}>
          Please connect your wallet using "Connect" button on this page before registering in Stealth Meta-Address
          Registry.
        </Alert>
      </Snackbar>
    </Box>
  );
}
