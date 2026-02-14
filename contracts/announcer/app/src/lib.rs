#![no_std]

use sails_rs::{H160, cell::RefCell, prelude::*};

#[derive(Clone, Debug, PartialEq, Encode, Decode, TypeInfo)]
#[codec(crate = scale_codec)]
#[scale_info(crate = scale_info)]
pub struct Announcement {
    stealth_address: H160,
    caller: H160,
    ephemeral_pub_key: Vec<u8>,
    metadata: Vec<u8>,
}

impl Announcement {
    pub fn validate(&self) {
        if self.metadata.is_empty() {
            panic!("metadata cannot be empty");
        }
        if self.ephemeral_pub_key.is_empty() {
            panic!("ephemeral_pub_key cannot be empty");
        }
        if self.ephemeral_pub_key.len() != 33 {
            panic!("ephemeral_pub_key has invalid length");
        }
    }
}

pub struct AnnouncerData {
    announcements: Vec<Announcement>,
}

impl AnnouncerData {
    pub fn new() -> Self {
        Self {
            announcements: Vec::with_capacity(8192),
        }
    }
}

#[event]
#[derive(Clone, Debug, PartialEq, Encode, TypeInfo)]
#[codec(crate = scale_codec)]
#[scale_info(crate = scale_info)]
pub enum AnnouncerEvents {
    Announcement(Announcement),
}

pub struct AnnouncerService<'a> {
    data: &'a RefCell<AnnouncerData>,
}

impl<'a> AnnouncerService<'a> {
    pub fn new(data: &'a RefCell<AnnouncerData>) -> Self {
        Self { data }
    }
}

#[service(events = AnnouncerEvents)]
impl AnnouncerService<'_> {
    #[export]
    pub fn announce(&mut self, announcement: Announcement) {
        announcement.validate();
        self.data
            .borrow_mut()
            .announcements
            .push(announcement.clone());
        self.emit_event(AnnouncerEvents::Announcement(announcement))
            .expect("failed to emit event");
    }

    #[export]
    pub fn announcements(&self, offset: u32, limit: u32) -> Vec<Announcement> {
        let announcements = &self.data.borrow().announcements;

        let offset = offset as usize;
        let limit = limit as usize;

        if limit == 0 {
            return vec![];
        }

        announcements
            .iter()
            .skip(offset)
            .take(limit)
            .cloned()
            .collect()
    }
}

pub struct AnnouncerProgram {
    announcer_data: RefCell<AnnouncerData>,
}

#[program]
impl AnnouncerProgram {
    pub fn new() -> Self {
        Self {
            announcer_data: RefCell::new(AnnouncerData::new()),
        }
    }

    pub fn announcer(&self) -> AnnouncerService<'_> {
        AnnouncerService::new(&self.announcer_data)
    }
}
