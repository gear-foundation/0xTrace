#![no_std]

use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
use sails_rs::{H160, cell::RefCell, collections::HashMap, prelude::*};
use sha3::{Digest, Keccak256};

type StealthMetaAddress = String;
type EthSignatureHex = String;

const SIGNING_PREFIX: &[u8] = b"Vara/stealth-meta-registry/v1:";

#[derive(Default)]
pub struct RegistryData {
    stealth_meta_addresses_map: HashMap<H160, StealthMetaAddress>,
    nonce: u128,
}

impl RegistryData {
    pub fn new() -> Self {
        Self {
            stealth_meta_addresses_map: HashMap::with_capacity(8192),
            nonce: 0,
        }
    }
}

#[event]
#[derive(Clone, Debug, PartialEq, Encode, TypeInfo)]
#[codec(crate = scale_codec)]
#[scale_info(crate = scale_info)]
pub enum RegistryEvents {
    StealthMetaAddressSet {
        registrant: H160,
        stealth_meta_address: StealthMetaAddress,
    },
}

pub struct RegistryService<'a> {
    data: &'a RefCell<RegistryData>,
}

impl<'a> RegistryService<'a> {
    pub fn new(data: &'a RefCell<RegistryData>) -> Self {
        Self { data }
    }
}

#[service(events = RegistryEvents)]
impl RegistryService<'_> {
    #[export]
    pub fn register_keys(
        &mut self,
        signature: EthSignatureHex,
        stealth_meta_address: StealthMetaAddress,
    ) {
        let Some(stealth_meta_address_stripped) = stealth_meta_address.strip_prefix("0x") else {
            panic!("Stealth meta address must be a 0x-prefixed hex string")
        };

        // Check that `stealth_without_0x` can be correctly encoded to `[u8; 66]`.
        let mut buffer: [u8; 66] = [0; 66];
        if sails_rs::hex::decode_to_slice(stealth_meta_address_stripped, &mut buffer).is_err() {
            panic!("Stealth meta address must be a valid [u8; 66] array encoded as hex string");
        };

        let sig = parse_sig_65(&signature);
        let nonce = self.data.borrow().nonce;
        let ethereum_address = recover_registrant(buffer, sig, nonce);

        self.data
            .borrow_mut()
            .stealth_meta_addresses_map
            .insert(ethereum_address, stealth_meta_address.clone());

        self.emit_event(RegistryEvents::StealthMetaAddressSet {
            registrant: ethereum_address,
            stealth_meta_address,
        })
        .expect("failed to emit event");
    }

    #[export]
    pub fn stealth_meta_address_of(&self, ethereum_address: H160) -> Option<StealthMetaAddress> {
        self.data
            .borrow()
            .stealth_meta_addresses_map
            .get(&ethereum_address)
            .cloned()
    }
}

#[derive(Default)]
pub struct RegistryProgram {
    registry_data: RefCell<RegistryData>,
}

#[program]
impl RegistryProgram {
    pub fn new() -> Self {
        Self {
            registry_data: RefCell::new(RegistryData::new()),
        }
    }

    pub fn registry(&self) -> RegistryService<'_> {
        RegistryService::new(&self.registry_data)
    }
}

fn parse_sig_65(sig: &str) -> [u8; 65] {
    let Some(hex_str) = sig.strip_prefix("0x") else {
        panic!("Signature must be a 0x-prefixed hex string");
    };

    if hex_str.len() != 130 {
        panic!("Signature must be 65 bytes (130 hex chars) after 0x");
    }

    let mut buf = [0u8; 65];
    if sails_rs::hex::decode_to_slice(hex_str, &mut buf).is_err() {
        panic!("Signature must be valid hex");
    }

    buf
}

fn signing_payload(meta: &[u8; 66], nonce: u128) -> Vec<u8> {
    let mut out = Vec::with_capacity(SIGNING_PREFIX.len() + 16 + 66);
    out.extend_from_slice(SIGNING_PREFIX);
    out.extend_from_slice(&nonce.to_be_bytes());
    out.extend_from_slice(meta);
    out
}

