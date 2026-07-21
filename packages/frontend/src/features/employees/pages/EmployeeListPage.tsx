import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Space, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { EmploymentStatusBadge } from '../components/EmploymentStatusBadge';
import { EmployeeDto } from '@/api/employees.api';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'transferred', label: 'Transferred' },
];

export const EmployeeListPage = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const query = useEmployees({
    page,
    pageSize,
    search: search || undefined,
    employmentStatus: statusFilter,
    sortField: 'lastName',
    sortDirection: 'asc',
  });

  const canCreate =
    user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'PEOPLE_CULTURE';

  const columns: ColumnsType<EmployeeDto> = [
    {
      title: 'Employee Code',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      render: (v: string, r) => (
        <a onClick={() => nav(`/employees/${r.id}`)} style={{ fontFamily: 'monospace' }}>
          {v}
        </a>
      ),
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, r) => r.fullName,
      sorter: true,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Office', dataIndex: 'officeLocation', key: 'officeLocation' },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => <EmploymentStatusBadge status={r.employmentStatus} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => nav(`/employees/${r.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Employee directory and asset assignments"
        actions={
          canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => nav('/employees/new')}
            >
              Add Employee
            </Button>
          ) : undefined
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search name, email, employee code"
            allowClear
            style={{ width: 360 }}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <Select
            placeholder="All statuses"
            allowClear
            style={{ width: 200 }}
            options={STATUS_OPTIONS}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          />
        </Space>
        <Table<EmployeeDto>
          rowKey="id"
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={query.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: query.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
};
