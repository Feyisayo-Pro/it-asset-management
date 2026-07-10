import { Space } from 'antd';

interface Props {
  active: boolean;
}

export const StatusDot = ({ active }: Props) => (
  <Space>
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: active ? '#16A34A' : '#9CA3AF',
      }}
    />
    <span>{active ? 'Active' : 'Inactive'}</span>
  </Space>
);
