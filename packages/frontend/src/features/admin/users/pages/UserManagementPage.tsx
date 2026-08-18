import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { RoleBadge } from '@/components/RoleBadge';
import { StatusDot } from '@/components/StatusDot';
import { AdminUserDto } from '@/api/users.api';
import { useUsers } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import {
  useActivateUser,
  useChangeUserRole,
  useDeactivateUser,
} from '../hooks/useUserMutations';
import { ChangeRoleModal } from '../components/ChangeRoleModal';
import { ApiError } from '@/types/api';
import { ROLE_LABEL, RoleName } from '@/types/role';
import { useAuth } from '@/hooks/useAuth';

const formatRelative = (iso: string | null): string => {
  if (!iso) return 'Never';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

interface StatusFilterValue {
  key: 'all' | 'active' | 'inactive';
  isActive: boolean | undefined;
}
const STATUS_OPTIONS: StatusFilterValue[] = [
  { key: 'all', isActive: undefined },
  { key: 'active', isActive: true },
  { key: 'inactive', isActive: false },
];

export const UserManagementPage = () => {
  const nav = useNavigate();
  const { user: me } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState<string | undefined>();
  const [status, setStatus] = useState<StatusFilterValue>(STATUS_OPTIONS[0]);
  const [roleModal, setRoleModal] = useState<{
    open: boolean;
    userId: string | null;
    currentRoleId: string;
  }>({ open: false, userId: null, currentRoleId: '' });

  const usersQuery = useUsers({
    page,
    pageSize,
    search: search || undefined,
    roleId,
    isActive: status.isActive,
    sortField: 'lastName',
    sortDirection: 'asc',
  });
  const rolesQuery = useRoles();

  const rolesById = useMemo(
    () =>
      Object.fromEntries(
        (rolesQuery.data ?? []).map((r) => [r.id, r]),
      ) as Record<string, { name: string }>,
    [rolesQuery.data],
  );

  const changeRole = useChangeUserRole(roleModal.userId ?? '');
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();

  const handleChangeRole = async (newRoleId: string) => {
    if (!roleModal.userId) return;
    try {
      await changeRole.mutateAsync(newRoleId);
      messageApi.success('Role updated');
      setRoleModal({ open: false, userId: null, currentRoleId: '' });
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Failed to change role');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivate.mutateAsync(id);
      messageApi.success('User deactivated');
    } catch (err) {
      messageApi.error((err as ApiError).message);
    }
  };
  const handleActivate = async (id: string) => {
    try {
      await activate.mutateAsync(id);
      messageApi.success('User activated');
    } catch (err) {
      messageApi.error((err as ApiError).message);
    }
  };

  const columns: ColumnsType<AdminUserDto> = [
    {
      title: 'Name',
      key: 'name',
      sorter: false,
      render: (_, u) => (
        <span>
          {u.lastName}, {u.firstName}
        </span>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      key: 'role',
      render: (_, u) => <RoleBadge role={rolesById[u.roleId]?.name ?? '—'} />,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, u) => <StatusDot active={u.isActive} />,
    },
    {
      title: 'Last login',
      key: 'lastLoginAt',
      render: (_, u) => formatRelative(u.lastLoginAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_, u) => {
        const isSelf = u.id === me?.id;
        const items = [
          { key: 'edit', label: 'Edit', onClick: () => nav(`/admin/users/${u.id}/edit`) },
          {
            key: 'role',
            label: 'Change role',
            disabled: isSelf,
            onClick: () =>
              setRoleModal({
                open: true,
                userId: u.id,
                currentRoleId: u.roleId,
              }),
          },
          u.isActive
            ? {
                key: 'deactivate',
                label: 'Deactivate',
                danger: true,
                disabled: isSelf,
                onClick: () => handleDeactivate(u.id),
              }
            : {
                key: 'activate',
                label: 'Activate',
                onClick: () => handleActivate(u.id),
              },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Users"
        subtitle="Manage system user accounts"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav('/admin/users/new')}
          >
            New user
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search by name or email"
            allowClear
            style={{ width: 320 }}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <Select
            placeholder="All roles"
            allowClear
            style={{ width: 200 }}
            options={(rolesQuery.data ?? []).map((r) => ({
              value: r.id,
              label: ROLE_LABEL[r.name as RoleName] ?? r.name,
            }))}
            onChange={(v) => {
              setRoleId(v);
              setPage(1);
            }}
          />
          <Select
            value={status.key}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Inactive only' },
            ]}
            onChange={(v) => {
              const next = STATUS_OPTIONS.find((s) => s.key === v)!;
              setStatus(next);
              setPage(1);
            }}
          />
        </Space>

        <Table<AdminUserDto>
          rowKey="id"
          columns={columns}
          dataSource={usersQuery.data?.data ?? []}
          loading={usersQuery.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: usersQuery.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          locale={{
            emptyText: usersQuery.isLoading
              ? 'Loading users…'
              : 'No users match your criteria.',
          }}
        />
      </Card>

      <ChangeRoleModal
        open={roleModal.open}
        currentRoleId={roleModal.currentRoleId}
        submitting={changeRole.isPending}
        onCancel={() =>
          setRoleModal({ open: false, userId: null, currentRoleId: '' })
        }
        onConfirm={handleChangeRole}
      />
    </div>
  );
};
