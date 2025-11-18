"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { beginZkLogin } from "@/lib/zklogin/auth";
import { validateZkLoginConfig } from "@/lib/zklogin/config";

/**
 * Login button with zkLogin integration
 * Implements Google OAuth with zero-knowledge proofs for Sui authentication
 */
export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Validate configuration
      const { isValid, missing } = validateZkLoginConfig();
      if (!isValid) {
        throw new Error(
          `Missing configuration: ${missing.join(", ")}. Please check your .env.local file.`
        );
      }

      // Step 1-3: Generate ephemeral keypair, create nonce, and get OAuth URL
      const { loginUrl } = await beginZkLogin();

      // Step 4: Redirect to Google OAuth
      // The callback handler at /auth/callback will:
      // - Receive the JWT
      // - Generate ZK proof
      // - Derive Sui address
      // - Complete the login flow
      window.location.href = loginUrl;
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Failed to start login");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Connecting...
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Log in with Google
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
