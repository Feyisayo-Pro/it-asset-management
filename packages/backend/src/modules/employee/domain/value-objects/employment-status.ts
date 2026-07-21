export enum EmploymentStatus {
  Active = 'active',
  OnLeave = 'on_leave',
  Terminated = 'terminated',
  Resigned = 'resigned',
  Transferred = 'transferred',
}

export const TERMINAL_STATUSES: readonly EmploymentStatus[] = [
  EmploymentStatus.Terminated,
  EmploymentStatus.Resigned,
];
