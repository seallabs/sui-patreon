/**
 * Hook to check if the current user has a creator profile
 *
 * Queries the Sui blockchain to verify profile existence
 */

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { PROFILE_REGISTRY } from '@/lib/sui/constants';

interface CreatorProfile {
  name: string;
  bio: string;
  avatarUrl: string;
  backgroundUrl?: string;
  topic?: number;
  createdAt: string;
}

export function useCreatorProfile() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!account?.address) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function fetchProfile() {
      try {
        setIsLoading(true);
        setError(null);

        // Query the profile registry to get the table ID
        const registryObject = await client.getObject({
          id: PROFILE_REGISTRY,
          options: {
            showContent: true,
          },
        });

        if (!registryObject.data?.content || registryObject.data.content.dataType !== 'moveObject') {
          throw new Error('Invalid registry object');
        }

        const fields = registryObject.data.content.fields as any;
        const profilesTableId = fields.profiles?.fields?.id?.id;

        if (!profilesTableId) {
          throw new Error('Profiles table not found in registry');
        }

        // Query the dynamic field for the user's address in the table
        try {
          const profileField = await client.getDynamicFieldObject({
            parentId: profilesTableId,
            name: {
              type: 'address',
              value: account!.address,
            },
          });

          // If we get here, the profile exists
          if (profileField.data?.content && profileField.data.content.dataType === 'moveObject') {
            const profileData = profileField.data.content.fields as any;

            // Extract profile data
            const creatorProfile: CreatorProfile = {
              name: profileData.value?.fields?.name || '',
              bio: profileData.value?.fields?.bio || '',
              avatarUrl: profileData.value?.fields?.avatar_url || '',
              backgroundUrl: profileData.value?.fields?.background_url || '',
              topic: profileData.value?.fields?.topic ?? 0,
              createdAt: profileData.value?.fields?.created_at || '0',
            };

            console.log('Creator profile found:', creatorProfile);

            if (!isCancelled) {
              setProfile(creatorProfile);
            }
          } else {
            // Profile field exists but has unexpected structure
            if (!isCancelled) {
              setProfile(null);
            }
          }
        } catch (dynamicFieldError: any) {
          // If getDynamicFieldObject throws, it means the profile doesn't exist
          // This is expected for users who haven't created a profile
          if (dynamicFieldError?.message?.includes('not found') ||
              dynamicFieldError?.message?.includes('Could not find')) {
            console.log('No creator profile found for address:', account!.address);
            if (!isCancelled) {
              setProfile(null);
            }
          } else {
            // Unexpected error
            throw dynamicFieldError;
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch creator profile:', err);
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setProfile(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, [account?.address, client, refetchTrigger]);

  const refetch = () => {
    if (!account?.address) {
      console.log('[useCreatorProfile] Refetch called but no account address');
      return;
    }

    console.log('[useCreatorProfile] Refetch triggered');
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    profile,
    hasProfile: !!profile,
    isLoading,
    error,
    refetch,
  };
}
