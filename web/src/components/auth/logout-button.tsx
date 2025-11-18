"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/zklogin";
import { useUser } from "@/contexts/user-context";
import { useRouter } from "next/navigation";

/**
 * Logout button that clears zkLogin session
 */
export function LogoutButton() {
  const { setUser } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    // Clear zkLogin session data
    logout();
    
    // Clear user context
    setUser(null);
    
    // Redirect to home
    router.push("/");
  };

  return (
    <Button onClick={handleLogout} variant="outline" size="sm">
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}

