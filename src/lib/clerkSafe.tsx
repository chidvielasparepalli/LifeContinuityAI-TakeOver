import React, { createContext, useContext } from "react";
import { ClerkProvider, useUser as useClerkUser, useClerk as useClerkNative } from "@clerk/clerk-react";

const rawKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
export const hasValidClerkKey = Boolean(
  rawKey &&
  rawKey !== "pk_test_ZW1wdHlfY2xlcmtfayQ" &&
  (rawKey.startsWith("pk_test_") || rawKey.startsWith("pk_live_"))
);

interface FallbackClerkState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any;
  signOut: () => Promise<void>;
}

const FallbackClerkContext = createContext<FallbackClerkState>({
  isLoaded: true,
  isSignedIn: false,
  user: null,
  signOut: async () => {}
});

export function SafeClerkProvider({ children }: { children: React.ReactNode }) {
  if (hasValidClerkKey) {
    return (
      <ClerkProvider publishableKey={rawKey}>
        {children}
      </ClerkProvider>
    );
  }

  return (
    <FallbackClerkContext.Provider
      value={{
        isLoaded: true,
        isSignedIn: false,
        user: null,
        signOut: async () => {}
      }}
    >
      {children}
    </FallbackClerkContext.Provider>
  );
}

export function useSafeUser() {
  if (hasValidClerkKey) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useClerkUser();
  }
  return useContext(FallbackClerkContext);
}

export function useSafeClerk() {
  if (hasValidClerkKey) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useClerkNative();
  }
  const fallback = useContext(FallbackClerkContext);
  return { signOut: fallback.signOut };
}
