import AutorenewIcon from "@mui/icons-material/Autorenew";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useAppKitAccount } from "@reown/appkit/react";
import { type SyntheticEvent, useCallback, useState } from "react";
import { useWriteContract } from "wagmi";
import { abi as ERC6538RegistryAbi, address as ERC6538RegistryAddress } from "@/contracts/ERC6538Registry";
import { generateNewStealthAddress, generateStealthAddress } from "@/cryptography/StealthAddresses";
import { useAlert } from "@/hooks/useAlert";
import { useVaraAccount } from "@/hooks/useVaraAccount";

function FieldRow({
  label,
  value,
  placeholder,
  onCopy,
}: { label: string; value: string; placeholder?: string; onCopy: () => void }) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      placeholder={placeholder}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={onCopy} edge="end" size="small" aria-label={`copy ${label}`}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

function ReceiveTab() {
  const { isConnected: isEthereumConnected } = useAppKitAccount();
  const { isConnected: isVaraConnected } = useVaraAccount();
  const { writeContract } = useWriteContract();
  const alert = useAlert();
  const canRegister = isEthereumConnected && isVaraConnected;

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
    if (!isEthereumConnected && !isVaraConnected) {
      alert.warning("Please connect both wallets before registering.");
      return;
    }
    if (!isEthereumConnected) {
      alert.warning("Please connect your Ethereum wallet.");
      return;
    }
    if (!isVaraConnected) {
      alert.warning("Please connect your Vara wallet.");
      return;
    }

    writeContract({
      abi: ERC6538RegistryAbi,
      address: ERC6538RegistryAddress,
      functionName: "registerKeys",
      args: [1n, stealthAddressHex],
    });
  }, [isEthereumConnected, isVaraConnected, writeContract, stealthAddressHex, alert]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Alert severity="warning">
        <AlertTitle>Important</AlertTitle>
        Backup both 12-word mnemonics (24 words total). You will need them to access your wallet.
      </Alert>

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
        <Button variant="outlined" onClick={handleRegister} startIcon={<HowToRegIcon />} disabled={!canRegister}>
          Register
        </Button>
      </Box>
    </Box>
  );
}

