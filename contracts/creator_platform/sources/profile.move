module creator_platform::profile;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

// Error codes
const EProfileAlreadyExists: u64 = 0;
const EProfileNotFound: u64 = 1;
const EInvalidName: u64 = 2;

// ===== Events =====

/// Event emitted when a new creator profile is created
public struct ProfileCreated has copy, drop {
    profile_id: ID,
    creator: address,
    name: String,
    bio: String,
    avatar_url: String,
    background_url: String,
    timestamp: u64,
}

/// Event emitted when a profile is updated
public struct ProfileUpdated has copy, drop {
    profile_id: ID,
    creator: address,
    name: String,
    bio: String,
    avatar_url: String,
    background_url: String,
    timestamp: u64,
}

// ===== Structs =====

public struct ProfileRegistry has key {
    id: UID,
    profiles: Table<address, CreatorProfile>,
}

/// Creator profile - represents a creator's identity on the platform
public struct CreatorProfile has store {
    name: String,
    bio: String,
    avatar_url: String,
    background_url: String,
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
public fun create_profile(
    registry: &mut ProfileRegistry,
    name: String,
    bio: String,
    avatar_url: String,
    background_url: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let creator = ctx.sender();
    assert!(!registry.profiles.contains(creator), EProfileAlreadyExists);
    assert!(name.length() > 0, EInvalidName);

    let created_at = clock.timestamp_ms();
    let profile = CreatorProfile {
        name,
        bio,
        avatar_url,
        background_url,
        created_at,
    };

    // Emit event for indexing before moving profile
    event::emit(ProfileCreated {
        profile_id: object::id_from_address(creator),
        creator,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        background_url: profile.background_url,
        timestamp: created_at,
    });

    registry.profiles.add(creator, profile);
}

/// Update profile information
/// Only the profile owner can update their profile
public fun update_profile(
    registry: &mut ProfileRegistry,
    name: String,
    bio: String,
    avatar_url: String,
    background_url: String,
    clock: &Clock,
    ctx: &TxContext,
) {
    let creator = ctx.sender();
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    assert!(name.length() > 0, EInvalidName);

    let profile = registry.profiles.borrow_mut(creator);
    profile.name = name;
    profile.bio = bio;
    profile.avatar_url = avatar_url;
    profile.background_url = background_url;

    // Emit update event
    event::emit(ProfileUpdated {
        profile_id: object::id_from_address(creator),
        creator,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        background_url: profile.background_url,
        timestamp: clock.timestamp_ms(),
    });
}

// ===== View Functions =====

/// Get profile name
public fun name(registry: &ProfileRegistry, creator: address): String {
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    registry.profiles.borrow(creator).name
}

/// Get profile bio
public fun bio(registry: &ProfileRegistry, creator: address): String {
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    registry.profiles.borrow(creator).bio
}

/// Get profile avatar URL
public fun avatar_url(registry: &ProfileRegistry, creator: address): String {
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    registry.profiles.borrow(creator).avatar_url
}

/// Get profile creation timestamp
public fun created_at(registry: &ProfileRegistry, creator: address): u64 {
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    registry.profiles.borrow(creator).created_at
}

/// Get profile background URL
public fun background_url(registry: &ProfileRegistry, creator: address): String {
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    registry.profiles.borrow(creator).background_url
}
