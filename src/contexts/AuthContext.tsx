import React, { createContext, useContext, useEffect, useState } from 'react';
import { insforge } from '../lib/insforge';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ requireEmailVerification: boolean; error?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<{ error?: string }>;
  resendVerification: (email: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (cancelled) return;
      setUser(error || !data?.user ? null : { id: data.user.id, email: data.user.email, name: data.user.profile?.name });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password, name) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name });
    if (error) return { requireEmailVerification: false, error: error.message };
    if (data?.accessToken && data.user) {
      setUser({ id: data.user.id, email: data.user.email, name: data.user.profile?.name });
    }
    return { requireEmailVerification: !!data?.requireEmailVerification };
  };

  const verifyEmail: AuthContextValue['verifyEmail'] = async (email, otp) => {
    const { data, error } = await insforge.auth.verifyEmail({ email, otp });
    if (error) return { error: error.message };
    if (data?.user) setUser({ id: data.user.id, email: data.user.email, name: data.user.profile?.name });
    return {};
  };

  const resendVerification: AuthContextValue['resendVerification'] = async (email) => {
    const { error } = await insforge.auth.resendVerificationEmail({ email });
    return error ? { error: error.message } : {};
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data?.user) setUser({ id: data.user.id, email: data.user.email, name: data.user.profile?.name });
    return {};
  };

  const signOut = async () => {
    await insforge.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, verifyEmail, resendVerification, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