// EIP-191 personal_sign:
// keccak256("\x19Ethereum Signed Message:\n" + decimal(len(payload)) + payload)
fn eth_personal_sign_hash(payload: &[u8]) -> [u8; 32] {
    let mut len_buf = [0u8; 20];
    let len_ascii = usize_to_dec_ascii(payload.len(), &mut len_buf);

    let mut h = Keccak256::new();
    h.update(b"\x19Ethereum Signed Message:\n");
    h.update(len_ascii);
    h.update(payload);

    h.finalize().into()
}

fn usize_to_dec_ascii(mut n: usize, out: &mut [u8; 20]) -> &[u8] {
    if n == 0 {
        out[19] = b'0';
        return &out[19..20];
    }

    let mut i = out.len();
    while n > 0 {
        i -= 1;
        out[i] = b'0' + (n % 10) as u8;
        n /= 10;
    }
    &out[i..]
}
fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut h = Keccak256::new();
    h.update(data);
    h.finalize().into()
}

fn recover_registrant(meta: [u8; 66], sig65: [u8; 65], nonce: u128) -> H160 {
    let payload = signing_payload(&meta, nonce);
    let prehash = eth_personal_sign_hash(&payload);

    // r||s (64 bytes) + v (1 byte)
    let sig = Signature::from_slice(&sig65[..64]).unwrap_or_else(|_| panic!("BadSignatureRS"));
    let v = sig65[64];

    // v can be 27/28 (ethers/metamask often) or 0/1 (some libs)
    let recid_u8 = match v {
        27 | 28 => v - 27,
        0 | 1 => v,
        _ => panic!("BadSignatureV"),
    };

    let recid = RecoveryId::try_from(recid_u8).unwrap_or_else(|_| panic!("BadRecoveryId"));

    let vk = VerifyingKey::recover_from_prehash(&prehash, &sig, recid)
        .unwrap_or_else(|_| panic!("InvalidSignature"));

    // Ethereum address = last 20 bytes of keccak256(uncompressed_pubkey[1..])
    let uncompressed = vk.to_encoded_point(false);
    let pk = uncompressed.as_bytes();
    if pk.len() != 65 || pk[0] != 0x04 {
        panic!("UnexpectedPubkeyEncoding");
    }

    let hash = keccak256(&pk[1..]);
    H160::from_slice(&hash[12..])
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use k256::ecdsa::signature::hazmat::PrehashSigner;
    use k256::{FieldBytes, ecdsa::SigningKey};
    use sha3::Digest;

    fn eip191_hash_reference(payload: &[u8]) -> [u8; 32] {
        let mut preimage = std::vec::Vec::new();
        preimage.extend_from_slice(b"\x19Ethereum Signed Message:\n");
        preimage.extend_from_slice(payload.len().to_string().as_bytes());
        preimage.extend_from_slice(payload);

        let digest: [u8; 32] = Keccak256::digest(&preimage).into();
        digest
    }

    fn expected_eth_address_from_vk(vk: &VerifyingKey) -> H160 {
        let uncompressed = vk.to_encoded_point(false);
        let pk = uncompressed.as_bytes();
        assert_eq!(pk.len(), 65);
        assert_eq!(pk[0], 0x04);

        let hash = keccak256(&pk[1..]);
        H160::from_slice(&hash[12..])
    }

    #[test]
    fn parse_sig_65_ok() {
        let mut sig = [0u8; 65];
        for i in 0..65 {
            sig[i] = i as u8;
        }
        let s = format!("0x{}", hex::encode(&sig));
        let got = parse_sig_65(&s);
        assert_eq!(got, sig);
    }

    #[test]
    #[should_panic(expected = "0x-prefixed")]
    fn parse_sig_65_rejects_missing_0x() {
        let sig = [0u8; 65];
        let s = hex::encode(&sig);
        let _ = parse_sig_65(&s);
    }

    #[test]
    #[should_panic(expected = "130 hex chars")]
    fn parse_sig_65_rejects_wrong_len() {
        let s = "0x00";
        let _ = parse_sig_65(s);
    }

    #[test]
    #[should_panic(expected = "valid hex")]
    fn parse_sig_65_rejects_bad_hex() {
        // 130 chars after 0x, but contains 'zz'
        let mut s = std::string::String::from("0x");
        s.push_str(&"00".repeat(64));
        s.push_str("zz");
        let _ = parse_sig_65(&s);
    }

    #[test]
    fn signing_payload_layout_and_nonce_be() {
        let meta = [0xAAu8; 66];
        let nonce_bytes: [u8; 16] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        let nonce = u128::from_be_bytes(nonce_bytes);

        let payload = signing_payload(&meta, nonce);

        assert_eq!(payload.len(), SIGNING_PREFIX.len() + 16 + 66);

        let (pfx, rest) = payload.split_at(SIGNING_PREFIX.len());
        assert_eq!(pfx, SIGNING_PREFIX);

        let (nonce_got, meta_got) = rest.split_at(16);
        assert_eq!(nonce_got, &nonce_bytes);
        assert_eq!(meta_got, &meta);
    }

    #[test]
    fn usize_to_dec_ascii_matches_std() {
        for &n in &[0usize, 1, 9, 10, 11, 99, 100, 101, 999, 1000, 123456] {
            let mut out = [0u8; 20];
            let got = usize_to_dec_ascii(n, &mut out);
            let exp = n.to_string();
            assert_eq!(got, exp.as_bytes(), "n={n}");
        }
    }

    #[test]
    fn eth_personal_sign_hash_matches_reference_small() {
        let payload = b"hello";
        assert_eq!(
            eth_personal_sign_hash(payload),
            eip191_hash_reference(payload)
        );
    }

    #[test]
    fn eth_personal_sign_hash_matches_reference_len_boundaries() {
        let payload9 = [0x11u8; 9];
        let payload10 = [0x22u8; 10];
        let payload99 = [0x33u8; 99];
        let payload100 = [0x44u8; 100];

        assert_eq!(
            eth_personal_sign_hash(&payload9),
            eip191_hash_reference(&payload9)
        );
        assert_eq!(
            eth_personal_sign_hash(&payload10),
            eip191_hash_reference(&payload10)
        );
        assert_eq!(
            eth_personal_sign_hash(&payload99),
            eip191_hash_reference(&payload99)
        );
        assert_eq!(
            eth_personal_sign_hash(&payload100),
            eip191_hash_reference(&payload100)
        );
    }

    #[test]
    fn sign_and_recover_keypair_v_is_0_or_1() {
        let sk_bytes = [7u8; 32];
        let sk = SigningKey::from_bytes(FieldBytes::from_slice(&sk_bytes)).unwrap();
        let vk = VerifyingKey::from(&sk);

        let meta = [0xABu8; 66];
        let nonce = 42u128;

        let payload = signing_payload(&meta, nonce);
        let prehash = eth_personal_sign_hash(&payload);

        let (sig, recid) = sk
            .sign_prehash_recoverable(&prehash)
            .expect("sign_prehash_recoverable failed");

        let recid_u8 = recid.to_byte();

        assert!(
            recid_u8 <= 1,
            "Unexpected RecoveryId {} (expected 0/1). Change test vector if this ever happens.",
            recid_u8
        );

        let mut sig65 = [0u8; 65];
        sig65[..64].copy_from_slice(&sig.to_bytes());
        sig65[64] = recid_u8;

        let got_addr = recover_registrant(meta, sig65, nonce);

        let expected_addr = expected_eth_address_from_vk(&vk);

        std::println!("expected_addr {:?}", expected_addr);
        std::println!("got_addr {:?}", got_addr);

        assert_eq!(got_addr, expected_addr);
    }
}
