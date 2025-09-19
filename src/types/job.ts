export type JobAssignee = {
  userId: number;
  assignedBy: number;
  assignmentDate: Date;
  status: string;
  slot: number;
}

export interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  status: string;
  vacancies: number;
  clientId: number;
  clientName?: string;
  departmentId: number;
  departmentName?: string;
  shiftId: number;
  shiftName?: string;
  assignees?: JobAssignee[];
  owner?: {
    id: number;
    username: string;
    profile?: any;
  };
  placements?: Array<{
    id: number;
    status: string;
    userId: number;
    user?: {
      displayName: string;
      id: number;
    };
  }>;
  body?: {
    includeWeekends?: boolean;
  };
}

export interface Department {
  id: number;
  name: string;
}

export interface DepartmentResponse {
  [key: string]: string;
}

export type ViewType = 'daily' | 'weekly' | 'monthly';