module creator_platform::profile;

use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

// Error codes
const ENotOwner: u64 = 0;
const EProfileAlreadyExists: u64 = 1;

// ===== Events =====

/// Event emitted when a new creator profile is created
public struct ProfileCreated has copy, drop {
    profile_id: ID,
    creator: address,
}

/// Event emitted when a profile is updated
public struct ProfileUpdated has copy, drop {
    profile_id: ID,
    creator: address,
}

// ===== Structs =====

public struct ProfileRegistry has key {
    id: UID,
    profiles: Table<address, ID>,
}

/// Creator profile NFT - represents a creator's identity on the platform
public struct CreatorProfile has key {
    id: UID,
    creator: address,
    info: vector<u8>,
    created_at: u64,
}

// ===== Public Functions =====

fun init(ctx: &mut TxContext) {
    transfer::share_object(ProfileRegistry {
        id: object::new(ctx),
        profiles: table::new(ctx),
    });
}

/// Create a new creator profile
/// Profile is returned to allow composability in programmable transactions
public fun create_profile(
    registry: &mut ProfileRegistry,
    info: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let creator = ctx.sender();
    assert!(!registry.profiles.contains(creator), EProfileAlreadyExists);

    let profile = CreatorProfile {
        id: object::new(ctx),
        creator,
        info,
        created_at: clock.timestamp_ms(),
    };

    registry.profiles.add(creator, object::id(&profile));
    event::emit(ProfileCreated {
        profile_id: object::id(&profile),
        creator: profile.creator,
    });

    transfer::share_object(profile);
}

/// Update profile information
/// Only the profile owner can update their profile
public fun update_profile(profile: &mut CreatorProfile, info: vector<u8>, ctx: &TxContext) {
    assert!(profile.creator == ctx.sender(), ENotOwner);
    profile.info = info;

    event::emit(ProfileUpdated {
        profile_id: object::id(profile),
        creator: profile.creator,
    });
}
