# Security Invariants

## Membership Limits Invariants

### 1. Uniform Member Capacity Cap Enforcement
- **Invariant**: The total number of members in a savings group (`group.member_count`) shall never exceed `group.max_members`.
- **Enforcement**: Checked across all member-adding paths:
  - `join_group`: Returns `Err(StellarSaveError::GroupFull)` if `group.member_count >= group.max_members`.
  - `invite_member`: Returns `Err(StellarSaveError::GroupFull)` if `group.member_count >= group.max_members`.
  - `merge_groups`: Returns `Err(StellarSaveError::GroupFull)` if `group1.member_count + group2.member_count > group1.max_members`.
  - `create_group` & `update_group`: Validates `max_members` against configured contract bounds via `validate_max_members`.
