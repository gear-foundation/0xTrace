import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useEffect, useState } from "react";
import { isAddress, parseEther } from "viem";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { ETH_EXPLORER, VARA_DECIMALS, VARA_EXPLORER } from "@/constants";
import { type Chain, generateStealthAddress } from "@/cryptography/StealthAddresses";
import { useAlert } from "@/hooks/useAlert";
import { useAnnouncerService } from "@/hooks/useAnnouncerService";
import { useRegistryService } from "@/hooks/useRegistryService";
import { useVaraAccount } from "@/hooks/useVaraAccount";
import { useVaraSigner } from "@/hooks/useVaraSigner";
import { accentBtnSx, chainToggleSx } from "@/theme/styles";

function isValidEthAddress(addr: string) {
  return isAddress(addr, { strict: true });
}

function isValidAmount(val: string) {
  if (!val) return false;
  const n = Number(val);
  return !Number.isNaN(n) && n > 0;
}

export function SendTab() {
  const { address: senderEthAddress, isConnected: isEthereumConnected } = useAppKitAccount();
  const { api: varaApi, isConnected: isVaraConnected } = useVaraAccount();
  const { getSigner, account: varaAccount } = useVaraSigner();
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

  const activeStep = announceDone ? 3 : transferDone ? 2 : stealthResult ? 1 : 0;

  const explorerUrl = transferTxHash
    ? chain === "eth"
      ? `${ETH_EXPLORER}${transferTxHash}`
      : `${VARA_EXPLORER}${transferTxHash}`
    : null;

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
  }, []);

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
      } else {
        if (!isVaraConnected || !varaAccount || !varaApi) {
          alert.warning("Connect your Vara wallet.");
          return;
        }
        const signer = await getSigner();
        const amountPlanck = BigInt(Math.floor(Number(amount) * 10 ** VARA_DECIMALS));
        const transfer = varaApi.tx.balances.transferKeepAlive(stealthResult.stealthAddress, amountPlanck);

        const txResult = await new Promise<string>((resolve, reject) => {
          transfer
            .signAndSend(varaAccount.address, { signer }, ({ status, txHash }) => {
              if (status.isFinalized || status.isInBlock) {
                resolve(txHash.toHex());
              }
            })
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
  }, [
    stealthResult,
    amount,
    chain,
    isEthereumConnected,
    senderEthAddress,
    sendTransactionAsync,
    isVaraConnected,
    varaAccount,
    varaApi,
    getSigner,
    alert,
  ]);

  const handleAnnounce = useCallback(async () => {
    if (!stealthResult || !senderEthAddress) return;
    if (!announcerReady) {
      alert.warning("Announcer service is not ready yet.");
      return;
    }
    setAnnounceLoading(true);
    try {
      await announce({
        stealth_address: stealthResult.stealthAddress,
        caller: senderEthAddress,
        ephemeral_pub_key: stealthResult.ephemeralPublicKey,
        metadata: stealthResult.viewTag,
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
        Send tokens privately. Look up the recipient's stealth meta-address, compute a one-time stealth address,
        transfer tokens, then announce on Vara.
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
          onChange={(_, v) => {
            if (v) {
              setChain(v as Chain);
              if (metaAddress) {
                try {
                  const result = generateStealthAddress(metaAddress, v as Chain);
                  setStealthResult(result);
                  setTransferTxHash(null);
                  setTransferDone(false);
                  setAnnounceDone(false);
                } catch (e) {
                  alert.error(e instanceof Error ? e.message : "Failed to recompute stealth address");
                }
              }
            }
          }}
          size="small"
          sx={chainToggleSx}
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

            {transferTxHash && (
              <Alert
                severity={transferDone ? "success" : "info"}
                icon={transferDone ? <CheckCircleIcon /> : <CircularProgress size={18} />}
              >
                <AlertTitle>{transferDone ? "Transfer confirmed" : "Waiting for confirmation..."}</AlertTitle>
                <Link
                  href={explorerUrl!}
                  target="_blank"
                  rel="noopener"
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
                >
                  {`${transferTxHash.slice(0, 10)}...${transferTxHash.slice(-8)}`}
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              </Alert>
            )}

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
