import AppWrapper from '@/components/layout/wrapper';
import { UserProvider } from '@/contexts/user-context';
import { SessionKeyProvider } from '@/providers/SessionKeyProvider';
import { MessagingClientProvider } from '@/providers/MessagingClientProvider';
import '@mysten/dapp-kit/dist/index.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SuiPatreon - Support Creators on Sui Blockchain',
  description: 'A decentralized creator platform built on Sui blockchain',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppWrapper>
          <SessionKeyProvider>
            <MessagingClientProvider>
              <UserProvider>{children}</UserProvider>
              <Toaster position="bottom-right" richColors />
            </MessagingClientProvider>
          </SessionKeyProvider>
        </AppWrapper>
      </body>
    </html>
  );
}
