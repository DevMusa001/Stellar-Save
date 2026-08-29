#![no_std]
#![allow(dead_code)]

mod contract;

pub use contract::{require_admin, require_allowlisted, ExampleContract};

#[cfg(test)]
mod test;
#[cfg(test)]
mod test_utils;
