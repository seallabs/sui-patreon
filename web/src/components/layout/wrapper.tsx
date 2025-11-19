'use client';
import {
  createNetworkConfig,
  SuiClientProvider,
  useSuiClientContext,
  WalletProvider,
} from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';
import { SuiClient } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

const queryClient = new QueryClient();
const { networkConfig } = createNetworkConfig({
  localnet: { url: 'http://127.0.0.1:9000' },
  devnet: { url: 'https://fullnode.devnet.sui.io:443' },
  testnet: { url: 'https://fullnode.testnet.sui.io:443' },
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443' },
});

// Create SuiClient with MVR (Module Version Resolution) for messaging SDK
const createClient = () => {
  return new SuiClient({
    url: "https://fullnode.testnet.sui.io:443",
    mvr: {
      overrides: {
        packages: {
          '@local-pkg/sui-stack-messaging': "0x984960ebddd75c15c6d38355ac462621db0ffc7d6647214c802cd3b685e1af3d",
        },
      },
    },
  });
};

function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider createClient={createClient} networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();
  useEffect(() => {
    if (!isEnokiNetwork(network)) return;
    if (
      !process.env.NEXT_PUBLIC_ENOKI_API_KEY ||
      !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    )
      throw new Error(
        'NEXT_PUBLIC_ENOKI_API_KEY or NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set'
      );
    const { unregister } = registerEnokiWallets({
      apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY,
      providers: {
        // Provide the client IDs for each of the auth providers you want to use:
        google: {
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          redirectUrl:
            (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') +
            '/auth/callback',
          extraParams: {
            redirect_uri:
              process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            response_type: 'id_token',
            scope: 'openid email profile',
          },
        },
      },
      client,
      network,
    });
    return unregister;
  }, [client, network]);
  return null;
}

export default AppWrapper;
