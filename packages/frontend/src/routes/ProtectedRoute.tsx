import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { RoleName } from '@/types/role';

interface Props {
  children: ReactNode;
  allowedRoles?: RoleName[];
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const location = useLocation();
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.roleName as RoleName)
  ) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
