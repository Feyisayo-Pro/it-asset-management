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
import { AssessmentListPage } from '@/features/assessments/pages/AssessmentListPage';
import { StartAssessmentPage } from '@/features/assessments/pages/StartAssessmentPage';
import { AssessmentDetailPage } from '@/features/assessments/pages/AssessmentDetailPage';
import { RepairListPage } from '@/features/repairs/pages/RepairListPage';
import { OpenRepairPage } from '@/features/repairs/pages/OpenRepairPage';
import { RepairDetailPage } from '@/features/repairs/pages/RepairDetailPage';
import { DisposalListPage } from '@/features/disposals/pages/DisposalListPage';
import { RequestDisposalPage } from '@/features/disposals/pages/RequestDisposalPage';
import { DisposalDetailPage } from '@/features/disposals/pages/DisposalDetailPage';
import { ActivityFeedPage } from '@/features/notifications/pages/ActivityFeedPage';
import { DashboardPage } from '@/features/reports/pages/DashboardPage';
import { ReportPage } from '@/features/reports/pages/ReportPage';
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
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'assets', element: <AssetListPage /> },
      { path: 'assets/new', element: <AssetCreatePage /> },
      { path: 'assets/import', element: <AssetImportPage /> },
      { path: 'assets/:id', element: <AssetDetailPage /> },
      { path: 'assets/:id/edit', element: <AssetEditPage /> },
      { path: 'assessments', element: <AssessmentListPage /> },
      { path: 'assessments/new', element: <StartAssessmentPage /> },
      { path: 'assessments/:id', element: <AssessmentDetailPage /> },
      { path: 'repairs', element: <RepairListPage /> },
      { path: 'repairs/new', element: <OpenRepairPage /> },
      { path: 'repairs/:id', element: <RepairDetailPage /> },
      { path: 'disposals', element: <DisposalListPage /> },
      { path: 'disposals/new', element: <RequestDisposalPage /> },
      { path: 'disposals/:id', element: <DisposalDetailPage /> },
      { path: 'reports', element: <ReportPage /> },
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
      { path: 'activity', element: <ActivityFeedPage /> },
    ],
  },
  { path: '/403', element: <PermissionDeniedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
