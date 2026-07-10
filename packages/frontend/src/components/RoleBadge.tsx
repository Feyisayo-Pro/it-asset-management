import { Tag } from 'antd';
import { ROLE_COLOR, ROLE_LABEL, RoleName } from '@/types/role';

interface Props {
  role: string;
}

export const RoleBadge = ({ role }: Props) => {
  const label = ROLE_LABEL[role as RoleName] ?? role;
  const color = ROLE_COLOR[role as RoleName] ?? 'default';
  return <Tag color={color}>{label}</Tag>;
};
