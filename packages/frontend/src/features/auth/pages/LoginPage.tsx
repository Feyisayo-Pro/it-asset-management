import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useLogin } from '../hooks/useLogin';
import { ApiError } from '@/types/api';

interface FormValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const nav = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);

  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? '/assets';

  const onFinish = async (values: FormValues) => {
    setError(null);
    try {
      await login.mutateAsync(values);
      nav(returnTo, { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'AUTH_ACCOUNT_LOCKED') {
        setError('Account temporarily locked due to failed attempts. Try again shortly.');
      } else if (apiError.code === 'AUTH_ACCOUNT_DISABLED') {
        setError('This account has been deactivated.');
      } else {
        setError('Invalid email or password.');
      }
    }
  };

  return (
    <Card style={{ width: 400 }} bordered>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            Sign in
          </Typography.Title>
          <Typography.Text type="secondary">
            IT Asset Management Platform
          </Typography.Text>
        </div>

        {error && <Alert type="error" showIcon message={error} />}

        <Form<FormValues>
          layout="vertical"
          onFinish={onFinish}
          disabled={login.isPending}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              autoComplete="current-password"
              placeholder="••••••••••••"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={login.isPending}
          >
            Sign in
          </Button>
        </Form>
      </Space>
    </Card>
  );
};
