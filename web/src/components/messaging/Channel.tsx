'use client';

import { useEffect, useState, useRef } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { formatTimestamp, formatAddress } from '@/lib/messaging/formatters';
import { AttachmentDisplay } from './AttachmentDisplay';
import { useSessionKey } from '@/providers/SessionKeyProvider';
import { SessionExpirationModal } from './SessionExpirationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Paperclip } from 'lucide-react';
import Image from 'next/image';

interface ChannelProps {
  channelId: string;
  onBack: () => void;
}

export function Channel({ channelId, onBack }: ChannelProps) {
  const currentAccount = useCurrentAccount();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);
  const { sessionKey } = useSessionKey();
  const {
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
    channelError,
    isReady,
  } = useMessaging();

  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Check session expiration
  const checkSessionExpiration = () => {
    if (sessionKey && sessionKey.isExpired()) {
      setIsSessionExpired(true);
      return true;
    }
    setIsSessionExpired(false);
    return false;
  };

  // Monitor session key changes
  useEffect(() => {
    if (sessionKey) {
      if (sessionKey.isExpired()) {
        setIsSessionExpired(true);
      } else {
        setIsSessionExpired(false);
      }
    } else {
      setIsSessionExpired(true);
    }
  }, [sessionKey]);

  // Fetch channel and messages on mount
  useEffect(() => {
    if (!isReady || !channelId) return;

    if (checkSessionExpiration()) {
      return;
    }

    let isMounted = true;

    // Fetch channel and messages
    getChannelById(channelId).then(() => {
      if (isMounted && !checkSessionExpiration()) {
        fetchMessages(channelId);
      }
    });

    // Auto-refresh messages every 5 seconds
    const interval = setInterval(() => {
      if (isMounted && !checkSessionExpiration()) {
        fetchLatestMessages(channelId);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isReady, channelId, sessionKey]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isLoadingOlderRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    isLoadingOlderRef.current = false;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkSessionExpiration()) {
      return;
    }

    if ((!messageText.trim() && selectedFiles.length === 0) || isSendingMessage) {
      return;
    }

    const attachments = selectedFiles.length > 0 ? selectedFiles : undefined;
    const result = await sendMessage(channelId, messageText, attachments);
    if (result) {
      setMessageText('');
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoadMore = () => {
    if (checkSessionExpiration()) {
      return;
    }

    if (messagesCursor && !isFetchingMessages) {
      isLoadingOlderRef.current = true;
      fetchMessages(channelId, messagesCursor);
    }
  };

  if (!isReady) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Waiting for messaging client to initialize...
      </div>
    );
  }

  return (
    <>
      <SessionExpirationModal isOpen={isSessionExpired} />
      <div className="flex h-[calc(100vh-8rem)] flex-col rounded-lg border bg-card">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack} disabled={isSessionExpired}>
              ← Back
            </Button>
            <div>
              <h3 className="font-semibold">Channel</h3>
              {currentChannel && (
                <p className="text-xs text-muted-foreground">
                  {formatAddress(currentChannel.id.id)}
                </p>
              )}
            </div>
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
            <span className="text-base text-muted-foreground">Secured by</span>
            <Image
              src="/seal-logo-lighter.svg"
              alt="Seal"
              width={150}
              height={48}
              className="h-12 w-auto object-contain"
            />
          </div>
          {currentChannel && (
            <div className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">
              {currentChannel.messages_count} messages
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Load More Button */}
          {hasMoreMessages && (
            <div className="mb-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isFetchingMessages || isSessionExpired}
              >
                {isFetchingMessages ? 'Loading...' : 'Load older messages'}
              </Button>
            </div>
          )}

          {/* Messages */}
          {messages.length === 0 && !isFetchingMessages ? (
            <div className="py-8 text-center text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender === currentAccount?.address;
                return (
                  <div
                    key={index}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <p className="mb-1 text-xs opacity-70">
                        {isOwnMessage ? 'You' : formatAddress(message.sender)}
                      </p>
                      {message.text && <p className="text-sm">{message.text}</p>}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                          {message.attachments.map((attachment, attIndex) => (
                            <AttachmentDisplay key={attIndex} attachment={attachment} />
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs opacity-60">
                        {formatTimestamp(message.createdAtMs)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />

          {isFetchingMessages && messages.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">Loading messages...</div>
          )}
        </div>

        {/* Error Display */}
        {channelError && (
          <div className="border-t p-3 text-sm text-red-500">
            Error: {channelError}
          </div>
        )}

        {/* Message Input */}
        <div className="border-t p-3">
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 rounded-md bg-muted p-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="truncate text-sm">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isSendingMessage || !isReady || isSessionExpired}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSendingMessage || !isReady || isSessionExpired}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={isSendingMessage || !isReady || isSessionExpired}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={(!messageText.trim() && selectedFiles.length === 0) || isSendingMessage || !isReady || isSessionExpired}
            >
              {isSendingMessage ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

