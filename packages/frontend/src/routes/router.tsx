import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { UserManagementPage } from '@/features/admin/users/pages/UserManagementPage';
import { UserCreatePage } from '@/features/admin/users/pages/UserCreatePage';
import { UserEditPage } from '@/features/admin/users/pages/UserEditPage';
import { RoleName } from '@/types/role';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PermissionDeniedPage } from '@/pages/PermissionDeniedPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute allowedRoles={[RoleName.SUPER_ADMIN]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'admin/users', element: <UserManagementPage /> },
      { path: 'admin/users/new', element: <UserCreatePage /> },
      { path: 'admin/users/:id/edit', element: <UserEditPage /> },
    ],
  },
  { path: '/403', element: <PermissionDeniedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
