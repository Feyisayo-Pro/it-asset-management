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
  FileDoneOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ToolOutlined,
  DeleteOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  DashboardOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_COLOR, ROLE_LABEL, RoleName } from '@/types/role';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { SapphireMark } from '@/components/SapphireMark';

const SIDER_BG = '#0B1E4A';

const { Header, Sider, Content } = Layout;

export const AppLayout = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close the sidebar after picking a page on mobile — otherwise
  // the overlay stays open covering the page you just navigated to.
  const navAndClose = (path: string) => {
    nav(path);
    if (isMobile) setCollapsed(true);
  };

  const roleName = user?.roleName as RoleName;

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navAndClose('/dashboard'),
    },
    {
      key: '/assets',
      icon: <LaptopOutlined />,
      label: 'Assets',
      onClick: () => navAndClose('/assets'),
    },
    {
      key: '/returns',
      icon: <RollbackOutlined />,
      label: 'Returns',
      onClick: () => navAndClose('/returns'),
    },
    ...(roleName !== 'EMPLOYEE'
      ? [
          {
            key: '/assessments',
            icon: <FileDoneOutlined />,
            label: 'Assessments',
            onClick: () => navAndClose('/assessments'),
          },
          {
            key: '/repairs',
            icon: <ToolOutlined />,
            label: 'Repairs',
            onClick: () => navAndClose('/repairs'),
          },
          {
            key: '/disposals',
            icon: <DeleteOutlined />,
            label: 'Disposals',
            onClick: () => navAndClose('/disposals'),
          },
          {
            key: '/reports',
            icon: <BarChartOutlined />,
            label: 'Reports',
            onClick: () => navAndClose('/reports'),
          },
        ]
      : []),
    {
      key: '/activity',
      icon: <UnorderedListOutlined />,
      label: 'Activity Feed',
      onClick: () => navAndClose('/activity'),
    },
    ...(roleName === 'SUPER_ADMIN'
      ? [
          {
            key: '/admin/users',
            icon: <TeamOutlined />,
            label: 'Users',
            onClick: () => navAndClose('/admin/users'),
          },
          {
            key: '/admin/audit-logs',
            icon: <AuditOutlined />,
            label: 'Audit Log',
            onClick: () => navAndClose('/admin/audit-logs'),
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
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .ant-drawer-content-wrapper { max-width: 100vw; }
        @media (max-width: 576px) {
          .list-filters { width: 100%; }
          .list-filters .ant-space-item { width: 100%; }
          .list-filters .ant-space-item > * { width: 100% !important; }
          .ant-card-body { padding: 16px; }
          .ant-statistic-content { font-size: 20px; }
          .responsive-grid { grid-template-columns: 1fr !important; }
          .checklist-item-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Backdrop — only rendered (and only intercepts clicks) when the
          sidebar is open as a mobile overlay. */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 999,
          }}
        />
      )}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        collapsedWidth={isMobile ? 0 : 80}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          if (broken) setCollapsed(true);
        }}
        style={{
          background: SIDER_BG,
          position: 'fixed',
          insetInlineStart: 0,
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            gap: 10,
            padding: collapsed && !isMobile ? 0 : '0 16px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed && !isMobile ? (
            <SapphireMark size={22} />
          ) : (
            <div
              style={{
                background: '#fff',
                borderRadius: 6,
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <img
                src="/sapphire-logo.png"
                alt="Sapphire Virtual Networks"
                style={{ height: 18, width: 'auto', display: 'block' }}
              />
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ background: SIDER_BG }}
        />
      </Sider>
      <Layout
        style={{
          marginInlineStart: isMobile ? 0 : collapsed ? 80 : 240,
          height: '100vh',
          overflow: 'hidden',
          transition: 'margin-inline-start 0.2s',
        }}
      >
        <Header
          style={{
            background: '#fff',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eef1f4',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          />
          <Space size={isMobile ? 8 : 16}>
            <NotificationBell onClick={() => setDrawerOpen(true)} />
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                {!isMobile && <Typography.Text>{user?.email}</Typography.Text>}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            padding: isMobile ? 12 : 24,
            background: '#f5f7fa',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Layout>
  );
};
