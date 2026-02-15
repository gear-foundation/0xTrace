import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import {
  type Chain,
  checkStealthAddress,
  computeStealthKey,
  deriveKeysFromMnemonic,
  validateMnemonic,
} from "@/cryptography/StealthAddresses";
import { accentBtnSx } from "@/theme/styles";
import { useAlert } from "@/hooks/useAlert";
import { useAnnouncerService } from "@/hooks/useAnnouncerService";

type ClaimResult = {
  stealthAddress: string;
  ephemeralPublicKey: string;
  viewTag: string;
  chain: Chain;
  privateKey: string;
};

export function ClaimTab() {
  const alert = useAlert();
  const { ready: announcerReady, getAnnouncements, getAnnouncementsLen } = useAnnouncerService();

  const [spendMnemonic, setSpendMnemonic] = useState("");
  const [viewMnemonic, setViewMnemonic] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [results, setResults] = useState<ClaimResult[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

      setScanProgress("Fetching announcements count...");
      const totalLen = await getAnnouncementsLen();

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

        for (const ann of announcements) {
          const ephemeralHex = `0x${Buffer.from(ann.ephemeral_pub_key).toString("hex")}` as `0x${string}`;
          const viewTagHex = `0x${Buffer.from(ann.metadata).toString("hex")}` as `0x${string}`;
          const chain: Chain = ann.chain === "Ethereum" ? "eth" : "vara";
          const stealthAddr = ann.stealth_address.startsWith("0x")
            ? (ann.stealth_address as `0x${string}`)
            : (`0x${ann.stealth_address}` as `0x${string}`);

          try {
            const isMatch = checkStealthAddress(
              stealthAddr,
              ephemeralHex,
              viewTagHex,
              chain,
              viewKeys.privateKey as `0x${string}`,
              spendKeys.publicKey as `0x${string}`,
            );

            if (isMatch) {
              const privateKey = computeStealthKey(
                stealthAddr,
                ephemeralHex,
                chain,
                viewKeys.privateKey as `0x${string}`,
                spendKeys.privateKey as `0x${string}`,
              );

              matched.push({
                stealthAddress: stealthAddr,
                ephemeralPublicKey: ephemeralHex,
                viewTag: viewTagHex,
                chain,
                privateKey,
              });
            }
          } catch {
            // skip malformed announcements
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
                    {`${r.stealthAddress.slice(0, 10)}...${r.stealthAddress.slice(-8)}`}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{r.viewTag}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleCopyPrivateKey(r.privateKey)}
                      startIcon={copiedKey === r.privateKey ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      sx={accentBtnSx}
                    >
                      {copiedKey === r.privateKey ? "Copied" : "Copy Key"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {results.length === 0 && !scanning && spendMnemonic && viewMnemonic && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          No results yet. Click "Scan Announcements" to search.
        </Typography>
      )}
    </Box>
  );
}
