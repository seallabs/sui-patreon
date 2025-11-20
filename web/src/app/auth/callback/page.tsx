"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { completeZkLogin } from "@/lib/zklogin/auth"; // TODO: Implement auth module
import { useUser } from "@/contexts/user-context";

/**
 * OAuth Callback Handler
 * Handles the redirect from Google OAuth and completes zkLogin flow
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");

  // useEffect(() => {
  //   // Prevent duplicate execution (React Strict Mode calls effects twice)
  //   let isCancelled = false;

  //   async function handleCallback() {
  //     try {
  //       // Extract JWT from URL hash (Google returns id_token in hash)
  //       const hash = window.location.hash;
  //       const params = new URLSearchParams(hash.substring(1));
  //       const jwt = params.get("id_token");

  //       if (!jwt) {
  //         throw new Error("No JWT token found in callback URL");
  //       }

  //       // Prevent duplicate processing
  //       if (isCancelled) {
  //         console.log('Callback cancelled (duplicate call)');
  //         return;
  //       }

  //       setStatus("loading");

  //       // Complete zkLogin flow
  //       const { address, decodedJwt } = await completeZkLogin(jwt);

  //       // Update user context with zkLogin data
  //       setUser({
  //         address,
  //         suinsName: null, // Will be fetched separately if exists
  //         displayName: decodedJwt.name || "Anonymous",
  //         avatarUrl: decodedJwt.picture || "",
  //         email: decodedJwt.email,
  //         subscriptions: [],
  //         createdAt: new Date(),
  //       });

  //       setStatus("success");

  //       // Redirect to home page after successful login
  //       setTimeout(() => {
  //         router.push("/");
  //       }, 1500);
  //     } catch (err) {
  //       console.error("Callback error:", err);
  //       setError(err instanceof Error ? err.message : "Unknown error occurred");
  //       setStatus("error");

  //       // Redirect back to home after error
  //       setTimeout(() => {
  //         router.push("/");
  //       }, 3000);
  //     }
  //   }

  //   handleCallback();

  //   // Cleanup function to prevent duplicate execution
  //   return () => {
  //     isCancelled = true;
  //   };
  // }, [router, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        {status === "loading" && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="text-2xl font-bold">Completing login...</h2>
            <p className="mt-2 text-muted-foreground">
              Generating zero-knowledge proof
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              This may take a few seconds
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <svg
                className="h-8 w-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Login successful!</h2>
            <p className="mt-2 text-muted-foreground">Redirecting to home...</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-500">Login failed</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting to home...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

