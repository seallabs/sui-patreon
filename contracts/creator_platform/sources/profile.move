module creator_platform::profile {
    use std::string::String;
    use sui::event;

    // Error codes
    const ENotOwner: u64 = 0;
    const EInvalidName: u64 = 1;

    // ===== Events =====

    /// Event emitted when a new creator profile is created
    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        creator: address,
        name: String,
        timestamp: u64,
    }

    /// Event emitted when a profile is updated
    public struct ProfileUpdated has copy, drop {
        profile_id: ID,
        creator: address,
        name: String,
        bio: String,
        avatar_url: String,
        timestamp: u64,
    }

    // ===== Structs =====

    /// Creator profile NFT - represents a creator's identity on the platform
    public struct CreatorProfile has key, store {
        id: UID,
        creator: address,
        name: String,
        bio: String,
        avatar_url: String,
        created_at: u64,
    }

    // ===== Public Functions =====

    /// Create a new creator profile
    /// Profile is returned to allow composability in programmable transactions
    public fun create_profile(
        name: String,
        bio: String,
        avatar_url: String,
        ctx: &mut TxContext
    ): CreatorProfile {
        let sender = ctx.sender();
        let created_at = ctx.epoch_timestamp_ms();

        // Validate name is not empty
        assert!(name.length() > 0, EInvalidName);

        let profile = CreatorProfile {
            id: object::new(ctx),
            creator: sender,
            name,
            bio,
            avatar_url,
            created_at,
        };

        let profile_id = object::id(&profile);

        // Emit event for indexing
        event::emit(ProfileCreated {
            profile_id,
            creator: sender,
            name: profile.name,
            timestamp: created_at,
        });

        profile
    }

    /// Update profile information
    /// Only the profile owner can update their profile
    public fun update_profile(
        profile: &mut CreatorProfile,
        bio: String,
        avatar_url: String,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        // Verify ownership - only the creator can update their profile
        assert!(profile.creator == sender, ENotOwner);

        // Update mutable fields
        profile.bio = bio;
        profile.avatar_url = avatar_url;

        // Emit update event
        event::emit(ProfileUpdated {
            profile_id: object::id(profile),
            creator: profile.creator,
            name: profile.name,
            bio: profile.bio,
            avatar_url: profile.avatar_url,
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    // ===== View Functions =====

    /// Get profile creator address
    public fun creator(profile: &CreatorProfile): address {
        profile.creator
    }

    /// Get profile name
    public fun name(profile: &CreatorProfile): String {
        profile.name
    }

    /// Get profile bio
    public fun bio(profile: &CreatorProfile): String {
        profile.bio
    }

    /// Get profile avatar URL
    public fun avatar_url(profile: &CreatorProfile): String {
        profile.avatar_url
    }

    /// Get profile creation timestamp
    public fun created_at(profile: &CreatorProfile): u64 {
        profile.created_at
    }

    // ===== Test-Only Functions =====

    #[test_only]
    public fun init_for_testing(_ctx: &mut TxContext) {
        // Test initialization if needed
    }
}
