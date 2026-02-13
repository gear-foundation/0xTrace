import { secp256k1 } from "@noble/curves/secp256k1";
import { type Hex, toHex } from "viem";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";

export function generateMnemonicExtended() {
  const mnemonic = generateMnemonic(english);
  const account = mnemonicToAccount(mnemonic);

  const privateKeyBuf = account.getHdKey().privateKey;
  if (!privateKeyBuf) {
    throw new Error("No private key");
  }

  const privateKey = toHex(privateKeyBuf);
  const publicKey = toHex(secp256k1.getPublicKey(privateKey.slice(2), true));

  return {
    mnemonic,
    privateKey,
    publicKey,
  };
}

export function generateNewStealthAddress(chain: string = "eth") {
  const spend = generateMnemonicExtended();
  const view = generateMnemonicExtended();

  const stealthAddressHex = `0x${spend.publicKey.slice(2)}${view.publicKey.slice(2)}` as Hex;
  const stealthAddress = `st:${chain}:${stealthAddressHex}`;

  return {
    spend,
    view,
    stealthAddressHex,
    stealthAddress,
  };
}
