import { useMessagingClient } from '@/providers/MessagingClientProvider';
import { useSessionKey } from '@/providers/SessionKeyProvider';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { DecryptedChannelObject, DecryptMessageResult, ChannelMessagesDecryptedRequest, PollingState } from '@mysten/messaging';
import { CONFIG } from '@/lib/config';
import { checkChannelExists, saveChannelMapping } from '@/services/messaging';

export const useMessaging = () => {
  const messagingClient = useMessagingClient();
  const { sessionKey, isInitializing, error } = useSessionKey();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  // Channel state
  const [channels, setChannels] = useState<DecryptedChannelObject[]>([]);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isFetchingChannels, setIsFetchingChannels] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  // Current channel state
  const [currentChannel, setCurrentChannel] = useState<DecryptedChannelObject | null>(null);
  const [messages, setMessages] = useState<DecryptMessageResult[]>([]);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messagesCursor, setMessagesCursor] = useState<bigint | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [pollingState, setPollingState] = useState<PollingState | null>(null);
  
  // Cache for member caps to avoid repeated membership fetches
  const [memberCapCache, setMemberCapCache] = useState<Map<string, string>>(new Map());
  const [membershipsCache, setMembershipsCache] = useState<{ memberships: Array<{ member_cap_id: string; channel_id: string }> } | null>(null);
  
  // Track in-flight requests to prevent duplicate simultaneous calls
  const inFlightRequests = useRef<Set<string>>(new Set());

  // Create channel function
  const createChannel = useCallback(async (recipientAddress: string) => {
    if (!messagingClient || !currentAccount) {
      setChannelError('[createChannel] Messaging client or account not available');
      return null;
    }

    setIsCreatingChannel(true);
    setChannelError(null);

    try {
      // Step 1: Check if channel already exists
      const existingChannel = await checkChannelExists(currentAccount.address, recipientAddress);

      if (existingChannel.exists && existingChannel.channelId) {
        console.log('Channel already exists:', existingChannel.channelId);
        // Return existing channel ID instead of creating new one
        return {
          channelId: existingChannel.channelId,
          existingChannel: true,
        };
      }

      // Step 2: Verify owner is subscribed to the recipient
      const { data: subscriptions } = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        filter: {
          StructType: `${CONFIG.PACKAGE_ID}::subscription::ActiveSubscription`,
        },
        options: { showContent: true },
      });

      const subscription = subscriptions.find(sub => {
        const fields = (sub.data?.content as any).fields;
        return fields.creator === recipientAddress && fields.expires_at > Date.now();
      });
      if (!subscription) {
        setChannelError('You are not subscribed to this creator, please subscribe to the creator to create a channel');
        return null;
      }

      // Step 3: Create channel flow
      const flow = messagingClient.createChannelFlow({
        creatorAddress: currentAccount.address,
        initialMemberAddresses: [recipientAddress],
      });

      // Step 4: Build and execute channel creation
      const channelTx = flow.build();
      const { digest } = await signAndExecute({
        transaction: channelTx,
      });

      // Wait for transaction and get channel ID
      const { objectChanges } = await suiClient.waitForTransaction({
        digest,
        options: { showObjectChanges: true },
      });

      const createdChannel = objectChanges?.find(
        (change) => change.type === 'created' && change.objectType?.endsWith('::channel::Channel')
      );

      const channelId = (createdChannel as any)?.objectId;

      // Step 5: Get generated caps
      const { creatorMemberCap } = await flow.getGeneratedCaps({ digest });

      // Step 6: Generate and attach encryption key
      const attachKeyTx = await flow.generateAndAttachEncryptionKey({
        creatorMemberCap,
      });

      const { digest: finalDigest } = await signAndExecute({
        transaction: attachKeyTx,
      });

      // Wait for final transaction
      const { effects } = await suiClient.waitForTransaction({
        digest: finalDigest,
        options: { showEffects: true },
      });

      if (effects?.status.status !== 'success') {
        throw new Error('Transaction failed');
      }

      // Step 7: Save channel mapping to backend
      if (channelId) {
        await saveChannelMapping({
          channelId,
          userAddress: currentAccount.address,
          creatorAddress: recipientAddress,
        });
      }

      // Refresh channels list
      await fetchChannels();

      return { channelId, existingChannel: false };
    } catch (err) {
      const errorMsg = err instanceof Error ? `[createChannel] ${err.message}` : '[createChannel] Failed to create channel';
      setChannelError(errorMsg);
      console.error('Error creating channel:', err);
      return null;
    } finally {
      setIsCreatingChannel(false);
    }
  }, [messagingClient, currentAccount, signAndExecute, suiClient]);

  // Fetch channels function (with deduplication)
  const fetchChannels = useCallback(async () => {
    if (!messagingClient || !currentAccount) {
      return;
    }

    const requestKey = `fetchChannels-${currentAccount.address}`;
    
    // Check if request is already in flight
    if (inFlightRequests.current.has(requestKey)) {
      return;
    }

    inFlightRequests.current.add(requestKey);
    setIsFetchingChannels(true);
    setChannelError(null);

    try {
      const response = await messagingClient.getChannelObjectsByAddress({
        address: currentAccount.address,
        limit: 10,
      });

      setChannels(response.channelObjects);
      // Invalidate member cap cache when channels are refreshed
      setMemberCapCache(new Map());
      setMembershipsCache(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? `[fetchChannels] ${err.message}` : '[fetchChannels] Failed to fetch channels';
      setChannelError(errorMsg);
      console.error('Error fetching channels:', err);
    } finally {
      setIsFetchingChannels(false);
      inFlightRequests.current.delete(requestKey);
    }
  }, [messagingClient, currentAccount]);

  // Get channel by ID
  const getChannelById = useCallback(async (channelId: string) => {
    if (!messagingClient || !currentAccount) {
      return null;
    }

    setChannelError(null);
    // Reset polling state when channel changes
    setPollingState(null);

    try {
      const response = await messagingClient.getChannelObjectsByChannelIds({
        channelIds: [channelId],
        userAddress: currentAccount.address,
      });

      if (response.length > 0) {
        setCurrentChannel(response[0]);
        return response[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? `[getChannelById] ${err.message}` : '[getChannelById] Failed to fetch channel';
      setChannelError(errorMsg);
      console.error('Error fetching channel:', err);
      return null;
    }
  }, [messagingClient, currentAccount]);

  // Fetch messages for a channel (with deduplication)
  const fetchMessages = useCallback(async (channelId: string, cursor: bigint | null = null) => {
    if (!messagingClient || !currentAccount) {
      return;
    }

    // Check if session key is expired
    if (!sessionKey || sessionKey.isExpired()) {
      setChannelError('[fetchMessages] Session key expired. Please sign a new session key.');
      return;
    }

    const requestKey = `fetchMessages-${channelId}-${cursor ?? 'initial'}`;
    
    // Check if request is already in flight
    if (inFlightRequests.current.has(requestKey)) {
      return;
    }

    inFlightRequests.current.add(requestKey);
    setIsFetchingMessages(true);
    setChannelError(null);

    try {
      const response = await messagingClient.getChannelMessages({
        channelId,
        userAddress: currentAccount.address,
        cursor,
        limit: 20,
        direction: 'backward',
      });

      if (cursor === null) {
        // First fetch, replace messages
        setMessages(response.messages);
        // Initialize polling state for future incremental fetches
        if (response.messages.length > 0) {
          setPollingState({
            channelId,
            lastMessageCount: BigInt(response.messages.length),
            lastCursor: response.cursor,
          });
        }
      } else {
        // Pagination, append older messages
        setMessages(prev => [...response.messages, ...prev]);
      }

      setMessagesCursor(response.cursor);
      setHasMoreMessages(response.hasNextPage);
    } catch (err) {
      const errorMsg = err instanceof Error ? `[fetchMessages] ${err.message}` : '[fetchMessages] Failed to fetch messages';
      setChannelError(errorMsg);
      console.error('Error fetching messages:', err);
    } finally {
      setIsFetchingMessages(false);
      inFlightRequests.current.delete(requestKey);
    }
  }, [messagingClient, currentAccount, sessionKey]);

  // Fetch only new messages since last poll (for auto-refresh, with deduplication)
  const fetchLatestMessages = useCallback(async (channelId: string) => {
    if (!messagingClient || !currentAccount || !pollingState || pollingState.channelId !== channelId) {
      // If no polling state, fall back to regular fetch
      return fetchMessages(channelId);
    }

    // Check if session key is expired
    if (!sessionKey || sessionKey.isExpired()) {
      setChannelError('[fetchLatestMessages] Session key expired. Please sign a new session key.');
      return;
    }

    const requestKey = `fetchLatestMessages-${channelId}`;
    
    // Check if request is already in flight
    if (inFlightRequests.current.has(requestKey)) {
      return;
    }

    inFlightRequests.current.add(requestKey);
    setChannelError(null);

    try {
      const response = await messagingClient.getLatestMessages({
        channelId,
        userAddress: currentAccount.address,
        pollingState,
        limit: 50,
      });

      if (response.messages.length > 0) {
        // Only append new messages, don't replace existing ones
        setMessages(prev => {
          // Create a map of existing messages by a unique key (sender + createdAtMs + text)
          // to avoid duplicates
          const existingKeys = new Set(
            prev.map(m => `${m.sender}-${m.createdAtMs}-${m.text?.slice(0, 50)}`)
          );
          
          // Filter out any messages that already exist
          const newMessages = response.messages.filter(
            m => !existingKeys.has(`${m.sender}-${m.createdAtMs}-${m.text?.slice(0, 50)}`)
          );
          
          // Update polling state with the new total count
          if (newMessages.length > 0) {
            const newTotal = prev.length + newMessages.length;
            setPollingState({
              channelId,
              lastMessageCount: BigInt(newTotal),
              lastCursor: response.cursor,
            });
          }
          
          // Append new messages to the end (most recent)
          return newMessages.length > 0 ? [...prev, ...newMessages] : prev;
        });
      }
    } catch (err) {
      // Silently fail for polling - don't show errors for background refreshes
      console.error('Error fetching latest messages:', err);
    } finally {
      inFlightRequests.current.delete(requestKey);
    }
  }, [messagingClient, currentAccount, pollingState, fetchMessages, sessionKey]);

  // Get member cap for channel (with caching)
  const getMemberCapForChannel = useCallback(async (channelId: string) => {
    if (!messagingClient || !currentAccount) {
      return null;
    }

    // Check cache first
    const cachedCap = memberCapCache.get(channelId);
    if (cachedCap) {
      return cachedCap;
    }

    try {
      // Use cached memberships if available, otherwise fetch
      let memberships = membershipsCache;
      if (!memberships) {
        memberships = await messagingClient.getChannelMemberships({
          address: currentAccount.address,
        });
        setMembershipsCache(memberships);
      }

      const membership = memberships.memberships.find(m => m.channel_id === channelId);
      const memberCapId = membership?.member_cap_id || null;
      
      // Cache the result
      if (memberCapId) {
        setMemberCapCache(prev => new Map(prev).set(channelId, memberCapId));
      }
      
      return memberCapId;
    } catch (err) {
      console.error('Error getting member cap:', err);
      return null;
    }
  }, [messagingClient, currentAccount, memberCapCache, membershipsCache]);

  // Get encrypted key for channel
  const getEncryptedKeyForChannel = useCallback(async (channelId: string) => {
    // Use current channel if it matches, otherwise fetch it once
    let channel = (currentChannel && currentChannel.id.id === channelId) 
      ? currentChannel 
      : await getChannelById(channelId);
    
    if (!channel) return null;

    const encryptedKeyBytes = channel.encryption_key_history.latest;
    const keyVersion = channel.encryption_key_history.latest_version;

    return {
      $kind: 'Encrypted' as const,
      encryptedBytes: new Uint8Array(encryptedKeyBytes),
      version: keyVersion,
    } as ChannelMessagesDecryptedRequest['encryptedKey'];
  }, [currentChannel, getChannelById]);

  // Send message function
  const sendMessage = useCallback(async (channelId: string, message: string, attachments?: File[]) => {
    if (!messagingClient || !currentAccount) {
      setChannelError('[sendMessage] Messaging client or account not available');
      return null;
    }

    // Check if session key is expired
    if (!sessionKey || sessionKey.isExpired()) {
      setChannelError('[sendMessage] Session key expired. Please sign a new session key.');
      return null;
    }

    setIsSendingMessage(true);
    setChannelError(null);

    try {
      // Get member cap ID
      const memberCapId = await getMemberCapForChannel(channelId);
      if (!memberCapId) {
        throw new Error('No member cap found for channel');
      }

      // Get encrypted key
      const encryptedKey = await getEncryptedKeyForChannel(channelId);
      if (!encryptedKey) {
        throw new Error('No encrypted key found for channel');
      }

      // Create and execute send message transaction
      const tx = new Transaction();
      const sendMessageTxBuilder = await messagingClient.sendMessage(
        channelId,
        memberCapId,
        currentAccount.address,
        message,
        encryptedKey,
        attachments,
      );
      await sendMessageTxBuilder(tx);

      const { digest } = await signAndExecute({ transaction: tx });

      // Wait for transaction
      await suiClient.waitForTransaction({
        digest,
        options: { showEffects: true },
      });

      // Use fetchLatestMessages to get only new messages instead of full refetch
      // This is more efficient and won't cause image flashing
      if (pollingState && pollingState.channelId === channelId) {
        await fetchLatestMessages(channelId);
      } else {
        // If no polling state yet, do a full fetch (shouldn't happen often)
        await fetchMessages(channelId);
      }

      return { digest };
    } catch (err) {
      const errorMsg = err instanceof Error ? `[sendMessage] ${err.message}` : '[sendMessage] Failed to send message';
      setChannelError(errorMsg);
      console.error('Error sending message:', err);
      return null;
    } finally {
      setIsSendingMessage(false);
    }
  }, [messagingClient, currentAccount, signAndExecute, suiClient, getMemberCapForChannel, getEncryptedKeyForChannel, fetchMessages, fetchLatestMessages, pollingState, sessionKey]);

  // Fetch channels when client is ready (initial fetch only)
  // Auto-refresh is now handled by components that need it
  useEffect(() => {
    if (messagingClient && currentAccount) {
      fetchChannels();
    }
  }, [messagingClient, currentAccount, fetchChannels]);

  return {
    client: messagingClient,
    sessionKey,
    isInitializing,
    error,
    isReady: !!messagingClient && !!sessionKey,

    // Channel functions and state
    channels,
    createChannel,
    fetchChannels,
    isCreatingChannel,
    isFetchingChannels,
    channelError,

    // Current channel functions and state
    currentChannel,
    messages,
    getChannelById,
    fetchMessages,
    fetchLatestMessages,
    sendMessage,
    isFetchingMessages,
    isSendingMessage,
    messagesCursor,
    hasMoreMessages,
  };
};

