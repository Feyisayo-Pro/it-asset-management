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
import { EnterpriseDashboardPage } from '@/features/dashboard/pages/EnterpriseDashboardPage';
import { EmployeeListPage } from '@/features/employees/pages/EmployeeListPage';
import { EmployeeDetailPage } from '@/features/employees/pages/EmployeeDetailPage';
import { EmployeeCreatePage } from '@/features/employees/pages/EmployeeCreatePage';
import { EmployeeEditPage } from '@/features/employees/pages/EmployeeEditPage';
import { MasterDataPage } from '@/features/admin/master-data/pages/MasterDataPage';
import { VendorListPage } from '@/features/vendors/pages/VendorListPage';
import { VendorDetailPage } from '@/features/vendors/pages/VendorDetailPage';
import { VendorCreatePage } from '@/features/vendors/pages/VendorCreatePage';
import { AcquisitionListPage } from '@/features/acquisitions/pages/AcquisitionListPage';
import { AcquisitionDetailPage } from '@/features/acquisitions/pages/AcquisitionDetailPage';
import { AcquisitionCreatePage } from '@/features/acquisitions/pages/AcquisitionCreatePage';
import { AllocationListPage } from '@/features/allocations/pages/AllocationListPage';
import { AllocationDetailPage } from '@/features/allocations/pages/AllocationDetailPage';
import { AllocationCreatePage } from '@/features/allocations/pages/AllocationCreatePage';
import { CompliancePage } from '@/features/compliance/pages/CompliancePage';
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
      { path: 'admin/master-data', element: <MasterDataPage /> },
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
      { path: 'dashboard/analytics', element: <DashboardPage /> },
      { path: 'employees', element: <EmployeeListPage /> },
      { path: 'employees/new', element: <EmployeeCreatePage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'employees/:id/edit', element: <EmployeeEditPage /> },
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
      { path: 'vendors', element: <VendorListPage /> },
      { path: 'vendors/new', element: <VendorCreatePage /> },
      { path: 'vendors/:id', element: <VendorDetailPage /> },
      { path: 'vendors/:id/edit', element: <VendorCreatePage /> },
      { path: 'acquisitions', element: <AcquisitionListPage /> },
      { path: 'acquisitions/new', element: <AcquisitionCreatePage /> },
      { path: 'acquisitions/:id', element: <AcquisitionDetailPage /> },
      { path: 'acquisitions/:id/edit', element: <AcquisitionCreatePage /> },
      { path: 'allocations/new', element: <AllocationCreatePage /> },
      { path: 'compliance', element: <CompliancePage /> },
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
      { path: 'dashboard', element: <EnterpriseDashboardPage /> },
      { path: 'returns', element: <ReturnListPage /> },
      { path: 'returns/new', element: <InitiateReturnPage /> },
      { path: 'returns/:id', element: <ReturnDetailPage /> },
      { path: 'allocations', element: <AllocationListPage /> },
      { path: 'allocations/:id', element: <AllocationDetailPage /> },
      { path: 'activity', element: <ActivityFeedPage /> },
    ],
  },
  { path: '/403', element: <PermissionDeniedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
