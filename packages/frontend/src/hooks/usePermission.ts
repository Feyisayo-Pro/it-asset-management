import { useAuthStore } from '@/stores/auth.store';
import { RoleName } from '@/types/role';

export const usePermission = () => {
  const permissions = useAuthStore((s) => s.permissions);
  const roleName = useAuthStore((s) => s.user?.roleName);

  return {
    has: (permission: string) => permissions.includes(permission),
    hasAny: (list: string[]) => list.some((p) => permissions.includes(p)),
    hasRole: (...roles: RoleName[]) =>
      roleName ? roles.includes(roleName as RoleName) : false,
  };
};
