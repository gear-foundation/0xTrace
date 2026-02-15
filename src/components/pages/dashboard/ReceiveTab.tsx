import AutorenewIcon from "@mui/icons-material/Autorenew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { generateNewStealthAddress } from "@/cryptography/StealthAddresses";
import { accentBtnSx } from "@/constants";
import { useAlert } from "@/hooks/useAlert";
import { useRegistryService } from "@/hooks/useRegistryService";
import { useVaraAccount } from "@/hooks/useVaraAccount";
import { FieldRow } from "./FieldRow";

export function ReceiveTab() {
  const { address: ethAddress, isConnected: isEthereumConnected } = useAccount();
  const { isConnected: isVaraConnected } = useVaraAccount();
  const { ready: registryReady, registerKeys, stealthMetaAddressOf } = useRegistryService();
  const alert = useAlert();

  const [keys, setKeys] = useState(() => generateNewStealthAddress());
  const { spend, view, stealthAddressHex, stealthAddress } = keys;

  const [registeredAddress, setRegisteredAddress] = useState<string | null>(null);
  const [checkingState, setCheckingState] = useState(false);
  const [registering, setRegistering] = useState(false);

  const canRegister = isEthereumConnected && isVaraConnected && registryReady;
  const isAlreadyRegistered = !!registeredAddress;
  const isLoading = checkingState || (isEthereumConnected && !registryReady);

  useEffect(() => {
    if (!ethAddress || !registryReady) {
      setRegisteredAddress(null);
      return;
    }
    let cancelled = false;
    setCheckingState(true);
    stealthMetaAddressOf(ethAddress)
      .then((addr) => {
        if (!cancelled) setRegisteredAddress(addr);
      })
      .catch(() => {
        if (!cancelled) setRegisteredAddress(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingState(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ethAddress, registryReady, stealthMetaAddressOf]);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        alert.success("Copied!");
      } catch {
        alert.error("Failed to copy");
      }
    },
    [alert],
  );

  const handleCopyStealth = useCallback(() => copyToClipboard(stealthAddress), [copyToClipboard, stealthAddress]);
  const handleCopySpend = useCallback(() => copyToClipboard(spend.mnemonic), [copyToClipboard, spend.mnemonic]);
  const handleCopyView = useCallback(() => copyToClipboard(view.mnemonic), [copyToClipboard, view.mnemonic]);

  const formatBackupText = useCallback(() => {
    return [
      "Backup of Stealth Wallet:",
      `Stealth meta-address: ${stealthAddress}`,
      `Spend mnemonic: ${spend.mnemonic}`,
      `View mnemonic: ${view.mnemonic}`,
      "",
    ].join("\n");
  }, [stealthAddress, spend.mnemonic, view.mnemonic]);

  const handleBackup = useCallback(() => copyToClipboard(formatBackupText()), [copyToClipboard, formatBackupText]);

  const handleGenerate = useCallback(() => {
    setKeys(generateNewStealthAddress());
  }, []);

  const handleRegister = useCallback(async () => {
    if (!isEthereumConnected) {
      alert.warning("Please connect your Ethereum wallet.");
      return;
    }
    if (!isVaraConnected) {
      alert.warning("Please connect your Vara wallet.");
      return;
    }
    if (!registryReady) {
      alert.warning("Registry service is not ready yet.");
      return;
    }
    if (!ethAddress) return;

    setRegistering(true);
    try {
      await registerKeys(ethAddress, stealthAddressHex);
      setRegisteredAddress(stealthAddressHex);
      alert.success("Stealth meta-address registered on Vara!");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }, [isEthereumConnected, isVaraConnected, registryReady, ethAddress, registerKeys, stealthAddressHex, alert]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {isLoading && (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Checking registration state...
        </Alert>
      )}

      {!isLoading && isAlreadyRegistered && (
        <Alert severity="success">
          <AlertTitle>Already Registered</AlertTitle>
          Your Ethereum address is registered on Vara with stealth meta-address:
          <Typography variant="caption" component="div" sx={{ mt: 0.5, fontFamily: "monospace", wordBreak: "break-all" }}>
            {registeredAddress?.startsWith("0x") ? registeredAddress : `0x${registeredAddress}`}
          </Typography>
        </Alert>
      )}

      {!isLoading && !isAlreadyRegistered && (
        <Alert severity="warning">
          <AlertTitle>Important</AlertTitle>
          Backup both 12-word mnemonics (24 words total). You will need them to access your wallet.
        </Alert>
      )}

      <FieldRow label="Stealth meta-address" value={stealthAddress} placeholder="st:eth:0x..." onCopy={handleCopyStealth} />
      <FieldRow label="Spend mnemonic" value={spend.mnemonic} placeholder="12 words" onCopy={handleCopySpend} />
      <FieldRow label="View mnemonic" value={view.mnemonic} placeholder="12 words" onCopy={handleCopyView} />

      <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" }, gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={handleGenerate} startIcon={<AutorenewIcon />}>
          Generate
        </Button>
        <Button variant="outlined" onClick={handleBackup} startIcon={<ContentCopyIcon />}>
          Backup
        </Button>
        <Button
          variant="outlined"
          onClick={handleRegister}
          startIcon={registering ? <CircularProgress size={16} /> : <HowToRegIcon />}
          disabled={!canRegister || registering}
          sx={accentBtnSx}
        >
          {registering ? "Registering..." : "Register"}
        </Button>
      </Box>
    </Box>
  );
}
