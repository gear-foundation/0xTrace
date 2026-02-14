#![no_std]

use k256::{
    AffinePoint, EncodedPoint,
    elliptic_curve::{group::prime::PrimeCurveAffine, sec1::FromEncodedPoint},
};
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
        let ephemeral_pub_key_buf_result: Result<[u8; 33], _> =
            self.ephemeral_pub_key[..33].try_into();
        let ephemeral_pub_key_buf =
            ephemeral_pub_key_buf_result.expect("ephemeral_pub_key must be 33 bytes long");
        let encoded_point = EncodedPoint::from_bytes(ephemeral_pub_key_buf)
            .expect("ephemeral_pub_key is not valid encoded point");
        match Option::<AffinePoint>::from(AffinePoint::from_encoded_point(&encoded_point)) {
            Some(point) => {
                if point.is_identity().into() {
                    panic!("ephemeral_pub_key cannot be identity point");
                }
            }
            None => panic!("ephemeral_pub_key is not valid point"),
        }
        if self.metadata.is_empty() {
            panic!("metadata cannot be empty");
        }
    }
}

pub struct AnnouncerData {
    announcements: Vec<Announcement>,
}

impl Default for AnnouncerData {
    fn default() -> Self {
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

    #[export]
    pub fn announcements_len(&self) -> u32 {
        self.data.borrow().announcements.len() as u32
    }
}

pub struct AnnouncerProgram {
    announcer_data: RefCell<AnnouncerData>,
}

#[program]
impl AnnouncerProgram {
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            announcer_data: RefCell::new(AnnouncerData::default()),
        }
    }

    pub fn announcer(&self) -> AnnouncerService<'_> {
        AnnouncerService::new(&self.announcer_data)
    }
}
