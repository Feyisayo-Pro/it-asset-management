import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { assessmentsApi } from '@/api/assessments.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.assessments.all });
  if (id) void qc.invalidateQueries({ queryKey: queryKeys.assessments.byId(id) });
};

export const useAssessmentTemplates = () =>
  useQuery({
    queryKey: queryKeys.assessments.templates,
    queryFn: assessmentsApi.templates,
    staleTime: 15 * 60 * 1000,
  });

export const useAssessments = (params: {
  page: number;
  pageSize: number;
  status?: 'Draft' | 'Completed';
}) =>
  useQuery({
    queryKey: queryKeys.assessments.list(params as unknown as Record<string, unknown>),
    queryFn: () => assessmentsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useAssessment = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.assessments.byId(id) : ['assessments', 'detail', 'noop'],
    queryFn: () => assessmentsApi.getById(id as string),
    enabled: !!id,
  });

export const useStartAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assessmentsApi.start,
    onSuccess: () => invalidate(qc),
  });
};

export const useSaveResults = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: Parameters<typeof assessmentsApi.saveResults>[1]) =>
      assessmentsApi.saveResults(id, entries),
    onSuccess: () => invalidate(qc, id),
  });
};

export const useCompleteAssessment = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof assessmentsApi.complete>[1]) =>
      assessmentsApi.complete(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};
