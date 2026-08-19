import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography } from 'antd';
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
    (location.state as { returnTo?: string } | null)?.returnTo ?? '/dashboard';

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
      } else if (apiError.code === 'NETWORK_ERROR') {
        setError(
          "Couldn't reach the server — it may be waking up after being idle. Please wait a few seconds and try again.",
        );
      } else {
        setError('Invalid email or password.');
      }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      {/* Mark shown only when the brand panel is hidden (narrow viewports). */}
      <div
        className="auth-mobile-mark"
        style={{
          display: 'none',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <img src="/sapphire-logo.png" alt="Sapphire Virtual Networks" style={{ width: 150, height: 'auto' }} />
      </div>

      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Welcome back
      </Typography.Title>
      <Typography.Text type="secondary">
        Sign in to your Sapphire Virtual Networks account
      </Typography.Text>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginTop: 20 }}
        />
      )}

      <Form<FormValues>
        layout="vertical"
        onFinish={onFinish}
        disabled={login.isPending}
        requiredMark={false}
        style={{ marginTop: 28 }}
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
            size="large"
            prefix={<MailOutlined style={{ color: 'rgba(0,0,0,0.35)' }} />}
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Password is required' }]}
          style={{ marginBottom: 8 }}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.35)' }} />}
            autoComplete="current-password"
            placeholder="••••••••••••"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={login.isPending}
          style={{ marginTop: 20, height: 44, fontWeight: 500 }}
        >
          Sign in
        </Button>
      </Form>

      <Typography.Text
        type="secondary"
        style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 13 }}
      >
        Contact your Stores or IT administrator if you need access.
      </Typography.Text>

      <style>{`
        @media (max-width: 900px) {
          .auth-mobile-mark { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
