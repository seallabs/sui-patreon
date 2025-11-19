import { decryptContent } from '@/lib/walrus/decrypt';
import { useQuery } from '@tanstack/react-query';
import { useSealSessionKey } from './useSealSessionKey';

export const useDecryptContent = (
  contentId?: string,
  subscriptionId?: string,
  patchId?: string
) => {
  const { data: sessionKey } = useSealSessionKey();
  console.log(sessionKey, contentId, subscriptionId, patchId);
  return useQuery({
    queryKey: ['decryptContent', patchId, contentId, subscriptionId],
    queryFn: async () => {
      console.log('decryping');
      const data = await decryptContent({
        contentId: contentId!,
        subscriptionId: subscriptionId!,
        blobId: patchId!,
        sessionKey: sessionKey!,
      });
      console.log(data);
      return data;
    },
    enabled: !!sessionKey && !!patchId && !!contentId && !!subscriptionId,
    refetchOnWindowFocus: false,
  });
};
