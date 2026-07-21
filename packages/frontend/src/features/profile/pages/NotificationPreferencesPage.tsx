import { Card, List, Switch, Typography } from 'antd';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const STORAGE_KEY = 'iam.notification-preferences';

const DEFAULT_PREFS: NotificationPref[] = [
  {
    key: 'workflow.transition',
    label: 'Workflow Transitions',
    description: 'When a workflow you are involved in advances to a new stage',
    enabled: true,
  },
  {
    key: 'workflow.completed',
    label: 'Workflow Completed',
    description: 'When a return or allocation workflow is fully completed',
    enabled: true,
  },
  {
    key: 'asset.assigned',
    label: 'Asset Assigned',
    description: 'When an asset is allocated to you',
    enabled: true,
  },
  {
    key: 'asset.returned',
    label: 'Asset Returned',
    description: 'When an asset return is processed',
    enabled: true,
  },
  {
    key: 'compliance.breach',
    label: 'SLA Breach Alerts',
    description: 'When a workflow stage exceeds its SLA deadline',
    enabled: true,
  },
  {
    key: 'signature.required',
    label: 'Signature Required',
    description: 'When your signature is needed on a workflow',
    enabled: true,
  },
  {
    key: 'repair.status',
    label: 'Repair Updates',
    description: 'When a repair request status changes',
    enabled: true,
  },
  {
    key: 'disposal.status',
    label: 'Disposal Updates',
    description: 'When a disposal request status changes',
    enabled: true,
  },
];

const loadPrefs = (): NotificationPref[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const saved = JSON.parse(stored) as Record<string, boolean>;
      return DEFAULT_PREFS.map((p) => ({
        ...p,
        enabled: saved[p.key] ?? p.enabled,
      }));
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
};

const savePrefs = (prefs: NotificationPref[]) => {
  const map: Record<string, boolean> = {};
  prefs.forEach((p) => {
    map[p.key] = p.enabled;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const NotificationPreferencesPage = () => {
  const [prefs, setPrefs] = useState<NotificationPref[]>(loadPrefs);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const handleToggle = (key: string, checked: boolean) => {
    setPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: checked } : p)),
    );
  };

  return (
    <div>
      <PageHeader
        title="Notification Preferences"
        subtitle="Choose which notifications you receive"
      />

      <Card>
        <List
          dataSource={prefs}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Switch
                  key="toggle"
                  checked={item.enabled}
                  onChange={(checked) => handleToggle(item.key, checked)}
                />,
              ]}
            >
              <List.Item.Meta
                title={item.label}
                description={
                  <Typography.Text type="secondary">{item.description}</Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};
