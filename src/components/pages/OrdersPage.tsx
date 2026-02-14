import Typography from "@mui/material/Typography";
import { checkStealthAddress, computeStealthKey, generateStealthAddress } from "@/cryptography/StealthAddresses";

export default function OrdersPage() {
  const { stealthAddress, viewTag, ephemeralPublicKey } = generateStealthAddress(
    "st:eth:0x034f6340cfdd930a6f54e730188e3071d150877fa664945fb6f120c18b56ce1c090201b0906e61ad4fcb2b91129d75723a1c6cd03d56b52a6a78a155292f0cf558e7",
  );
  const ret = checkStealthAddress(
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
    "0xe106b40d369f5c94f5dd2a13d9131585121002ed9e313d2dc9e49ff534c50bd1",
    "0x034f6340cfdd930a6f54e730188e3071d150877fa664945fb6f120c18b56ce1c09",
  );
  console.log(ret);
  const stealthPrivateKey = computeStealthKey(
    stealthAddress,
    ephemeralPublicKey,
    "0xe106b40d369f5c94f5dd2a13d9131585121002ed9e313d2dc9e49ff534c50bd1",
    "0xa4ddf31f7f32ba696f14ce50ecf3f21e3e100e83bdf47966e7b07468e9500b6e",
  );
  console.log(stealthPrivateKey);

  return <Typography>Welcome to the Toolpad orders!</Typography>;
}
