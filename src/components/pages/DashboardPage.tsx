import AutorenewIcon from "@mui/icons-material/Autorenew";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { Signer } from "@polkadot/api/types";
import { useAppKitAccount } from "@reown/appkit/react";
import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import {
  type Chain,
  checkStealthAddress,
  computeStealthKey,
  deriveKeysFromMnemonic,
  generateNewStealthAddress,
  generateStealthAddress,
  validateMnemonic,
} from "@/cryptography/StealthAddresses";
import { useAlert } from "@/hooks/useAlert";
import { useAnnouncerService } from "@/hooks/useAnnouncerService";
import { useRegistryService } from "@/hooks/useRegistryService";
import { useVaraAccount } from "@/hooks/useVaraAccount";

// Shared accent button style — adapts to light/dark via opacity
const accentBtnSx = {
  borderColor: "#9cef3b",
  color: "#9cef3b",
  "&:hover": { borderColor: "#9cef3b", bgcolor: "rgba(156,239,59,0.08)" },
} as const;

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

const VARA_DECIMALS = 12;
const ETH_EXPLORER = "https://hoodi.etherscan.io/tx/";
const VARA_EXPLORER = "https://vara.subscan.io/extrinsic/";

function isValidEthAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isValidAmount(val: string) {
  if (!val) return false;
  const n = Number(val);
  return !Number.isNaN(n) && n > 0;
}

