import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RoleName } from '@/types/role';

export interface AuthUser {
  id: string;
  email: string;
  roleName: RoleName | string;
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  accessExpiresAt: number | null;
  user: AuthUser | null;
  permissions: string[];
  setSession(input: {
    accessToken: string;
    accessExpiresIn: number;
    refreshToken: string;
    user: AuthUser;
    permissions?: string[];
  }): void;
  setPermissions(permissions: string[]): void;
  clear(): void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      user: null,
      permissions: [],
      setSession: (input) =>
        set({
          accessToken: input.accessToken,
          accessExpiresAt: Date.now() + input.accessExpiresIn * 1000,
          refreshToken: input.refreshToken,
          user: input.user,
          permissions: input.permissions ?? [],
        }),
      setPermissions: (permissions) => set({ permissions }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          accessExpiresAt: null,
          user: null,
          permissions: [],
        }),
    }),
    {
      name: 'iam.auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessExpiresAt: state.accessExpiresAt,
        user: state.user,
        permissions: state.permissions,
      }),
    },
  ),
);
