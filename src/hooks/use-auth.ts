import { useState, useCallback } from "react";

export function useAuth() {
  const [isAuthenticated] = useState(true);
  const [isLoading] = useState(false);

  const signIn = useCallback(async (..._args: unknown[]) => {
    // Auth not available in standalone deployment
  }, []);

  const signOut = useCallback(async () => {
    // Auth not available in standalone deployment
  }, []);

  return {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
  };
}
