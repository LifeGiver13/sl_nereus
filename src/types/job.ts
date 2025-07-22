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