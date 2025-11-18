module creator_platform::content;

use creator_platform::subscription::ActiveSubscription;
use std::string::String;
use sui::bcs::{Self, BCS};
use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

// ===== Error Codes =====

const EAccessDenied: u64 = 0;

// ===== Events =====

/// Event emitted when new content is created
public struct ContentCreated has copy, drop {
    content_id: ID,
    creator: address,
    title: String,
    description: String,
    content_type: String,
    walrus_blob_id: String,
    preview_blob_id: String,
    tier_ids: vector<ID>,
    is_public: bool,
    created_at: u64,
}

// ===== Structs =====

public struct ContentRegistry has key {
    id: UID,
    contents: Table<address, vector<ID>>,
}

/// Content metadata registry with Walrus blob IDs and tier-based access requirements
/// Shared object to allow public metadata access
public struct Content has key {
    id: UID,
    creator: address,
    nonce: u64,
    title: String,
    description: String,
    content_type: String, // MIME type (e.g., "video/mp4", "image/jpeg")
    walrus_blob_id: String, // Main content blob ID in Walrus
    preview_blob_id: String, // Preview/sample blob ID (can be empty)
    required_tier_ids: vector<ID>, // Tier IDs required for access (empty = public)
    is_public: bool, // If true, no tier required
    created_at: u64,
}

// ===== Public Functions =====

fun init(ctx: &mut TxContext) {
    transfer::share_object(ContentRegistry {
        id: object::new(ctx),
        contents: table::new(ctx),
    });
}

/// Create new content with tier-based access control
/// Content is shared to allow public metadata viewing
public fun create_content(
    registry: &mut ContentRegistry,
    nonce: u64,
    title: String,
    description: String,
    content_type: String,
    walrus_blob_id: String,
    preview_blob_id: String,
    required_tier_ids: vector<ID>,
    is_public: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let creator = ctx.sender();
    let content = Content {
        id: object::new(ctx),
        creator,
        nonce,
        title,
        description,
        content_type,
        walrus_blob_id,
        preview_blob_id,
        required_tier_ids,
        is_public,
        created_at: clock.timestamp_ms(),
    };

    if (registry.contents.contains(creator)) {
        let contents = registry.contents.borrow_mut(creator);
        contents.push_back(object::id(&content));
    } else {
        let contents = vector::singleton(object::id(&content));
        registry.contents.add(creator, contents);
    };

    event::emit(ContentCreated {
        content_id: object::id(&content),
        creator: content.creator,
        title: content.title,
        description: content.description,
        content_type: content.content_type,
        walrus_blob_id: content.walrus_blob_id,
        preview_blob_id: content.preview_blob_id,
        tier_ids: content.required_tier_ids,
        is_public: content.is_public,
        created_at: content.created_at,
    });

    // Share object to allow public metadata access
    transfer::share_object(content);
}

// ===== Access Verification Functions =====

/// Seal approval entry function - called by Seal before content decryption
/// Verifies that the user's subscription grants access to the content
/// Transaction success = decryption approved
/// Transaction abort = access denied
entry fun seal_approve(
    id: vector<u8>,
    content: &Content,
    subscription: &ActiveSubscription,
    clock: &Clock,
) {
    assert!(check_policy(id, content, subscription, clock), EAccessDenied);
}

/// Verify if a subscription grants access to the content
/// Returns true if:
/// - Content is public, OR
/// - Subscription is active AND subscription tier matches content requirements
fun check_policy(
    id: vector<u8>,
    content: &Content,
    subscription: &ActiveSubscription,
    clock: &Clock,
): bool {
    let mut prepared: BCS = bcs::new(id);
    let creator = prepared.peel_address();
    let nonce = prepared.peel_u64();

    // Check id is for the correct content
    if (creator != content.creator || nonce != content.nonce) {
        return false
    };

    // Public content is accessible to everyone
    if (content.is_public) {
        return true
    };

    // Check subscription is for the correct creator
    if (subscription.creator() != content.creator) {
        return false
    };

    // Check subscription is not expired
    if (subscription.expires_at() < clock.timestamp_ms()) {
        return false
    };

    // Check if subscription tier matches any required tier
    let sub_tier_id = subscription.tier_id();
    vector::contains(&content.required_tier_ids, &sub_tier_id)
}
