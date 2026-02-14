#![no_std]

use sails_rs::{cell::RefCell, prelude::*};

pub type EthAddress = [u8; 20];
struct Announcer<'a> {
    state: &'a RefCell<State>,
}
#[derive(Default, Debug)]
pub struct State {
    announcements: Vec<StoredAnnouncement>,
}

#[sails_rs::event]
#[derive(Clone, Debug, PartialEq, Encode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum Events {
    Announcement {
        scheme_id: u32,
        stealth_address: EthAddress,
        caller: ActorId,
        ephemeral_pub_key: Vec<u8>,
        metadata: Vec<u8>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct StoredAnnouncement {
    pub scheme_id: u32,
    pub stealth_address: EthAddress,
    pub caller: ActorId,
    pub ephemeral_pub_key: Vec<u8>,
    // metadata[0] is viewTag
    pub metadata: Vec<u8>,
}

impl<'a> Announcer<'a> {
    pub fn new(state: &'a RefCell<State>) -> Self {
        Self { state }
    }

    pub fn get_mut(&self) -> sails_rs::cell::RefMut<'_, State> {
        self.state.borrow_mut()
    }

    pub fn get(&self) -> sails_rs::cell::Ref<'_, State> {
        self.state.borrow()
    }
}

#[sails_rs::service(events = Events)]
impl<'a> Announcer<'a> {
    #[export]
    pub fn announce(
        &mut self,
        scheme_id: u32,
        stealth_address: EthAddress,
        ephemeral_pub_key: Vec<u8>,
        metadata: Vec<u8>,
    ) {
        if metadata.is_empty() {
            panic!("Wrong metadata");
        }
        let caller = sails_rs::gstd::msg::source();
        let mut st = self.get_mut();
        st.announcements.push(StoredAnnouncement {
            scheme_id,
            stealth_address,
            caller,
            ephemeral_pub_key: ephemeral_pub_key.clone(),
            metadata: metadata.clone(),
        });
        self.emitter()
            .emit_event(Events::Announcement {
                scheme_id,
                stealth_address,
                caller,
                ephemeral_pub_key,
                metadata,
            })
            .expect("Error during event emission");
        }

    #[export]
    pub fn announcements_list(&self, offset: u32, limit: u32) -> Vec<StoredAnnouncement> {
        let st = self.get();
        let off = offset as usize;
        let lim = limit as usize;

        if lim == 0 {
            return Vec::new();
        }

        st.announcements
            .iter()
            .skip(off)
            .take(lim)
            .cloned()
            .collect()
    }
}

#[derive(Default)]
pub struct Program {
    state: RefCell<State>,
}

#[sails_rs::program]
impl Program {
    // Program's constructor
    pub fn create() -> Self {
        Self {
            state: RefCell::new(State::default()),
        }
    }

    // Exposed service
    pub fn announcer(&self) -> Announcer<'_> {
        Announcer::new(&self.state)
    }
}
