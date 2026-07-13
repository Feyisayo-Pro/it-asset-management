import { client } from './client';

export interface WorkflowStageDto {
  id: string;
  state: string;
  label: string;
  requiredRoles: string[];
  slaMinutes: number | null;
  sortOrder: number;
}

export interface WorkflowTransitionConfigDto {
  id: string;
  fromState: string;
  toState: string;
  actionName: string;
  requiredRoles: string[];
  requiresSignature: boolean;
  requiresEvidence: boolean;
  requiresComment: boolean;
  notificationRecipients: string[];
  auditAction: string;
}

export interface WorkflowDefinitionDto {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  initialState: string;
  finalStates: string[];
  stages: WorkflowStageDto[];
  transitions: WorkflowTransitionConfigDto[];
}

export interface WorkflowInstanceHistoryEntry {
  id: string;
  fromState: string;
  toState: string;
  actionName: string;
  actorUserId: string | null;
  signatureName: string | null;
  comment: string | null;
  occurredAt: string;
}

export interface WorkflowInstanceStateDto {
  id: string;
  definitionId: string;
  definitionKey: string;
  subjectType: string;
  subjectId: string;
  currentState: string;
  completedAt: string | null;
  bypassed: boolean;
  availableActions: Array<{ actionName: string; toState: string }>;
  stages: WorkflowStageDto[];
  history: WorkflowInstanceHistoryEntry[];
}

export const workflowsApi = {
  listDefinitions: async (): Promise<WorkflowDefinitionDto[]> => {
    const { data } = await client.get<WorkflowDefinitionDto[]>('/workflows/definitions');
    return data;
  },
  getInstance: async (id: string): Promise<WorkflowInstanceStateDto> => {
    const { data } = await client.get<WorkflowInstanceStateDto>(
      `/workflows/instances/${id}`,
    );
    return data;
  },
  transition: async (
    id: string,
    payload: {
      actionName: string;
      signatureName?: string;
      evidenceFileIds?: string[];
      comment?: string;
    },
  ) => {
    const { data } = await client.post(`/workflows/instances/${id}/transition`, payload);
    return data as { id: string; currentState: string };
  },
};
