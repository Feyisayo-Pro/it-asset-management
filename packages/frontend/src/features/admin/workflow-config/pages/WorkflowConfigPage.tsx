import { Card, Collapse, Descriptions, Space, Steps, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  WorkflowDefinitionDto,
  WorkflowStageDto,
  WorkflowTransitionConfigDto,
  workflowsApi,
} from '@/api/workflows.api';
import { PageHeader } from '@/components/PageHeader';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'red',
  STORES_OFFICER: 'blue',
  IT_REP: 'green',
  PEOPLE_CULTURE: 'purple',
  EMPLOYEE: 'default',
};

const transitionColumns: ColumnsType<WorkflowTransitionConfigDto> = [
  {
    title: 'Action',
    dataIndex: 'actionName',
    key: 'actionName',
    render: (v: string) => <Tag color="blue">{v}</Tag>,
  },
  {
    title: 'From',
    dataIndex: 'fromState',
    key: 'fromState',
  },
  {
    title: 'To',
    dataIndex: 'toState',
    key: 'toState',
  },
  {
    title: 'Required Roles',
    dataIndex: 'requiredRoles',
    key: 'requiredRoles',
    render: (roles: string[]) => (
      <Space wrap>
        {roles.map((r) => (
          <Tag key={r} color={ROLE_COLORS[r] ?? 'default'}>
            {r}
          </Tag>
        ))}
      </Space>
    ),
  },
  {
    title: 'Signature',
    dataIndex: 'requiresSignature',
    key: 'requiresSignature',
    render: (v: boolean) => (v ? <Tag color="orange">Required</Tag> : '-'),
  },
  {
    title: 'Evidence',
    dataIndex: 'requiresEvidence',
    key: 'requiresEvidence',
    render: (v: boolean) => (v ? <Tag color="orange">Required</Tag> : '-'),
  },
  {
    title: 'Comment',
    dataIndex: 'requiresComment',
    key: 'requiresComment',
    render: (v: boolean) => (v ? <Tag color="orange">Required</Tag> : '-'),
  },
];

const DefinitionCard = ({ def }: { def: WorkflowDefinitionDto }) => {
  const sortedStages = [...def.stages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card
      title={
        <Space>
          <Typography.Text strong>{def.name ?? def.key}</Typography.Text>
          <Tag color={def.isActive ? 'green' : 'default'}>
            {def.isActive ? 'Active' : 'Inactive'}
          </Tag>
          <Tag>v{def.version}</Tag>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Key">{def.key}</Descriptions.Item>
        <Descriptions.Item label="Initial State">
          <Tag color="green">{def.initialState}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Final States">
          {def.finalStates.map((s) => (
            <Tag key={s} color="red">
              {s}
            </Tag>
          ))}
        </Descriptions.Item>
        {def.description && (
          <Descriptions.Item label="Description" span={3}>
            {def.description}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Collapse
        items={[
          {
            key: 'stages',
            label: `Stages (${def.stages.length})`,
            children: (
              <Steps
                direction="vertical"
                size="small"
                current={-1}
                items={sortedStages.map((s: WorkflowStageDto) => ({
                  title: s.label ?? s.state,
                  description: (
                    <Space wrap>
                      <Typography.Text type="secondary">{s.state}</Typography.Text>
                      {s.slaMinutes != null && (
                        <Tag>SLA: {s.slaMinutes >= 60 ? `${Math.round(s.slaMinutes / 60)}h` : `${s.slaMinutes}m`}</Tag>
                      )}
                      {s.requiredRoles.map((r) => (
                        <Tag key={r} color={ROLE_COLORS[r] ?? 'default'}>
                          {r}
                        </Tag>
                      ))}
                    </Space>
                  ),
                }))}
              />
            ),
          },
          {
            key: 'transitions',
            label: `Transitions (${def.transitions.length})`,
            children: (
              <Table<WorkflowTransitionConfigDto>
                rowKey="id"
                columns={transitionColumns}
                dataSource={def.transitions}
                pagination={false}
                size="small"
                scroll={{ x: 700 }}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export const WorkflowConfigPage = () => {
  const { data: definitions, isLoading } = useQuery({
    queryKey: queryKeys.workflows.definitions,
    queryFn: () => workflowsApi.listDefinitions(),
  });

  return (
    <div>
      <PageHeader
        title="Workflow Configuration"
        subtitle="View workflow definitions, stages, and transitions"
      />

      {isLoading && <Card loading />}

      {definitions?.map((def) => (
        <DefinitionCard key={def.id} def={def} />
      ))}

      {definitions?.length === 0 && (
        <Card>
          <Typography.Text type="secondary">No workflow definitions found.</Typography.Text>
        </Card>
      )}
    </div>
  );
};
