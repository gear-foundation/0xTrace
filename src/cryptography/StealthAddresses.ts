import { secp256k1 } from "@noble/curves/secp256k1";
import { blake2AsHex } from "@polkadot/util-crypto";
import { bytesToBigInt, checksumAddress, fromHex, type Hex, keccak256, toBytes, toHex } from "viem";
import { english, generateMnemonic, mnemonicToAccount, privateKeyToAddress } from "viem/accounts";

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

export function validateMnemonic(mnemonic: string): { valid: boolean; error?: string } {
  const words = mnemonic.trim().split(/\s+/);
  if (words.length !== 12) {
    return { valid: false, error: `Expected 12 words, got ${words.length}` };
  }
  const invalidWords = words.filter((w) => !english.includes(w));
  if (invalidWords.length > 0) {
    return { valid: false, error: `Invalid word(s): ${invalidWords.join(", ")}` };
  }
  try {
    mnemonicToAccount(mnemonic.trim());
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid mnemonic checksum" };
  }
}

export function deriveKeysFromMnemonic(mnemonic: string) {
  const account = mnemonicToAccount(mnemonic.trim());
  const privateKeyBuf = account.getHdKey().privateKey;
  if (!privateKeyBuf) {
    throw new Error("No private key derived from mnemonic");
  }
  const privateKey = toHex(privateKeyBuf);
  const publicKey = toHex(secp256k1.getPublicKey(privateKey.slice(2), true));
  return { privateKey, publicKey };
}

export function generateNewStealthAddress() {
  const spend = generateMnemonicExtended();
  const view = generateMnemonicExtended();

  const stealthAddressHex = `0x${spend.publicKey.slice(2)}${view.publicKey.slice(2)}` as Hex;
  const stealthAddress = `${stealthAddressHex}`;

  return {
    spend,
    view,
    stealthAddressHex,
    stealthAddress,
  };
}

export type Chain = "eth" | "vara";

export function generateStealthAddress(stealthMetaAddress: string, chain: Chain) {
  const regExpMatch = stealthMetaAddress.match(/^0x([0-9a-fA-F]+)$/);
  if (!regExpMatch) {
    throw new Error("Invalid stealth address format, expected: st:<chain>:0x<hex>");
  }

  const stealthMetaAddressHex = regExpMatch[1];
  const EXPECTED_HEX_LEN = 66 * 2;
  if (stealthMetaAddressHex.length !== EXPECTED_HEX_LEN) {
    throw new Error("Invalid stealth hex length");
  }

  const spendPublicKeyHex = `0x${stealthMetaAddressHex.slice(0, 66)}`;
  const viewPublicKeyHex = `0x${stealthMetaAddressHex.slice(66)}`;

  const spendPublicKeyBuffer = Buffer.from(spendPublicKeyHex.slice(2), "hex");
  const viewPublicKeyBuffer = Buffer.from(viewPublicKeyHex.slice(2), "hex");

  const spendPublicKey = secp256k1.Point.fromBytes(new Uint8Array(spendPublicKeyBuffer));
  const viewPublicKey = secp256k1.Point.fromBytes(new Uint8Array(viewPublicKeyBuffer));

  const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPublicKey = toHex(secp256k1.Point.fromPrivateKey(ephemeralPrivateKey).toBytes());

  const sharedSecretPoint = viewPublicKey.multiply(bytesToBigInt(ephemeralPrivateKey)).toAffine();
  const sharedSecretX = sharedSecretPoint.x;
  const sharedSecretXHashed = keccak256(toBytes(sharedSecretX), "bytes");

  const viewTag = toHex(sharedSecretXHashed.slice(0, 1));

  const sharedSecretXHashedPublicKey = secp256k1.Point.fromPrivateKey(sharedSecretXHashed);

  const stealthPublicKey = spendPublicKey.add(sharedSecretXHashedPublicKey).toBytes(false).slice(1);
  const stealthPublicKeyHash = keccak256(stealthPublicKey, "bytes").slice(12);

  let stealthAddress = "0x" as Hex;

  if (chain === "eth") {
    stealthAddress = checksumAddress(`0x${toHex(stealthPublicKeyHash).slice(2)}`);
  } else if (chain === "vara") {
    const stealthPublicKeyCompressed = spendPublicKey.add(sharedSecretXHashedPublicKey).toBytes(true);
    stealthAddress = blake2AsHex(stealthPublicKeyCompressed) as Hex;
  }

  return {
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
    chain,
  };
}

