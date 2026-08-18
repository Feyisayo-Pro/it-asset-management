import { useEffect, useState } from 'react';
import { Alert, Modal, Space, Typography } from 'antd';
import { RolePicker } from './RolePicker';
import { useRoles } from '../hooks/useRoles';
import { RoleName } from '@/types/role';

interface Props {
  open: boolean;
  currentRoleId: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (newRoleId: string) => Promise<void>;
}

export const ChangeRoleModal = ({
  open,
  currentRoleId,
  submitting,
  onCancel,
  onConfirm,
}: Props) => {
  const rolesQuery = useRoles();
  const [selected, setSelected] = useState<string>(currentRoleId);

  useEffect(() => {
    if (open) setSelected(currentRoleId);
  }, [open, currentRoleId]);

  const current = rolesQuery.data?.find((r) => r.id === currentRoleId);
  const isDemotingSuperAdmin =
    current?.name === RoleName.SUPER_ADMIN && selected !== currentRoleId;

  return (
    <Modal
      title="Change user role"
      open={open}
      onCancel={onCancel}
      onOk={() => onConfirm(selected)}
      okText="Confirm"
      confirmLoading={submitting}
      okButtonProps={{ disabled: selected === currentRoleId }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text>
          Current role: <strong>{current?.name ?? '—'}</strong>
        </Typography.Text>
        <div>
          <Typography.Text>New role</Typography.Text>
          <div style={{ marginTop: 6 }}>
            <RolePicker value={selected} onChange={setSelected} />
          </div>
        </div>
        {isDemotingSuperAdmin && (
          <Alert
            type="warning"
            showIcon
            message="Removing Super Admin role cannot be undone by the user themselves."
          />
        )}
      </Space>
    </Modal>
  );
};