function SendTab() {
  const { address: senderEthAddress, isConnected: isEthereumConnected } = useAppKitAccount();
  const { account: varaAccount, api: varaApi, isConnected: isVaraConnected } = useVaraAccount();
  const { ready: registryReady, stealthMetaAddressOf } = useRegistryService();
  const { ready: announcerReady, announce } = useAnnouncerService();
  const alert = useAlert();

  // --- wagmi ETH send ---
  const { sendTransactionAsync, data: ethTxHash } = useSendTransaction();
  const { isSuccess: ethTxConfirmed } = useWaitForTransactionReceipt({ hash: ethTxHash });

  // --- form state ---
  const [recipientAddress, setRecipientAddress] = useState("");
  const [metaAddress, setMetaAddress] = useState("");
  const [chain, setChain] = useState<Chain>("eth");
  const [amount, setAmount] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [stealthResult, setStealthResult] = useState<{
    stealthAddress: string;
    ephemeralPublicKey: string;
    viewTag: string;
    chain: Chain;
  } | null>(null);

  // --- transfer state ---
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferTxHash, setTransferTxHash] = useState<string | null>(null);
  const [transferDone, setTransferDone] = useState(false);

  // --- announce state ---
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [announceDone, setAnnounceDone] = useState(false);

  // Mark ETH transfer done when confirmed
  useEffect(() => {
    if (ethTxConfirmed && ethTxHash) {
      setTransferDone(true);
    }
  }, [ethTxConfirmed, ethTxHash]);

  // Active step for stepper
  const activeStep = announceDone ? 3 : transferDone ? 2 : stealthResult ? 1 : 0;

  const explorerUrl = transferTxHash
    ? chain === "eth"
      ? `${ETH_EXPLORER}${transferTxHash}`
      : `${VARA_EXPLORER}${transferTxHash}`
    : null;

  // --- handlers ---
  const handleLookup = useCallback(async () => {
    if (!recipientAddress) {
      alert.warning("Enter recipient address.");
      return;
    }
    if (!registryReady) {
      alert.warning("Registry service is not ready yet.");
      return;
    }
    setLookupLoading(true);
    try {
      const result = await stealthMetaAddressOf(recipientAddress);
      if (result) {
        const addr = result.startsWith("0x") ? result : `0x${result}`;
        setMetaAddress(addr);
        alert.success("Stealth meta-address found!");
      } else {
        alert.warning("No stealth meta-address registered for this address.");
      }
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }, [recipientAddress, registryReady, stealthMetaAddressOf, alert]);

  // Reset everything when chain changes
  useEffect(() => {
    setStealthResult(null);
    setTransferTxHash(null);
    setTransferDone(false);
    setAnnounceDone(false);
  }, [chain]);

  const handleComputeStealth = useCallback(() => {
    if (!metaAddress) {
      alert.warning("Enter or lookup the recipient's stealth meta-address.");
      return;
    }
    try {
      const result = generateStealthAddress(metaAddress, chain);
      setStealthResult(result);
      setTransferTxHash(null);
      setTransferDone(false);
      setAnnounceDone(false);
      alert.success("Stealth address computed!");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Failed to compute stealth address");
    }
  }, [metaAddress, chain, alert]);

  const handleTransfer = useCallback(async () => {
    if (!stealthResult || !isValidAmount(amount)) return;

    setTransferLoading(true);
    try {
      if (chain === "eth") {
        // --- Ethereum transfer via wagmi ---
        if (!isEthereumConnected || !senderEthAddress) {
          alert.warning("Connect your Ethereum wallet.");
          return;
        }
        if (!isValidEthAddress(stealthResult.stealthAddress)) {
          alert.error("Invalid stealth address for Ethereum.");
          return;
        }
        const hash = await sendTransactionAsync({
          to: stealthResult.stealthAddress as `0x${string}`,
          value: parseEther(amount),
        });
        setTransferTxHash(hash);
        alert.success("ETH transfer submitted!");
        // transferDone will be set by useEffect watching ethTxConfirmed
      } else {
        // --- Vara transfer via Gear API ---
        if (!isVaraConnected || !varaAccount || !varaApi) {
          alert.warning("Connect your Vara wallet.");
          return;
        }
        const injected = (window as unknown as Record<string, unknown>).injectedWeb3 as Record<
          string,
          { enable: (origin: string) => Promise<{ signer: unknown }> }
        >;
        const provider = injected[varaAccount.source];
        if (!provider) throw new Error("Wallet extension not found");
        const extension = await provider.enable("Stealth Wallet");

        const amountPlanck = BigInt(Math.floor(Number(amount) * 10 ** VARA_DECIMALS));
        const transfer = varaApi.tx.balances.transferKeepAlive(stealthResult.stealthAddress, amountPlanck);

        const txResult = await new Promise<string>((resolve, reject) => {
          transfer
            .signAndSend(
              varaAccount.address,
              { signer: (extension as { signer: Signer }).signer },
              ({ status, txHash }) => {
                if (status.isFinalized || status.isInBlock) {
                  resolve(txHash.toHex());
                }
              },
            )
            .catch(reject);
        });
        setTransferTxHash(txResult);
        setTransferDone(true);
        alert.success("VARA transfer confirmed!");
      }
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  }, [stealthResult, amount, chain, isEthereumConnected, senderEthAddress, sendTransactionAsync, isVaraConnected, varaAccount, varaApi, alert]);

  const handleAnnounce = useCallback(async () => {
    if (!stealthResult || !senderEthAddress) return;
    if (!announcerReady) {
      alert.warning("Announcer service is not ready yet.");
      return;
    }
    setAnnounceLoading(true);
    try {
      const ephemeralBytes = Array.from(
        Buffer.from(stealthResult.ephemeralPublicKey.replace(/^0x/, ""), "hex"),
      );
      const viewTagBytes = Array.from(
        Buffer.from(stealthResult.viewTag.replace(/^0x/, ""), "hex"),
      );

      await announce({
        stealth_address: stealthResult.stealthAddress,
        caller: senderEthAddress,
        ephemeral_pub_key: ephemeralBytes,
        metadata: viewTagBytes,
        chain: stealthResult.chain === "eth" ? "Ethereum" : "Vara",
      });

      setAnnounceDone(true);
      alert.success("Announcement sent on Vara!");
    } catch (e) {
      alert.error(e instanceof Error ? e.message : "Announce failed");
    } finally {
      setAnnounceLoading(false);
    }
  }, [stealthResult, senderEthAddress, announcerReady, announce, alert]);

  const tokenSymbol = chain === "eth" ? "ETH" : "VARA";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Send tokens privately. Look up the recipient's stealth meta-address, compute a one-time stealth address, transfer
        tokens, then announce on Vara.
      </Typography>

      <TextField
        fullWidth
        label="Recipient Ethereum address"
        placeholder="0x..."
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
        error={!!recipientAddress && !isValidEthAddress(recipientAddress)}
        helperText={recipientAddress && !isValidEthAddress(recipientAddress) ? "Invalid Ethereum address" : undefined}
      />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleLookup}
          startIcon={lookupLoading ? <CircularProgress size={16} /> : <SearchIcon />}
          disabled={lookupLoading || !registryReady || !isValidEthAddress(recipientAddress)}
        >
          Lookup
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Stealth meta-address"
        placeholder="0x..."
        value={metaAddress}
        onChange={(e) => setMetaAddress(e.target.value)}
        helperText="Paste manually or use Lookup to fetch from Vara Registry"
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Network:
        </Typography>
        <ToggleButtonGroup
          value={chain}
          exclusive
          onChange={(_, v) => v && setChain(v as Chain)}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              minWidth: 120,
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "action.hover",
              border: "none",
              color: "text.secondary",
              transition: "all 0.25s ease",
            },
            "& .MuiToggleButton-root.Mui-selected[value='eth']": {
              bgcolor: "#627eea !important",
              color: "#fff !important",
              borderColor: "#627eea !important",
              "&:hover": { bgcolor: "#4f6bd6 !important" },
            },
            "& .MuiToggleButton-root.Mui-selected[value='vara']": {
              bgcolor: "#9cef3b !important",
              color: "#000 !important",
              borderColor: "#9cef3b !important",
              "&:hover": { bgcolor: "#8ad635 !important" },
            },
          }}
        >
          <ToggleButton value="eth">Ethereum</ToggleButton>
          <ToggleButton value="vara">Vara</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Button
        variant="outlined"
        onClick={handleComputeStealth}
        startIcon={stealthResult ? <AutorenewIcon /> : <VisibilityIcon />}
        disabled={!metaAddress}
        sx={accentBtnSx}
      >
        {stealthResult ? "Recompute" : "Compute Stealth Address"}
      </Button>

      {stealthResult && (
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              <Step completed={activeStep > 0}>
                <StepLabel>Compute</StepLabel>
              </Step>
              <Step completed={activeStep > 1}>
                <StepLabel>Transfer</StepLabel>
              </Step>
              <Step completed={activeStep > 2}>
                <StepLabel>Announce</StepLabel>
              </Step>
            </Stepper>

            <TextField
              fullWidth
              size="small"
              label="Stealth address"
              value={stealthResult.stealthAddress}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Ephemeral public key"
              value={stealthResult.ephemeralPublicKey}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              fullWidth
              size="small"
              label="View tag"
              value={stealthResult.viewTag}
              slotProps={{ input: { readOnly: true } }}
            />

            {/* --- Step 2: Transfer --- */}
            {!transferDone && (
              <>
                <TextField
                  fullWidth
                  label={`Amount (${tokenSymbol})`}
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  error={!!amount && !isValidAmount(amount)}
                  helperText={amount && !isValidAmount(amount) ? "Enter a valid positive number" : undefined}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Chip label={tokenSymbol} size="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleTransfer}
                  startIcon={transferLoading ? <CircularProgress size={16} /> : <SendIcon />}
                  disabled={
                    transferLoading ||
                    !isValidAmount(amount) ||
                    (chain === "eth" ? !isEthereumConnected : !isVaraConnected)
                  }
                  sx={accentBtnSx}
                >
                  {transferLoading ? "Sending..." : `Transfer ${tokenSymbol}`}
                </Button>
              </>
            )}

            {/* --- Transfer result --- */}
            {transferTxHash && (
              <Alert severity={transferDone ? "success" : "info"} icon={transferDone ? <CheckCircleIcon /> : <CircularProgress size={18} />}>
                <AlertTitle>{transferDone ? "Transfer confirmed" : "Waiting for confirmation..."}</AlertTitle>
                <Link href={explorerUrl!} target="_blank" rel="noopener" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  {`${transferTxHash.slice(0, 10)}...${transferTxHash.slice(-8)}`}
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              </Alert>
            )}

            {/* --- Step 3: Announce --- */}
            {transferDone && !announceDone && (
              <Button
                variant="outlined"
                onClick={handleAnnounce}
                startIcon={announceLoading ? <CircularProgress size={16} /> : <SendIcon />}
                disabled={announceLoading || !announcerReady || !isVaraConnected}
                sx={accentBtnSx}
              >
                {announceLoading ? "Announcing..." : "Announce on Vara"}
              </Button>
            )}

            {announceDone && (
              <Alert severity="success">
                <AlertTitle>Done!</AlertTitle>
                Transfer and announcement completed. The recipient can now scan and claim the funds.
              </Alert>
            )}
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
  chain: Chain;
  privateKey: string;
};

function ClaimTab() {
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

export default function DashboardPage() {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="fullWidth"
        TabIndicatorProps={{ sx: { bgcolor: "#9cef3b" } }}
        sx={{ "& .Mui-selected": { color: "#9cef3b !important" } }}
      >
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
