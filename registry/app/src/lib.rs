#![no_std]

use sails_rs::prelude::*;

struct Registry(());

impl Registry {
    pub fn create() -> Self {
        Self(())
    }
}

#[sails_rs::service]
impl Registry {
    // Service's method (command)
    #[export]
    pub fn do_something(&mut self) -> String {
        "Hello from Registry!".to_string()
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
    pub fn registry(&self) -> Registry {
        Registry::create()
    }
}