export function checkStealthAddress(
  expectedStealthAddress: Hex,
  ephemeralPublicKeyHex: Hex,
  expectedViewTagHex: Hex,
  chain: Chain,
  viewingPrivateKey: Hex,
  spendingPublicKeyHex: Hex,
) {
  const ephemeralPublicKey = secp256k1.Point.fromBytes(fromHex(ephemeralPublicKeyHex, { size: 33, to: "bytes" }));
  const spendPublicKey = secp256k1.Point.fromBytes(fromHex(spendingPublicKeyHex, { size: 33, to: "bytes" }));

  const sharedSecretPoint = ephemeralPublicKey.multiply(BigInt(viewingPrivateKey)).toAffine();
  const sharedSecretX = sharedSecretPoint.x;
  const sharedSecretXHashed = keccak256(toBytes(sharedSecretX), "bytes");

  const viewTag = toHex(sharedSecretXHashed.slice(0, 1));

  console.log("[checkStealthAddress] View tag check:", {
    computed: viewTag,
    expected: expectedViewTagHex,
    match: expectedViewTagHex === viewTag,
  });

  if (expectedViewTagHex !== viewTag) {
    return false;
  }

  const sharedSecretXHashedPublicKey = secp256k1.Point.fromPrivateKey(sharedSecretXHashed);

  const stealthPublicKey = spendPublicKey.add(sharedSecretXHashedPublicKey).toBytes(false).slice(1);
  const stealthPublicKeyHash = keccak256(stealthPublicKey, "bytes").slice(12);

  let stealthAddress = "0x" as Hex;

  if (chain === "eth") {
    stealthAddress = checksumAddress(`0x${toHex(stealthPublicKeyHash).slice(2)}`);
  } else if (chain === "vara") {
    const stealthPublicKeyCompressed = spendPublicKey.add(sharedSecretXHashedPublicKey).toBytes(true);
    stealthAddress = blake2AsHex(stealthPublicKeyCompressed) as Hex;
  }

  const match = expectedStealthAddress.toLowerCase() === stealthAddress.toLowerCase();

  console.log("[checkStealthAddress] Address check:", {
    computed: stealthAddress,
    expected: expectedStealthAddress,
    match,
  });

  return match;
}

export function computeStealthKey(
  expectedStealthAddress: Hex,
  ephemeralPublicKeyHex: Hex,
  chain: Chain,
  viewingPrivateKey: Hex,
  spendingPrivateKey: Hex,
) {
  const ephemeralPublicKey = secp256k1.Point.fromBytes(fromHex(ephemeralPublicKeyHex, { size: 33, to: "bytes" }));

  const sharedSecretPoint = ephemeralPublicKey.multiply(BigInt(viewingPrivateKey)).toAffine();
  const sharedSecretX = sharedSecretPoint.x;
  const sharedSecretXHashed = keccak256(toBytes(sharedSecretX), "bytes");

  const stealthPrivateKey =
    (BigInt(spendingPrivateKey) + bytesToBigInt(sharedSecretXHashed)) % secp256k1.Point.CURVE().n;

  let stealthAddress = "0x" as Hex;

  if (chain === "eth") {
    stealthAddress = privateKeyToAddress(toHex(stealthPrivateKey, { size: 32 }));
  } else if (chain === "vara") {
    const stealthPublicKeyCompressed = secp256k1.Point.fromPrivateKey(stealthPrivateKey).toBytes(true);
    stealthAddress = blake2AsHex(stealthPublicKeyCompressed) as Hex;
  }

  if (stealthAddress.toLowerCase() !== expectedStealthAddress.toLowerCase()) {
    throw new Error("Computed stealth private key does not match expected stealth address");
  }

  return toHex(stealthPrivateKey);
}
