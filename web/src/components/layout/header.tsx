"use client";

import Link from "next/link";
import { Search, ExternalLink, Copy, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/login-button";
import { RoleSwitcher } from "@/components/auth/role-switcher";
import { useUser } from "@/contexts/user-context";
import { formatAddress } from "@/lib/utils";
import { logout } from "@/lib/zklogin";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const isAuthenticated = !!user;

  const handleCopyAddress = () => {
    if (user?.address) {
      navigator.clipboard.writeText(user.address);
    }
  };

  const handleOpenExplorer = () => {
    if (user?.address) {
      // Open Sui Explorer with user's address
      const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
      window.open(`https://suiscan.xyz/${network}/account/${user.address}`, '_blank');
    }
  };

  const handleDisconnect = () => {
    logout();
    setUser(null);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search creators..."
              className="w-full pl-10"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Role Switcher */}
          <RoleSwitcher />

          {isAuthenticated ? (
            <>
              {/* User Account Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {user.avatarUrl && (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || "User"}
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-foreground">{user.displayName || "User"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatAddress(user.address)}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border-border backdrop-blur-sm">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium text-foreground">
                        {user.displayName || "User"}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {formatAddress(user.address)}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Dashboard Link */}
                  <DropdownMenuItem asChild>
                    <Link href="/creator/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  
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
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <LoginButton />
              <Button variant="outline" asChild>
                <Link href="/creator/dashboard">Become a Creator</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
