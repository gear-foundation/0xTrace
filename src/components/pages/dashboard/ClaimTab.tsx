import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import { useColorScheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Keyring } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { useCallback, useState } from "react";
import { checksumAddress, fromHex, type Hex } from "viem";
import {
  type Chain,
  checkStealthAddress,
  computeStealthKey,
  deriveKeysFromMnemonic,
  validateMnemonic,
} from "@/cryptography/StealthAddresses";
import { useAlert } from "@/hooks/useAlert";
import { useAnnouncerService } from "@/hooks/useAnnouncerService";
import { accentBtnSx } from "@/theme/styles";

type ClaimResult = {
  stealthAddress: string;
  ephemeralPublicKey: string;
  viewTag: string;
  chain: Chain;
  privateKey: string;
};

const VARA_GENESIS = import.meta.env.VITE_VARA_GENESIS as string;

export function ClaimTab() {
  const alert = useAlert();
  const { ready: announcerReady, getAnnouncements, getAnnouncementsLen } = useAnnouncerService();
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === "system" ? systemMode : mode;
  const isDarkMode = resolvedMode === "dark";

  const [spendMnemonic, setSpendMnemonic] = useState("");
  const [viewMnemonic, setViewMnemonic] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [results, setResults] = useState<ClaimResult[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveFilename, setSaveFilename] = useState("");
  const [savePassword, setSavePassword] = useState("");
  const [saveTarget, setSaveTarget] = useState<ClaimResult | null>(null);
  const [savingJson, setSavingJson] = useState(false);

  const spendValidation = spendMnemonic ? validateMnemonic(spendMnemonic) : null;
  const viewValidation = viewMnemonic ? validateMnemonic(viewMnemonic) : null;
  const mnemonicsValid = spendValidation?.valid === true && viewValidation?.valid === true;

  const handleScan = useCallback(async () => {
    if (!mnemonicsValid) {
      alert.warning("Fix mnemonic errors before scanning.");
      return;
    }
    if (!announcerReady) {
      alert.warning("Announcer service is not ready yet.");
      return;
    }

    setScanning(true);
    setResults([]);
    setScanProgress("Deriving keys...");

    try {
      const spendKeys = deriveKeysFromMnemonic(spendMnemonic);
      const viewKeys = deriveKeysFromMnemonic(viewMnemonic);

      console.log("[ClaimTab] Derived keys:", {
        spendPublicKey: spendKeys.publicKey,
        viewPrivateKey: viewKeys.privateKey,
      });

      setScanProgress("Fetching announcements count...");
      const totalLen = await getAnnouncementsLen();
      console.log(`[ClaimTab] Total announcements: ${totalLen}`);

      if (totalLen === 0) {
        alert.info("No announcements found on Vara.");
        setScanning(false);
        setScanProgress("");
        return;
      }

      const BATCH = 50;
      const matched: ClaimResult[] = [];

      for (let offset = 0; offset < totalLen; offset += BATCH) {
        const limit = Math.min(BATCH, totalLen - offset);
        setScanProgress(`Scanning ${offset + 1}–${offset + limit} of ${totalLen}...`);

        const announcements = await getAnnouncements(offset, limit);
        console.log(`[ClaimTab] Batch ${offset}-${offset + limit}:`, announcements);

        for (const ann of announcements) {
          // Handle both array and string formats
          const ephemeralHex = (
            typeof ann.ephemeral_pub_key === "string" ? ann.ephemeral_pub_key : ann.ephemeral_pub_key
          ) as `0x${string}`;
          const viewTagHex = (typeof ann.metadata === "string" ? ann.metadata : ann.metadata) as `0x${string}`;
          const chain: Chain = ann.chain === "Ethereum" ? "eth" : "vara";
          const stealthAddr1 = ann.stealth_address.startsWith("0x")
            ? (ann.stealth_address as `0x${string}`)
            : (`0x${ann.stealth_address}` as `0x${string}`);
          const stealthAddr = (
            ann.chain === "Ethereum" && stealthAddr1.startsWith("0x000000000000000000000000")
              ? `0x${stealthAddr1.slice(26)}`
              : stealthAddr1
          ) as `0x${string}`;

          console.log(`[ClaimTab] Processing announcement:`, {
            raw: ann,
            parsed: { stealthAddr, ephemeralHex, viewTagHex, chain },
          });

          try {
            const isMatch = checkStealthAddress(
              stealthAddr,
              ephemeralHex,
              viewTagHex,
              chain,
              viewKeys.privateKey as `0x${string}`,
              spendKeys.publicKey as `0x${string}`,
            );

            console.log(`[ClaimTab] Check result:`, { stealthAddr, isMatch });

            if (isMatch) {
              const privateKey = computeStealthKey(
                stealthAddr,
                ephemeralHex,
                chain,
                viewKeys.privateKey as `0x${string}`,
                spendKeys.privateKey as `0x${string}`,
              );

              console.log(`[ClaimTab] ✅ MATCH FOUND!`, {
                stealthAddress: stealthAddr,
                privateKey,
                chain,
              });

              matched.push({
                stealthAddress: stealthAddr,
                ephemeralPublicKey: ephemeralHex,
                viewTag: viewTagHex,
                chain,
                privateKey,
              });
            }
          } catch (err) {
            console.warn(`[ClaimTab] Error checking announcement:`, err);
          }
        }
      }

      setResults(matched);
      if (matched.length > 0) {
        alert.success(`Found ${matched.length} stealth payment(s)!`);
      } else {
        alert.info("No stealth payments found for your keys.");
      }
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
      setScanProgress("");
    }
  }, [spendMnemonic, viewMnemonic, mnemonicsValid, announcerReady, getAnnouncementsLen, getAnnouncements, alert]);

  const handleCopyPrivateKey = useCallback(
    async (key: string) => {
      try {
        await navigator.clipboard.writeText(key);
        setCopiedKey(key);
        alert.success("Private key copied!");
        setTimeout(() => setCopiedKey(null), 2000);
      } catch {
        alert.error("Failed to copy");
      }
    },
    [alert],
  );

  const handleOpenSaveDialog = useCallback((result: ClaimResult) => {
    const shortAddr = `${result.stealthAddress.slice(0, 8)}${result.stealthAddress.slice(-4)}`;
    setSaveFilename(`vara-stealth-${shortAddr}`);
    setSavePassword("");
    setSaveTarget(result);
    setSaveDialogOpen(true);
  }, []);

  const handleCloseSaveDialog = useCallback(() => {
    if (savingJson) {
      return;
    }
    setSaveDialogOpen(false);
    setSaveTarget(null);
  }, [savingJson]);

  const handleSaveJson = useCallback(async () => {
    if (!saveTarget) {
      return;
    }

    const trimmedName = saveFilename.trim();
    if (!trimmedName) {
      alert.warning("Enter a file name.");
      return;
    }
    if (!savePassword) {
      alert.warning("Enter a password to encrypt the file.");
      return;
    }

    setSavingJson(true);
    try {
      await cryptoWaitReady();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const keyring = new Keyring({ type: "ecdsa", ss58Format: 137 });
      const pair = keyring.addFromSeed(fromHex(saveTarget.privateKey as Hex, { size: 32, to: "bytes" }));
      pair.setMeta({
        address: pair.address,
        genesisHash: VARA_GENESIS as Hex,
        name: `Vara Stealth ${saveTarget.stealthAddress.slice(0, 10)}...${saveTarget.stealthAddress.slice(-8)}`,
      });
      const jsonPayload = JSON.stringify(pair.toJson(savePassword));

      const blob = new Blob([jsonPayload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = trimmedName.endsWith(".json") ? trimmedName : `${trimmedName}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      alert.success("Vara key saved.");
      setSaveDialogOpen(false);
      setSaveTarget(null);
    } catch (err) {
      console.error("[ClaimTab] Failed to save json:", err);
      alert.error(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSavingJson(false);
    }
  }, [alert, saveFilename, savePassword, saveTarget]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Scan announcements to find payments sent to you. Enter your spend and view mnemonics to detect and claim stealth
        transfers.
      </Typography>

      <TextField
        fullWidth
        label="Spend mnemonic"
        placeholder="12 words separated by spaces"
        value={spendMnemonic}
        onChange={(e) => setSpendMnemonic(e.target.value)}
        multiline
        minRows={2}
        error={spendValidation !== null && !spendValidation.valid}
        helperText={spendValidation !== null && !spendValidation.valid ? spendValidation.error : undefined}
      />

      <TextField
        fullWidth
        label="View mnemonic"
        placeholder="12 words separated by spaces"
        value={viewMnemonic}
        onChange={(e) => setViewMnemonic(e.target.value)}
        multiline
        minRows={2}
        error={viewValidation !== null && !viewValidation.valid}
        helperText={viewValidation !== null && !viewValidation.valid ? viewValidation.error : undefined}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleScan}
          startIcon={scanning ? <CircularProgress size={16} /> : <SearchIcon />}
          disabled={scanning || !mnemonicsValid || !announcerReady}
          sx={accentBtnSx}
        >
          {scanning ? "Scanning..." : "Scan Announcements"}
        </Button>
        {scanProgress && (
          <Typography variant="caption" color="text.secondary">
            {scanProgress}
          </Typography>
        )}
      </Box>

      {results.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Chain</TableCell>
                <TableCell>Stealth Address</TableCell>
                <TableCell>View Tag</TableCell>
                <TableCell align="right">Private Key</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.stealthAddress}>
                  <TableCell>
                    <Chip
                      label={r.chain === "eth" ? "ETH" : "VARA"}
                      size="small"
                      sx={{
                        bgcolor: r.chain === "eth" ? "#627eea" : "#9cef3b",
                        color: r.chain === "eth" ? "#fff" : "#000",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                    {r.chain === "eth" ? (
                      <Link
                        href={`https://hoodi.etherscan.io/address/${checksumAddress(r.stealthAddress as Hex)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: "primary.main",
                          textDecoration: "underline",
                          "&:hover": {
                            textDecoration: "none",
                          },
                        }}
                      >
                        {checksumAddress(r.stealthAddress as Hex)}
                      </Link>
                    ) : (
                      `${r.stealthAddress.slice(0, 10)}...${r.stealthAddress.slice(-8)}`
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{r.viewTag}</TableCell>
                  <TableCell align="right">
                    {r.chain === "eth" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleCopyPrivateKey(r.privateKey)}
                        startIcon={copiedKey === r.privateKey ? <CheckCircleIcon /> : <ContentCopyIcon />}
                        sx={accentBtnSx}
                      >
                        {copiedKey === r.privateKey ? "Copied" : "Copy Key"}
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenSaveDialog(r)}
                        startIcon={<SaveAltIcon />}
                        sx={accentBtnSx}
                      >
                        Save Json
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={saveDialogOpen}
        onClose={handleCloseSaveDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: (theme) => (isDarkMode ? "#141820" : theme.palette.background.paper),
              color: (theme) => theme.palette.text.primary,
              backgroundImage: isDarkMode ? "linear-gradient(180deg, #1b2029 0%, #141820 100%)" : "none",
              border: (_theme) => (isDarkMode ? "none" : "1px solid"),
              borderColor: (theme) => (isDarkMode ? "transparent" : theme.palette.divider),
              boxShadow: (theme) => (isDarkMode ? "0 24px 60px rgba(0,0,0,0.55)" : theme.shadows[8]),
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: isDarkMode ? "1px solid rgba(255,255,255,0.08)" : "none",
            color: (theme) => (isDarkMode ? "rgba(255,255,255,0.82)" : theme.palette.text.primary),
          }}
        >
          Save Vara Key
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: 5,
            pb: 0.5,
            "& .MuiOutlinedInput-root": {
              bgcolor: isDarkMode ? "rgba(255,255,255,0.04)" : "transparent",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: (theme) => (isDarkMode ? "rgba(255,255,255,0.2)" : theme.palette.divider),
            },
            "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: (theme) => (isDarkMode ? "rgba(255,255,255,0.35)" : theme.palette.text.primary),
            },
            "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: (theme) => (isDarkMode ? "#00FFC4" : theme.palette.primary.main),
            },
          }}
        >
          <TextField
            label="File name"
            value={saveFilename}
            onChange={(event) => setSaveFilename(event.target.value)}
            size="small"
            fullWidth
            autoFocus
            sx={{ mt: 1.5 }}
          />
          <TextField
            label="Password"
            type="password"
            value={savePassword}
            onChange={(event) => setSavePassword(event.target.value)}
            size="small"
            fullWidth
          />
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 1,
            borderTop: isDarkMode ? "1px solid rgba(255,255,255,0.08)" : "none",
          }}
        >
          <Button variant="text" onClick={handleCloseSaveDialog} disabled={savingJson}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveJson} disabled={savingJson}>
            {savingJson ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {results.length === 0 && !scanning && spendMnemonic && viewMnemonic && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          No results yet. Click "Scan Announcements" to search.
        </Typography>
      )}
    </Box>
  );
}
