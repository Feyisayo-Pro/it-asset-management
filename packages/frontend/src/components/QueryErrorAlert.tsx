import { Alert, Button, Space } from 'antd';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export const QueryErrorAlert = ({
  message = 'Failed to load data. Please try again.',
  onRetry,
}: Props) => (
  <Alert
    type="error"
    showIcon
    message={message}
    action={
      onRetry ? (
        <Space>
          <Button size="small" type="primary" onClick={onRetry}>
            Retry
          </Button>
        </Space>
      ) : undefined
    }
  />
);
