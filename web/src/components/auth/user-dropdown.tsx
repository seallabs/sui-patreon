'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import { formatAddress } from '@/lib/utils';
import { logout } from '@/lib/zklogin';
import { useDisconnectWallet } from '@mysten/dapp-kit';
import {
  ChevronDown,
  Copy,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkCreatorProfile } from '@/services/creator';
import { CreatorProfile } from '@/types';

interface UserDropdownProps {
  inSidebar?: boolean;
}

export function UserDropdown({ inSidebar = false }: UserDropdownProps) {
  const { user, setUser, switchRole } = useUser();
  const router = useRouter();
  const { mutateAsync: disconnect } = useDisconnectWallet();
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [isLoadingCreator, setIsLoadingCreator] = useState(true);

  // Fetch creator profile on mount
  useEffect(() => {
    const loadCreatorProfile = async () => {
      if (!user?.address) {
        setIsLoadingCreator(false);
        return;
      }

      try {
        const profile = await checkCreatorProfile(user.address);
        setCreatorProfile(profile);
      } catch (error) {
        console.error('Failed to load creator profile:', error);
      } finally {
        setIsLoadingCreator(false);
      }
    };

    loadCreatorProfile();
  }, [user?.address]);

  const handleCreatorDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    switchRole('creator');
    router.push('/creator/dashboard');
  };

  const handleCopyAddress = () => {
    if (user?.address) {
      navigator.clipboard.writeText(user.address);
    }
  };

  const handleOpenExplorer = () => {
    if (user?.address) {
      const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
      window.open(
        `https://suiscan.xyz/${network}/account/${user.address}`,
        '_blank'
      );
    }
  };

  const handleDisconnect = async () => {
    disconnect();
    logout();
    setUser(null);
    router.push('/');
  };

  if (!user) {
    if (inSidebar) {
      return (
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">Guest User</p>
            <p className="truncate text-xs text-muted-foreground">Not connected</p>
          </div>
        </Link>
      );
    }
    return null; // Don't show in header if not authenticated
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={
            inSidebar
              ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              : "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          }
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || 'User'}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className={`${inSidebar ? 'flex-1' : ''} overflow-hidden text-left`}>
            <p className="truncate text-sm font-medium text-foreground">
              {user.displayName || 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatAddress(user.address)}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={inSidebar ? "top" : "bottom"}
        className="w-64 bg-card border-border backdrop-blur-sm"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-foreground">
              {user.displayName || 'User'}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {formatAddress(user.address)}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Creator Card or Dashboard Link */}
        {creatorProfile ? (
          <DropdownMenuItem
            onClick={handleCreatorDashboardClick}
            className="cursor-pointer p-3 focus:bg-accent"
          >
            <div className="flex items-center gap-3 w-full">
              {creatorProfile.avatarUrl ? (
                <img
                  src={creatorProfile.avatarUrl}
                  alt={creatorProfile.displayName}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {creatorProfile.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Creator Dashboard
                </p>
              </div>
            </div>
          </DropdownMenuItem>
        ) : !isLoadingCreator ? (
          <DropdownMenuItem asChild>
            <Link href="/creator/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My Account
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenExplorer} className="cursor-pointer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open on Explorer
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-2 text-center">
          <a
            href="https://sui.io/zklogin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by SUI zkLogin
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
