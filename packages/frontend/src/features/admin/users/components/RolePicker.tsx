import { Select } from 'antd';
import { useRoles } from '../hooks/useRoles';
import { ROLE_LABEL, RoleName } from '@/types/role';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const RolePicker = ({ value, onChange, disabled, placeholder }: Props) => {
  const rolesQuery = useRoles();
  const options = (rolesQuery.data ?? []).map((r) => ({
    value: r.id,
    label: ROLE_LABEL[r.name as RoleName] ?? r.name,
  }));
  return (
    <Select
      value={value}
      onChange={onChange}
      loading={rolesQuery.isLoading}
      disabled={disabled}
      options={options}
      placeholder={placeholder ?? 'Select a role'}
      style={{ width: '100%' }}
    />
  );
};
