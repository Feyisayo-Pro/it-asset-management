import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { UserManagementPage } from '@/features/admin/users/pages/UserManagementPage';
import { UserCreatePage } from '@/features/admin/users/pages/UserCreatePage';
import { UserEditPage } from '@/features/admin/users/pages/UserEditPage';
import { AssetListPage } from '@/features/assets/pages/AssetListPage';
import { AssetCreatePage } from '@/features/assets/pages/AssetCreatePage';
import { AssetEditPage } from '@/features/assets/pages/AssetEditPage';
import { AssetDetailPage } from '@/features/assets/pages/AssetDetailPage';
import { AssetImportPage } from '@/features/assets/pages/AssetImportPage';
import { ReturnListPage } from '@/features/returns/pages/ReturnListPage';
import { InitiateReturnPage } from '@/features/returns/pages/InitiateReturnPage';
import { ReturnDetailPage } from '@/features/returns/pages/ReturnDetailPage';
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
  {
    path: '/',
    element: (
      <ProtectedRoute
        allowedRoles={[
          RoleName.SUPER_ADMIN,
          RoleName.STORES_OFFICER,
          RoleName.IT_REP,
          RoleName.PEOPLE_CULTURE,
        ]}
      >
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'assets', element: <AssetListPage /> },
      { path: 'assets/new', element: <AssetCreatePage /> },
      { path: 'assets/import', element: <AssetImportPage /> },
      { path: 'assets/:id', element: <AssetDetailPage /> },
      { path: 'assets/:id/edit', element: <AssetEditPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'returns', element: <ReturnListPage /> },
      { path: 'returns/new', element: <InitiateReturnPage /> },
      { path: 'returns/:id', element: <ReturnDetailPage /> },
    ],
  },
  { path: '/403', element: <PermissionDeniedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
