import { useState } from 'react';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Space,
  Switch,
  Table,
  Tabs,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { masterDataApi, MasterDataCategory, MasterDataItem } from '@/api/master-data.api';
import { PageHeader } from '@/components/PageHeader';
import type { ColumnsType } from 'antd/es/table';
import { ApiError } from '@/types/api';

const CATEGORIES: { key: MasterDataCategory; label: string }[] = [
  { key: 'departments', label: 'Departments' },
  { key: 'offices', label: 'Offices' },
  { key: 'device-types', label: 'Device Types' },
  { key: 'brands', label: 'Brands' },
];

const CategoryTable = ({ category }: { category: MasterDataCategory }) => {
  const qc = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MasterDataItem | null>(null);
  const [nameInput, setNameInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.masterData.byCategory(category),
    queryFn: () => masterDataApi.list(category),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.masterData.byCategory(category) });
  };

  const createMut = useMutation({
    mutationFn: (name: string) => masterDataApi.create(category, name),
    onSuccess: () => { invalidate(); messageApi.success('Created'); },
    onError: (e) => messageApi.error((e as ApiError).message || 'Create failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; isActive?: boolean } }) =>
      masterDataApi.update(category, id, patch),
    onSuccess: () => { invalidate(); messageApi.success('Updated'); },
    onError: (e) => messageApi.error((e as ApiError).message || 'Update failed'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => masterDataApi.remove(category, id),
    onSuccess: () => { invalidate(); messageApi.success('Deleted'); },
    onError: (e) => messageApi.error((e as ApiError).message || 'Delete failed'),
  });

  const openCreate = () => {
    setEditItem(null);
    setNameInput('');
    setModalOpen(true);
  };

  const openEdit = (item: MasterDataItem) => {
    setEditItem(item);
    setNameInput(item.name);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    if (editItem) {
      await updateMut.mutateAsync({ id: editItem.id, patch: { name: nameInput.trim() } });
    } else {
      await createMut.mutateAsync(nameInput.trim());
    }
    setModalOpen(false);
  };

  const columns: ColumnsType<MasterDataItem> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Active',
      key: 'isActive',
      width: 100,
      render: (_, r) => (
        <Switch
          checked={r.isActive}
          onChange={(v) => updateMut.mutate({ id: r.id, patch: { isActive: v } })}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, r) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this item?" onConfirm={() => removeMut.mutate(r.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add
        </Button>
      </Space>
      <Table<MasterDataItem>
        rowKey="id"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
        size="small"
      />
      <Modal
        title={editItem ? 'Edit Item' : 'Add Item'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okButtonProps={{ disabled: !nameInput.trim() }}
      >
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Name"
          onPressEnter={handleSave}
        />
      </Modal>
    </>
  );
};

export const MasterDataPage = () => {
  return (
    <div>
      <PageHeader
        title="Master Data"
        subtitle="Manage reference data for departments, offices, device types, and brands"
      />
      <Card>
        <Tabs
          defaultActiveKey="departments"
          items={CATEGORIES.map((c) => ({
            key: c.key,
            label: c.label,
            children: <CategoryTable category={c.key} />,
          }))}
        />
      </Card>
    </div>
  );
};
