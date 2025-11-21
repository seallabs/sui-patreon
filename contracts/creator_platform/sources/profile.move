module creator_platform::profile;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

// Topic constants
#[allow(unused_const)]
const TOPIC_TRAVEL: u8 = 0;
#[allow(unused_const)]
const TOPIC_MOVIES_SHOWS: u8 = 1;
#[allow(unused_const)]
const TOPIC_MOTORSPORTS: u8 = 2;
#[allow(unused_const)]
const TOPIC_PODCASTS_SHOWS: u8 = 3;
#[allow(unused_const)]
const TOPIC_LIFESTYLE: u8 = 4;
#[allow(unused_const)]
const TOPIC_VISUAL_ARTS: u8 = 5;
#[allow(unused_const)]
const TOPIC_SPORTS: u8 = 6;
#[allow(unused_const)]
const TOPIC_ENTERTAINMENT: u8 = 7;
#[allow(unused_const)]
const TOPIC_POP_CULTURE: u8 = 8;
const TOPIC_COMEDY: u8 = 9;

// Error codes
const EProfileAlreadyExists: u64 = 0;
const EProfileNotFound: u64 = 1;
const EInvalidName: u64 = 2;
const EInvalidTopic: u64 = 3;

// ===== Events =====

/// Event emitted when a new creator profile is created
public struct ProfileCreated has copy, drop {
    profile_id: ID,
    creator: address,
    name: String,
    bio: String,
    avatar_url: String,
    background_url: String,
    topic: u8,
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
    topic: u8,
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
    topic: u8,
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
    topic: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let creator = ctx.sender();
    assert!(!registry.profiles.contains(creator), EProfileAlreadyExists);
    assert!(name.length() > 0, EInvalidName);
    assert!(topic <= TOPIC_COMEDY, EInvalidTopic);

    let created_at = clock.timestamp_ms();
    let profile = CreatorProfile {
        name,
        bio,
        avatar_url,
        background_url,
        topic,
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
        topic: profile.topic,
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
    topic: u8,
    clock: &Clock,
    ctx: &TxContext,
) {
    let creator = ctx.sender();
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    assert!(name.length() > 0, EInvalidName);
    assert!(topic <= TOPIC_COMEDY, EInvalidTopic);

    let profile = registry.profiles.borrow_mut(creator);
    profile.name = name;
    profile.bio = bio;
    profile.avatar_url = avatar_url;
    profile.background_url = background_url;
    profile.topic = topic;

    // Emit update event
    event::emit(ProfileUpdated {
        profile_id: object::id_from_address(creator),
        creator,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        background_url: profile.background_url,
        topic: profile.topic,
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

/// Get profile topic
public fun topic(registry: &ProfileRegistry, creator: address): u8 {
    assert!(registry.profiles.contains(creator), EProfileNotFound);
    registry.profiles.borrow(creator).topic
}
