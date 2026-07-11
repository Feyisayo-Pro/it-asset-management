import { Tag } from 'antd';

const COLOR: Record<string, string> = {
  Registration: 'default',
  Available: 'green',
  Reserved: 'gold',
  Allocated: 'blue',
  Returned: 'cyan',
  UnderRepair: 'orange',
  Disposed: 'default',
  Lost: 'red',
  Stolen: 'red',
  Unaccounted: 'volcano',
};

export const AssetStatusBadge = ({ status }: { status: string }) => (
  <Tag color={COLOR[status] ?? 'default'}>{status}</Tag>
);
