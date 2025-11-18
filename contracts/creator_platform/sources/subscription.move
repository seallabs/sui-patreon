module creator_platform::subscription {
    use std::string::String;
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::event;

    // Error codes
    const ENotCreator: u64 = 0;
    const EInvalidPrice: u64 = 1;
    const ETierInactive: u64 = 2;
    const EInvalidName: u64 = 3;
    const EInsufficientPayment: u64 = 4;

    // Constants
    const MIST_PER_SUI: u64 = 1_000_000_000;
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
        old_price: u64,
        new_price: u64,
        timestamp: u64,
    }

    /// Event emitted when a tier is deactivated
    public struct TierDeactivated has copy, drop {
        tier_id: ID,
        creator: address,
        name: String,
        description: String,
        price: u64,
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

    /// Subscription tier - represents a subscription level for a creator
    /// Shared object to allow multiple subscribers to interact concurrently
    public struct SubscriptionTier has key, store {
        id: UID,
        creator: address,
        name: String,
        description: String,
        price_monthly: u64,  // Price in MIST (1 SUI = 1_000_000_000 MIST)
        is_active: bool,
        created_at: u64,
    }

    /// Active subscription NFT - owned by the subscriber
    public struct ActiveSubscription has key, store {
        id: UID,
        subscriber: address,
        creator: address,
        tier_id: ID,
        tier_name: String,
        started_at: u64,
        expires_at: u64,
    }

    // ===== Public Functions =====

    /// Create a new subscription tier
    /// Returns the tier as a shared object for concurrent access
    public fun create_tier(
        name: String,
        description: String,
        price_monthly: u64,
        ctx: &mut TxContext
    ): SubscriptionTier {
        let sender = ctx.sender();
        let created_at = ctx.epoch_timestamp_ms();

        // Validate name is not empty
        assert!(name.length() > 0, EInvalidName);

        // Validate price is non-zero (free tiers should use minimal price like 1 MIST)
        assert!(price_monthly > 0, EInvalidPrice);

        let tier = SubscriptionTier {
            id: object::new(ctx),
            creator: sender,
            name,
            description,
            price_monthly,
            is_active: true,
            created_at,
        };

        let tier_id = object::id(&tier);

        // Emit event for indexing
        event::emit(TierCreated {
            tier_id,
            creator: sender,
            name: tier.name,
            description: tier.description,
            price: price_monthly,
            is_active: tier.is_active,
            created_at,
        });

        tier
    }

    /// Update the price of a subscription tier
    /// Only the creator can update their tier's price
    public fun update_tier_price(
        tier: &mut SubscriptionTier,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        // Verify ownership - only the creator can update their tier
        assert!(tier.creator == sender, ENotCreator);

        // Validate new price is non-zero
        assert!(new_price > 0, EInvalidPrice);

        let old_price = tier.price_monthly;
        tier.price_monthly = new_price;

        // Emit update event
        event::emit(TierPriceUpdated {
            tier_id: object::id(tier),
            old_price,
            new_price,
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    /// Deactivate a subscription tier
    /// Only the creator can deactivate their tier
    /// Deactivated tiers remain accessible but cannot accept new subscriptions
    public fun deactivate_tier(
        tier: &mut SubscriptionTier,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        // Verify ownership - only the creator can deactivate their tier
        assert!(tier.creator == sender, ENotCreator);

        tier.is_active = false;

        // Emit deactivation event
        event::emit(TierDeactivated {
            tier_id: object::id(tier),
            creator: tier.creator,
            name: tier.name,
            description: tier.description,
            price: tier.price_monthly,
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    /// Purchase a subscription to a tier
    /// Creates an ActiveSubscription NFT and transfers payment to creator
    public entry fun purchase_subscription(
        tier: &SubscriptionTier,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let subscriber = ctx.sender();
        let started_at = ctx.epoch_timestamp_ms();

        // Verify tier is active
        assert!(tier.is_active, ETierInactive);

        // Verify payment amount is sufficient
        let payment_amount = payment.value();
        assert!(payment_amount >= tier.price_monthly, EInsufficientPayment);

        // Calculate expiration (30 days from now)
        let expires_at = started_at + (SUBSCRIPTION_DURATION_DAYS * MILLISECONDS_PER_DAY);

        // Create subscription NFT
        let subscription = ActiveSubscription {
            id: object::new(ctx),
            subscriber,
            creator: tier.creator,
            tier_id: object::id(tier),
            tier_name: tier.name,
            started_at,
            expires_at,
        };

        let subscription_id = object::id(&subscription);

        // Transfer payment to creator
        transfer::public_transfer(payment, tier.creator);

        // Transfer subscription NFT to subscriber
        transfer::transfer(subscription, subscriber);

        // Emit purchase event
        event::emit(SubscriptionPurchased {
            subscription_id,
            subscriber,
            creator: tier.creator,
            tier_id: object::id(tier),
            tier_name: tier.name,
            amount: payment_amount,
            started_at,
            expires_at,
        });
    }

    /// Check if a subscription is currently active (not expired)
    public fun is_subscription_active(
        subscription: &ActiveSubscription,
        ctx: &TxContext
    ): bool {
        let current_time = ctx.epoch_timestamp_ms();
        current_time < subscription.expires_at
    }

    // ===== View Functions =====

    /// Get tier creator address
    public fun creator(tier: &SubscriptionTier): address {
        tier.creator
    }

    /// Get tier name
    public fun name(tier: &SubscriptionTier): String {
        tier.name
    }

    /// Get tier description
    public fun description(tier: &SubscriptionTier): String {
        tier.description
    }

    /// Get tier monthly price in MIST
    public fun price_monthly(tier: &SubscriptionTier): u64 {
        tier.price_monthly
    }

    /// Get tier active status
    public fun is_active(tier: &SubscriptionTier): bool {
        tier.is_active
    }

    /// Get tier creation timestamp
    public fun created_at(tier: &SubscriptionTier): u64 {
        tier.created_at
    }

    /// Assert that a tier is active (for use by other modules)
    public fun assert_tier_active(tier: &SubscriptionTier) {
        assert!(tier.is_active, ETierInactive);
    }

    // ===== ActiveSubscription View Functions =====

    /// Get subscription subscriber address
    public fun subscriber(subscription: &ActiveSubscription): address {
        subscription.subscriber
    }

    /// Get subscription creator address
    public fun subscription_creator(subscription: &ActiveSubscription): address {
        subscription.creator
    }

    /// Get subscription tier ID
    public fun tier_id(subscription: &ActiveSubscription): ID {
        subscription.tier_id
    }

    /// Get subscription tier name
    public fun subscription_tier_name(subscription: &ActiveSubscription): String {
        subscription.tier_name
    }

    /// Get subscription start timestamp
    public fun started_at(subscription: &ActiveSubscription): u64 {
        subscription.started_at
    }

    /// Get subscription expiration timestamp
    public fun expires_at(subscription: &ActiveSubscription): u64 {
        subscription.expires_at
    }

    // ===== Helper Functions =====

    /// Convert SUI to MIST for convenience
    public fun sui_to_mist(sui_amount: u64): u64 {
        sui_amount * MIST_PER_SUI
    }

    /// Convert MIST to SUI (rounds down)
    public fun mist_to_sui(mist_amount: u64): u64 {
        mist_amount / MIST_PER_SUI
    }

    // ===== Test-Only Functions =====

    #[test_only]
    public fun init_for_testing(_ctx: &mut TxContext) {
        // Test initialization if needed
    }

    #[test_only]
    /// Test helper to get MIST_PER_SUI constant
    public fun get_mist_per_sui(): u64 {
        MIST_PER_SUI
    }

    #[test_only]
    /// Test helper to get MILLISECONDS_PER_DAY constant
    public fun get_milliseconds_per_day(): u64 {
        MILLISECONDS_PER_DAY
    }

    #[test_only]
    /// Test helper to get SUBSCRIPTION_DURATION_DAYS constant
    public fun get_subscription_duration_days(): u64 {
        SUBSCRIPTION_DURATION_DAYS
    }
}
