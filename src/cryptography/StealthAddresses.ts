import { secp256k1 } from "@noble/curves/secp256k1";
import { type Address, bytesToBigInt, checksumAddress, fromHex, type Hex, keccak256, toBytes, toHex } from "viem";
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

export function generateStealthAddress(stealthMetaAddress: string) {
  const regExpMatch = stealthMetaAddress.match(/^st:([^:]+):0x([0-9a-fA-F]+)$/);
  if (!regExpMatch) {
    throw new Error("Invalid stealth address format, expected: st:<chain>:0x<hex>");
  }

  const chain = regExpMatch[1];
  if (chain !== "eth") {
    throw new Error("Unsupported chain");
  }

  const stealthMetaAddressHex = regExpMatch[2];
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

  //const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPrivateKey = fromHex("0x5966e42b1db433cdeca15434ff2fa8b8bea7a4d9aa95a41cffcd0fd54cb020cf", {
    size: 32,
    to: "bytes",
  });
  const ephemeralPublicKey = toHex(secp256k1.Point.fromPrivateKey(ephemeralPrivateKey).toBytes());

  const sharedSecretPoint = viewPublicKey.multiply(bytesToBigInt(ephemeralPrivateKey)).toAffine();
  const sharedSecretX = sharedSecretPoint.x;
  const sharedSecretXHashed = keccak256(toBytes(sharedSecretX), "bytes");

  const viewTag = toHex(sharedSecretXHashed.slice(0, 1));

  const sharedSecretXHashedPublicKey = secp256k1.Point.fromPrivateKey(sharedSecretXHashed);

  const stealthPublicKey = spendPublicKey.add(sharedSecretXHashedPublicKey).toBytes(false).slice(1);
  const stealthPublicKeyHash = keccak256(stealthPublicKey, "bytes").slice(12);
  const stealthAddress = checksumAddress(`0x${toHex(stealthPublicKeyHash).slice(2)}`);

  return {
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
  };
}

export function checkStealthAddress(
  expectedStealthAddress: Address,
  ephemeralPublicKeyHex: Hex,
  expectedViewTagHex: Hex,
  viewingPrivateKey: Hex,
  spendingPublicKeyHex: Hex,
) {
  const ephemeralPublicKey = secp256k1.Point.fromBytes(fromHex(ephemeralPublicKeyHex, { size: 33, to: "bytes" }));
  const spendPublicKey = secp256k1.Point.fromBytes(fromHex(spendingPublicKeyHex, { size: 33, to: "bytes" }));

  const sharedSecretPoint = ephemeralPublicKey.multiply(BigInt(viewingPrivateKey)).toAffine();
  const sharedSecretX = sharedSecretPoint.x;
  const sharedSecretXHashed = keccak256(toBytes(sharedSecretX), "bytes");

  const viewTag = toHex(sharedSecretXHashed.slice(0, 1));

  if (expectedViewTagHex !== viewTag) {
    return false;
  }

  const sharedSecretXHashedPublicKey = secp256k1.Point.fromPrivateKey(sharedSecretXHashed);

  const stealthPublicKey = spendPublicKey.add(sharedSecretXHashedPublicKey).toBytes(false).slice(1);
  const stealthPublicKeyHash = keccak256(stealthPublicKey, "bytes").slice(12);
  const stealthAddress = checksumAddress(`0x${toHex(stealthPublicKeyHash).slice(2)}`);

  return expectedStealthAddress === stealthAddress;
}

export function computeStealthKey(
  expectedStealthAddress: Address,
  ephemeralPublicKeyHex: Hex,
  viewingPrivateKey: Hex,
  spendingPrivateKey: Hex,
) {
  const ephemeralPublicKey = secp256k1.Point.fromBytes(fromHex(ephemeralPublicKeyHex, { size: 33, to: "bytes" }));

  const sharedSecretPoint = ephemeralPublicKey.multiply(BigInt(viewingPrivateKey)).toAffine();
  const sharedSecretX = sharedSecretPoint.x;
  const sharedSecretXHashed = keccak256(toBytes(sharedSecretX), "bytes");

  const stealthPrivateKey =
    BigInt(spendingPrivateKey) + (bytesToBigInt(sharedSecretXHashed) % secp256k1.Point.CURVE().n);
  if (privateKeyToAddress(toHex(stealthPrivateKey)) !== expectedStealthAddress) {
    throw new Error("Computed stealth private key does not match expected stealth address");
  }

  return toHex(stealthPrivateKey);
}
