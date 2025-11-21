const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ChannelCheckResponse {
  success: boolean;
  exists: boolean;
  channelId?: string;
  createdAt?: string;
  error?: string;
}

export interface ChannelMappingRequest {
  channelId: string;
  userAddress: string;
  creatorAddress: string;
}

export interface ChannelMappingResponse {
  success: boolean;
  mapping?: {
    id: string;
    channelId: string;
    userAddress: string;
    creatorAddress: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

export interface CreatorInfo {
  id: string;
  address: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface ChannelWithCreator {
  channelId: string;
  creator: CreatorInfo | null;
  createdAt: string;
}

export interface UserChannelMappingsResponse {
  success: boolean;
  mappings?: ChannelWithCreator[];
  error?: string;
}

/**
 * Check if a channel already exists between user and creator
 */
export async function checkChannelExists(
  userAddress: string,
  creatorAddress: string
): Promise<ChannelCheckResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/messaging/channels/check/${userAddress}/${creatorAddress}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check channel');
    }

    const result = await response.json();

    // Backend returns {success: true, data: {exists: boolean, channelId?: string}}
    // Extract the data field
    return {
      success: result.success,
      exists: result.data?.exists || false,
      channelId: result.data?.channelId,
      error: result.error,
    };
  } catch (error) {
    console.error('Error checking channel existence:', error);
    return {
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new channel-creator mapping
 */
export async function saveChannelMapping(
  data: ChannelMappingRequest
): Promise<ChannelMappingResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/messaging/channels/mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save channel mapping');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving channel mapping:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all channel-creator mappings for a user
 */
export async function getUserChannelMappings(
  userAddress: string
): Promise<UserChannelMappingsResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/messaging/channels/user/${userAddress}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch channel mappings');
    }

    const result = await response.json();

    // Backend returns {success: true, data: [...]}
    // Convert to {success: true, mappings: [...]} for consistency
    return {
      success: result.success,
      mappings: result.data || [],
      error: result.error,
    };
  } catch (error) {
    console.error('Error fetching user channel mappings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
