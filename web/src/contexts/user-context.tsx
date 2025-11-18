"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User } from "@/types";
import { getUserAddress, hasValidZkLoginSession } from "@/lib/zklogin";
import { ZKLOGIN_CONFIG } from "@/lib/zklogin/config";
import { getSession } from "@/lib/zklogin/storage";

type UserRole = "fan" | "creator";

interface UserContextType {
  user: User | null;
  currentRole: UserRole;
  setUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  isCreatorMode: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>("fan");
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore user session and role from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Restore role
      const savedRole = localStorage.getItem("userRole") as UserRole | null;
      if (savedRole === "creator" || savedRole === "fan") {
        setCurrentRole(savedRole);
      }

      // Restore zkLogin session if valid
      if (hasValidZkLoginSession()) {
        const address = getUserAddress();
        const jwt = getSession<string>(ZKLOGIN_CONFIG.storageKeys.jwt);

        if (address && jwt) {
          try {
            // Decode JWT to get user info
            const parts = jwt.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              
              // Restore user from stored data
              const restoredUser: User = {
                address,
                email: payload.email,
                displayName: payload.name || "User",
                avatarUrl: payload.picture || "",
                suinsName: null,
                subscriptions: [],
                createdAt: new Date(),
              };

              setUser(restoredUser);
            }
          } catch (error) {
            console.error("Failed to restore user session:", error);
          }
        }
      }

      setIsInitialized(true);
    }
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setCurrentRole(role);
    // Store preference in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("userRole", role);
    }
  }, []);

  const isCreatorMode = currentRole === "creator";

  // Don't render children until we've restored the role from localStorage
  // This prevents flash of wrong content
  if (!isInitialized) {
    return null;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        currentRole,
        setUser,
        switchRole,
        isCreatorMode,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
