#![no_std]

use sails_rs::prelude::*;

struct Announcer(());

impl Announcer {
    pub fn create() -> Self {
        Self(())
    }
}

#[sails_rs::service]
impl Announcer {
    // Service's method (command)
    #[export]
    pub fn do_something(&mut self) -> String {
        "Hello from Announcer!".to_string()
    }
}

#[derive(Default)]
pub struct Program(());

#[sails_rs::program]
impl Program {
    // Program's constructor
    pub fn create() -> Self {
        Self(())
    }

    // Exposed service
    pub fn announcer(&self) -> Announcer {
        Announcer::create()
    }
}
