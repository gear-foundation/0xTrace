import ArticleIcon from "@mui/icons-material/Article";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import GitHubIcon from "@mui/icons-material/GitHub";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function AboutPage() {
  return (
    <Box sx={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" fontWeight={600}>
        What is 0xTrace?
      </Typography>

      <Typography variant="body1" color="text.secondary">
        0xTrace lets you receive crypto without revealing your real address. When someone sends you tokens, they go to a
        brand-new one-time address that only you can unlock. Nobody watching the blockchain can connect that payment to
        your identity. Think of it like giving someone a fresh P.O. Box for every letter — the mail arrives, but no one
        knows it's yours.
      </Typography>

      <Typography variant="body1" color="text.secondary">
        Under the hood, this is based on the{" "}
        <Link href="https://eips.ethereum.org/EIPS/eip-5564" target="_blank" rel="noopener noreferrer">
          ERC-5564
        </Link>{" "}
        standard (Stealth Addresses). Unlike mixers, the source of funds is always visible — so you can prove your money
        is clean — but the recipient stays private. It works on any chain with secp256k1 cryptography: Ethereum, Vara,
        Bitcoin, and more.
      </Typography>

      <Divider />

      <Typography variant="h6" fontWeight={600}>
        How does it work?
      </Typography>

      <Typography variant="body2" color="text.secondary">
        You generate a special key (a stealth meta-address) from two secret phrases (12 words each). One phrase lets you
        detect incoming payments (view key), the other lets you spend them (spend key). You publish the meta-address
        on-chain so anyone can look it up. When someone pays you, their wallet takes your meta-address, mixes it with a
        random one-time key using elliptic curve math, and produces a fresh address that only your keys can open. Every
        payment goes to a different address — unlinkable to each other or to you.
      </Typography>

      <Divider />

      <Typography variant="h6" fontWeight={600}>
        Why is it secure?
      </Typography>

      <Typography variant="body2" color="text.secondary">
        The math behind it (ECDH + key blinding) ensures that even if someone knows your meta-address, they cannot
        figure out which stealth addresses belong to you. Only your private view key can detect your payments, and only
        your private spend key can move the funds. No backend, no middlemen — everything runs through smart contracts
        and your browser.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          borderLeft: 4,
          borderColor: "primary.main",
          bgcolor: "action.hover",
          px: 2.5,
          py: 2,
          display: "flex",
          gap: 1.5,
        }}
      >
        <FormatQuoteIcon sx={{ color: "primary.main", mt: 0.25 }} />
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
            "But why can't the sender just take the money back?" — When Alice sends you tokens, she computes the stealth
            address using a shared secret and your public spend key. The private key is{" "}
            <code>pstealth = pspend + sharedSecret</code>. Alice knows the shared secret, but she doesn't know your
            private spend key. Without it, she can only compute the address — not the key that unlocks it.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", mt: 1 }}>
            Think of it like a mailbox: anyone can drop a letter in, but only you have the key to open it.
          </Typography>
        </Box>
      </Paper>

      <Alert severity="info" icon={<ArticleIcon />}>
        Want to dive deeper into the math?{" "}
        <Link href="/stealth-addresses-article.pdf" target="_blank" rel="noopener noreferrer">
          Read the full article (PDF)
        </Link>
      </Alert>

      <Divider />

      <Typography variant="h6" fontWeight={600}>
        Why Vara?
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Publishing payment announcements on Ethereum is expensive. 0xTrace uses Vara Network as a cheap storage layer —
        the Announcer and Registry contracts live on Vara, while actual transfers happen on Ethereum or any EVM chain.
        You connect two wallets and get the best of both worlds: low fees for data, full EVM compatibility for
        transfers.
      </Typography>

      <Divider />

      <Typography variant="h6" fontWeight={600}>
        Networks
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip label="Ethereum (Hoodi Testnet)" variant="outlined" />
        <Chip label="Vara (Testnet)" variant="outlined" />
      </Box>

      <Divider />

      <Typography variant="h6" fontWeight={600}>
        Contribute
      </Typography>

      <Typography variant="body2" color="text.secondary">
        0xTrace is open source. We welcome contributions, bug reports, and ideas. Check out the repo, open an issue, or
        submit a PR — every bit helps make private transactions accessible to everyone.
      </Typography>

      <Box>
        <Button
          variant="outlined"
          startIcon={<GitHubIcon />}
          href="https://github.com/gear-foundation/stealth-addresses"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            borderColor: "divider",
            color: "inherit",
            "&:hover": { borderColor: "text.primary" },
          }}
        >
          GitHub
        </Button>
      </Box>
    </Box>
  );
}
