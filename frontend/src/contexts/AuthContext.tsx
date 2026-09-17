import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase, type UserProfile } from '../lib/supabase';
import { getScopedItem, setScopedItem } from '../lib/accountStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchToGuestMode: () => void;
  updatePreferredCurrency: (currency: 'USD' | 'PEN') => Promise<void>;
  updateDemoBalance: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('crypto_auth_mode') !== 'authenticated';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Fetch or create user profile
  const fetchProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile not found -> create one with $1000 default free demo cash.
        const newProfile: UserProfile = {
          id: userId,
          email: email || '',
          preferred_currency: (getScopedItem('currencyMode', userId, { legacyFallback: true }) as 'USD' | 'PEN') || 'USD',
          demo_usdt_balance: 1000.0,
        };
        await supabase.from('user_profiles').insert(newProfile);
        setProfile(newProfile);
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.warn('Error loading user profile:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        setIsGuest(false);
        localStorage.setItem('crypto_auth_mode', 'authenticated');
        fetchProfile(initialSession.user.id, initialSession.user.email);
      } else {
        setIsGuest(true);
      }
      setIsLoading(false);
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        setIsGuest(false);
        localStorage.setItem('crypto_auth_mode', 'authenticated');
        fetchProfile(currentSession.user.id, currentSession.user.email);
      } else {
        setIsGuest(true);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithEmail = async (email: string, password = 'DemoPassword123!'): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setIsAuthModalOpen(false);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithEmail = async (email: string, password = 'DemoPassword123!'): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setIsAuthModalOpen(false);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsGuest(true);
    localStorage.setItem('crypto_auth_mode', 'guest');
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const switchToGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('crypto_auth_mode', 'guest');
    setIsAuthModalOpen(false);
  };

  const updatePreferredCurrency = async (currency: 'USD' | 'PEN') => {
    setScopedItem('currencyMode', currency, user?.id);
    if (user && profile) {
      setProfile((prev) => (prev ? { ...prev, preferred_currency: currency } : null));
      await supabase.from('user_profiles').update({ preferred_currency: currency }).eq('id', user.id);
    }
  };

  const updateDemoBalance = async (amount: number) => {
    setScopedItem('demo_usdt_cash', amount.toString(), user?.id);
    if (user && profile) {
      setProfile((prev) => (prev ? { ...prev, demo_usdt_balance: amount } : null));
      await supabase.from('user_profiles').update({ demo_usdt_balance: amount }).eq('id', user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isGuest,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        switchToGuestMode,
        updatePreferredCurrency,
        updateDemoBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
