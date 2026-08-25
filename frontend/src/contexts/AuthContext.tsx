import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase, type UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isGuest: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password?: string) => Promise<{ error: Error | null }>;
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

  // Fetch or create user profile
  const fetchProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile not found -> create one
        const newProfile: UserProfile = {
          id: userId,
          email: email || '',
          preferred_currency: (localStorage.getItem('currencyMode') as 'USD' | 'PEN') || 'USD',
          demo_usdt_balance: Number(localStorage.getItem('usdtCash') || '1000'),
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
  };

  const updatePreferredCurrency = async (currency: 'USD' | 'PEN') => {
    localStorage.setItem('currencyMode', currency);
    if (user && profile) {
      setProfile((prev) => (prev ? { ...prev, preferred_currency: currency } : null));
      await supabase.from('user_profiles').update({ preferred_currency: currency }).eq('id', user.id);
    }
  };

  const updateDemoBalance = async (amount: number) => {
    localStorage.setItem('usdtCash', amount.toString());
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
        signInWithEmail,
        signUpWithEmail,
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