function SendTab() {
  const { isConnected: isEthereumConnected } = useAppKitAccount();
  const { isConnected: isVaraConnected } = useVaraAccount();
  const alert = useAlert();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [metaAddress, setMetaAddress] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [stealthResult, setStealthResult] = useState<{
    stealthAddress: string;
    ephemeralPublicKey: string;
    viewTag: string;
  } | null>(null);
  const [sendLoading, setSendLoading] = useState(false);

  const handleLookup = useCallback(async () => {
    if (!recipientAddress) {
      alert.warning("Enter recipient address.");
      return;
    }
    setLookupLoading(true);
    try {
      // TODO: query Vara Registry via sails-js
      // For now, allow manual meta-address input
      alert.info("Vara Registry lookup is not yet connected. Enter the meta-address manually.");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }, [recipientAddress, alert]);

  const handleComputeStealth = useCallback(() => {
    if (!metaAddress) {
      alert.warning("Enter or lookup the recipient's stealth meta-address.");
      return;
    }
    try {
      const result = generateStealthAddress(metaAddress);
      setStealthResult(result);
      alert.success("Stealth address computed!");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Failed to compute stealth address");
    }
  }, [metaAddress, alert]);

  const handleSend = useCallback(async () => {
    if (!stealthResult) return;
    if (!isEthereumConnected) {
      alert.warning("Connect your Ethereum wallet to send.");
      return;
    }
    if (!isVaraConnected) {
      alert.warning("Connect your Vara wallet to announce.");
      return;
    }
    setSendLoading(true);
    try {
      // TODO: 1. Announce on Vara via sails-js
      // TODO: 2. Transfer ETH/tokens to stealthResult.stealthAddress via wagmi
      alert.info("Send flow is not yet connected to contracts.");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendLoading(false);
    }
  }, [stealthResult, isEthereumConnected, isVaraConnected, alert]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Send tokens privately. Look up the recipient's stealth meta-address, compute a one-time stealth address, announce
        on Vara, and transfer on Ethereum.
      </Typography>

      <TextField
        fullWidth
        label="Recipient Ethereum address"
        placeholder="0x..."
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleLookup}
          startIcon={lookupLoading ? <CircularProgress size={16} /> : <SearchIcon />}
          disabled={lookupLoading}
        >
          Lookup
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Stealth meta-address"
        placeholder="st:eth:0x..."
        value={metaAddress}
        onChange={(e) => setMetaAddress(e.target.value)}
        helperText="Paste manually or use Lookup to fetch from Vara Registry"
      />

      <Button variant="outlined" onClick={handleComputeStealth} startIcon={<VisibilityIcon />} disabled={!metaAddress}>
        Compute Stealth Address
      </Button>

      {stealthResult && (
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="subtitle2">Computed Stealth Data</Typography>
            <TextField
              fullWidth
              label="Stealth address"
              value={stealthResult.stealthAddress}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              fullWidth
              label="Ephemeral public key"
              value={stealthResult.ephemeralPublicKey}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              fullWidth
              label="View tag"
              value={stealthResult.viewTag}
              slotProps={{ input: { readOnly: true } }}
            />
            <Button
              variant="outlined"
              onClick={handleSend}
              startIcon={sendLoading ? <CircularProgress size={16} /> : <SendIcon />}
              disabled={sendLoading || !isEthereumConnected || !isVaraConnected}
            >
              Announce & Send
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

type ClaimResult = {
  stealthAddress: string;
  ephemeralPublicKey: string;
  viewTag: string;
  privateKey?: string;
};

function ClaimTab() {
  const alert = useAlert();

  const [spendMnemonic, setSpendMnemonic] = useState("");
  const [viewMnemonic, setViewMnemonic] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ClaimResult[]>([]);

  const validateMnemonic = useCallback((mnemonic: string) => {
    const words = mnemonic.trim().split(/\s+/);
    return words.length === 12;
  }, []);

  const handleScan = useCallback(async () => {
    if (!validateMnemonic(spendMnemonic)) {
      alert.warning("Spend mnemonic must be 12 words.");
      return;
    }
    if (!validateMnemonic(viewMnemonic)) {
      alert.warning("View mnemonic must be 12 words.");
      return;
    }

    setScanning(true);
    setResults([]);
    try {
      // TODO: 1. Derive keys from mnemonics
      // TODO: 2. Query Vara Announcer for all announcements
      // TODO: 3. For each announcement, check view tag + stealth address
      // TODO: 4. For matches, compute stealth private key
      alert.info("Scanning is not yet connected to Vara Announcer.");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [spendMnemonic, viewMnemonic, validateMnemonic, alert]);

  const handleWithdraw = useCallback(
    (_result: ClaimResult) => {
      alert.info("Withdraw is not yet implemented.");
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
      />

      <TextField
        fullWidth
        label="View mnemonic"
        placeholder="12 words separated by spaces"
        value={viewMnemonic}
        onChange={(e) => setViewMnemonic(e.target.value)}
        multiline
        minRows={2}
      />

      <Box>
        <Button
          variant="outlined"
          onClick={handleScan}
          startIcon={scanning ? <CircularProgress size={16} /> : <SearchIcon />}
          disabled={scanning || !spendMnemonic || !viewMnemonic}
        >
          {scanning ? "Scanning..." : "Scan Announcements"}
        </Button>
      </Box>

      {results.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Stealth Address</TableCell>
                <TableCell>View Tag</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.stealthAddress}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                    {`${r.stealthAddress.slice(0, 10)}...${r.stealthAddress.slice(-8)}`}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{r.viewTag}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={() => handleWithdraw(r)}>
                      Withdraw
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

export default function DashboardPage() {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
        <Tab icon={<CallReceivedIcon />} label="Receive" iconPosition="start" />
        <Tab icon={<CallMadeIcon />} label="Send" iconPosition="start" />
        <Tab icon={<SearchIcon />} label="Claim" iconPosition="start" />
      </Tabs>

      <Box sx={{ pt: 1 }}>
        {tab === 0 && <ReceiveTab />}
        {tab === 1 && <SendTab />}
        {tab === 2 && <ClaimTab />}
      </Box>
    </Box>
  );
}
