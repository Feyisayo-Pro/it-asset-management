import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const PermissionDeniedPage = () => {
  const nav = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="You don't have permission to view this page."
      extra={
        <Button type="primary" onClick={() => nav(-1)}>
          Go back
        </Button>
      }
    />
  );
};
