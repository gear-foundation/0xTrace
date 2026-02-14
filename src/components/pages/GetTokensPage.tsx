import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useAlert } from "@/hooks/useAlert";
import { useVaraAccount } from "@/hooks/useVaraAccount";

const FAUCET_URL = import.meta.env.VITE_VARA_FAUCET_URL as string;
const VARA_GENESIS = import.meta.env.VITE_VARA_GENESIS as string;
const HCAPTCHA_SITEKEY = import.meta.env.VITE_HCAPTCHA_SITEKEY as string;

function EthIcon() {
  return (
    <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 28 }}>
      <circle cx="12" cy="12" r="12" fill="#627EEA" />
      <path d="M12 3.5L7 12.2L12 14.7L17 12.2L12 3.5Z" fill="#fff" fillOpacity="0.9" />
      <path d="M7 12.2L12 14.7V3.5L7 12.2Z" fill="#fff" fillOpacity="0.6" />
      <path d="M12 15.9L7 13.4L12 20.5L17 13.4L12 15.9Z" fill="#fff" fillOpacity="0.9" />
      <path d="M7 13.4L12 15.9V20.5L7 13.4Z" fill="#fff" fillOpacity="0.6" />
    </SvgIcon>
  );
}

function VaraIcon() {
  return (
    <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 28 }}>
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

export default function GetTokensPage() {
  const alert = useAlert();
  const { account } = useVaraAccount();
  const hCaptchaRef = useRef<HCaptcha>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("Connect your Vara wallet first");
      if (!hCaptchaRef.current) throw new Error("Captcha not ready");

      const { response: token } = await hCaptchaRef.current.execute({ async: true });

      const res = await fetch(`${FAUCET_URL}/bridge/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify({
          address: account.address,
          genesis: VARA_GENESIS,
          token,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || res.statusText || "Faucet request failed");
      }

      return res;
    },
  });

  const handleGetVara = useCallback(() => {
    mutateAsync()
      .then(() => {
        alert.success("Test TVARA tokens requested! They will appear in your balance shortly.");
      })
      .catch((error: unknown) => {
        if (error === "challenge-closed") return;
        const message = error instanceof Error ? error.message : String(error);
        alert.error(message);
      });
  }, [mutateAsync, alert]);

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" fontWeight={600}>
        Get Test Tokens
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Get free test tokens to try transfers on testnets. These tokens have no real value.
      </Typography>

      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <EthIcon />
            <Typography variant="h6" fontWeight={600}>
              Get Test ETH
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Get some test ETH on Hoodi testnet to try stealth transfers.
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              href="https://hoodifaucet.io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                borderColor: "divider",
                color: "inherit",
                "&:hover": { borderColor: "#627EEA", bgcolor: "rgba(98,126,234,0.08)" },
              }}
            >
              hoodifaucet.io
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <VaraIcon />
            <Typography variant="h6" fontWeight={600}>
              Get Test TVARA
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Get free TVARA tokens on Vara testnet for transfer tests.
            {!account && " Connect your Vara wallet first."}
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={isPending ? <CircularProgress size={16} /> : <CardGiftcardIcon />}
              disabled={!account || isPending}
              onClick={handleGetVara}
              sx={{
                borderColor: "divider",
                color: "inherit",
                "&:hover": { borderColor: "#00FFC4", bgcolor: "rgba(0,255,196,0.08)" },
              }}
            >
              {isPending ? "Requesting..." : "Get TVARA"}
            </Button>
          </Box>
          <HCaptcha ref={hCaptchaRef} sitekey={HCAPTCHA_SITEKEY} size="invisible" />
        </CardContent>
      </Card>
    </Box>
  );
}
