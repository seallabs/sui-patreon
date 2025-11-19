import { CONFIG, getSessionKey } from '@/lib/config';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';

export const useSealSessionKey = () => {
  const userAddress = useCurrentAccount()?.address;
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  return useQuery({
    queryKey: ['sealSessionKey', userAddress],
    queryFn: () =>
      getSessionKey(
        CONFIG.PACKAGE_ID,
        userAddress!,
        (msg) => signPersonalMessage({ message: msg }),
        10
      ),
    enabled: !!userAddress,
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60000,
  });
};
