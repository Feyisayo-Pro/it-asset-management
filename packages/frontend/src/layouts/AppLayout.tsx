import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Space,
  Typography,
  Button,
  Tag,
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  LaptopOutlined,
  RollbackOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_COLOR, ROLE_LABEL, RoleName } from '@/types/role';

const { Header, Sider, Content } = Layout;

export const AppLayout = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const roleName = user?.roleName as RoleName;

  const menuItems = [
    {
      key: '/assets',
      icon: <LaptopOutlined />,
      label: 'Assets',
      onClick: () => nav('/assets'),
    },
    {
      key: '/returns',
      icon: <RollbackOutlined />,
      label: 'Returns',
      onClick: () => nav('/returns'),
    },
    ...(roleName === 'SUPER_ADMIN'
      ? [
          {
            key: '/admin/users',
            icon: <TeamOutlined />,
            label: 'Users',
            onClick: () => nav('/admin/users'),
          },
        ]
      : []),
  ];

  const userMenu = {
    items: [
      {
        key: 'me',
        disabled: true,
        label: (
          <div>
            <div style={{ fontWeight: 600 }}>{user?.email}</div>
            <Tag color={ROLE_COLOR[roleName]} style={{ marginTop: 4 }}>
              {ROLE_LABEL[roleName] ?? roleName}
            </Tag>
          </div>
        ),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign out',
        onClick: async () => {
          await logout();
          nav('/login', { replace: true });
        },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{ background: '#0f1a2f' }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: 1,
          }}
        >
          {collapsed ? 'IAM' : 'IAM Platform'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ background: '#0f1a2f' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eef1f4',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>{user?.email}</Typography.Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#f5f7fa' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
