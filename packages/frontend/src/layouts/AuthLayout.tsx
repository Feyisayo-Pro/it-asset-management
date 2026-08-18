import { Outlet, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuthStore } from '@/stores/auth.store';

export const AuthLayout = () => {
  const isAuthed = useAuthStore((s) => !!s.accessToken && !!s.user);
  if (isAuthed) return <Navigate to="/assets" replace />;
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#f5f7fa',
        }}
      >
        <Outlet />
      </Layout.Content>
    </Layout>
  );
};
