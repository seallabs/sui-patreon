module creator_platform::content {
    use std::string::String;
    use sui::event;
    use creator_platform::subscription::ActiveSubscription;

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

    /// Content metadata registry with Walrus blob IDs and tier-based access requirements
    /// Shared object to allow public metadata access
    public struct Content has key {
        id: UID,
        creator: address,
        title: String,
        description: String,
        content_type: String,  // MIME type (e.g., "video/mp4", "image/jpeg")
        walrus_blob_id: String,  // Main content blob ID in Walrus
        preview_blob_id: String,  // Preview/sample blob ID (can be empty)
        required_tier_ids: vector<ID>,  // Tier IDs required for access (empty = public)
        created_at: u64,
        is_public: bool,  // If true, no tier required
    }

    // ===== Public Functions =====

    /// Create new content with tier-based access control
    /// Content is shared to allow public metadata viewing
    public entry fun create_content(
        title: String,
        description: String,
        content_type: String,
        walrus_blob_id: String,
        preview_blob_id: String,
        required_tier_ids: vector<ID>,
        is_public: bool,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let created_at = ctx.epoch_timestamp_ms();

        let content = Content {
            id: object::new(ctx),
            creator: sender,
            title,
            description,
            content_type,
            walrus_blob_id,
            preview_blob_id,
            required_tier_ids,
            created_at,
            is_public,
        };

        let content_id = object::id(&content);

        // Emit event for indexing
        event::emit(ContentCreated {
            content_id,
            creator: sender,
            title: content.title,
            description: content.description,
            content_type: content.content_type,
            walrus_blob_id: content.walrus_blob_id,
            preview_blob_id: content.preview_blob_id,
            tier_ids: content.required_tier_ids,
            is_public: content.is_public,
            created_at,
        });

        // Share object to allow public metadata access
        transfer::share_object(content);
    }

    // ===== View Functions =====

    /// Get content creator address
    public fun creator(content: &Content): address {
        content.creator
    }

    /// Get content title
    public fun title(content: &Content): String {
        content.title
    }

    /// Get content description
    public fun description(content: &Content): String {
        content.description
    }

    /// Get content type (MIME type)
    public fun content_type(content: &Content): String {
        content.content_type
    }

    /// Get Walrus blob ID for main content
    public fun walrus_blob_id(content: &Content): String {
        content.walrus_blob_id
    }

    /// Get Walrus blob ID for preview
    public fun preview_blob_id(content: &Content): String {
        content.preview_blob_id
    }

    /// Get required tier IDs for access
    public fun required_tier_ids(content: &Content): vector<ID> {
        content.required_tier_ids
    }

    /// Get content creation timestamp
    public fun created_at(content: &Content): u64 {
        content.created_at
    }

    /// Check if content is public (no tier required)
    public fun is_public(content: &Content): bool {
        content.is_public
    }

    // ===== Access Verification Functions =====

    /// Verify if a subscription grants access to the content
    /// Returns true if:
    /// - Content is public, OR
    /// - Subscription is active AND subscription tier matches content requirements
    public fun verify_access(
        content: &Content,
        subscription: &ActiveSubscription,
        ctx: &TxContext
    ): bool {
        // Public content is accessible to everyone
        if (content.is_public) {
            return true
        };

        // Check subscription is not expired
        let current_time = ctx.epoch_timestamp_ms();
        if (subscription.expires_at() < current_time) {
            return false
        };

        // Check if subscription tier matches any required tier
        let sub_tier_id = subscription.tier_id();
        vector::contains(&content.required_tier_ids, &sub_tier_id)
    }

    /// Seal approval entry function - called by Seal before content decryption
    /// Verifies that the user's subscription grants access to the content
    /// Transaction success = decryption approved
    /// Transaction abort = access denied
    public entry fun seal_approve(
        content: &Content,
        subscription: &ActiveSubscription,
        ctx: &TxContext
    ) {
        assert!(verify_access(content, subscription, ctx), EAccessDenied);
    }

    // ===== Test-Only Functions =====

    #[test_only]
    public fun init_for_testing(_ctx: &mut TxContext) {
        // Test initialization if needed
    }

    #[test_only]
    /// Get error code for access denied (for testing expected failures)
    public fun get_access_denied_error(): u64 {
        EAccessDenied
    }
}
