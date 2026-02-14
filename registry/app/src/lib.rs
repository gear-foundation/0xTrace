#![no_std]

use sails_rs::{collections::HashMap, prelude::*};

type StealthMetaAddress = [u8; 66];

#[derive(Default)]
pub struct ProtocolData {
    stealth_meta_of: HashMap<H160, StealthMetaAddress>,
}

// Service event type definition.
#[event]
#[derive(Clone, Debug, PartialEq, Encode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum Events {
    KeyAdded(H160),
}

pub struct ZeroTraceService {
    data: ProtocolData,
}

impl ZeroTraceService {
    // Service constrctor demands a reference to the data to be passed
    // from the outside.
    pub fn new(data: ProtocolData) -> Self {
        Self { data }
    }
}

// Declare the service can emit events of type CounterEvents.
#[service(events = Events)]
impl ZeroTraceService {
    /// TODO: use signature, instead of `eth_address`
    #[export]
    pub fn register_keys(&mut self, eth_address: H160, stealth_meta_address: StealthMetaAddress) {
        self.data
            .stealth_meta_of
            .insert(eth_address, stealth_meta_address);
    }
}

#[derive(Default)]
pub struct ZeroTraceProgram;

#[sails_rs::program]
impl ZeroTraceProgram {
    // Redirect Program's constructor
    pub fn new() -> Self {
        Self
    }

    // Exposed Redirect service
    pub fn redirect(&self) -> ZeroTraceService {
        ZeroTraceService::new(ProtocolData::default())
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub use code::WASM_BINARY_OPT as WASM_BINARY;

#[cfg(not(target_arch = "wasm32"))]
mod code {
    include!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));
}
