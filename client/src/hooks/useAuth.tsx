import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { User } from "@shared/schema";
import { sanitizeUserData, validateAnonymizedData } from '../lib/anonymity';
import bs58 from 'bs58';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessToken: () => Promise<string | null>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setDbProfile: (p: Partial<User>) => void;
  dbProfile: User | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, connect, disconnect, signMessage, wallet } = useWallet();
  const { connection } = useConnection();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [dbProfile, setDbProfile] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const profileFetchedRef = useRef(false);

  const authenticated = !!(connected && publicKey && authToken);
  const ready = true;

  // Debug authentication state (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useAuth] Authentication state changed:', {
        connected,
        publicKey: publicKey?.toString(),
        authenticated,
        hasToken: !!authToken,
      });
    }
  }, [connected, publicKey, authenticated, authToken]);

  const login = useCallback(async () => {
    try {
      setIsAuthenticating(true);

      if (!connected || !wallet) {
        // Trigger Phantom wallet connection
        await connect();
      }
    } catch (error) {
      console.error('[useAuth] Login error:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [connect, connected, wallet]);

  const logout = useCallback(async () => {
    try {
      await disconnect();
      setAuthToken(null);
      setDbProfile(null);
      profileFetchedRef.current = false;

      // Clear auth token from storage
      localStorage.removeItem('phantom_auth_token');

      // Use replace to avoid adding to browser history
      window.location.replace('/auth');
    } catch (error) {
      console.error('[useAuth] Logout error:', error);
    }
  }, [disconnect]);

  // Authenticate with backend when wallet connects
  useEffect(() => {
    async function authenticateWithBackend() {
      if (!connected || !publicKey || !signMessage || authToken) return;

      try {
        setIsAuthenticating(true);

        // Get nonce from backend
        const nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            walletType: 'phantom'
          }),
        });
        console.log("Nonce result : " , nonceRes);
        if (!nonceRes.ok) {
          throw new Error('Failed to get nonce from server');
        }

        const { nonce } = await nonceRes.json();

        // Sign the nonce with Phantom wallet
        const message = new TextEncoder().encode(`Sign this message to authenticate with Anonn.\n\nNonce: ${nonce}`);
        const signature = await signMessage(message);

        // Verify signature with backend
        const authRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            signature: bs58.encode(signature),
            nonce,
            walletType: 'phantom'
          }),
        });

        if (!authRes.ok) {
          throw new Error('Failed to verify signature');
        }

        const { token } = await authRes.json();
        setAuthToken(token);
        localStorage.setItem('phantom_auth_token', token);

        if (process.env.NODE_ENV === 'development') {
          console.log('[useAuth] Authentication successful');
        }
      } catch (error) {
        console.error('[useAuth] Authentication error:', error);
        await disconnect();
      } finally {
        setIsAuthenticating(false);
      }
    }

    authenticateWithBackend();
  }, [connected, publicKey, signMessage, authToken, disconnect]);

  // Restore auth token from storage
  useEffect(() => {
    const savedToken = localStorage.getItem('phantom_auth_token');
    if (savedToken && !authToken) {
      setAuthToken(savedToken);
    }
  }, [authToken]);

  const getAccessToken = useCallback(async () => {
    return authToken;
  }, [authToken]);

  useEffect(() => {
    // Provide a single canonical getter for the token
    (window as any).__getDynamicToken = async () => {
      return authToken;
    };
    // Back-compat alias used by existing fetch helpers
    (window as any).__getPrivyToken = (window as any).__getDynamicToken;

    if (process.env.NODE_ENV === 'development') {
      console.log('[useAuth] Token getter function set up, authToken available:', !!authToken);
    }
  }, [authToken]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!ready || !authenticated || isLoadingProfile) return;

    setIsLoadingProfile(true);
    try {
      const token = await getAccessToken();

      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useAuth] No token available for profile refresh');
        }
        return;
      }

      const res = await fetch('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const profile = await res.json() as User;

        // Validate that the data is properly anonymized
        if (!validateAnonymizedData(profile)) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[useAuth] Received non-anonymized user data!');
          }
        }

        // Sanitize user data as an extra precaution
        const sanitizedProfile = sanitizeUserData(profile);

        setDbProfile(sanitizedProfile);
        if (process.env.NODE_ENV === 'development') {
          console.log('[useAuth] Profile refreshed successfully');
        }
      } else if (res.status === 401) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useAuth] Authentication failed during profile refresh');
        }
        // Token might be expired, trigger re-auth
        setAuthToken(null);
        localStorage.removeItem('phantom_auth_token');
        setDbProfile(null);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('[useAuth] Failed to refresh profile:', res.status, res.statusText);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAuth] Error refreshing profile:', error);
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [ready, authenticated, isLoadingProfile, getAccessToken]);

  // Fetch DB-backed profile once authenticated
  useEffect(() => {
    if (!ready || !authenticated || profileFetchedRef.current) return;

    profileFetchedRef.current = true;
    refreshProfile();
  }, [ready, authenticated, refreshProfile]);

  // Reset profile fetch flag when user changes
  useEffect(() => {
    if (!authenticated) {
      profileFetchedRef.current = false;
      setDbProfile(null);
    }
  }, [authenticated]);

  const shapedUser: User | null = useMemo(() => {
    if (!publicKey) return null;

    // If we have both wallet and database profile, prioritize database
    if (dbProfile) {
      const userData = {
        id: dbProfile.id || publicKey.toString(),
        username: dbProfile.username || null,
        password: null,
        profileImageUrl: dbProfile.profileImageUrl || null,
        bannerUrl: dbProfile.bannerUrl || null,
        bio: dbProfile.bio || null,
        location: dbProfile.location || null,
        website: dbProfile.website || null,
        allowlisted: dbProfile.allowlisted ?? true,
        karma: dbProfile.karma || 0,
        postKarma: dbProfile.postKarma || 0,
        commentKarma: dbProfile.commentKarma || 0,
        awardeeKarma: dbProfile.awardeeKarma || 0,
        followerCount: dbProfile.followerCount || 0,
        followingCount: dbProfile.followingCount || 0,
        isVerified: dbProfile.isVerified || false,
        isPremium: dbProfile.isPremium || false,
        premiumExpiresAt: dbProfile.premiumExpiresAt || null,
        isOnline: dbProfile.isOnline ?? true,
        lastActiveAt: dbProfile.lastActiveAt || null,
        createdAt: dbProfile.createdAt || null,
        updatedAt: dbProfile.updatedAt || null,
        dynamicProfile: null,
        dynamicProfileSynced: dbProfile.dynamicProfileSynced || false,
      } as User;

      return sanitizeUserData(userData);
    }

    // If only wallet (database profile still loading), create minimal user
    const now = new Date();
    const minimalUser = {
      id: publicKey.toString(),
      username: null,
      password: null,
      profileImageUrl: null,
      bannerUrl: null,
      bio: null,
      location: null,
      website: null,
      allowlisted: true,
      karma: 0,
      postKarma: 0,
      commentKarma: 0,
      awardeeKarma: 0,
      followerCount: 0,
      followingCount: 0,
      isVerified: false,
      isPremium: false,
      premiumExpiresAt: null,
      isOnline: true,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
      dynamicProfile: null,
      dynamicProfileSynced: false,
    } as User;

    return sanitizeUserData(minimalUser);
  }, [publicKey, dbProfile]);

  const contextValue = useMemo(() => ({
    user: shapedUser,
    isAuthenticated: authenticated,
    isLoading: !ready || isLoadingProfile || isAuthenticating,
    dbProfile,
    refreshProfile,
    getAccessToken,
    login,
    logout,
    setDbProfile: (p: Partial<User>) => {
      setDbProfile((prev: User | null) => {
        if (!prev) return p as User;
        return { ...prev, ...p } as User;
      });
    },
  }), [
    shapedUser,
    authenticated,
    ready,
    isLoadingProfile,
    isAuthenticating,
    dbProfile,
    refreshProfile,
    getAccessToken,
    login,
    logout,
  ]);

  const safeContextValue = ready ? contextValue : {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    dbProfile: null,
    refreshProfile: async () => {},
    getAccessToken: async () => null,
    login: async () => {},
    logout: async () => {},
    setDbProfile: () => {},
  };

  return (
    <AuthContext.Provider value={safeContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[useAuth] Context not found. Make sure AuthProvider is wrapping your component tree.');
    }
    throw new Error("useAuth must be used within an AuthProvider. Check that AuthProvider is properly set up in your app.");
  }
  return context;
}
