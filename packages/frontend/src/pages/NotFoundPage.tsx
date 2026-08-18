import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const nav = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="Page not found."
      extra={
        <Button type="primary" onClick={() => nav('/admin/users')}>
          Back
        </Button>
      }
    />
  );
};
