import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, List, Modal, Tag, Typography } from 'antd';
import {
  DashboardOutlined,
  IdcardOutlined,
  LaptopOutlined,
  RollbackOutlined,
  SwapOutlined,
  FileDoneOutlined,
  ToolOutlined,
  DeleteOutlined,
  ShopOutlined,
  FileAddOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  DatabaseOutlined,
  AuditOutlined,
  PartitionOutlined,
  UserOutlined,
  SettingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';

interface SearchItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  category: string;
  keywords: string[];
  roles?: string[];
}

const ALL_ITEMS: SearchItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlined />, category: 'Navigation', keywords: ['home', 'overview'] },
  { key: 'employees', label: 'Employees', path: '/employees', icon: <IdcardOutlined />, category: 'Navigation', keywords: ['staff', 'people', 'team'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'employees-new', label: 'Add Employee', path: '/employees/new', icon: <IdcardOutlined />, category: 'Actions', keywords: ['create', 'new employee', 'hire'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'assets', label: 'Assets', path: '/assets', icon: <LaptopOutlined />, category: 'Navigation', keywords: ['devices', 'inventory', 'equipment'] },
  { key: 'assets-new', label: 'Register Asset', path: '/assets/new', icon: <LaptopOutlined />, category: 'Actions', keywords: ['create', 'new asset', 'add device'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'assets-import', label: 'Import Assets', path: '/assets/import', icon: <LaptopOutlined />, category: 'Actions', keywords: ['bulk', 'csv', 'upload'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'returns', label: 'Returns', path: '/returns', icon: <RollbackOutlined />, category: 'Navigation', keywords: ['return', 'give back'] },
  { key: 'returns-new', label: 'Initiate Return', path: '/returns/new', icon: <RollbackOutlined />, category: 'Actions', keywords: ['new return', 'start return'] },
  { key: 'allocations', label: 'Allocations', path: '/allocations', icon: <SwapOutlined />, category: 'Navigation', keywords: ['assign', 'distribute'] },
  { key: 'allocations-new', label: 'New Allocation', path: '/allocations/new', icon: <SwapOutlined />, category: 'Actions', keywords: ['request allocation', 'assign asset'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'assessments', label: 'Assessments', path: '/assessments', icon: <FileDoneOutlined />, category: 'Navigation', keywords: ['check', 'inspect', 'evaluate'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'repairs', label: 'Repairs', path: '/repairs', icon: <ToolOutlined />, category: 'Navigation', keywords: ['fix', 'maintenance'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'disposals', label: 'Disposals', path: '/disposals', icon: <DeleteOutlined />, category: 'Navigation', keywords: ['dispose', 'decommission', 'scrap'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'vendors', label: 'Vendors', path: '/vendors', icon: <ShopOutlined />, category: 'Navigation', keywords: ['supplier', 'provider'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'acquisitions', label: 'Acquisitions', path: '/acquisitions', icon: <FileAddOutlined />, category: 'Navigation', keywords: ['procurement', 'purchase', 'buy'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'compliance', label: 'Compliance', path: '/compliance', icon: <SafetyCertificateOutlined />, category: 'Navigation', keywords: ['sla', 'breach', 'monitor'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'reports', label: 'Reports', path: '/reports', icon: <BarChartOutlined />, category: 'Navigation', keywords: ['analytics', 'export', 'csv'], roles: ['SUPER_ADMIN', 'STORES_OFFICER', 'IT_REP', 'PEOPLE_CULTURE'] },
  { key: 'activity', label: 'Activity Feed', path: '/activity', icon: <UnorderedListOutlined />, category: 'Navigation', keywords: ['notifications', 'feed', 'log'] },
  { key: 'admin-users', label: 'User Management', path: '/admin/users', icon: <TeamOutlined />, category: 'Admin', keywords: ['users', 'accounts', 'roles'], roles: ['SUPER_ADMIN'] },
  { key: 'admin-master-data', label: 'Master Data', path: '/admin/master-data', icon: <DatabaseOutlined />, category: 'Admin', keywords: ['reference', 'lookup', 'categories'], roles: ['SUPER_ADMIN'] },
  { key: 'admin-audit-logs', label: 'Audit Logs', path: '/admin/audit-logs', icon: <AuditOutlined />, category: 'Admin', keywords: ['audit', 'trail', 'history'], roles: ['SUPER_ADMIN'] },
  { key: 'admin-workflows', label: 'Workflow Configuration', path: '/admin/workflow-config', icon: <PartitionOutlined />, category: 'Admin', keywords: ['workflow', 'stages', 'transitions'], roles: ['SUPER_ADMIN'] },
  { key: 'profile', label: 'My Profile', path: '/profile', icon: <UserOutlined />, category: 'Account', keywords: ['account', 'password', 'settings'] },
  { key: 'notification-prefs', label: 'Notification Preferences', path: '/notification-preferences', icon: <SettingOutlined />, category: 'Account', keywords: ['preferences', 'settings', 'alerts'] },
];

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<ReturnType<typeof Input.Search> | null>(null);
  const nav = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filteredItems = ALL_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role as string)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.includes(q))
    );
  });

  const grouped = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, SearchItem[]>,
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery('');
    nav(path);
  };

  return (
    <Modal
      open={open}
      onCancel={() => { setOpen(false); setQuery(''); }}
      footer={null}
      closable={false}
      width={560}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          ref={inputRef as never}
          prefix={<SearchOutlined />}
          placeholder="Search pages, actions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="borderless"
          size="large"
          autoFocus
          suffix={
            <Tag style={{ margin: 0 }}>
              ESC
            </Tag>
          }
        />
      </div>
      <div style={{ maxHeight: 400, overflow: 'auto', padding: '8px 0' }}>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, padding: '4px 16px', display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {category}
            </Typography.Text>
            <List
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                  onClick={() => handleSelect(item.path)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <List.Item.Meta
                    avatar={item.icon}
                    title={item.label}
                  />
                </List.Item>
              )}
            />
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <Typography.Text type="secondary">No results found</Typography.Text>
          </div>
        )}
      </div>
    </Modal>
  );
};
