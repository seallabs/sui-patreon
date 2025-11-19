module creator_platform::subscription;

use asset::usdc::USDC;
use std::string::String;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use sui::table::{Self, Table};
use sui::vec_map::{Self, VecMap};

// Error codes
const ENotCreator: u64 = 0;
const ETierNotFound: u64 = 1;
const EInvalidPrice: u64 = 2;
const ETierInactive: u64 = 3;
const EInvalidName: u64 = 4;
const EInsufficientFunds: u64 = 5;

// Constants
const MILLISECONDS_PER_DAY: u64 = 86_400_000; // 24 * 60 * 60 * 1000
const SUBSCRIPTION_DURATION_DAYS: u64 = 30;

// ===== Events =====

/// Event emitted when a new subscription tier is created
public struct TierCreated has copy, drop {
    tier_id: ID,
    creator: address,
    name: String,
    description: String,
    price: u64,
    is_active: bool,
    created_at: u64,
}

/// Event emitted when a tier's price is updated
public struct TierPriceUpdated has copy, drop {
    tier_id: ID,
    creator: address,
    old_price: u64,
    new_price: u64,
    timestamp: u64,
}

/// Event emitted when a tier is deactivated
public struct TierDeactivated has copy, drop {
    tier_id: ID,
    creator: address,
    timestamp: u64,
}

/// Event emitted when a subscription is purchased
public struct SubscriptionPurchased has copy, drop {
    subscription_id: ID,
    subscriber: address,
    creator: address,
    tier_id: ID,
    tier_name: String,
    amount: u64,
    started_at: u64,
    expires_at: u64,
}

// ===== Structs =====

public struct TierRegistry has key {
    id: UID,
    tiers: Table<address, VecMap<ID, Tier>>,
}

/// Subscription tier - represents a subscription level for a creator
/// Shared object to allow multiple subscribers to interact concurrently
public struct Tier has key, store {
    id: UID,
    name: String,
    description: String,
    price_monthly: u64,
    is_active: bool,
    created_at: u64,
}

/// Active subscription NFT - owned by the subscriber
public struct ActiveSubscription has key {
    id: UID,
    creator: address,
    tier_id: ID,
    started_at: u64,
    expires_at: u64,
}

// ===== Public Functions =====

fun init(ctx: &mut TxContext) {
    transfer::share_object(TierRegistry {
        id: object::new(ctx),
        tiers: table::new(ctx),
    });
}

/// Create a new subscription tier
/// Returns the tier as a shared object for concurrent access
public fun create_tier(
    registry: &mut TierRegistry,
    name: String,
    description: String,
    price_monthly: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(name.length() > 0, EInvalidName);
    assert!(price_monthly > 0, EInvalidPrice);

    let creator = ctx.sender();
    let created_at = clock.timestamp_ms();
    let tier = Tier {
        id: object::new(ctx),
        name,
        description,
        price_monthly,
        is_active: true,
        created_at,
    };

    if (!registry.tiers.contains(creator)) {
        registry.tiers.add(creator, vec_map::empty());
    };

    event::emit(TierCreated {
        tier_id: object::id(&tier),
        creator,
        name: tier.name,
        description: tier.description,
        price: price_monthly,
        is_active: tier.is_active,
        created_at,
    });

    let tiers = registry.tiers.borrow_mut(creator);
    tiers.insert(object::id(&tier), tier);
}

/// Update the price of a subscription tier
/// Only the creator can update their tier's price
public fun update_tier_price(
    registry: &mut TierRegistry,
    tier_id: ID,
    new_price: u64,
    clock: &Clock,
    ctx: &TxContext,
) {
    let creator = ctx.sender();
    assert!(registry.tiers.contains(creator), ENotCreator);
    assert!(new_price > 0, EInvalidPrice);

    let tiers = registry.tiers.borrow_mut(creator);
    assert!(tiers.contains(&tier_id), ETierNotFound);
    let tier = tiers.get_mut(&tier_id);

    let old_price = tier.price_monthly;
    tier.price_monthly = new_price;
    event::emit(TierPriceUpdated {
        tier_id,
        creator,
        old_price,
        new_price,
        timestamp: clock.timestamp_ms(),
    });
}

/// Deactivate a subscription tier
/// Only the creator can deactivate their tier
public fun deactivate_tier(
    registry: &mut TierRegistry,
    tier_id: ID,
    clock: &Clock,
    ctx: &TxContext,
) {
    let creator = ctx.sender();
    assert!(registry.tiers.contains(creator), ENotCreator);

    let tiers = registry.tiers.borrow_mut(creator);
    assert!(tiers.contains(&tier_id), ETierNotFound);
    let tier = tiers.get_mut(&tier_id);

    tier.is_active = false;

    event::emit(TierDeactivated {
        tier_id,
        creator,
        timestamp: clock.timestamp_ms(),
    });
}

/// Purchase a subscription to a tier
/// Creates an ActiveSubscription NFT and transfers payment to creator
public fun purchase_subscription(
    registry: &TierRegistry,
    creator: address,
    tier_id: ID,
    payment: &mut Coin<USDC>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let tiers = registry.tiers.borrow(creator);
    assert!(tiers.contains(&tier_id), ETierNotFound);
    let tier = tiers.get(&tier_id);

    assert!(tier.is_active, ETierInactive);
    assert!(payment.value() >= tier.price_monthly, EInsufficientFunds);

    // Calculate expiration (30 days from now)
    let started_at = clock.timestamp_ms();
    let expires_at = started_at + (SUBSCRIPTION_DURATION_DAYS * MILLISECONDS_PER_DAY);

    // Transfer payment to creator
    let fee = payment.split(tier.price_monthly, ctx);
    transfer::public_transfer(fee, creator);

    // Create subscription NFT
    let subscription = ActiveSubscription {
        id: object::new(ctx),
        creator,
        tier_id: object::id(tier),
        started_at,
        expires_at,
    };

    // Emit purchase event
    event::emit(SubscriptionPurchased {
        subscription_id: object::id(&subscription),
        subscriber: ctx.sender(),
        creator,
        tier_id: object::id(tier),
        tier_name: tier.name,
        amount: tier.price_monthly,
        started_at,
        expires_at,
    });

    // Transfer subscription NFT to subscriber
    transfer::transfer(subscription, ctx.sender());
}

/// Get subscription creator address
public fun creator(subscription: &ActiveSubscription): address {
    subscription.creator
}

/// Get subscription tier index
public fun tier_id(subscription: &ActiveSubscription): ID {
    subscription.tier_id
}

/// Get subscription expiration timestamp
public fun expires_at(subscription: &ActiveSubscription): u64 {
    subscription.expires_at
}
