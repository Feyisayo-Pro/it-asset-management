import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/api/auth.api';
import { rbacApi } from '@/api/rbac.api';

export const useAuth = () => {
  const store = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const perms = await rbacApi.myPermissions().catch(() => ({ permissions: [] }));
    store.setSession({
      accessToken: response.accessToken,
      accessExpiresIn: response.accessTokenExpiresIn,
      refreshToken: response.refreshToken,
      user: response.user,
      permissions: perms.permissions,
    });
  }, [store]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(store.refreshToken);
    } finally {
      store.clear();
    }
  }, [store]);

  return {
    user: store.user,
    isAuthenticated: !!store.accessToken && !!store.user,
    role: store.user?.roleName,
    permissions: store.permissions,
    login,
    logout,
  };
};
