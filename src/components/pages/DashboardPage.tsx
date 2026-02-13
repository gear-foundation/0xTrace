import AutorenewIcon from "@mui/icons-material/Autorenew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useMemo, useState } from "react";
import { useWriteContract } from "wagmi";
import { abi as ERC6538RegistryAbi, address as ERC6538RegistryAddress } from "@/contracts/ERC6538Registry";
import { generateNewStealthAddress } from "@/cryptography/StealthAddresses";
import { useAlert } from "@/hooks/useAlert";

function FieldRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
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
                  <ContentCopyIcon />
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
  const { isConnected } = useAppKitAccount();
  const { writeContract } = useWriteContract();
  const alert = useAlert();

  const [keys, setKeys] = useState(() => generateNewStealthAddress());
  const { spend, view, stealthAddressHex, stealthAddress } = keys;

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

  const handleRegister = useCallback(() => {
    if (isConnected) {
      writeContract({
        abi: ERC6538RegistryAbi,
        address: ERC6538RegistryAddress,
        functionName: "registerKeys",
        args: [1n, stealthAddressHex],
      });
    } else {
      alert.warning("Please connect your wallet before registering.");
    }
  }, [isConnected, writeContract, stealthAddressHex, alert]);

  const fields = useMemo(
    () => [
      { label: "Stealth meta-address", value: stealthAddress, onCopy: handleCopyStealth },
      { label: "Spend mnemonic", value: spend.mnemonic, onCopy: handleCopySpend },
      { label: "View mnemonic", value: view.mnemonic, onCopy: handleCopyView },
    ],
    [stealthAddress, spend.mnemonic, view.mnemonic, handleCopyStealth, handleCopySpend, handleCopyView],
  );

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Alert severity="warning" sx={{ px: 1 }}>
        <AlertTitle>Important</AlertTitle>
        Backup both 12-word mnemonics (24 words total). You will need them to access your wallet.
      </Alert>

      {fields.map(({ label, value, onCopy }) => (
        <FieldRow key={label} label={label} value={value} onCopy={onCopy} />
      ))}

      <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" }, gap: 1 }}>
        <Button variant="outlined" onClick={handleGenerate} startIcon={<AutorenewIcon />}>
          Generate
        </Button>

        <Button variant="outlined" onClick={handleBackup} startIcon={<ContentCopyIcon />}>
          Backup
        </Button>

        <Button variant="outlined" onClick={handleRegister} startIcon={<HowToRegIcon />}>
          Register
        </Button>
      </Box>
    </Box>
  );
}
