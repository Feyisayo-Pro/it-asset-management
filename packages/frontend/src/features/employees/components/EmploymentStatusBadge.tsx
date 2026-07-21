import { Tag } from 'antd';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: 'Active' },
  on_leave: { color: 'orange', label: 'On Leave' },
  terminated: { color: 'red', label: 'Terminated' },
  resigned: { color: 'volcano', label: 'Resigned' },
  transferred: { color: 'blue', label: 'Transferred' },
};

export const EmploymentStatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};
