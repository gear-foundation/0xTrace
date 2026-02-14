#![no_std]

use sails_rs::{cell::RefCell, collections::HashMap, prelude::*, H160};

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
        let Some(stealth_meta_address_stripped) = stealth_meta_address.strip_prefix("0x") else {
            panic!("Stealth meta address must be a 0x-prefixed hex string")
        };

        // Check that `stealth_without_0x` can be correctly encoded to `[u8; 66]`.
        let mut buffer: [u8; 66] = [0; 66];
        if sails_rs::hex::decode_to_slice(stealth_meta_address_stripped, &mut buffer).is_err() {
            panic!("Stealth meta address must be a valid [u8; 66] array encoded as hex string");
        };

        // TODO: recover ethereum address from signature instead of accepting it as an argument
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
