//! Shared Access-Control (Auth) Module for StellarSave.
//!
//! Provides centralized authorization guard functions for:
//! - `require_admin`: Validates caller authority against global admin config
//! - `require_creator`: Validates caller is the group creator
//! - `require_member`: Validates caller is an active group member

use soroban_sdk::{Address, Env};
use crate::error::StellarSaveError;
use crate::group::Group;
use crate::storage::StorageKeyBuilder;
use crate::types::ContractConfig;

/// Require caller authentication and verify caller is a registered admin.
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), StellarSaveError> {
    caller.require_auth();
    let config: ContractConfig = env
        .storage()
        .persistent()
        .get(&StorageKeyBuilder::contract_config())
        .ok_or(StellarSaveError::Unauthorized)?;
    if &config.admin != caller {
        return Err(StellarSaveError::Unauthorized);
    }
    Ok(())
}

/// Require caller authentication and verify caller is the group creator.
pub fn require_creator(caller: &Address, group: &Group) -> Result<(), StellarSaveError> {
    caller.require_auth();
    if caller != &group.creator {
        return Err(StellarSaveError::Unauthorized);
    }
    Ok(())
}

/// Require caller authentication and verify caller is a member of the group.
pub fn require_member(env: &Env, group_id: u64, caller: &Address) -> Result<(), StellarSaveError> {
    caller.require_auth();
    let member_key = StorageKeyBuilder::member_profile(group_id, caller.clone());
    let is_member = env.storage().persistent().has(&member_key);
    if !is_member {
        return Err(StellarSaveError::NotMember);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn test_auth_creator_guard() {
        let env = Env::default();
        let creator = Address::generate(&env);
        let non_creator = Address::generate(&env);

        let group = Group::new(
            &env,
            1,
            creator.clone(),
            100,
            3600,
            5,
            2,
            1000,
            0,
        );

        env.mock_all_auths();

        // Positive case
        assert!(require_creator(&creator, &group).is_ok());

        // Negative case
        assert_eq!(
            require_creator(&non_creator, &group),
            Err(StellarSaveError::Unauthorized)
        );
    }

    #[test]
    fn test_auth_member_guard() {
        let env = Env::default();
        let member = Address::generate(&env);
        let non_member = Address::generate(&env);
        let group_id = 1u64;

        env.mock_all_auths();

        let member_key = StorageKeyBuilder::member_profile(group_id, member.clone());
        let profile = crate::types::MemberProfile {
            address: member.clone(),
            joined_at: 1000,
            status: crate::types::MemberStatus::Active,
        };
        env.storage().persistent().set(&member_key, &profile);

        // Positive case
        assert!(require_member(&env, group_id, &member).is_ok());

        // Negative case
        assert_eq!(
            require_member(&env, group_id, &non_member),
            Err(StellarSaveError::NotMember)
        );
    }

    #[test]
    fn test_auth_admin_guard() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let non_admin = Address::generate(&env);

        env.mock_all_auths();

        let config = ContractConfig {
            admin: admin.clone(),
            treasury: admin.clone(),
            creation_fee: 0,
        };
        env.storage()
            .persistent()
            .set(&StorageKeyBuilder::contract_config(), &config);

        // Positive case
        assert!(require_admin(&env, &admin).is_ok());

        // Negative case
        assert_eq!(
            require_admin(&env, &non_admin),
            Err(StellarSaveError::Unauthorized)
        );
    }
}
