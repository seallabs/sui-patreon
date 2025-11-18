module creator_platform::subscription;

use asset::usdc::USDC;
use std::string::String;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use sui::table::{Self, Table};

// Error codes
const ENotCreator: u64 = 0;
const EInvalidPrice: u64 = 1;
const ETierInactive: u64 = 2;
const EInvalidName: u64 = 3;
const EInsufficientPayment: u64 = 5;

// Constants
const MILLISECONDS_PER_DAY: u64 = 86_400_000; // 24 * 60 * 60 * 1000
const SUBSCRIPTION_DURATION_DAYS: u64 = 30;

// ===== Events =====

/// Event emitted when a new subscription tier is created
public struct TierCreated has copy, drop {
    tier_id: ID,
    creator: address,
    name: String,
    price: u64,
}

/// Event emitted when a tier's price is updated
public struct TierPriceUpdated has copy, drop {
    tier_id: ID,
    old_price: u64,
    new_price: u64,
    timestamp: u64,
}

/// Event emitted when a tier is deactivated
public struct TierDeactivated has copy, drop {
    tier_id: ID,
    timestamp: u64,
}

/// Event emitted when a subscription is purchased
public struct SubscriptionPurchased has copy, drop {
    subscription_id: ID,
    subscriber: address,
    creator: address,
    tier_id: ID,
    amount: u64,
    expires_at: u64,
}

// ===== Structs =====

public struct TierRegistry has key {
    id: UID,
    tiers: Table<address, vector<ID>>,
}

/// Subscription tier - represents a subscription level for a creator
/// Shared object to allow multiple subscribers to interact concurrently
public struct SubscriptionTier has key {
    id: UID,
    creator: address,
    name: String,
    description: String,
    price_monthly: u64, // Price in MIST (1 SUI = 1_000_000_000 MIST)
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
    let tier = SubscriptionTier {
        id: object::new(ctx),
        creator,
        name,
        description,
        price_monthly,
        is_active: true,
        created_at: clock.timestamp_ms(),
    };

    if (registry.tiers.contains(creator)) {
        let tiers = registry.tiers.borrow_mut(creator);
        tiers.push_back(object::id(&tier));
    } else {
        let tiers = vector::singleton(object::id(&tier));
        registry.tiers.add(creator, tiers);
    };

    event::emit(TierCreated {
        tier_id: object::id(&tier),
        creator: tier.creator,
        name: tier.name,
        price: price_monthly,
    });

    transfer::share_object(tier);
}

/// Update the price of a subscription tier
/// Only the creator can update their tier's price
public fun update_tier_price(
    tier: &mut SubscriptionTier,
    new_price: u64,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(tier.creator == ctx.sender(), ENotCreator);
    assert!(new_price > 0, EInvalidPrice);

    let old_price = tier.price_monthly;
    tier.price_monthly = new_price;

    event::emit(TierPriceUpdated {
        tier_id: object::id(tier),
        old_price,
        new_price,
        timestamp: clock.timestamp_ms(),
    });
}

/// Deactivate a subscription tier
/// Only the creator can deactivate their tier
/// Deactivated tiers remain accessible but cannot accept new subscriptions
public fun deactivate_tier(tier: &mut SubscriptionTier, clock: &Clock, ctx: &TxContext) {
    assert!(tier.creator == ctx.sender(), ENotCreator);

    tier.is_active = false;

    event::emit(TierDeactivated {
        tier_id: object::id(tier),
        timestamp: clock.timestamp_ms(),
    });
}

/// Purchase a subscription to a tier
/// Creates an ActiveSubscription NFT and transfers payment to creator
public fun purchase_subscription(
    tier: &SubscriptionTier,
    payment: &mut Coin<USDC>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(tier.is_active, ETierInactive);
    assert!(payment.value() >= tier.price_monthly, EInsufficientPayment);

    // Calculate expiration (30 days from now)
    let started_at = clock.timestamp_ms();
    let expires_at = started_at + (SUBSCRIPTION_DURATION_DAYS * MILLISECONDS_PER_DAY);

    // Transfer payment to creator
    let fee = payment.split(tier.price_monthly, ctx);
    transfer::public_transfer(fee, tier.creator);

    // Create subscription NFT
    let subscription = ActiveSubscription {
        id: object::new(ctx),
        creator: tier.creator,
        tier_id: object::id(tier),
        started_at,
        expires_at,
    };

    // Emit purchase event
    event::emit(SubscriptionPurchased {
        subscription_id: object::id(&subscription),
        subscriber: ctx.sender(),
        creator: tier.creator,
        tier_id: object::id(tier),
        amount: tier.price_monthly,
        expires_at,
    });

    // Transfer subscription NFT to subscriber
    transfer::transfer(subscription, ctx.sender());
}

/// Check if a subscription is currently active (not expired)
public fun is_subscription_active(subscription: &ActiveSubscription, ctx: &TxContext): bool {
    let current_time = ctx.epoch_timestamp_ms();
    current_time < subscription.expires_at
}

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
