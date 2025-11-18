"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, MessageSquare, Bell, Settings, User } from "lucide-react";
import Image from "next/image";
import { cn, formatAddress } from "@/lib/utils";
import { mockCreators } from "@/lib/mock-data";
import { useUser } from "@/contexts/user-context";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/chats", label: "Chats", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Recently visited creators (using first 3 from mock data)
const recentlyVisited = mockCreators.slice(0, 3);

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-lg font-semibold">SuiPatreon</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Recently Visited Section */}
        <div className="px-3 pb-4">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recently Visited
          </h3>
          <div className="space-y-0.5">
            {recentlyVisited.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.address}`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="truncate text-sm font-medium text-foreground">
                  {creator.displayName}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* User Section */}
        <div className="border-t border-border p-4">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {user ? (
              <>
                {user.avatarUrl ? (
                  <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.displayName || "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatAddress(user.address)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">Guest User</p>
                  <p className="truncate text-xs text-muted-foreground">Not connected</p>
                </div>
              </>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
}
