#![no_std]

use k256::{
    AffinePoint, EncodedPoint,
    elliptic_curve::{group::prime::PrimeCurveAffine, sec1::FromEncodedPoint},
};
use sails_rs::{H160, cell::RefCell, collections::HashMap, hex, prelude::*};

type StealthMetaAddress = String;

#[derive(Default)]
pub struct RegistryData {
    stealth_meta_addresses_map: HashMap<H160, StealthMetaAddress>,
}

impl RegistryData {
    pub fn new() -> Self {
        Self {
            stealth_meta_addresses_map: HashMap::with_capacity(8192),
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
        ethereum_address: H160,
        stealth_meta_address: StealthMetaAddress,
    ) {
        let mut buffer: [u8; 66] = [0; 66];
        if hex::decode_to_slice(&stealth_meta_address, &mut buffer).is_err() {
            panic!("Stealth meta address must be valid [u8; 66] array encoded as hex string");
        };

        let Some((spend_pub_key, view_pub_key)) = buffer.split_at_checked(33) else {
            panic!("Stealth meta address must be exactly 66 bytes when decoded from hex");
        };

        let spend_pub_key_buf_result: Result<[u8; 33], _> = spend_pub_key.try_into();
        let spend_pub_key_buf =
            spend_pub_key_buf_result.expect("spend_pub_key must be 33 bytes long");
        let encoded_point = EncodedPoint::from_bytes(spend_pub_key_buf)
            .expect("spend_pub_key is not valid encoded point");
        match Option::<AffinePoint>::from(AffinePoint::from_encoded_point(&encoded_point)) {
            Some(point) => {
                if point.is_identity().into() {
                    panic!("spend_pub_key cannot be identity point");
                }
            }
            None => panic!("spend_pub_key is not valid point"),
        }

        let view_pub_key_buf_result: Result<[u8; 33], _> = view_pub_key.try_into();
        let view_pub_key_buf = view_pub_key_buf_result.expect("view_pub_key must be 33 bytes long");
        let encoded_point = EncodedPoint::from_bytes(view_pub_key_buf)
            .expect("view_pub_key is not valid encoded point");
        match Option::<AffinePoint>::from(AffinePoint::from_encoded_point(&encoded_point)) {
            Some(point) => {
                if point.is_identity().into() {
                    panic!("view_pub_key cannot be identity point");
                }
            }
            None => panic!("view_pub_key is not valid point"),
        }

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
