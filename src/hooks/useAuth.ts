'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserRole } from '@/lib/supabaseDb';

interface AuthState {
  userId: string | null;
  username: string | null;
  role: UserRole;
  isAdmin: boolean;
}

function getAuthFromStorage(): AuthState {
  if (typeof window === 'undefined') {
    return { userId: null, username: null, role: 'admin', isAdmin: true };
  }
  const userId = localStorage.getItem('currentUserId');
  const username = localStorage.getItem('currentUsername');
  const roleStr = localStorage.getItem('currentUserRole');
  const role: UserRole = (roleStr === 'admin' || roleStr === 'user') ? roleStr : 'admin';
  return { userId, username, role, isAdmin: role === 'admin' };
}

export function useAuth(): AuthState & {
  refreshAuth: () => void;
} {
  const [authState, setAuthState] = useState<AuthState>(getAuthFromStorage);

  const refreshAuth = useCallback(() => {
    setAuthState(getAuthFromStorage());
  }, []);

  useEffect(() => {
    // Listen for storage changes (e.g., from another tab or logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUserId' || e.key === 'currentUserRole' || e.key === 'currentUsername') {
        refreshAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom auth change events (same tab)
    window.addEventListener('auth-changed', refreshAuth);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', refreshAuth);
    };
  }, [refreshAuth]);

  return {
    ...authState,
    refreshAuth,
  };
}
