import { Badge } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useUnreadCount } from '../hooks/useNotifications';

interface Props {
  onClick: () => void;
}

export const NotificationBell = ({ onClick }: Props) => {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Badge count={count} size="small" offset={[-2, 4]}>
      <BellOutlined
        style={{ fontSize: 20, cursor: 'pointer' }}
        onClick={onClick}
      />
    </Badge>
  );
};
